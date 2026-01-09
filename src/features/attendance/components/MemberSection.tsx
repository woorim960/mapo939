// 멤버 섹션 컴포넌트

import { MemberCard } from "./MemberCard";
import type { Member } from "../types";

type MemberSectionProps = {
  title: string;
  subtitle: string;
  members: (Member & { age: number })[];
  loading: boolean;
  onCheck: (memberId: string, status: "PRESENT" | "LATE") => void;
  onAbsent: (memberId: string) => void;
  onOpen: (memberId: string) => void;
};

export function MemberSection({
  title,
  subtitle,
  members,
  loading,
  onCheck,
  onAbsent,
  onOpen,
}: MemberSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="text-sm text-neutral-500">{subtitle}</div>
        </div>
        <div className="text-sm text-neutral-600">인원: {members.length}명</div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {members.map((m) => (
          <MemberCard
            key={m.id}
            member={m}
            loading={loading}
            onCheck={onCheck}
            onAbsent={onAbsent}
            onOpen={onOpen}
          />
        ))}

        {members.length === 0 && (
          <div className="rounded-2xl border p-4 text-sm text-neutral-600">멤버가 없습니다.</div>
        )}
      </div>
    </section>
  );
}
