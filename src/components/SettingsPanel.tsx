import { useState } from 'react';
import type { StudySettings } from '../hooks/useStudyPlan';
import { useCloudSync } from '../hooks/useCloudSync';
import type { CloudStatus } from '../hooks/useCloudSync';

interface Props {
  settings: StudySettings;
  onSave: (settings: StudySettings) => void;
  onClose: () => void;
}

export default function SettingsPanel({ settings, onSave, onClose }: Props) {
  const [wpd, setWpd] = useState(String(settings.wordsPerDay));
  const [days, setDays] = useState(String(settings.totalDays));
  const { config, setConfig, setPassphrase, upload, download, status } = useCloudSync();
  const [manualBusy, setManualBusy] = useState(false);
  const [passInput, setPassInput] = useState('');

  const handleUpload = async () => {
    setManualBusy(true);
    await upload();
    setManualBusy(false);
  };
  const handleDownload = async () => {
    setManualBusy(true);
    await download();
    setManualBusy(false);
  };

  const handleSave = () => {
    const wordsPerDay = Math.max(1, Math.min(50, parseInt(wpd) || 10));
    const totalDays = Math.max(1, Math.min(365, parseInt(days) || 30));
    onSave({ wordsPerDay, totalDays });
    onClose();
  };

  return (
    <div className="flex flex-col px-6 py-8 max-w-md mx-auto min-h-screen">
      <h2 className="text-xl font-bold text-gray-700 mb-6">学习设置</h2>

      <div className="bg-indigo-50 rounded-xl p-4 mb-6">
        <h3 className="font-bold text-indigo-700 text-sm mb-1">📅 自适应复习</h3>
        <p className="text-xs text-gray-500">
          复习间隔按「错误次数」加权：错得越多复习越频繁
          （0 错→30天，1→15，2→7，3→3，≥4→每日）
        </p>
      </div>

      <label className="text-sm text-gray-500 mb-1">每天学习新词数</label>
      <input
        type="number"
        min="1"
        max="50"
        value={wpd}
        onChange={e => setWpd(e.target.value)}
        className="w-full p-3 border border-gray-200 rounded-lg text-lg mb-4 focus:border-indigo-400 focus:outline-none"
      />

      <label className="text-sm text-gray-500 mb-1">计划总天数</label>
      <input
        type="number"
        min="1"
        max="365"
        value={days}
        onChange={e => setDays(e.target.value)}
        className="w-full p-3 border border-gray-200 rounded-lg text-lg mb-6 focus:border-indigo-400 focus:outline-none"
      />

      <p className="text-xs text-gray-400 mb-6">
        总共可学 {parseInt(wpd) || 10} × {parseInt(days) || 30} = {' '}
        {(parseInt(wpd) || 10) * (parseInt(days) || 30)} 个词
      </p>

      {/* 跨设备云端同步 */}
      <div className="border-t border-gray-100 pt-4 mb-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-gray-700 text-sm">☁️ 跨设备云端同步</h3>
          <SyncDot status={status} />
        </div>
        <p className="text-xs text-gray-400 mb-3">
          将词库 / 统计 / 释义 / 学习进度打包到 GitHub Gist，换设备、清缓存不丢数据。
          需一个带 <b>gist</b> 权限的 GitHub Token；建议设置同步密码以加密存储（不设置则明文保存）。
        </p>

        {/* 自动后台同步开关 */}
        <label className="flex items-center gap-2 text-sm text-gray-600 mb-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!config.autoSync}
            onChange={e => setConfig({ autoSync: e.target.checked })}
            className="w-4 h-4 accent-indigo-500"
          />
          自动后台同步（本地数据变化后自动上传，并定期拉取其它设备）
        </label>

        <label className="text-sm text-gray-500 mb-1">Gist ID（留空则首次上传时自动创建）</label>
        <input
          value={config.gistId}
          onChange={e => setConfig({ gistId: e.target.value.trim() })}
          placeholder="如：86d67f60c66736f6dd6092edceab5edf"
          className="w-full p-2 border border-gray-200 rounded-lg text-xs mb-3 focus:border-indigo-400 focus:outline-none"
        />

        <label className="text-sm text-gray-500 mb-1">GitHub Token</label>
        <input
          type="password"
          value={config.token}
          onChange={e => setConfig({ token: e.target.value.trim() })}
          placeholder="ghp_xxx 或 github_pat_xxx"
          className="w-full p-2 border border-gray-200 rounded-lg text-xs mb-3 focus:border-indigo-400 focus:outline-none"
        />

        {/* 同步密码：加密 Token 存储 */}
        <label className="text-sm text-gray-500 mb-1">同步密码（可选，用于加密 Token）</label>
        <div className="flex gap-2 mb-2">
          <input
            type="password"
            value={passInput}
            onChange={e => setPassInput(e.target.value)}
            placeholder="设置后 Token 将加密存储"
            className="flex-1 p-2 border border-gray-200 rounded-lg text-xs focus:border-indigo-400 focus:outline-none"
          />
          <button
            onClick={() => setPassphrase(passInput)}
            disabled={!passInput}
            className="px-3 py-2 bg-gray-700 text-white rounded-lg text-xs font-bold disabled:opacity-40"
          >
            应用
          </button>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-400 mb-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!config.rememberedPass}
            onChange={e => setConfig({ rememberedPass: e.target.checked ? passInput : '' })}
            className="w-3.5 h-3.5 accent-indigo-500"
          />
          记住密码（仅本机明文，不提升安全性）
        </label>

        {config.encryptedToken && status.state !== 'needpass' && (
          <p className="text-xs text-green-500 mb-2">🔒 Token 已加密并解锁</p>
        )}
        {config.encryptedToken && status.state === 'needpass' && (
          <p className="text-xs text-amber-500 mb-2">🔒 Token 已加密，请输入同步密码以启用同步</p>
        )}
        {!config.encryptedToken && config.token && (
          <p className="text-xs text-red-400 mb-2">⚠️ Token 未加密存储（建议设置同步密码）</p>
        )}

        <p className="text-xs text-gray-400 mb-2">
          上次同步：{config.lastSync ? new Date(config.lastSync).toLocaleString() : '从未'}
        </p>

        <div className="flex gap-2">
          <button
            onClick={handleUpload}
            disabled={manualBusy}
            className="flex-1 py-2 bg-indigo-500 text-white rounded-xl font-bold text-sm disabled:opacity-50"
          >
            {manualBusy ? '同步中…' : '☁️ 上传备份'}
          </button>
          <button
            onClick={handleDownload}
            disabled={manualBusy || !config.gistId}
            className="flex-1 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm disabled:opacity-50"
          >
            ⬇️ 下载备份
          </button>
        </div>

        {status.lastError && (status.state === 'error' || status.state === 'offline') && (
          <p className="text-xs mt-2 text-red-400 break-all">⚠️ {status.lastError}</p>
        )}
      </div>

      <div className="flex gap-3 mt-auto pt-4 border-t border-gray-100">
        <button onClick={onClose} className="flex-1 py-3 bg-gray-200 rounded-xl font-bold text-gray-600">取消</button>
        <button onClick={handleSave} className="flex-1 py-3 bg-indigo-500 text-white rounded-xl font-bold active:bg-indigo-600">保存</button>
      </div>
    </div>
  );
}

const SYNC_DOT: Record<CloudStatus['state'], { c: string; t: string }> = {
  idle: { c: 'bg-green-500', t: '已同步' },
  pending: { c: 'bg-amber-500', t: '待同步' },
  syncing: { c: 'bg-blue-500 animate-pulse', t: '同步中' },
  error: { c: 'bg-red-500', t: '失败' },
  offline: { c: 'bg-gray-400', t: '离线' },
  needpass: { c: 'bg-amber-500', t: '需密码' },
  disabled: { c: 'bg-gray-300', t: '关闭' },
};

function SyncDot({ status }: { status: CloudStatus }) {
  const m = SYNC_DOT[status.state];
  return (
    <span className="flex items-center gap-1 text-xs text-gray-500">
      <span className={`w-2 h-2 rounded-full ${m.c}`} />
      {m.t}
    </span>
  );
}
