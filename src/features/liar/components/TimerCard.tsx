// 타이머 카드 컴포넌트

import { useEffect, useState } from "react";
import { remainingMs } from "../utils";

type TimerCardProps = {
  title: string;
  endsAt: number | null;
};

export function TimerCard({ title, endsAt }: TimerCardProps) {
  const [, setTick] = useState<number>(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((v) => v + 1), 250);
    return () => window.clearInterval(t);
  }, []);
  const sec = Math.max(0, Math.ceil(remainingMs(endsAt) / 1000));
  const totalSec = endsAt ? Math.ceil((endsAt - Date.now() + remainingMs(endsAt)) / 1000) : 0;
  const progress = totalSec > 0 ? Math.max(0, Math.min(100, (sec / totalSec) * 100)) : 0;
  const isUrgent = sec < 10 && sec > 0;

  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200">
      <div className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
        <span className="text-lg">⏱️</span>
        <span>{title}</span>
      </div>
      
      <div className="flex items-center gap-4 mb-3">
        <div className={[
          "w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shadow-lg transition-all duration-300",
          isUrgent
            ? "bg-gradient-to-br from-red-500 to-orange-500 text-white animate-pulse"
            : "bg-gradient-to-br from-amber-400 to-orange-500 text-white",
        ].join(" ")}>
          {sec}
        </div>
        <div className="flex-1">
          <div className="h-3 bg-amber-200 rounded-full overflow-hidden mb-2">
            <div
              className={[
                "h-full transition-all duration-300 rounded-full",
                isUrgent
                  ? "bg-gradient-to-r from-red-500 to-orange-500"
                  : "bg-gradient-to-r from-amber-500 to-orange-500",
              ].join(" ")}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-amber-700 font-medium">남은 시간</div>
        </div>
      </div>
    </div>
  );
}
