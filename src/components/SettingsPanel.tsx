import { useState } from 'react';
import type { StudySettings } from '../hooks/useStudyPlan';

interface Props {
  settings: StudySettings;
  onSave: (settings: StudySettings) => void;
  onClose: () => void;
}

export default function SettingsPanel({ settings, onSave, onClose }: Props) {
  const [wpd, setWpd] = useState(String(settings.wordsPerDay));
  const [days, setDays] = useState(String(settings.totalDays));

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
        <h3 className="font-bold text-indigo-700 text-sm mb-1">📅 艾宾浩斯遗忘曲线</h3>
        <p className="text-xs text-gray-500">
          新学的单词会在第 1、7、16、30 天后自动安排复习，帮助长期记忆
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

      <div className="flex gap-3 mt-auto pt-4 border-t border-gray-100">
        <button onClick={onClose} className="flex-1 py-3 bg-gray-200 rounded-xl font-bold text-gray-600">取消</button>
        <button onClick={handleSave} className="flex-1 py-3 bg-indigo-500 text-white rounded-xl font-bold active:bg-indigo-600">保存</button>
      </div>
    </div>
  );
}
