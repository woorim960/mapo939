// 생일자 카드 컴포넌트

import { fmtYmd } from "../utils";
import type { BirthdayMember } from "../utils";

type BirthdayCardProps = {
  birthday: BirthdayMember;
  onOpen: (memberId: string) => void;
};

export function BirthdayCard({ birthday, onOpen }: BirthdayCardProps) {
  const { member, birthdayDate, daysUntil, isToday, isThisWeek } = birthday;

  function getDaysUntilText(): string {
    if (isToday) return "오늘";
    if (daysUntil === 1) return "내일";
    if (daysUntil < 0) return `${Math.abs(daysUntil)}일 전`; // 이미 지난 경우
    return `${daysUntil}일 후`;
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(member.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen(member.id);
      }}
      className={`group rounded-xl border p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
        isToday
          ? "border-neutral-300 bg-neutral-50/90 backdrop-blur-sm hover:border-neutral-400"
          : "border-neutral-200 bg-white/90 backdrop-blur-sm hover:border-neutral-300"
      }`}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div className="flex items-center gap-4">
        {/* 프로필 이미지 */}
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-neutral-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={member.photoUrl} alt="" className="h-full w-full object-cover" />
        </div>

        {/* 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="font-semibold text-neutral-900 text-base truncate">{member.name}</div>
            <div
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isToday
                  ? "bg-amber-700 text-white"
                  : isThisWeek
                    ? "bg-slate-600 text-white"
                    : "bg-neutral-100 text-neutral-600 border border-neutral-200"
              }`}
            >
              {isToday ? "오늘" : isThisWeek ? "이번주" : getDaysUntilText()}
            </div>
          </div>
          <div className="text-sm text-neutral-600">
            {member.age}세 · {fmtYmd(birthdayDate)}
          </div>
        </div>
      </div>
    </div>
  );
}
