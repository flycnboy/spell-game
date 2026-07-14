// 自动后台云端同步控制器（模块级单例，与 React 解耦）。
// - 轮询（默认 15s）检测本地学习数据变化，变化后防抖（默认 5s）上传到 GitHub Gist；
// - 定期（默认 2min）拉取其它设备的数据并与本地字段级合并；
// - 失败冷却后自动重试；切到后台 / 关闭页面时 best-effort 把改动刷上去。
// - Token 加密：设了同步密码后用 AES-GCM 加密存储，明文仅留内存本会话。
// React 侧通过 useCloudSync（useSyncExternalStore）订阅同一实例，避免重复循环。

import {
  CONFIG_KEY, BACKUP_FILE, GITHUB_API,
  collectLocal, applyLocal,
  type CloudBackup, type GistConfig,
} from './cloudMerge';
import { encryptString, decryptString } from './crypto';

const TICK_INTERVAL = 15_000;   // 每 15s 轮询一次本地数据变化
const PUSH_DEBOUNCE = 5_000;    // 变化后 5s 防抖再上传（合并连续写入）
const PULL_INTERVAL = 120_000;  // 最多每 2 分钟拉取一次
const RETRY_COOLDOWN = 20_000;  // 失败后至少 20s 再尝试

export type SyncState =
  | 'disabled'   // 自动同步关闭 / 未配置 Token+Gist
  | 'idle'       // 已是最新
  | 'pending'    // 本地有改动，等待防抖上传
  | 'syncing'    // 上传 / 下载进行中
  | 'error'      // 最近一次出错
  | 'offline'    // 离线，将自动重试
  | 'needpass';  // 已加密但本会话未提供同步密码，需用户输入才能同步

export interface CloudStatus {
  state: SyncState;
  lastSyncAt: number | null;          // ms 时间戳（最近一次成功同步）
  lastError: string | null;
  lastRemoteUpdatedAt: number | null; // ms（云端备份的更新时间）
  pending: boolean;
}

type FullConfig = GistConfig & { autoSync: boolean };

function defaultConfig(): FullConfig {
  return { gistId: '', token: '', lastSync: null, autoSync: false };
}

function loadConfig(): FullConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return { ...defaultConfig(), ...JSON.parse(raw) };
  } catch {}
  return defaultConfig();
}

function saveConfig(c: FullConfig) {
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(c)); } catch {}
}

// 仅对「数据字段」做签名，排除 updatedAt（每次 collectLocal 都会刷新时间）
function dataSignature(b: CloudBackup): string {
  const s = JSON.stringify({
    banks: b.banks, stats: b.stats, enriched: b.enriched,
    settings: b.settings, plans: b.plans,
  });
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return String(h >>> 0);
}

class CloudSyncController {
  private config: FullConfig = loadConfig();
  private status: CloudStatus = {
    state: 'disabled', lastSyncAt: null, lastError: null,
    lastRemoteUpdatedAt: null, pending: false,
  };
  private snapshot = { config: this.config, status: { ...this.status } };
  private subs = new Set<() => void>();

  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSignature = '';        // 最近一次「已与云端一致」的本地数据签名
  private lastPullAt = 0;
  private lastErrorAt = 0;
  private lastRemoteUpdatedAt = 0;   // 云端备份的更新时间（ms），0 表示未知
  private uploading = false;
  private started = false;

  private passphrase: string | null = null; // 同步密码（仅内存，不落盘）
  private tokenCache = '';                   // 解密后的 Token（仅内存，供网络使用）

  constructor() {
    this.passphrase = this.config.rememberedPass || null;
  }

  // ---- 订阅（useSyncExternalStore 要求 getSnapshot 返回稳定引用）----
  subscribe = (cb: () => void) => {
    this.subs.add(cb);
    return () => { this.subs.delete(cb); };
  };
  getSnapshot = () => this.snapshot;

  private emit() {
    this.snapshot = { config: this.config, status: { ...this.status } };
    for (const cb of this.subs) cb();
  }
  private setStatus(patch: Partial<CloudStatus>) {
    this.status = { ...this.status, ...patch };
    this.emit();
  }

  getConfig = () => this.config;

  // 同步可用的 Token：优先内存解密值，其次明文。无则返回 ''
  private tokenValue(): string {
    if (this.tokenCache) return this.tokenCache;
    if (this.config.token) { this.tokenCache = this.config.token; return this.tokenCache; }
    return '';
  }

  setConfig = (patch: Partial<FullConfig>) => {
    const wasAuto = !!this.config.autoSync;
    this.config = { ...this.config, ...patch };
    if (patch.token !== undefined) {
      const tok = patch.token;
      if (!tok) {
        // 清空 Token
        this.tokenCache = '';
        this.config = { ...this.config, token: undefined as any, encryptedToken: null as any };
      } else if (this.passphrase) {
        // 有同步密码：加密存储，内存保留明文供本会话同步，不落盘明文
        this.tokenCache = tok;
        this.config = { ...this.config, token: undefined as any };
        encryptString(tok, this.passphrase).then(enc => {
          this.config = { ...this.config, encryptedToken: enc };
          saveConfig(this.config);
          this.emit();
        });
      } else {
        // 无同步密码：明文存储（存在泄露风险，设置面板会提示）
        this.config = { ...this.config, encryptedToken: null as any };
        this.tokenCache = tok;
      }
    }
    saveConfig(this.config);
    this.emit();

    const nowAuto = !!this.config.autoSync;
    if (nowAuto && !wasAuto && this.isValid()) {
      // 刚开启：先拉取其它设备数据，再把本地独有改动回传
      this.downloadNow();
      this.maybePush();
    } else if (!nowAuto) {
      this.setStatus({ state: 'disabled', pending: false });
    }
    // 已加密但本会话无密码，无法同步
    if (nowAuto && !this.tokenValue() && this.config.encryptedToken) {
      this.setStatus({ state: 'needpass', lastError: '需输入同步密码以启用自动同步' });
    }
  };

  // 设置本会话同步密码（内存）；若已加密则尝试解密出 Token
  async setPassphrase(p: string) {
    this.passphrase = p || null;
    if (p && this.config.encryptedToken) {
      try {
        this.tokenCache = await decryptString(this.config.encryptedToken, p);
      } catch {
        this.tokenCache = '';
        this.setStatus({ state: 'needpass', lastError: '同步密码错误' });
        return;
      }
    } else if (!p) {
      this.tokenCache = this.config.token || '';
    }
    if (this.config.autoSync && this.isValid()) {
      await this.downloadNow();
      this.maybePush();
    } else if (this.config.encryptedToken && !this.tokenCache) {
      this.setStatus({ state: 'needpass', lastError: '需输入同步密码以启用自动同步' });
    } else if (!this.config.autoSync) {
      this.setStatus({ state: 'disabled' });
    }
  }

  private isValid() {
    return !!this.tokenValue() && !!this.config.gistId;
  }

  private hasLocalChanges(): boolean {
    return dataSignature(collectLocal(localStorage)) !== this.lastSignature;
  }

  private schedulePush() {
    if (!this.config.autoSync || !this.isValid()) return;
    if (this.pushTimer) return; // 已在防抖中
    this.setStatus({ pending: true, state: 'pending' });
    this.pushTimer = setTimeout(() => {
      this.pushTimer = null;
      this.uploadNow(false);
    }, PUSH_DEBOUNCE);
  }

  // 检测本地变化后安排上传（带失败冷却）
  private maybePush() {
    if (!this.config.autoSync || !this.isValid()) return;
    if (!this.hasLocalChanges()) return;
    if (Date.now() - this.lastErrorAt < RETRY_COOLDOWN) return;
    this.schedulePush();
  }

  // 上传：未配置 gistId 则新建，否则 PATCH 更新
  async uploadNow(force = false): Promise<boolean> {
    const token = this.tokenValue();
    if (!token) {
      this.setStatus({
        state: this.config.encryptedToken ? 'needpass' : 'disabled',
        lastError: this.config.encryptedToken ? '需输入同步密码' : '未配置 GitHub Token',
      });
      return false;
    }
    if (this.uploading) return false;
    const backup = collectLocal(localStorage);
    const sig = dataSignature(backup);
    if (!force && sig === this.lastSignature) {
      this.setStatus({ pending: false });
      if (this.status.state === 'pending') this.setStatus({ state: 'idle' });
      return true;
    }
    this.uploading = true;
    this.setStatus({ state: 'syncing', pending: false });
    try {
      backup.updatedAt = new Date().toISOString();
      const content = JSON.stringify(backup, null, 2);
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      let gistId = this.config.gistId;
      if (gistId) {
        const resp = await fetch(`${GITHUB_API}/${gistId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ files: { [BACKUP_FILE]: { content } } }),
        });
        if (!resp.ok) {
          const d = await resp.json().catch(() => ({} as any));
          throw new Error(d?.message || `上传失败 (${resp.status})`);
        }
      } else {
        const resp = await fetch(GITHUB_API, {
          method: 'POST',
          headers,
          body: JSON.stringify({ description: 'spell-game 云端备份', public: false, files: { [BACKUP_FILE]: { content } } }),
        });
        const d = await resp.json().catch(() => ({} as any));
        if (!resp.ok) throw new Error(d?.message || `创建失败 (${resp.status})`);
        gistId = d.id as string;
        this.config = { ...this.config, gistId };
        saveConfig(this.config);
      }
      this.lastSignature = sig;
      this.lastPullAt = Date.now();
      this.lastErrorAt = 0;
      this.config = { ...this.config, lastSync: new Date().toISOString() };
      saveConfig(this.config);
      this.setStatus({ state: 'idle', lastError: null, lastSyncAt: Date.now(), pending: false });
      return true;
    } catch (e: any) {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      this.lastErrorAt = Date.now();
      this.setStatus({ state: offline ? 'offline' : 'error', lastError: e?.message || '同步失败', pending: true });
      return false;
    } finally {
      this.uploading = false;
    }
  }

  // 下载：仅当云端比本地记录的更新时才合并，避免无谓写回
  async downloadNow(): Promise<boolean> {
    if (!this.config.gistId) return false;
    const token = this.tokenValue();
    if (!token) {
      this.setStatus({
        state: this.config.encryptedToken ? 'needpass' : 'disabled',
        lastError: this.config.encryptedToken ? '需输入同步密码' : '未配置 GitHub Token',
      });
      return false;
    }
    this.setStatus({ state: 'syncing' });
    try {
      const resp = await fetch(`${GITHUB_API}/${this.config.gistId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await resp.json().catch(() => ({} as any));
      if (!resp.ok) throw new Error(d?.message || `下载失败 (${resp.status})`);
      const file = d.files?.[BACKUP_FILE];
      if (!file || !file.content) throw new Error('云端备份文件不存在，请先上传');
      const backup: CloudBackup = JSON.parse(file.content);
      const remoteMs = new Date(backup.updatedAt || 0).getTime();
      if (this.lastRemoteUpdatedAt && remoteMs <= this.lastRemoteUpdatedAt) {
        this.setStatus({ state: 'idle', lastError: null, lastSyncAt: Date.now() });
        return true;
      }
      applyLocal(backup, localStorage);
      this.lastRemoteUpdatedAt = remoteMs;
      // 以「云端基线」作为已同步标记：本地独有改动会造成差异，下一轮会被回传
      this.lastSignature = dataSignature(backup);
      this.lastErrorAt = 0;
      this.config = { ...this.config, lastSync: new Date().toISOString() };
      saveConfig(this.config);
      this.setStatus({ state: 'idle', lastError: null, lastSyncAt: Date.now(), pending: false });
      this.maybePush(); // 立即把本地独有改动回传云端
      return true;
    } catch (e: any) {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      this.lastErrorAt = Date.now();
      this.setStatus({ state: offline ? 'offline' : 'error', lastError: e?.message || '下载失败' });
      return false;
    }
  }

  private tick = () => {
    if (!this.config.autoSync || !this.isValid()) return;
    this.maybePush();
    if (Date.now() - this.lastPullAt > PULL_INTERVAL) this.downloadNow();
  };

  start() {
    if (this.started) return;
    this.started = true;
    // 异步初始化：若勾选「记住密码」则先解密出 Token，再启动首次同步
    (async () => {
      if (this.config.rememberedPass && this.config.encryptedToken) {
        await this.setPassphrase(this.config.rememberedPass);
      }
      if (this.config.autoSync && this.isValid()) {
        await this.downloadNow();
        this.maybePush();
      } else if (this.config.autoSync && this.config.encryptedToken && !this.tokenValue()) {
        this.setStatus({ state: 'needpass', lastError: '需输入同步密码以启用自动同步' });
      } else {
        this.setStatus({ state: 'disabled' });
      }
    })();
    setInterval(this.tick, TICK_INTERVAL);
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.flush);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') this.flush();
        else this.tick();
      });
    }
  }

  // 切后台 / 关闭页面时尽量把改动刷上去（best-effort，不等待结果）
  private flush = () => {
    if (this.config.autoSync && this.isValid() && this.hasLocalChanges()) {
      this.uploadNow(false);
    }
  };

  // 由关键业务节点主动调用，使改动尽快进入同步（仍在防抖窗口内合并）
  touch() {
    this.maybePush();
  }
}

export const cloudSync = new CloudSyncController();
