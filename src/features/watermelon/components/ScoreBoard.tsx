// 점수판 컴포넌트 (현재 점수만 표시)

"use client";

import { useEffect, useState } from "react";

type ScoreBoardProps = {
  score: number;
};

export function ScoreBoard({ score }: ScoreBoardProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [prevScore, setPrevScore] = useState(score);

  useEffect(() => {
    if (score !== prevScore && score > 0) {
      setIsAnimating(true);
      setPrevScore(score);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [score, prevScore]);

  return (
    <div className="rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 backdrop-blur-sm px-3 py-1.5 shadow-md border border-green-200/50 text-center">
      <div className="text-[10px] text-green-700 font-medium mb-0.5">점수</div>
      <div 
        className={`text-base font-bold text-green-700 transition-all duration-300 ${
          isAnimating ? "scale-105" : "scale-100"
        }`}
      >
        {score.toLocaleString()}
      </div>
    </div>
  );
}
