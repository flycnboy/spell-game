import { useSyncExternalStore } from 'react';
import { cloudSync } from '../lib/cloudSync';
import type { GistConfig } from '../lib/cloudMerge';
import type { CloudStatus } from '../lib/cloudSync';

export type { CloudStatus };
export { cloudSync };

// 薄壳：订阅同一单例，App 与 SettingsPanel 共享状态、避免重复后台循环。
export function useCloudSync() {
  const snap = useSyncExternalStore(cloudSync.subscribe, cloudSync.getSnapshot, cloudSync.getSnapshot);
  return {
    config: snap.config as GistConfig & { autoSync?: boolean },
    status: snap.status as CloudStatus,
    setConfig: (patch: Partial<GistConfig & { autoSync?: boolean }>) => cloudSync.setConfig(patch),
    setPassphrase: (p: string) => cloudSync.setPassphrase(p),
    start: () => cloudSync.start(),
    upload: () => cloudSync.uploadNow(true),
    download: () => cloudSync.downloadNow(),
    touch: () => cloudSync.touch(),
  };
}
