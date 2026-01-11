// 랭킹 포디엄 컴포넌트 (메달 시상식 스타일)

import type { Member } from "../types";

type RankingPodiumProps = {
  rankedGroups: {
    first: (Member & { age: number })[];
    second: (Member & { age: number })[];
    third: (Member & { age: number })[];
  };
  onOpen: (memberId: string) => void;
};

export function RankingPodium({ rankedGroups, onOpen }: RankingPodiumProps) {
  const { first, second, third } = rankedGroups;
  
  if (first.length === 0 && second.length === 0 && third.length === 0) return null;

  const firstMember = first[0];
  const secondMember = second[0];
  const thirdMember = third[0];

  return (
    <section className="rounded-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm shadow-xl p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-center mb-6">
        <div className="text-2xl font-bold bg-gradient-to-r from-yellow-600 via-amber-500 to-orange-600 bg-clip-text text-transparent flex items-center gap-3">
          <span className="text-3xl">🏆</span>
          <span>포인트 랭킹 TOP 3</span>
        </div>
      </div>

      <div className="flex items-end justify-center gap-4 px-4">
        {/* 2등 (왼쪽) */}
        {secondMember && (
          <div className="flex flex-col items-center flex-1 max-w-[200px]">
            <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
              {second.map((member, idx) => (
                <div
                  key={member.id}
                  className="flex flex-col items-center cursor-pointer group transition-all duration-300 hover:scale-105"
                  onClick={() => onOpen(member.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onOpen(member.id);
                  }}
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-slate-300 bg-gradient-to-br from-slate-100 to-slate-200 shadow-xl group-hover:shadow-2xl group-hover:border-slate-400 transition-all duration-300 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                    </div>
                    {idx === 0 && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white font-bold text-xs shadow-lg border-2 border-white">
                        2
                      </div>
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-700 mt-1 truncate max-w-[60px]">
                    {member.name}
                  </div>
                </div>
              ))}
            </div>
            <div className="w-full h-32 rounded-t-2xl bg-gradient-to-b from-slate-300 to-slate-400 border-4 border-slate-400 shadow-lg flex flex-col items-center justify-end pb-3 mb-2">
              <div className="text-white font-bold text-xs mb-1 px-2 text-center leading-tight">
                {second.map((m, i) => (
                  <span key={m.id}>
                    {m.name}
                    {i < second.length - 1 && ", "}
                  </span>
                ))}
              </div>
              <div className="text-white font-bold text-sm">
                {(secondMember.totalPoints ?? 0).toLocaleString()}P
              </div>
            </div>
            <div className="text-xs font-bold text-slate-600 mt-1">
              {(secondMember.totalPoints ?? 0).toLocaleString()}점
            </div>
          </div>
        )}

        {/* 1등 (가운데, 가장 높음) */}
        {firstMember && (
          <div className="flex flex-col items-center flex-1 max-w-[250px]">
            <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
              {first.map((member, idx) => (
                <div
                  key={member.id}
                  className="flex flex-col items-center cursor-pointer group transition-all duration-300 hover:scale-105"
                  onClick={() => onOpen(member.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onOpen(member.id);
                  }}
                >
                  <div className="relative">
                    <div className={`rounded-full border-4 border-yellow-400 bg-gradient-to-br from-yellow-200 to-amber-200 shadow-2xl group-hover:shadow-[0_0_30px_rgba(251,191,36,0.6)] group-hover:border-yellow-300 transition-all duration-300 overflow-hidden relative ${first.length > 1 ? "w-20 h-20" : "w-32 h-32"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-yellow-300/20" />
                    </div>
                    {idx === 0 && (
                      <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white font-bold shadow-xl border-4 border-white animate-pulse ${first.length > 1 ? "w-12 h-12" : "w-16 h-16"}`}>
                        <span className={first.length > 1 ? "text-xl" : "text-3xl"}>👑</span>
                      </div>
                    )}
                  </div>
                  <div className={`font-bold text-slate-700 mt-1 truncate max-w-[70px] ${first.length > 1 ? "text-xs" : "text-sm"}`}>
                    {member.name}
                  </div>
                </div>
              ))}
            </div>
            <div className="w-full h-40 rounded-t-2xl bg-gradient-to-b from-yellow-400 via-amber-400 to-orange-400 border-4 border-yellow-500 shadow-2xl flex flex-col items-center justify-end pb-4 mb-2 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-yellow-600/30 to-transparent" />
              <div className="relative z-10 text-white font-bold text-xs mb-1 px-2 text-center leading-tight">
                {first.map((m, i) => (
                  <span key={m.id}>
                    {m.name}
                    {i < first.length - 1 && ", "}
                  </span>
                ))}
              </div>
              <div className="relative z-10 text-white font-bold text-lg">
                {(firstMember.totalPoints ?? 0).toLocaleString()}P
              </div>
            </div>
            <div className="text-sm font-bold text-yellow-700 mt-1">
              {(firstMember.totalPoints ?? 0).toLocaleString()}점
            </div>
          </div>
        )}

        {/* 3등 (오른쪽) */}
        {thirdMember && (
          <div className="flex flex-col items-center flex-1 max-w-[200px]">
            <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
              {third.map((member, idx) => (
                <div
                  key={member.id}
                  className="flex flex-col items-center cursor-pointer group transition-all duration-300 hover:scale-105"
                  onClick={() => onOpen(member.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onOpen(member.id);
                  }}
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-amber-600 bg-gradient-to-br from-amber-200 to-orange-200 shadow-xl group-hover:shadow-2xl group-hover:border-amber-500 transition-all duration-300 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                    </div>
                    {idx === 0 && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center text-white font-bold text-xs shadow-lg border-2 border-white">
                        3
                      </div>
                    )}
                  </div>
                  <div className="text-xs font-bold text-amber-700 mt-1 truncate max-w-[60px]">
                    {member.name}
                  </div>
                </div>
              ))}
            </div>
            <div className="w-full h-28 rounded-t-2xl bg-gradient-to-b from-amber-500 to-orange-500 border-4 border-amber-600 shadow-lg flex flex-col items-center justify-end pb-3 mb-2">
              <div className="text-white font-bold text-xs mb-1 px-2 text-center leading-tight">
                {third.map((m, i) => (
                  <span key={m.id}>
                    {m.name}
                    {i < third.length - 1 && ", "}
                  </span>
                ))}
              </div>
              <div className="text-white font-bold text-sm">
                {(thirdMember.totalPoints ?? 0).toLocaleString()}P
              </div>
            </div>
            <div className="text-xs font-bold text-amber-700 mt-1">
              {(thirdMember.totalPoints ?? 0).toLocaleString()}점
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-center gap-6 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 shadow-md" />
            <span className="font-semibold">1등</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 shadow-md" />
            <span className="font-semibold">2등</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-600 to-orange-600 shadow-md" />
            <span className="font-semibold">3등</span>
          </div>
        </div>
      </div>
    </section>
  );
}
