// 멤버 카드 컴포넌트

import { useState } from "react";
import { fmtYmd, todayLabel, badgeTone } from "../utils";
import type { Member } from "../types";

type MemberCardProps = {
  member: Member & { age: number };
  loading: boolean;
  isAdmin: boolean;
  onCheck: (memberId: string, status: "PRESENT" | "LATE") => void;
  onAddBonusPoints: (memberId: string, points: number, reason: string) => void;
  onAbsent: (memberId: string) => void;
  onOpen: (memberId: string) => void;
};

export function MemberCard({ member, loading, isAdmin, onCheck, onAddBonusPoints, onAbsent, onOpen }: MemberCardProps) {
  const [showPointsInput, setShowPointsInput] = useState(false);
  const [pointsInput, setPointsInput] = useState("");
  const [reasonInput, setReasonInput] = useState("");

  function handleBonusPointsSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    
    const points = Number.parseInt(pointsInput, 10);
    if (Number.isNaN(points) || points < 0) {
      alert("올바른 점수를 입력해주세요.");
      return;
    }

    if (!reasonInput.trim()) {
      alert("이유를 입력해주세요.");
      return;
    }

    onAddBonusPoints(member.id, points, reasonInput.trim());
    setShowPointsInput(false);
    setPointsInput("");
    setReasonInput("");
  }

  return (
    <div className="group w-[280px] shrink-0 rounded-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm p-3 md:p-4 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-200">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpen(member.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onOpen(member.id);
        }}
        className="w-full cursor-pointer text-left select-none"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        {/* 작은 화면: 컴팩트 레이아웃 */}
        <div className="md:hidden">
          <div className="flex items-start gap-3 mb-2">
            {/* 프로필 이미지 */}
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={member.photoUrl} alt="" className="w-full h-full object-cover" />
              </div>
              <div
                className={[
                  "absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold shadow-md",
                  badgeTone(member.todayStatus),
                ].join(" ")}
              >
                {todayLabel(member.todayStatus) === "출석" ? "✓" : todayLabel(member.todayStatus) === "지각" ? "⏰" : "○"}
              </div>
            </div>

            {/* 이름 및 정보 */}
            <div className="flex-1 min-w-0">
              <div className="text-base font-bold text-gray-800 mb-1 break-words">{member.name}</div>
              <div className="text-xs text-gray-600 mb-2">
                {member.age}세 · {fmtYmd(member.birthDate)}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Pill label="출석 포인트" value={`${(member.totalPoints ?? 0).toLocaleString()}P`} icon="star" />
                <Pill label="올해 출석" value={`${member.yearAttendanceCount}회`} icon="check" />
              </div>
            </div>
          </div>
        </div>

        {/* 데스크톱: 기존 레이아웃 */}
        <div className="hidden md:block">
          <div className="relative mb-4">
            <div className="h-40 w-full overflow-hidden rounded-xl border-2 border-white shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={member.photoUrl} alt="" className="h-full w-full object-cover" />
            </div>

            <div
              className={[
                "absolute right-2 top-2 rounded-full px-2.5 py-1 text-xs font-bold shadow-md backdrop-blur-sm",
                badgeTone(member.todayStatus),
              ].join(" ")}
            >
              {todayLabel(member.todayStatus)}
            </div>

            <div className="absolute -bottom-4 left-3 h-12 w-12 overflow-hidden rounded-full border-2 border-white shadow-lg bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={member.photoUrl} alt="" className="h-full w-full object-cover" />
            </div>
          </div>

          <div className="mt-8">
            <div className="text-lg font-bold text-gray-800 mb-1">{member.name}</div>
            <div className="text-xs text-gray-600 mb-3">
              {member.age}세 · {fmtYmd(member.birthDate)}
            </div>
            <div className="flex flex-wrap gap-2">
              <Pill label="출석 포인트" value={`${(member.totalPoints ?? 0).toLocaleString()}P`} icon="star" />
              <Pill label="올해 출석" value={`${member.yearAttendanceCount}회`} icon="check" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 md:mt-4 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={(e) => {
              e.stopPropagation();
              onCheck(member.id, "PRESENT");
            }}
            className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-2 py-2 text-xs font-bold text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✅ 출석
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={(e) => {
              e.stopPropagation();
              onCheck(member.id, "LATE");
            }}
            className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-2 text-xs font-bold text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⏰ 지각
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={(e) => {
              e.stopPropagation();
              onAbsent(member.id);
            }}
            className="rounded-lg border-2 border-gray-400 bg-white px-2 py-2 text-xs font-bold text-gray-800 hover:bg-gray-50 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ❌ 결석
          </button>
        </div>

        {isAdmin && (
          <>
            {!showPointsInput ? (
              <button
                type="button"
                disabled={loading}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPointsInput(true);
                }}
                className="w-full rounded-lg border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2 text-xs font-bold text-amber-700 hover:from-amber-100 hover:to-orange-100 hover:border-amber-400 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🎁 보너스 점수
              </button>
            ) : (
              <form
                onSubmit={handleBonusPointsSubmit}
                onClick={(e) => e.stopPropagation()}
                className="rounded-lg border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-3 space-y-2"
              >
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={pointsInput}
                  onChange={(e) => setPointsInput(e.target.value)}
                  placeholder="점수"
                  className="w-full rounded-lg border-2 border-amber-300 px-3 py-2 text-xs font-bold text-center outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all disabled:bg-gray-100 disabled:border-gray-300"
                  disabled={loading}
                  autoFocus
                />
                <input
                  type="text"
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="이유"
                  className="w-full rounded-lg border-2 border-amber-300 px-3 py-2 text-xs font-medium outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all disabled:bg-gray-100 disabled:border-gray-300"
                  disabled={loading}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPointsInput(false);
                      setPointsInput("");
                      setReasonInput("");
                    }}
                    className="flex-1 rounded-lg border-2 border-gray-400 bg-white px-2 py-1.5 text-xs font-bold text-gray-800 hover:bg-gray-50 transition-all duration-200"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-1.5 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    추가
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Pill({ label, value, icon }: { label: string; value: string; icon?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-700 border border-gray-200">
      <span className="text-gray-500">{label}:</span>
      <span className="font-bold text-gray-800">{value}</span>
    </span>
  );
}
