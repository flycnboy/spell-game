// 云端备份的纯逻辑（不依赖 React / 浏览器全局），便于单测。
// 存储通过 CloudStorage 接口注入，浏览器中传 localStorage，测试中传 mock。

export interface CloudStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  readonly length: number;
  key(index: number): string | null;
}

export interface GistConfig {
  gistId: string;
  // Token 二选一存储：明文（未设同步密码时，存在泄露风险）或加密密文（设了同步密码后）
  token?: string;
  encryptedToken?: { cipher: string; salt: string; iv: string } | null;
  rememberedPass?: string; // 仅在勾选「本机记住密码」时存在，明文，不提升安全性
  lastSync: string | null;
  autoSync?: boolean; // 是否开启自动后台同步
}

export interface CloudBackup {
  updatedAt: string;
  banks: unknown;
  stats: unknown;
  enriched: unknown;
  settings: unknown;
  plans: Record<string, string>; // batchId -> 当前学习天数
}

export const CONFIG_KEY = 'spellgame_gist';
export const BACKUP_FILE = 'spellgame_cloud_backup.json';
export const GITHUB_API = 'https://api.github.com/gists';

function safeParse(s: string): any {
  try { return JSON.parse(s); } catch { return undefined; }
}

function safeGet(storage: CloudStorage, key: string): unknown {
  const raw = storage.getItem(key);
  if (!raw) return undefined;
  try { return JSON.parse(raw); } catch { return raw; }
}

// 收集本机所有学习数据，打包为云端备份
export function collectLocal(storage: CloudStorage): CloudBackup {
  const plans: Record<string, string> = {};
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k && k.startsWith('spellplan_')) {
      plans[k.slice('spellplan_'.length)] = storage.getItem(k) || '1';
    }
  }
  return {
    updatedAt: new Date().toISOString(),
    banks: safeGet(storage, 'spellgame_batches'),
    stats: safeGet(storage, 'spellgame_stats'),
    enriched: safeGet(storage, 'spellgame_enriched'),
    settings: safeGet(storage, 'spellgame_settings'),
    plans,
  };
}

export interface StatsShape {
  wrongWords: string[];
  history: { date: string; word: string; mode: string; correct: boolean }[];
  errorCounts: Record<string, number>;
  reviewSchedule: Record<string, number>;
}

export interface EnrichedWord {
  word: string;
  chinese: string;
  definition: string;
  example: string;
  manual?: boolean;
}

// 合并两份统计：history 去重拼接、errorCounts 取 max、reviewSchedule 取更早、wrongWords 取并集
export function mergeStats(localRaw: unknown, remoteRaw: unknown): StatsShape {
  const l = (typeof localRaw === 'string' ? safeParse(localRaw) : localRaw) as Partial<StatsShape> | undefined;
  const r = (typeof remoteRaw === 'string' ? safeParse(remoteRaw) : remoteRaw) as Partial<StatsShape> | undefined;
  const lh = l?.history || [];
  const rh = r?.history || [];
  const seen = new Set<string>();
  const history = [...lh, ...rh].filter(e => {
    const k = `${e.date}|${e.word}|${e.mode}|${e.correct}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const ec: Record<string, number> = {};
  for (const w of new Set([...Object.keys(l?.errorCounts || {}), ...Object.keys(r?.errorCounts || {})])) {
    ec[w] = Math.max(l?.errorCounts?.[w] || 0, r?.errorCounts?.[w] || 0);
  }
  const rs: Record<string, number> = {};
  const INF = Number.MAX_SAFE_INTEGER;
  for (const w of new Set([...Object.keys(l?.reviewSchedule || {}), ...Object.keys(r?.reviewSchedule || {})])) {
    rs[w] = Math.min(l?.reviewSchedule?.[w] ?? INF, r?.reviewSchedule?.[w] ?? INF);
  }
  const wrongWords = Array.from(new Set([...(l?.wrongWords || []), ...(r?.wrongWords || [])]));
  return { wrongWords, history, errorCounts: ec, reviewSchedule: rs };
}

// 合并两份释义缓存：按词合并，保留非空字段与 manual 标记
export function mergeEnriched(localRaw: unknown, remoteRaw: unknown): Record<string, EnrichedWord> {
  const l = (typeof localRaw === 'string' ? safeParse(localRaw) : localRaw) as Record<string, EnrichedWord> | undefined;
  const r = (typeof remoteRaw === 'string' ? safeParse(remoteRaw) : remoteRaw) as Record<string, EnrichedWord> | undefined;
  const out: Record<string, EnrichedWord> = { ...(l || {}) };
  for (const w of Object.keys(r || {})) {
    const cur = out[w];
    const inc = (r as Record<string, EnrichedWord>)[w];
    if (!cur) { out[w] = inc; continue; }
    out[w] = {
      word: w,
      chinese: cur.chinese || inc.chinese,
      definition: cur.definition || inc.definition,
      example: cur.example || inc.example,
      manual: cur.manual || inc.manual,
    };
  }
  return out;
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : JSON.stringify(v);
}

// 将云端备份写回本机。
// 词库按 id 并集；stats/enriched 与本地合并；plans 取更大学天数。
export function applyLocal(backup: CloudBackup, storage: CloudStorage): void {
  const banks = backup.banks as any;
  if (banks && typeof banks === 'object' && banks.batches) {
    const localRaw = storage.getItem('spellgame_batches');
    if (localRaw) {
      try {
        const localB = JSON.parse(localRaw);
        const localIds = new Set((localB.batches || []).map((x: any) => x.id));
        const mergedBatches = [
          ...(localB.batches || []),
          ...(banks.batches || []).filter((x: any) => !localIds.has(x.id)),
        ];
        storage.setItem(
          'spellgame_batches',
          JSON.stringify({ batches: mergedBatches, currentBatchId: banks.currentBatchId || localB.currentBatchId })
        );
      } catch {
        storage.setItem('spellgame_batches', JSON.stringify(banks));
      }
    } else {
      storage.setItem('spellgame_batches', JSON.stringify(banks));
    }
  } else if (backup.banks !== undefined) {
    storage.setItem('spellgame_batches', asString(backup.banks));
  }

  if (backup.stats !== undefined) {
    const localStats = storage.getItem('spellgame_stats');
    if (localStats) {
      storage.setItem('spellgame_stats', JSON.stringify(mergeStats(localStats, backup.stats)));
    } else {
      storage.setItem('spellgame_stats', asString(backup.stats));
    }
  }

  if (backup.enriched !== undefined) {
    const localE = storage.getItem('spellgame_enriched');
    if (localE) {
      storage.setItem('spellgame_enriched', JSON.stringify(mergeEnriched(localE, backup.enriched)));
    } else {
      storage.setItem('spellgame_enriched', asString(backup.enriched));
    }
  }

  if (backup.settings !== undefined) {
    storage.setItem('spellgame_settings', asString(backup.settings));
  }

  if (backup.plans) {
    for (const [id, day] of Object.entries(backup.plans)) {
      const key = `spellplan_${id}`;
      const localDay = Number(storage.getItem(key) || '0');
      const remoteDay = Number(day) || 0;
      storage.setItem(key, String(Math.max(localDay, remoteDay)));
    }
  }
}
