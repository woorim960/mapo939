// 점수 통계 컴포넌트

import type { ScoreStats as ScoreStatsType } from "../hooks/useWatermelonGame";

type ScoreStatsProps = {
  stats: ScoreStatsType;
};

export function ScoreStats({ stats }: ScoreStatsProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-600">
      <div className="flex items-center gap-1">
        <span>최고</span>
        <span className="font-semibold text-gray-800">{stats.bestScore.toLocaleString()}</span>
      </div>
      <span className="text-gray-300">•</span>
      <div className="flex items-center gap-1">
        <span>평균</span>
        <span className="font-semibold text-gray-800">{stats.averageScore.toLocaleString()}</span>
      </div>
      <span className="text-gray-300">•</span>
      <div className="flex items-center gap-1">
        <span>플레이</span>
        <span className="font-semibold text-gray-800">{stats.playCount}회</span>
      </div>
    </div>
  );
}
