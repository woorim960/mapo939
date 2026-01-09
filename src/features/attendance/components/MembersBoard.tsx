"use client";

import { useMemo, useState } from "react";
import { koreanAgeFromBirthDate } from "@/lib/ui-age";
import { useMembers } from "../hooks/useMembers";
import { useAdmin } from "../hooks/useAdmin";
import { useMemberForm } from "../hooks/useMemberForm";
import { checkAttendance, markAbsent, fetchMemberStats, deleteMember, logout } from "../api";
import { MemberSection } from "./MemberSection";
import { MemberModal } from "./MemberModal";
import { MemberForm } from "./MemberForm";
import { LoginModal } from "./LoginModal";
import { Toast } from "@/shared/components/Toast";
import type { Member, MemberStats } from "../types";

export function MembersBoard() {
  const { members, stats, loading, refreshAll } = useMembers();
  const { admin, adminLeftText, refreshAdminMe } = useAdmin();
  const memberForm = useMemberForm();

  // 상세 모달
  const [openMemberId, setOpenMemberId] = useState<string | null>(null);
  const [memberStats, setMemberStats] = useState<MemberStats | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // 로그인 모달
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginErr, setLoginErr] = useState<string | null>(null);

  // 토스트
  const [toast, setToast] = useState<string>("");

  const { youth, student } = useMemo(() => {
    const withAge = members.map((m) => ({
      ...m,
      age: koreanAgeFromBirthDate(m.birthDate),
    }));
    return {
      youth: withAge.filter((m) => m.age >= 20),
      student: withAge.filter((m) => m.age < 20),
    };
  }, [members]);

  // 출석/지각/결석
  async function handleCheckAttendance(memberId: string, status: "PRESENT" | "LATE") {
    if (loading) return;

    try {
      const res = await checkAttendance(memberId, status);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setLoginErr("평일 출석/지각 변경은 관리자 인증이 필요합니다.");
          setLoginOpen(true);
        } else {
          alert(err?.error ?? "처리 실패");
        }
        return;
      }

      await Promise.all([refreshAll(), refreshAdminMe()]);
      if (openMemberId === memberId) await handleOpenMemberModal(memberId);
    } catch (err) {
      alert("처리 실패");
    }
  }

  async function handleMarkAbsent(memberId: string) {
    if (loading) return;

    try {
      const res = await markAbsent(memberId);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setLoginErr("평일 결석 변경은 관리자 인증이 필요합니다.");
          setLoginOpen(true);
        } else {
          alert(err?.error ?? "결석 처리 실패");
        }
        return;
      }

      await Promise.all([refreshAll(), refreshAdminMe()]);
      if (openMemberId === memberId) await handleOpenMemberModal(memberId);
    } catch (err) {
      alert("결석 처리 실패");
    }
  }

  // 상세 모달
  async function handleOpenMemberModal(memberId: string) {
    setOpenMemberId(memberId);
    setModalLoading(true);
    try {
      const data = await fetchMemberStats(memberId);
      setMemberStats(data);
    } catch {
      setToast("멤버 정보를 불러오는데 실패했습니다.");
    } finally {
      setModalLoading(false);
    }
  }

  function handleCloseMemberModal() {
    setOpenMemberId(null);
    setMemberStats(null);
  }

  // 관리자 로그인/로그아웃
  function handleOpenLoginModal(message?: string) {
    setLoginErr(message ?? null);
    setLoginOpen(true);
  }

  async function handleLoginSuccess() {
    await Promise.all([refreshAdminMe(), refreshAll()]);
    setLoginOpen(false);
    setLoginErr(null);
  }

  async function handleLogout() {
    try {
      await logout();
      await refreshAdminMe();
    } catch {
      // ignore
    }
  }

  // 멤버 폼
  function handleOpenCreateMember() {
    if (!admin.isAdmin) {
      handleOpenLoginModal("멤버 추가는 관리자 인증이 필요합니다.");
      return;
    }
    memberForm.openCreate();
  }

  function handleOpenEditMemberFromStats() {
    if (!admin.isAdmin) {
      handleOpenLoginModal("멤버 수정은 관리자 인증이 필요합니다.");
      return;
    }
    if (!memberStats) return;
    memberForm.openEdit(memberStats.member);
  }

  async function handleSoftDeleteMemberFromStats() {
    if (!admin.isAdmin) {
      handleOpenLoginModal("멤버 비활성화는 관리자 인증이 필요합니다.");
      return;
    }
    if (!memberStats) return;

    const ok = window.confirm(`"${memberStats.member.name}" 멤버를 비활성화(삭제)할까요?\n(기록은 유지됩니다)`);
    if (!ok) return;

    try {
      const res = await deleteMember(memberStats.member.id);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.error ?? "비활성화 실패");
        return;
      }
      await Promise.all([refreshAll(), refreshAdminMe()]);
      handleCloseMemberModal();
    } catch {
      alert("비활성화 실패");
    }
  }

  async function handleSaveMember() {
    if (!admin.isAdmin) {
      handleOpenLoginModal("관리자 인증이 필요합니다.");
      return;
    }

    const success = await memberForm.save();
    if (success) {
      await Promise.all([refreshAll(), refreshAdminMe()]);
      if (openMemberId === memberForm.form.memberId) {
        await handleOpenMemberModal(memberForm.form.memberId!);
      }
    }
  }

  function handlePhotoUploaded(url: string) {
    memberForm.updateForm({ photoUrl: url });
    memberForm.addTempUrl(url);
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <header className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-xl font-semibold">출석부</h1>
              <p className="text-sm text-neutral-600">
                {stats ? `오늘(${stats.todayYmd}) 출석(지각 포함): ${stats.todayCount}명` : "로딩 중..."}
              </p>
            </div>

            <div className="flex flex-col items-start gap-2 md:items-end">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={[
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
                    admin.isAdmin ? "bg-sky-50 text-sky-700 border-sky-200" : "bg-neutral-50 text-neutral-600 border-neutral-200",
                  ].join(" ")}
                >
                  관리자: {admin.isAdmin ? "인증됨" : "미인증"}
                  {admin.isAdmin && <span className="text-neutral-500">({adminLeftText})</span>}
                </span>

                {!admin.isAdmin ? (
                  <button
                    type="button"
                    onClick={() => handleOpenLoginModal()}
                    className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-neutral-50 active:bg-neutral-100"
                  >
                    관리자 로그인
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleOpenCreateMember}
                      className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-50"
                    >
                      멤버 추가
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleLogout}
                      className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-50"
                    >
                      로그아웃
                    </button>
                  </>
                )}
              </div>

              <div className="text-sm text-neutral-700">
                {stats && (
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <span>이번달 평균: {stats.month.avgAttendance.toFixed(1)}명</span>
                    <span>전체 평균: {stats.all.avgAttendance.toFixed(1)}명</span>
                    <span className="text-neutral-500">
                      (이번달 모임 수 {stats.month.performedDays}회 · 전체 모임 수 {stats.all.performedDays}회)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <MemberSection
          title="청년회"
          subtitle="20세 이상"
          members={youth}
          loading={loading}
          onCheck={handleCheckAttendance}
          onAbsent={handleMarkAbsent}
          onOpen={handleOpenMemberModal}
        />

        <MemberSection
          title="학생회"
          subtitle="20세 미만"
          members={student}
          loading={loading}
          onCheck={handleCheckAttendance}
          onAbsent={handleMarkAbsent}
          onOpen={handleOpenMemberModal}
        />

        {/* 상세 모달 */}
        {openMemberId && (
          <MemberModal
            memberStats={memberStats}
            loading={modalLoading}
            isAdmin={admin.isAdmin}
            onEdit={handleOpenEditMemberFromStats}
            onDelete={handleSoftDeleteMemberFromStats}
            onClose={handleCloseMemberModal}
          />
        )}

        {/* 멤버 추가/수정 모달 */}
        <MemberForm
          form={memberForm.form}
          error={memberForm.error}
          saving={memberForm.saving}
          onClose={memberForm.close}
          onChange={memberForm.updateForm}
          onSave={handleSaveMember}
          onPhotoUploaded={handlePhotoUploaded}
        />

        {/* 관리자 로그인 모달 */}
        <LoginModal
          open={loginOpen}
          initialError={loginErr}
          onClose={() => {
            setLoginOpen(false);
            setLoginErr(null);
          }}
          onSuccess={handleLoginSuccess}
        />

        {/* 토스트 */}
        {toast && <Toast message={toast} onClose={() => setToast("")} />}
      </div>
    </div>
  );
}
