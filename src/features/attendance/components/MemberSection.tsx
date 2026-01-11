// 멤버 섹션 컴포넌트

import { MemberCard } from "./MemberCard";
import type { Member } from "../types";

type MemberSectionProps = {
  title: string;
  subtitle: string;
  members: (Member & { age: number })[];
  loading: boolean;
  isAdmin: boolean;
  onCheck: (memberId: string, status: "PRESENT" | "LATE") => void;
  onAddBonusPoints: (memberId: string, points: number, reason: string) => void;
  onAbsent: (memberId: string) => void;
  onOpen: (memberId: string) => void;
};

export function MemberSection({
  title,
  subtitle,
  members,
  loading,
  isAdmin,
  onCheck,
  onAddBonusPoints,
  onAbsent,
  onOpen,
}: MemberSectionProps) {
  return (
    <section className="rounded-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm shadow-xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
          <span>{title === "청년회" ? "👔" : "🎓"}</span>
          <span>{title}</span>
          <span className="text-xs text-gray-600 font-normal bg-clip-border">({subtitle})</span>
        </div>
        <div className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm shadow-sm">
          {members.length}명
        </div>
      </div>

      {/* 작은 화면: 2행 그리드 가로 스크롤 */}
      <div 
        className="md:hidden grid grid-rows-2 grid-flow-col gap-3 overflow-x-auto pb-4 scrollbar-hide"
        style={{ gridAutoColumns: '280px' }}
      >
        {members.map((m) => (
          <MemberCard
            key={m.id}
            member={m}
            loading={loading}
            isAdmin={isAdmin}
            onCheck={onCheck}
            onAddBonusPoints={onAddBonusPoints}
            onAbsent={onAbsent}
            onOpen={onOpen}
          />
        ))}

        {members.length === 0 && (
          <div className="col-span-full row-span-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center flex items-center justify-center">
            <div>
              <div className="text-4xl mb-2">👤</div>
              <div className="text-sm text-gray-500">멤버가 없습니다</div>
            </div>
          </div>
        )}
      </div>

      {/* 데스크톱: 가로 스크롤 */}
      <div className="hidden md:flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {members.map((m) => (
          <MemberCard
            key={m.id}
            member={m}
            loading={loading}
            isAdmin={isAdmin}
            onCheck={onCheck}
            onAddBonusPoints={onAddBonusPoints}
            onAbsent={onAbsent}
            onOpen={onOpen}
          />
        ))}

        {members.length === 0 && (
          <div className="w-full rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <div className="text-4xl mb-2">👤</div>
            <div className="text-sm text-gray-500">멤버가 없습니다</div>
          </div>
        )}
      </div>
    </section>
  );
}
