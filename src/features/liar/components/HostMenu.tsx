// 방장 메뉴 컴포넌트

import { useState, useEffect } from "react";
import type { Phase } from "../types";
import { parseNonNegativeInt } from "../utils";

type HostMenuProps = {
  joined: boolean;
  isHost: boolean;
  phase: Phase;
  joinedCount: number;
  busy: boolean;
  defaultRoleCounts: (n: number) => { liar: number; troll: number; audience: number };
  onStartGame: (roleCounts?: {
    liarCount?: number;
    trollCount?: number;
    audienceCount?: number;
  }) => void;
  onResetRound: () => void;
};

export function HostMenu({
  joined,
  isHost,
  phase,
  joinedCount,
  busy,
  defaultRoleCounts,
  onStartGame,
  onResetRound,
}: HostMenuProps) {
  const [roleLiarInput, setRoleLiarInput] = useState<string>("");
  const [roleTrollInput, setRoleTrollInput] = useState<string>("");
  const [roleAudienceInput, setRoleAudienceInput] = useState<string>("");
  const [roleConfigErr, setRoleConfigErr] = useState<string>("");
  const [resetClicked, setResetClicked] = useState(false);
  const [roleTouched, setRoleTouched] = useState<boolean>(false);

  // PREP에서만 자동 역할 기본값 채우기
  useEffect(() => {
    if (phase !== "PREP") return;
    if (roleTouched) return;

    const n = joinedCount;
    const base = defaultRoleCounts(n);
    setRoleLiarInput(String(base.liar));
    setRoleTrollInput(String(base.troll));
    setRoleAudienceInput(String(base.audience));
  }, [phase, joinedCount, roleTouched, defaultRoleCounts]);

  function buildRoleOverridePayload():
    | { liarCount?: number; trollCount?: number; audienceCount?: number }
    | null {
    setRoleConfigErr("");

    const liarN = parseNonNegativeInt(roleLiarInput);
    const trollN = parseNonNegativeInt(roleTrollInput);
    const audN = parseNonNegativeInt(roleAudienceInput);

    const allEmpty = liarN === null && trollN === null && audN === null;
    if (allEmpty) return {};

    const liar = liarN ?? 0;
    const troll = trollN ?? 0;
    const aud = audN ?? 0;

    const sum = liar + troll + aud;
    const limit = joinedCount;

    if (liar === 0) {
      setRoleConfigErr(`라이어는 1명 이상이어야 해요`);
      return null;
    }
    if (aud === 0) {
      setRoleConfigErr(`관객은 1명 이상이어야 해요`);
      return null;
    }
    if (sum > limit) {
      setRoleConfigErr(`역할 합(${sum})이 인원수(${limit})를 넘어요`);
      return null;
    }
    if (sum < limit) {
      setRoleConfigErr(`역할 합(${sum})이 인원수(${limit})보다 적어요`);
      return null;
    }
    if (liar >= aud) {
      setRoleConfigErr(`관객은 라이어보다 많아야 해요`);
      return null;
    }

    return { liarCount: liar, trollCount: troll, audienceCount: aud };
  }

  function handleStartGame() {
    const rolePayload = buildRoleOverridePayload();
    if (rolePayload === null) return;
    onStartGame(rolePayload);
  }

  if (!joined || !isHost) return null;

  return (
    <section className="rounded-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm shadow-xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
        <span>👑</span>
        <span>방장 메뉴</span>
      </div>

      <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-4">
        <div className="text-sm font-bold text-purple-800 mb-3 flex items-center gap-2">
          <span>🎭</span>
          <span>역할 설정</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label className="space-y-2">
            <div className="text-xs font-semibold text-red-700 flex items-center gap-1">
              <span>🎭</span>
              <span>라이어</span>
            </div>
            <input
              className="w-full rounded-lg border-2 border-red-300 px-3 py-2 text-base font-bold text-center outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all disabled:bg-gray-100 disabled:border-gray-300"
              value={roleLiarInput}
              onChange={(e) => {
                setRoleTouched(true);
                setRoleLiarInput(e.target.value);
              }}
              inputMode="numeric"
              placeholder="0"
              disabled={busy || phase !== "PREP"}
            />
          </label>

          <label className="space-y-2">
            <div className="text-xs font-semibold text-orange-700 flex items-center gap-1">
              <span>🤡</span>
              <span>트롤</span>
            </div>
            <input
              className="w-full rounded-lg border-2 border-orange-300 px-3 py-2 text-base font-bold text-center outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all disabled:bg-gray-100 disabled:border-gray-300"
              value={roleTrollInput}
              onChange={(e) => {
                setRoleTouched(true);
                setRoleTrollInput(e.target.value);
              }}
              inputMode="numeric"
              placeholder="0"
              disabled={busy || phase !== "PREP"}
            />
          </label>

          <label className="space-y-2">
            <div className="text-xs font-semibold text-blue-700 flex items-center gap-1">
              <span>👥</span>
              <span>관객</span>
            </div>
            <input
              className="w-full rounded-lg border-2 border-blue-300 px-3 py-2 text-base font-bold text-center outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-gray-100 disabled:border-gray-300"
              value={roleAudienceInput}
              onChange={(e) => {
                setRoleTouched(true);
                setRoleAudienceInput(e.target.value);
              }}
              inputMode="numeric"
              placeholder="0"
              disabled={busy || phase !== "PREP"}
            />
          </label>
        </div>

        <div className="mt-3 text-xs text-gray-600 bg-white/60 p-2 rounded-lg border border-purple-200">
          <div className="font-semibold mb-1">규칙</div>
          <div>• 0 이상 정수</div>
          <div>• 역할 합 = 인원수 ({joinedCount}명)</div>
        </div>

        <button
          type="button"
          className={`
            mt-3 w-full rounded-xl border-2 px-3 py-2 text-sm font-semibold
            transition-all duration-200
            ${resetClicked 
              ? "bg-purple-200 border-purple-300 scale-[0.97]" 
              : "bg-white border-purple-300 hover:bg-purple-50 hover:shadow-md"}
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          onClick={() => {
            const base = defaultRoleCounts(joinedCount);
            setResetClicked(true);
            setRoleTouched(false);
            setRoleLiarInput(String(base.liar));
            setRoleTrollInput(String(base.troll));
            setRoleAudienceInput(String(base.audience));
            setTimeout(() => setResetClicked(false), 300);
          }}
          disabled={busy || phase !== "PREP"}
        >
          {resetClicked ? "✅ 기본값 적용됨" : "🔄 기본값으로 되돌리기"}
        </button>

        {roleConfigErr && (
          <div className="mt-3 p-2 rounded-lg bg-red-50 border-2 border-red-200 flex items-center gap-2 animate-in slide-in-from-top-1 duration-200">
            <span className="text-lg">⚠️</span>
            <div className="text-xs font-semibold text-red-700">{roleConfigErr}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          className={[
            "rounded-xl px-4 py-3 text-base font-bold text-white shadow-lg transition-all duration-200",
            (busy || joinedCount < 3 || phase !== "PREP")
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]",
          ].join(" ")}
          onClick={handleStartGame}
          disabled={busy || joinedCount < 3 || phase !== "PREP"}
        >
          {busy ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span>
              <span>시작 중...</span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>게임 시작</span>
            </span>
          )}
        </button>

        <button
          className={[
            "rounded-xl border-2 px-4 py-3 text-base font-bold transition-all duration-200",
            busy
              ? "border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
              : "border-gray-400 bg-white text-gray-800 hover:bg-gray-50 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
          ].join(" ")}
          onClick={onResetRound}
          disabled={busy}
        >
          <span className="flex items-center justify-center gap-2">
            <span>이번판 초기화</span>
          </span>
        </button>
      </div>

      <div className="p-3 rounded-xl bg-blue-50 border-2 border-blue-200">
        <div className="text-xs text-blue-700">
          <span className="font-semibold">💡 참고:</span> 이번 판 초기화는 점수는 유지됩니다. (누군가 300점 달성 시 자동 새게임에서 점수가 초기화됩니다)
        </div>
      </div>
    </section>
  );
}
