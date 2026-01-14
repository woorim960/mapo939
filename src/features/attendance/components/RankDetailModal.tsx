// 랭크 상세 정보 모달 컴포넌트

"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/shared/components/Modal";
import { fetchMemberStats } from "../api";
import { fmtYmd, fmtYmdHm, pct } from "../utils";
import type { Member, MemberStats } from "../types";

type RankDetailModalProps = {
  open: boolean;
  onClose: () => void;
  members: (Member & { age: number })[];
  rank: number;
  points: number;
  isAdmin: boolean;
  onMemberClick: (memberId: string) => void;
};

export function RankDetailModal({
  open,
  onClose,
  members,
  rank,
  points,
  isAdmin,
  onMemberClick,
}: RankDetailModalProps) {
  const [memberStatsList, setMemberStatsList] = useState<(MemberStats | null)[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && members.length > 0) {
      loadMemberStats();
    } else {
      setMemberStatsList([]);
    }
  }, [open, members]);

  const loadMemberStats = async () => {
    try {
      setLoading(true);
      const statsPromises = members.map((member) => fetchMemberStats(member.id));
      const stats = await Promise.all(statsPromises);
      setMemberStatsList(stats);
    } catch (error) {
      console.error("Failed to load member stats:", error);
      setMemberStatsList(members.map(() => null));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const medalIcon = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
  const rankColors = {
    1: {
      border: "border-yellow-300",
      bg: "bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50",
      text: "text-yellow-700",
      badge: "bg-gradient-to-br from-yellow-400 to-amber-500",
    },
    2: {
      border: "border-slate-300",
      bg: "bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50",
      text: "text-slate-700",
      badge: "bg-gradient-to-br from-slate-400 to-slate-500",
    },
    3: {
      border: "border-amber-300",
      bg: "bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50",
      text: "text-amber-700",
      badge: "bg-gradient-to-br from-amber-500 to-orange-500",
    },
  };

  const colors = rankColors[rank as keyof typeof rankColors] || rankColors[2];

  return (
    <Modal onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full ${colors.badge} flex items-center justify-center shadow-lg border-2 ${colors.border}`}>
              <span className="text-2xl">{medalIcon}</span>
            </div>
            <div>
              <div className="text-lg font-bold bg-gradient-to-r from-yellow-600 via-amber-500 to-orange-600 bg-clip-text text-transparent">
                {rank}등 상세 정보
              </div>
              <div className="text-sm text-gray-600">
                {members.length}명 · {points.toLocaleString()}P
              </div>
            </div>
          </div>
          <button
            type="button"
            className="text-xs px-2 py-1 rounded-md text-gray-600 hover:bg-white/50 hover:text-gray-800 transition-colors"
            onClick={onClose}
            aria-label="닫기"
          >
            ✕ 닫기
          </button>
        </div>

        {loading ? (
          <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <span className="text-4xl animate-spin">⏳</span>
              <p className="text-sm font-medium text-gray-600">불러오는 중...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {members.map((member, index) => {
              const stats = memberStatsList[index];
              return (
                <div
                  key={member.id}
                  className="rounded-xl border-2 border-white/50 bg-white/80 backdrop-blur-sm p-4 shadow-lg hover:shadow-xl transition-all cursor-pointer"
                  onClick={() => {
                    onMemberClick(member.id);
                    onClose();
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* 프로필 이미지 */}
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-xl border-2 border-white shadow-md overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={member.photoUrl}
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    {/* 멤버 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-lg font-bold text-gray-800">{member.name}</div>
                        <div className="text-xs text-gray-500">{member.age}세</div>
                      </div>

                      {stats ? (
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-xs text-gray-600 mb-1">누적 총 포인트</div>
                            <div className="font-bold text-purple-600">
                              {stats.points.total.toLocaleString()}P
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600 mb-1">올해 총 포인트</div>
                            <div className="font-bold text-purple-600">
                              {stats.points.yearTotal.toLocaleString()}P
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600 mb-1">이번달 출석</div>
                            <div className="font-bold text-emerald-600">
                              {stats.attendance.month.present}회
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600 mb-1">이번달 출석율</div>
                            <div className="font-bold text-emerald-600">
                              {pct(stats.attendance.month.rate)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">정보를 불러올 수 없습니다.</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
