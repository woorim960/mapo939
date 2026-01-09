// 투표하러 가기 버튼 컴포넌트

type GoToVotingButtonProps = {
  joined: boolean;
  isHost: boolean;
  phase: string;
  busy: boolean;
  goVoteClicked: boolean;
  myVotedTargetId: string;
  onGoToVoting: () => void;
};

export function GoToVotingButton({
  joined,
  isHost,
  phase,
  busy,
  goVoteClicked,
  myVotedTargetId,
  onGoToVoting,
}: GoToVotingButtonProps) {
  const canShow = joined && isHost && (phase === "REVEAL" || phase === "DISCUSS" || phase === "TIE_DISCUSS" || phase === "VOTING");
  const isVoted = !!myVotedTargetId;
  const isDisabled = busy || goVoteClicked || isVoted;

  if (!canShow) return null;

  return (
    <section className="rounded-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm shadow-xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <button
        className={[
          "w-full rounded-xl px-4 py-3 text-base font-bold text-white shadow-lg transition-all duration-200",
          isDisabled
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-gradient-to-r from-rose-500 to-pink-500 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]",
        ].join(" ")}
        onClick={onGoToVoting}
        disabled={isDisabled}
        title="투표 단계로 전환"
      >
        {isVoted ? (
          <span className="flex items-center justify-center gap-2">
            <span>✅</span>
            <span>투표 완료</span>
          </span>
        ) : busy || goVoteClicked ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span>
            <span>투표 중...</span>
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <span>🗳️</span>
            <span>투표하러 가기</span>
          </span>
        )}
      </button>
      <div className="mt-3 text-xs text-center text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
        👑 방장 전용 기능
      </div>
    </section>
  );
}
