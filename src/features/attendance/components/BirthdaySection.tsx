// 생일자 섹션 컴포넌트

import { useMemo } from "react";
import { getAllMonthBirthdays } from "../utils";
import { BirthdayCard } from "./BirthdayCard";
import { CompactBirthdayCard } from "./CompactBirthdayCard";
import type { Member } from "../types";

type BirthdaySectionProps = {
  members: (Member & { age: number })[];
  onOpen: (memberId: string) => void;
};

export function BirthdaySection({ members, onOpen }: BirthdaySectionProps) {
  const monthGroups = useMemo(() => getAllMonthBirthdays(members), [members]);

  if (monthGroups.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm shadow-xl p-5 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent flex items-center gap-2">
          <span>🎂</span>
          <span>생일자</span>
        </div>
      </div>

      <div className="space-y-6">
        {monthGroups.map((group) => (
          <div key={group.month} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className={`text-base font-bold ${group.isCurrentMonth ? "text-gray-900" : "text-gray-600"}`}>
                  {group.monthName}
                </h3>
                {group.isCurrentMonth && (
                  <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 text-xs font-semibold border border-pink-200">
                    이번 달
                  </span>
                )}
              </div>
              <div className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
                {group.birthdays.length}명
              </div>
            </div>

            {group.isCurrentMonth ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.birthdays.map((birthday) => (
                  <BirthdayCard key={birthday.member.id} birthday={birthday} onOpen={onOpen} />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {group.birthdays.map((birthday) => (
                  <CompactBirthdayCard key={birthday.member.id} birthday={birthday} onOpen={onOpen} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
