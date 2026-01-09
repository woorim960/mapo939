// 게임 헤더 컴포넌트

import type { PublicState, Phase } from "../types";
import { phaseLabel, getPhaseTheme, getRoleColor } from "../utils";

type GameHeaderProps = {
  publicState: PublicState | null;
  phaseKo: string;
  joined: boolean;
  spectatorLocked: boolean;
  meRoleKo: string;
  isAliveMe: boolean;
  onResetAll: () => void;
  onShowHowTo: () => void;
  busy: boolean;
};

function PhaseIcon({ phase }: { phase: Phase }) {
  switch (phase) {
    case "LOBBY":
    case "PREP":
      return <span className="text-xs">👥</span>;
    case "ANSWERING":
      return <span className="text-xs">✍️</span>;
    case "REVEAL":
      return <span className="text-xs">🎴</span>;
    case "DISCUSS":
    case "TIE_DISCUSS":
      return <span className="text-xs">💬</span>;
    case "VOTING":
      return <span className="text-xs">🗳️</span>;
    case "RESULT":
      return <span className="text-xs">📊</span>;
    case "GAME_OVER":
      return <span className="text-xs">🏆</span>;
    default:
      return <span className="text-xs">•</span>;
  }
}

export function GameHeader({
  publicState,
  phaseKo,
  joined,
  spectatorLocked,
  meRoleKo,
  isAliveMe,
  onResetAll,
  onShowHowTo,
  busy,
}: GameHeaderProps) {
  const joinedCount = publicState?.players.length ?? 0;
  const aliveCount = publicState?.players.filter((p) => p.isAlive).length ?? 0;
  const phase = publicState?.phase ?? "LOBBY";
  const theme = getPhaseTheme(phase);
  const roleColor = getRoleColor(joined && meRoleKo !== "미공개" ? (meRoleKo as any) : null);

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            className="text-xs px-2 py-1 rounded-md text-gray-600 hover:bg-white/50 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onResetAll}
            disabled={busy}
            title="닉네임/점수/게임상태까지 모두 삭제"
          >
            🔄 전체 초기화
          </button>

          <button
            type="button"
            className="text-xs px-2 py-1 rounded-md text-gray-600 hover:bg-white/50 hover:text-gray-800 transition-colors"
            onClick={onShowHowTo}
            title="게임 방법 보기"
          >
            ❓ 게임 방법
          </button>
        </div>

        <div className="text-[11px] text-gray-500 bg-white/60 px-2 py-1 rounded-md">v{publicState?.version ?? 0}</div>
      </div>

      <header className="rounded-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm shadow-xl p-5 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            🎭 라이어 게임
          </h1>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${theme.badgeBg} ${theme.badgeColor} font-semibold text-sm shadow-sm animate-in zoom-in duration-300`}>
            <PhaseIcon phase={phase} />
            <span>{phaseKo}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="flex items-center gap-2 bg-blue-50/80 rounded-lg px-3 py-2">
            <span className="text-lg">👥</span>
            <div className="flex-1">
              <div className="text-xs text-gray-600">참여</div>
              <div className="text-lg font-bold text-blue-700">{joinedCount}명</div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-green-50/80 rounded-lg px-3 py-2">
            <span className="text-lg">❤️</span>
            <div className="flex-1">
              <div className="text-xs text-gray-600">생존</div>
              <div className="text-lg font-bold text-green-700">{aliveCount}명</div>
            </div>
          </div>
        </div>

        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${roleColor.bg} border ${roleColor.border} transition-all duration-300`}>
          <span className="text-sm font-medium text-gray-700">내 상태:</span>
          <span className={`font-bold text-sm ${roleColor.text}`}>
            {joined ? (
              <>
                ✅ 참가
                {meRoleKo !== "미공개" && (
                  <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs ${roleColor.bg} ${roleColor.text} border ${roleColor.border}`}>
                    {meRoleKo}
                  </span>
                )}
              </>
            ) : spectatorLocked ? (
              "👁️ 관전(참여 불가)"
            ) : (
              "⏳ 미참가"
            )}
          </span>
          {joined && !isAliveMe && (
            <span className="ml-auto px-2 py-0.5 rounded-full text-xs bg-gray-800 text-white font-semibold animate-pulse">
              💀 사망
            </span>
          )}
        </div>
      </header>
    </>
  );
}
