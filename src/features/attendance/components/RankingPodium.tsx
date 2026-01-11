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
    <section className="rounded-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm shadow-xl p-4 md:p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* 헤더 */}
      <div className="flex items-center justify-center mb-4">
        <div className="text-lg md:text-xl font-bold bg-gradient-to-r from-yellow-600 via-amber-500 to-orange-600 bg-clip-text text-transparent flex items-center gap-2">
          <span className="text-2xl md:text-3xl">🏆</span>
          <span>포인트 랭킹 TOP 3</span>
        </div>
      </div>

      {/* 컴팩트 메달 카드 */}
      <div className="space-y-2 md:space-y-3">
        {/* 1등 */}
        {firstMember && (
          <div
            className="flex items-center gap-3 md:gap-4 rounded-xl border-2 border-yellow-300/50 bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 p-3 md:p-4 h-[90px] md:h-[100px] hover:shadow-lg hover:scale-[1.01] transition-all duration-200 cursor-pointer group"
            onClick={() => onOpen(firstMember.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onOpen(firstMember.id);
            }}
          >
            {/* 왼쪽: 메달 */}
            <div className="flex-shrink-0">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg border-2 border-yellow-300">
                <span className="text-lg md:text-xl">🥇</span>
              </div>
            </div>

            {/* 중앙: 이름 목록 */}
            <div className="flex-1 min-w-0">
              {first.length > 1 ? (
                <>
                  <div className="text-[10px] md:text-xs font-semibold text-yellow-700 mb-1">공동 1등 ({first.length}명)</div>
                  <div className="text-sm md:text-base font-bold text-gray-800 truncate">
                    {first.map((m, i) => (
                      <span key={m.id}>
                        {m.name}
                        {i < first.length - 1 && <span className="text-gray-400 mx-1">·</span>}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-sm md:text-base font-bold text-gray-800">{firstMember.name}</div>
              )}
            </div>

            {/* 프로필 이미지 */}
            <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
              <div className="relative">
                <div className="flex -space-x-1.5 md:-space-x-2">
                  {first.slice(0, 3).map((member, idx) => (
                    <div
                      key={member.id}
                      className="relative w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white shadow-md overflow-hidden bg-white group-hover:scale-110 transition-transform duration-200"
                      style={{ zIndex: 3 - idx }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(member.id);
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {first.length > 3 && (
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white bg-gradient-to-br from-yellow-100 to-amber-100 flex items-center justify-center text-[10px] md:text-xs font-bold text-yellow-700 shadow-md">
                      +{first.length - 3}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 오른쪽: 점수 */}
            <div className="flex-shrink-0 text-right">
              <div className="flex items-baseline gap-1">
                <span className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                  {(firstMember.totalPoints ?? 0).toLocaleString()}
                </span>
                <span className="text-xs md:text-sm font-bold text-yellow-600">P</span>
              </div>
            </div>
          </div>
        )}

        {/* 2등 */}
        {secondMember && (
          <div
            className="flex items-center gap-3 md:gap-4 rounded-xl border-2 border-slate-300/50 bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50 p-3 md:p-4 h-[90px] md:h-[100px] hover:shadow-lg hover:scale-[1.01] transition-all duration-200 cursor-pointer group"
            onClick={() => onOpen(secondMember.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onOpen(secondMember.id);
            }}
          >
            {/* 왼쪽: 메달 */}
            <div className="flex-shrink-0">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center shadow-lg border-2 border-slate-300">
                <span className="text-lg md:text-xl">🥈</span>
              </div>
            </div>

            {/* 중앙: 이름 목록 */}
            <div className="flex-1 min-w-0">
              {second.length > 1 ? (
                <>
                  <div className="text-[10px] md:text-xs font-semibold text-slate-700 mb-1">공동 2등 ({second.length}명)</div>
                  <div className="text-sm md:text-base font-bold text-gray-800 truncate">
                    {second.map((m, i) => (
                      <span key={m.id}>
                        {m.name}
                        {i < second.length - 1 && <span className="text-gray-400 mx-1">·</span>}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-sm md:text-base font-bold text-gray-800">{secondMember.name}</div>
              )}
            </div>

            {/* 프로필 이미지 */}
            <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
              <div className="relative">
                <div className="flex -space-x-1.5 md:-space-x-2">
                  {second.slice(0, 3).map((member, idx) => (
                    <div
                      key={member.id}
                      className="relative w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white shadow-md overflow-hidden bg-white group-hover:scale-110 transition-transform duration-200"
                      style={{ zIndex: 3 - idx }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(member.id);
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {second.length > 3 && (
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white bg-gradient-to-br from-slate-100 to-gray-100 flex items-center justify-center text-[10px] md:text-xs font-bold text-slate-700 shadow-md">
                      +{second.length - 3}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 오른쪽: 점수 */}
            <div className="flex-shrink-0 text-right">
              <div className="flex items-baseline gap-1">
                <span className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-slate-600 to-gray-600 bg-clip-text text-transparent">
                  {(secondMember.totalPoints ?? 0).toLocaleString()}
                </span>
                <span className="text-xs md:text-sm font-bold text-slate-600">P</span>
              </div>
            </div>
          </div>
        )}

        {/* 3등 */}
        {thirdMember && (
          <div
            className="flex items-center gap-3 md:gap-4 rounded-xl border-2 border-amber-300/50 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-3 md:p-4 h-[90px] md:h-[100px] hover:shadow-lg hover:scale-[1.01] transition-all duration-200 cursor-pointer group"
            onClick={() => onOpen(thirdMember.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onOpen(thirdMember.id);
            }}
          >
            {/* 왼쪽: 메달 */}
            <div className="flex-shrink-0">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg border-2 border-amber-400">
                <span className="text-lg md:text-xl">🥉</span>
              </div>
            </div>

            {/* 중앙: 이름 목록 */}
            <div className="flex-1 min-w-0">
              {third.length > 1 ? (
                <>
                  <div className="text-[10px] md:text-xs font-semibold text-amber-700 mb-1">공동 3등 ({third.length}명)</div>
                  <div className="text-sm md:text-base font-bold text-gray-800 truncate">
                    {third.map((m, i) => (
                      <span key={m.id}>
                        {m.name}
                        {i < third.length - 1 && <span className="text-gray-400 mx-1">·</span>}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-sm md:text-base font-bold text-gray-800">{thirdMember.name}</div>
              )}
            </div>

            {/* 프로필 이미지 */}
            <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
              <div className="relative">
                <div className="flex -space-x-1.5 md:-space-x-2">
                  {third.slice(0, 3).map((member, idx) => (
                    <div
                      key={member.id}
                      className="relative w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white shadow-md overflow-hidden bg-white group-hover:scale-110 transition-transform duration-200"
                      style={{ zIndex: 3 - idx }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(member.id);
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {third.length > 3 && (
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-[10px] md:text-xs font-bold text-amber-700 shadow-md">
                      +{third.length - 3}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 오른쪽: 점수 */}
            <div className="flex-shrink-0 text-right">
              <div className="flex items-baseline gap-1">
                <span className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  {(thirdMember.totalPoints ?? 0).toLocaleString()}
                </span>
                <span className="text-xs md:text-sm font-bold text-amber-600">P</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
