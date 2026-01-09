// 토론 패널 컴포넌트

import { TimerCard } from "./TimerCard";

type DiscussPanelProps = {
  phase: "DISCUSS" | "TIE_DISCUSS";
  discussEndsAt: number | null;
  tieDiscussEndsAt: number | null;
};

export function DiscussPanel({ phase, discussEndsAt, tieDiscussEndsAt }: DiscussPanelProps) {
  const endsAt = phase === "DISCUSS" ? discussEndsAt : tieDiscussEndsAt;
  const title = phase === "DISCUSS" ? "토론 시간" : "동점 재논의 시간";
  const isTie = phase === "TIE_DISCUSS";

  return (
    <section className="rounded-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm shadow-xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="text-lg font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent flex items-center gap-2">
        <span>{isTie ? "🔄" : "💬"}</span>
        <span>{title}</span>
      </div>
      
      <TimerCard title={title} endsAt={endsAt} />
      
      {isTie && (
        <div className="p-3 rounded-xl bg-orange-50 border-2 border-orange-200 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-orange-800 mb-1">동점 발생</div>
            <div className="text-xs text-orange-700">재논의 후 다시 투표로 이동합니다</div>
          </div>
        </div>
      )}
      
      {!isTie && (
        <div className="p-3 rounded-xl bg-blue-50 border-2 border-blue-200 flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div className="text-xs text-blue-700">
            시간이 끝나면 자동으로 투표 단계로 이동하거나, 방장이 투표 시작 버튼을 눌러야 합니다
          </div>
        </div>
      )}
    </section>
  );
}
