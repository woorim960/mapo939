// 게임 종료 패널 컴포넌트

type GameOverPanelProps = {
  winnerNames: string[];
  championName: string | null;
};

export function GameOverPanel({ winnerNames, championName }: GameOverPanelProps) {
  return (
    <section className="rounded-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm shadow-xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 bg-clip-text text-transparent flex items-center gap-2">
        <span className="text-3xl">🏆</span>
        <span>게임 종료</span>
      </div>

      {winnerNames.length > 0 ? (
        <div className="p-5 rounded-xl bg-gradient-to-r from-yellow-50 via-orange-50 to-amber-50 border-2 border-yellow-300">
          <div className="text-sm font-semibold text-yellow-800 mb-2 flex items-center gap-2">
            <span>⭐</span>
            <span>승리팀</span>
          </div>
          <div className="text-xl font-bold text-gray-900">
            {winnerNames.map((name, idx) => (
              <span key={name}>
                <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  {name}
                </span>
                {idx < winnerNames.length - 1 && <span className="text-gray-400 mx-2">·</span>}
              </span>
            ))}
          </div>
        </div>
      ) : (
        championName && (
          <div className="p-5 rounded-xl bg-gradient-to-r from-purple-50 via-pink-50 to-rose-50 border-2 border-purple-300">
            <div className="text-sm font-semibold text-purple-800 mb-2 flex items-center gap-2">
              <span>👑</span>
              <span>우승자</span>
            </div>
            <div className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {championName}
            </div>
          </div>
        )
      )}

      <div className="p-3 rounded-xl bg-gray-50 border-2 border-gray-200 flex items-start gap-3">
        <span className="text-xl">⏰</span>
        <div className="text-xs text-gray-700">
          최종 우승자(300점 달성)가 있으면 잠시 후 자동으로 새 게임이 시작됩니다
        </div>
      </div>
    </section>
  );
}
