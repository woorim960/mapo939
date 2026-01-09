// 멤버 상세 모달 컴포넌트

import { Modal } from "@/shared/components/Modal";
import { fmtYmd, pct } from "../utils";
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
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">개인 정보 / 통계</h2>
          <div className="flex items-center gap-2">
            {isAdmin && memberStats && (
              <>
                <button
                  type="button"
                  className="rounded-lg border px-3 py-1 text-sm hover:bg-neutral-50 active:bg-neutral-100"
                  onClick={onEdit}
                >
                  수정
                </button>
                <button
                  type="button"
                  className="rounded-lg border px-3 py-1 text-sm hover:bg-neutral-50 active:bg-neutral-100"
                  onClick={onDelete}
                >
                  비활성화
                </button>
              </>
            )}
            <button type="button" className="rounded-lg border px-3 py-1 text-sm" onClick={onClose}>
              닫기
            </button>
          </div>
        </div>

        {loading || !memberStats ? (
          <div className="rounded-xl border p-4 text-sm text-neutral-600">불러오는 중...</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border p-4">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 overflow-hidden rounded-2xl border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={memberStats.member.photoUrl} alt="" className="h-full w-full object-cover" />
                </div>
                <div>
                  <div className="text-base font-semibold">{memberStats.member.name}</div>
                  <div className="text-sm text-neutral-600">
                    {memberStats.member.age}세 · {fmtYmd(memberStats.member.birthDate)}
                  </div>
                  <div className="text-sm text-neutral-600">{memberStats.member.phone}</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <Stat label="누적 출석 포인트" value={`${memberStats.points.total.toLocaleString()}P`} />
                <Stat label="올해 출석 포인트" value={`${memberStats.points.yearTotal.toLocaleString()}P`} />
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="grid gap-2 text-sm">
                <div className="rounded-xl border p-3">
                  <div className="font-medium">이번달</div>
                  <div className="mt-1 text-neutral-700">
                    출석: {memberStats.attendance.month.present}회 · 지각: {memberStats.attendance.month.late}회
                  </div>
                  <div className="text-neutral-700">모임 수: {memberStats.attendance.month.meetingDays}회</div>
                  <div className="text-neutral-700">출석율: {pct(memberStats.attendance.month.rate)}</div>
                </div>

                <div className="rounded-xl border p-3">
                  <div className="font-medium">올해</div>
                  <div className="mt-1 text-neutral-700">
                    출석: {memberStats.attendance.year.present}회 · 지각: {memberStats.attendance.year.late}회
                  </div>
                  <div className="text-neutral-700">모임 수: {memberStats.attendance.year.meetingDays}회</div>
                  <div className="text-neutral-700">출석율: {pct(memberStats.attendance.year.rate)}</div>
                </div>
              </div>

              <p className="mt-3 text-xs text-neutral-500">* 결석은 "기록 없음"으로 처리됩니다. (오늘 기준만 수정 가능)</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-base font-semibold">{value}</div>
    </div>
  );
}
