// 최종 우승 축하 오버레이 컴포넌트

type FinalChampionOverlayProps = {
  names: string[];
  restartInSec: number | null;
};

export function FinalChampionOverlay({ names, restartInSec }: FinalChampionOverlayProps) {
  const title =
    names.length === 0
      ? "최종 우승!"
      : names.length === 1
        ? `🎉 최종 우승자는 ${names[0]} 입니다!`
        : `🎉 최종 우승자는 ${names.join(", ")} 입니다!`;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 px-4">
      {/* 배경 반짝이 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Sparkles />
      </div>

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-purple-700 via-fuchsia-600 to-amber-500 p-1 shadow-2xl">
        <div className="rounded-[22px] bg-black/20 backdrop-blur-md p-6 text-center">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-xs font-semibold text-white/90">
            🏆 FINAL CHAMPION
          </div>

          <div className="text-2xl font-extrabold tracking-tight text-white drop-shadow">{title}</div>

          <div className="mt-3 text-sm text-white/90">
            {restartInSec === null ? (
              "새 게임을 준비 중…"
            ) : (
              <>
                <span className="font-semibold">{restartInSec}초</span> 후 새 게임이 시작됩니다
              </>
            )}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <Badge text="✨ 축하해요" />
            <Badge text="🔥 300 달성" />
            <Badge text="🎊 새 게임 시작" />
          </div>

          <div className="mt-6 text-xs text-white/80">
            점수는 자동으로 초기화되고, 새 게임으로 이어집니다.
          </div>

          {/* 카드 내부 광원 효과 */}
          <div className="pointer-events-none absolute -inset-16 opacity-30 blur-3xl">
            <div className="h-40 w-40 animate-pulse rounded-full bg-white/50" />
          </div>
        </div>

        {/* 아래 움직이는 라인 */}
        <div className="absolute inset-x-0 bottom-0 h-1 animate-pulse bg-white/30" />
      </div>
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-white/15 px-2 py-2 text-[11px] font-semibold text-white/90">{text}</div>
  );
}

function Sparkles() {
  const items = Array.from({ length: 18 }).map((_, i) => i);
  return (
    <>
      {items.map((i) => (
        <span
          key={i}
          className="absolute h-1.5 w-1.5 animate-[sparkle_1.8s_ease-in-out_infinite] rounded-full bg-white/80"
          style={{
            left: `${(i * 37) % 100}%`,
            top: `${(i * 53) % 100}%`,
            animationDelay: `${(i % 9) * 0.12}s`,
            opacity: 0.7,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes sparkle {
          0%,
          100% {
            transform: translateY(0) scale(1);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-10px) scale(1.6);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
