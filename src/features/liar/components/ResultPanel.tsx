// 결과 패널 컴포넌트

type ResultPanelProps = {
  eliminatedName: string | null;
  lastEliminatedWasTroll: boolean;
  lastEliminatedRole: "AUDIENCE" | "LIAR" | "TROLL" | null;
  joined: boolean;
  isAliveMe: boolean;
  busy: boolean;
  onFinalize: () => void;
};

export function ResultPanel({
  eliminatedName,
  lastEliminatedWasTroll,
  lastEliminatedRole,
  joined,
  isAliveMe,
  busy,
  onFinalize,
}: ResultPanelProps) {
  return (
    <section className="rounded-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm shadow-xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="text-lg font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
        <span>📊</span>
        <span>결과</span>
      </div>

      <div className={[
        "p-4 rounded-xl border-2 transition-all duration-300",
        lastEliminatedWasTroll
          ? "bg-gradient-to-r from-orange-50 to-red-50 border-orange-300"
          : "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300",
      ].join(" ")}>
        <div className="flex items-center gap-3">
          <div className={[
            "w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-lg",
            lastEliminatedWasTroll ? "bg-gradient-to-br from-orange-400 to-red-500" : "bg-gradient-to-br from-gray-400 to-slate-500",
          ].join(" ")}>
            {lastEliminatedWasTroll ? "🤡" : "💀"}
          </div>
          <div className="flex-1">
            <div className="text-xs text-gray-600 mb-1">탈락자</div>
            <div className="text-xl font-bold text-gray-800">
              {eliminatedName ?? "미정"}
            </div>
            {eliminatedName && lastEliminatedRole && (
              <div className={[
                "mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-semibold",
                lastEliminatedRole === "TROLL"
                  ? "bg-orange-200 text-orange-800"
                  : lastEliminatedRole === "LIAR"
                  ? "bg-red-200 text-red-800"
                  : "bg-blue-200 text-blue-800",
              ].join(" ")}>
                {lastEliminatedRole === "TROLL" 
                  ? "🤡 트롤" 
                  : lastEliminatedRole === "LIAR"
                  ? "🎭 라이어"
                  : "👥 관객"}
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        className={[
          "w-full rounded-xl px-4 py-3 text-base font-bold text-white shadow-lg transition-all duration-200",
          (busy || !joined || !isAliveMe)
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-gradient-to-r from-violet-500 to-purple-500 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]",
        ].join(" ")}
        onClick={onFinalize}
        disabled={busy || !joined || !isAliveMe}
      >
        {busy ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span>
            <span>처리 중...</span>
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <span>✅</span>
            <span>결과 확정</span>
          </span>
        )}
      </button>

      {!joined && (
        <div className="p-3 rounded-xl bg-gray-50 border-2 border-gray-200 flex items-center gap-2">
          <span className="text-xl">👁️</span>
          <div className="text-sm text-gray-700">관전 중에는 결과 확정을 누를 수 없어요</div>
        </div>
      )}
    </section>
  );
}
