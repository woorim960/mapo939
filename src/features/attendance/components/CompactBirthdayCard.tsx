// 간략한 생일자 카드 컴포넌트 (이번 달이 아닌 경우)

import { fmtYmd } from "../utils";
import type { BirthdayMember } from "../utils";

type CompactBirthdayCardProps = {
  birthday: BirthdayMember;
  onOpen: (memberId: string) => void;
};

export function CompactBirthdayCard({ birthday, onOpen }: CompactBirthdayCardProps) {
  const { member, birthdayDate } = birthday;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(member.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen(member.id);
      }}
      className="group flex items-center gap-3 rounded-lg border border-neutral-200 bg-white/90 backdrop-blur-sm px-3 py-2 shadow-sm hover:border-neutral-300 hover:shadow-md hover:bg-white transition-all duration-200 cursor-pointer"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {/* 프로필 이미지 */}
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-neutral-200 transition-all">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={member.photoUrl} alt="" className="h-full w-full object-cover" />
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-neutral-900 text-sm truncate">{member.name}</div>
        <div className="text-xs text-neutral-500 font-medium">{fmtYmd(birthdayDate)}</div>
      </div>
    </div>
  );
}
