// 멤버 상세 모달 컴포넌트

"use client";

import { Modal } from "@/shared/components/Modal";
import { fmtYmd, fmtYmdHm, pct } from "../utils";
import { WatermelonConnection } from "./WatermelonConnection";
import type { MemberStats } from "../types";

type MemberModalProps = {
  memberStats: MemberStats | null;
  loading: boolean;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export function MemberModal({
  memberStats,
  loading,
  isAdmin,
  onEdit,
  onDelete,
  onClose,
}: MemberModalProps) {
  return (
    <Modal onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
            <span>📊</span>
            <span>개인 정보 / 통계</span>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && memberStats && (
              <>
                <button
                  type="button"
                  className="rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 px-3 py-1.5 text-xs font-bold text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  onClick={onEdit}
                >
                  ✏️ 수정
                </button>
                <button
                  type="button"
                  className="rounded-lg border-2 border-red-300 bg-white text-red-600 px-3 py-1.5 text-xs font-bold hover:bg-red-50 hover:border-red-400 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  onClick={onDelete}
                >
                  🗑️ 비활성화
                </button>
              </>
            )}
            <button
              type="button"
              className="text-xs px-2 py-1 rounded-md text-gray-600 hover:bg-white/50 hover:text-gray-800 transition-colors"
              onClick={onClose}
              aria-label="닫기"
            >
              ✕ 닫기
            </button>
          </div>
        </div>

        {loading || !memberStats ? (
          <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <span className="text-4xl animate-spin">⏳</span>
              <p className="text-sm font-medium text-gray-600">불러오는 중...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border-2 border-white/50 bg-white/80 backdrop-blur-sm p-5 shadow-xl">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-neutral-200">
                  <div className="h-24 w-24 overflow-hidden rounded-2xl border-2 border-white shadow-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={memberStats.member.photoUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="text-2xl font-bold text-neutral-900 mb-2">{memberStats.member.name}</div>
                    <div className="space-y-1">
                      <div className="text-sm text-neutral-600 font-medium flex items-center gap-2">
                        <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {memberStats.member.age}세 · {fmtYmd(memberStats.member.birthDate)}
                      </div>
                      <div className="text-sm text-neutral-600 font-medium flex items-center gap-2">
                        <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {memberStats.member.phone}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Stat label="누적 총 포인트" value={`${memberStats.points.total.toLocaleString()}P`} highlight icon="star" />
                  <Stat label="올해 총 포인트" value={`${memberStats.points.yearTotal.toLocaleString()}P`} highlight icon="trophy" />
                  <Stat label="출석 포인트" value={`${memberStats.points.attendanceTotal.toLocaleString()}P`} icon="check" />
                  <Stat label="보너스 포인트" value={`${memberStats.points.bonusTotal.toLocaleString()}P`} icon="gift" />
                </div>
              </div>

              <div className="rounded-xl border-2 border-white/50 bg-white/80 backdrop-blur-sm p-5 shadow-xl">
                <div className="grid gap-4">
                  <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="font-bold text-neutral-900 text-base">이번달</div>
                    </div>
                    <div className="space-y-2 text-sm text-neutral-700">
                      <div className="flex items-center justify-between">
                        <span>출석:</span>
                        <span className="font-bold text-emerald-700">{memberStats.attendance.month.present}회</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>지각:</span>
                        <span className="font-bold text-amber-700">{memberStats.attendance.month.late}회</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>모임 수:</span>
                        <span className="font-bold text-neutral-900">{memberStats.attendance.month.meetingDays}회</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-emerald-200">
                        <span className="font-semibold">출석율:</span>
                        <span className="font-bold text-lg text-emerald-700">{pct(memberStats.attendance.month.rate)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="font-bold text-neutral-900 text-base">올해</div>
                    </div>
                    <div className="space-y-2 text-sm text-neutral-700">
                      <div className="flex items-center justify-between">
                        <span>출석:</span>
                        <span className="font-bold text-emerald-700">{memberStats.attendance.year.present}회</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>지각:</span>
                        <span className="font-bold text-amber-700">{memberStats.attendance.year.late}회</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>모임 수:</span>
                        <span className="font-bold text-neutral-900">{memberStats.attendance.year.meetingDays}회</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                        <span className="font-semibold">출석율:</span>
                        <span className="font-bold text-lg text-blue-700">{pct(memberStats.attendance.year.rate)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-xs text-neutral-500 italic flex items-start gap-2">
                  <svg className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  결석은 "기록 없음"으로 처리됩니다. (오늘 기준만 수정 가능)
                </p>
              </div>
            </div>

            {/* 수박게임 계정 연결 */}
            <div className="rounded-xl border-2 border-white/50 bg-white/80 backdrop-blur-sm p-5 shadow-xl">
              <WatermelonConnection memberId={memberStats.member.id} />
            </div>

            {memberStats.bonusPoints.length > 0 && (
              <div className="rounded-xl border-2 border-white/50 bg-white/80 backdrop-blur-sm p-5 shadow-xl">
                <div className="text-lg font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent flex items-center gap-2 mb-4">
                  <span>🎁</span>
                  <span>보너스 점수 기록</span>
                  <span className="ml-auto text-xs text-gray-600 font-normal bg-clip-border bg-gray-100 px-2 py-1 rounded-full">
                    {memberStats.bonusPoints.length}건
                  </span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-hide">
                  {memberStats.bonusPoints.map((bp) => (
                    <div key={bp.id} className="rounded-lg border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="font-bold text-amber-700 text-base mb-1">
                            +{bp.points.toLocaleString()}P
                          </div>
                          <div className="text-sm text-gray-700">{bp.reason}</div>
                        </div>
                        <div className="text-xs text-gray-500 whitespace-nowrap">
                          {fmtYmdHm(bp.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

function Stat({ label, value, highlight, icon }: { label: string; value: string; highlight?: boolean; icon?: string }) {
  return (
    <div className={`rounded-lg border-2 p-3 ${highlight ? "border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50" : "border-gray-200 bg-white"}`}>
      <div className="text-xs text-gray-600 font-semibold mb-1">{label}</div>
      <div className={`text-lg font-bold ${highlight ? "text-purple-700" : "text-gray-800"}`}>
        {value}
      </div>
    </div>
  );
}
