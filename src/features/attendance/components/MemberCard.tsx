// 멤버 카드 컴포넌트

import { fmtYmd, todayLabel, badgeTone } from "../utils";
import type { Member } from "../types";

type MemberCardProps = {
  member: Member & { age: number };
  loading: boolean;
  onCheck: (memberId: string, status: "PRESENT" | "LATE") => void;
  onAbsent: (memberId: string) => void;
  onOpen: (memberId: string) => void;
};

export function MemberCard({ member, loading, onCheck, onAbsent, onOpen }: MemberCardProps) {
  return (
    <div className="w-[280px] shrink-0 rounded-2xl border bg-white p-3 shadow-sm">
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
        <div className="relative">
          <div className="h-40 w-full overflow-hidden rounded-2xl border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={member.photoUrl} alt="" className="h-full w-full object-cover" />
          </div>

          <div
            className={[
              "absolute right-3 top-3 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur",
              badgeTone(member.todayStatus),
            ].join(" ")}
          >
            {todayLabel(member.todayStatus)}
          </div>

          <div className="absolute -bottom-5 left-3 h-14 w-14 overflow-hidden rounded-full border bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={member.photoUrl} alt="" className="h-full w-full object-cover" />
          </div>
        </div>

        <div className="mt-7">
          <div className="text-base font-semibold">{member.name}</div>
          <div className="text-sm text-neutral-600">
            {member.age}세 · {fmtYmd(member.birthDate)}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Pill label="출석 포인트" value={`${(member.totalPoints ?? 0).toLocaleString()}P`} />
            <Pill label="올해 출석" value={`${member.yearAttendanceCount}회`} />
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={(e) => {
            e.stopPropagation();
            onCheck(member.id, "PRESENT");
          }}
          className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-50"
        >
          출석
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={(e) => {
            e.stopPropagation();
            onCheck(member.id, "LATE");
          }}
          className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-50"
        >
          지각
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={(e) => {
            e.stopPropagation();
            onAbsent(member.id);
          }}
          className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-50"
        >
          결석
        </button>
      </div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
      <span className="text-neutral-500">{label}</span>
      <span className="font-semibold text-neutral-900">{value}</span>
    </span>
  );
}
