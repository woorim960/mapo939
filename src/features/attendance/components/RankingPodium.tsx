// 랭킹 포디엄 컴포넌트 (메달 시상식 스타일)

import { useEffect, useRef, useState } from "react";
import type { Member } from "../types";

type RankingPodiumProps = {
  rankedGroups: {
    first: (Member & { age: number })[];
    second: (Member & { age: number })[];
    third: (Member & { age: number })[];
  };
  onOpen: (memberId: string) => void;
  onRankClick?: (members: (Member & { age: number })[], rank: number, points: number) => void;
};

type RankCardProps = {
  members: (Member & { age: number })[];
  rank: 1 | 2 | 3;
  medalIcon: string;
  colors: {
    border: string;
    bg: string;
    text: string;
    badge: string;
    points: string;
  };
  onOpen: (memberId: string) => void;
  onRankClick?: (members: (Member & { age: number })[], rank: number, points: number) => void;
};

function RankCard({ members, rank, medalIcon, colors, onOpen, onRankClick }: RankCardProps) {
  const nameRef = useRef<HTMLDivElement>(null);
  const [isTextOverflowing, setIsTextOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (nameRef.current) {
        // line-clamp-2가 적용된 요소에서 텍스트가 잘렸는지 확인
        // scrollHeight가 clientHeight보다 크면 텍스트가 잘린 것 (2줄을 넘음)
        const element = nameRef.current;
        const hasOverflow = element.scrollHeight > element.clientHeight + 2; // 2px 여유 (라인 간격 고려)
        setIsTextOverflowing(hasOverflow);
      }
    };

    // 초기 확인 (약간의 지연을 주어 DOM이 완전히 렌더링된 후 확인)
    const timeoutId1 = setTimeout(checkOverflow, 50);
    const timeoutId2 = setTimeout(checkOverflow, 200); // 추가 확인 (폰트 로딩 등 고려)
    
    // ResizeObserver를 사용하여 더 정확하게 감지
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(checkOverflow, 0);
    });

    if (nameRef.current) {
      resizeObserver.observe(nameRef.current);
    }

    // 윈도우 리사이즈 이벤트도 추가 (백업)
    window.addEventListener("resize", checkOverflow);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", checkOverflow);
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
    };
  }, [members]);

  if (members.length === 0) return null;

  const firstMember = members[0];
  const showCompactProfile = isTextOverflowing;

  const handleCardClick = () => {
    if (onRankClick) {
      onRankClick(members, rank, firstMember.totalPoints ?? 0);
    } else {
      onOpen(firstMember.id);
    }
  };

  return (
    <div
      className={`flex items-center gap-3 md:gap-4 rounded-xl border-2 ${colors.border} ${colors.bg} p-3 md:p-4 h-[90px] md:h-[100px] hover:shadow-lg hover:scale-[1.01] transition-all duration-200 cursor-pointer group`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleCardClick();
        }
      }}
    >
      {/* 왼쪽: 메달 */}
      <div className="flex-shrink-0">
        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full ${colors.badge} flex items-center justify-center shadow-lg border-2 ${colors.border}`}>
          <span className="text-lg md:text-xl">{medalIcon}</span>
        </div>
      </div>

      {/* 중앙: 이름 목록 */}
      <div className="flex-1 min-w-0 max-w-[50%]">
        {members.length > 1 ? (
          <>
            <div className={`text-[10px] md:text-xs font-semibold ${colors.text} mb-1`}>
              공동 {rank}등 ({members.length}명)
            </div>
            <div
              ref={nameRef}
              className="text-sm md:text-base font-bold text-gray-800 line-clamp-2 break-words"
            >
              {members.slice(0, 4).map((m, i) => (
                <span key={m.id}>
                  {m.name}
                  {i < Math.min(members.length, 4) - 1 && <span className="text-gray-400 mx-1">·</span>}
                </span>
              ))}
              {members.length > 4 && (
                <span className="text-gray-500 font-medium"> 외 {members.length - 4}명</span>
              )}
            </div>
          </>
        ) : (
          <div className="text-sm md:text-base font-bold text-gray-800 truncate">{firstMember.name}</div>
        )}
      </div>

      {/* 프로필 이미지 + 점수 (우측 끝 정렬) */}
      <div className="flex items-center gap-3 md:gap-4 flex-shrink-0 ml-auto">
        {/* 프로필 이미지 */}
        <div className="flex items-center gap-1.5 md:gap-2">
          <div className="relative">
            <div className="flex -space-x-1.5 md:-space-x-2">
              {showCompactProfile ? (
                <>
                  {/* 텍스트가 잘려서 "..."으로 표시되는 경우: 첫 번째 프로필만 표시 */}
                  <div
                    className="relative w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white shadow-md overflow-hidden bg-white group-hover:scale-110 transition-transform duration-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(members[0].id);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={members[0].photoUrl} alt={members[0].name} className="w-full h-full object-cover" />
                  </div>
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white ${colors.badge} flex items-center justify-center text-[9px] md:text-[10px] font-bold ${colors.text} shadow-md`}>
                    +{members.length - 1}명
                  </div>
                </>
              ) : (
                <>
                  {/* 텍스트가 잘리지 않음: 최대 3개까지 표시 */}
                  {members.slice(0, 3).map((member, idx) => (
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
                  {members.length > 3 && (
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white ${colors.badge} flex items-center justify-center text-[10px] md:text-xs font-bold ${colors.text} shadow-md`}>
                      +{members.length - 3}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* 점수 */}
        <div className="flex-shrink-0 text-right">
          <div className="flex items-baseline gap-1">
            <span className={`text-xl md:text-2xl font-extrabold ${colors.points} bg-clip-text text-transparent`}>
              {(firstMember.totalPoints ?? 0).toLocaleString()}
            </span>
            <span className={`text-xs md:text-sm font-bold ${colors.text}`}>P</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RankingPodium({ rankedGroups, onOpen, onRankClick }: RankingPodiumProps) {
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
        <RankCard
          members={first}
          rank={1}
          medalIcon="🥇"
          colors={{
            border: "border-yellow-300/50",
            bg: "bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50",
            text: "text-yellow-700",
            badge: "bg-gradient-to-br from-yellow-400 to-amber-500 border-yellow-300",
            points: "bg-gradient-to-r from-yellow-600 to-amber-600",
          }}
          onOpen={onOpen}
          onRankClick={onRankClick}
        />

        {/* 2등 */}
        <RankCard
          members={second}
          rank={2}
          medalIcon="🥈"
          colors={{
            border: "border-slate-300/50",
            bg: "bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50",
            text: "text-slate-700",
            badge: "bg-gradient-to-br from-slate-400 to-slate-500 border-slate-300",
            points: "bg-gradient-to-r from-slate-600 to-gray-600",
          }}
          onOpen={onOpen}
          onRankClick={onRankClick}
        />

        {/* 3등 */}
        <RankCard
          members={third}
          rank={3}
          medalIcon="🥉"
          colors={{
            border: "border-amber-300/50",
            bg: "bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50",
            text: "text-amber-700",
            badge: "bg-gradient-to-br from-amber-500 to-orange-500 border-amber-400",
            points: "bg-gradient-to-r from-amber-600 to-orange-600",
          }}
          onOpen={onOpen}
          onRankClick={onRankClick}
        />
      </div>
    </section>
  );
}
