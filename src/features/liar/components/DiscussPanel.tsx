// 토론 패널 컴포넌트

import { TimerCard } from "./TimerCard";

type DiscussPanelProps = {
  phase: "DISCUSS" | "TIE_DISCUSS";
  discussEndsAt: number | null;
  tieDiscussEndsAt: number | null;
  lastEliminatedPlayerId: string | null;
  eliminatedName: string | null;
};

export function DiscussPanel({ 
  phase, 
  discussEndsAt, 
  tieDiscussEndsAt,
  lastEliminatedPlayerId,
  eliminatedName,
}: DiscussPanelProps) {
  const endsAt = phase === "DISCUSS" ? discussEndsAt : tieDiscussEndsAt;
  const isTieDiscuss = phase === "TIE_DISCUSS";
  
  // TIE_DISCUSS 상황 구분: lastEliminatedPlayerId가 있으면 사망자 발생 후 재논의, 없으면 동점 재논의
  const isAfterElimination = isTieDiscuss && lastEliminatedPlayerId !== null;
  const isTieVote = isTieDiscuss && lastEliminatedPlayerId === null;
  
  // 제목 결정
  let title: string;
  let icon: string;
  if (phase === "DISCUSS") {
    title = "토론 시간";
    icon = "💬";
  } else if (isAfterElimination) {
    title = "사망 토론 시작";
    icon = "💀";
  } else {
    title = "동점표 발생";
    icon = "🔄";
  }

  return (
    <section className="rounded-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm shadow-xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="text-lg font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent flex items-center gap-2">
        <span>{icon}</span>
        <span>{title}</span>
      </div>
      
      <TimerCard title={title} endsAt={endsAt} />
      
      {/* 사망자 발생 후 재논의 */}
      {isAfterElimination && (
        <div className="p-3 rounded-xl bg-red-50 border-2 border-red-200 flex items-start gap-3">
          <span className="text-xl">💀</span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-red-800 mb-1">
              {eliminatedName ? `${eliminatedName}님이 사망했습니다` : "사망자가 발생했습니다"}
            </div>
            <div className="text-xs text-red-700">
              생존자들이 재논의 후 다시 투표로 진행합니다
            </div>
          </div>
        </div>
      )}
      
      {/* 동점 재논의 */}
      {isTieVote && (
        <div className="p-3 rounded-xl bg-orange-50 border-2 border-orange-200 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-orange-800 mb-1">동점 발생</div>
            <div className="text-xs text-orange-700">
              최다 득표자가 여러명 발생했습니다. 재논의 후 다시 투표합니다
            </div>
          </div>
        </div>
      )}
      
      {/* 일반 토론 */}
      {phase === "DISCUSS" && (
        <div className="p-3 rounded-xl bg-blue-50 border-2 border-blue-200 flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div className="flex-1">
            <div className="text-xs text-blue-700">
              시간이 끝나면 자동으로 투표 단계로 이동하거나, 방장이 투표 시작 버튼을 눌러야 합니다
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
