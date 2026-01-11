"use client";

import { useMemo, useState } from "react";
import { koreanAgeFromBirthDate } from "@/lib/ui-age";
import { useMembers } from "../hooks/useMembers";
import { useAdmin } from "../hooks/useAdmin";
import { useMemberForm } from "../hooks/useMemberForm";
import { checkAttendance, markAbsent, fetchMemberStats, deleteMember, logout, addBonusPoints } from "../api";
import { ApiError } from "@/shared/utils/error";
import { MemberSection } from "./MemberSection";
import { BirthdaySection } from "./BirthdaySection";
import { RankingPodium } from "./RankingPodium";
import { MemberModal } from "./MemberModal";
import { MemberForm } from "./MemberForm";
import { LoginModal } from "./LoginModal";
import { GameMenuButton } from "./GameMenuButton";
import { Toast } from "@/shared/components/Toast";
import type { Member, MemberStats } from "../types";

export function MembersBoard() {
  const { members, stats, loading, initialLoading, refreshAll } = useMembers();
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

  // 포인트 랭킹 TOP 3 계산 (공동 순위 처리)
  const rankedGroups = useMemo(() => {
    const allMembers = [...youth, ...student]
      .filter((m) => (m.totalPoints ?? 0) > 0)
      .sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0));

    if (allMembers.length === 0) return { first: [], second: [], third: [] };

    // 점수별로 그룹화
    const groups: (typeof allMembers)[] = [];
    let currentPoints: number | null = null;
    let currentGroup: typeof allMembers = [];

    for (const member of allMembers) {
      const points = member.totalPoints ?? 0;
      if (currentPoints === null || points === currentPoints) {
        currentGroup.push(member);
        currentPoints = points;
      } else {
        groups.push(currentGroup);
        currentGroup = [member];
        currentPoints = points;
      }
    }
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return {
      first: groups[0] ?? [],
      second: groups[1] ?? [],
      third: groups[2] ?? [],
    };
  }, [youth, student]);

  // 출석/지각/결석
  async function handleCheckAttendance(memberId: string, status: "PRESENT" | "LATE") {
    if (loading) return;

    try {
      await checkAttendance(memberId, status);
      await Promise.all([refreshAll(), refreshAdminMe()]);
      if (openMemberId === memberId) await handleOpenMemberModal(memberId);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setLoginErr("평일 출석/지각 변경은 관리자 인증이 필요합니다.");
          setLoginOpen(true);
        } else {
          alert(err.message);
        }
      } else {
        alert("처리 실패");
      }
    }
  }

  async function handleMarkAbsent(memberId: string) {
    if (loading) return;

    try {
      await markAbsent(memberId);
      await Promise.all([refreshAll(), refreshAdminMe()]);
      if (openMemberId === memberId) await handleOpenMemberModal(memberId);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setLoginErr("평일 결석 변경은 관리자 인증이 필요합니다.");
          setLoginOpen(true);
        } else {
          alert(err.message);
        }
      } else {
        alert("결석 처리 실패");
      }
    }
  }

  async function handleAddBonusPoints(memberId: string, points: number, reason: string) {
    if (loading) return;

    if (!admin.isAdmin) {
      setLoginErr("보너스 점수 입력은 관리자 인증이 필요합니다.");
      setLoginOpen(true);
      return;
    }

    try {
      await addBonusPoints(memberId, points, reason);
      await Promise.all([refreshAll(), refreshAdminMe()]);
      if (openMemberId === memberId) await handleOpenMemberModal(memberId);
      setToast(`${points}점이 추가되었습니다.`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setLoginErr("관리자 인증이 필요합니다.");
          setLoginOpen(true);
        } else {
          alert(err.message);
        }
      } else {
        alert("보너스 점수 추가 실패");
      }
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
      await deleteMember(memberStats.member.id);
      await Promise.all([refreshAll(), refreshAdminMe()]);
      handleCloseMemberModal();
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert("비활성화 실패");
      }
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
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-neutral-900 transition-all duration-500">
      {/* 초기 로딩 오버레이 */}
      {initialLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/90 shadow-xl border-2 border-white/50">
              <span className="text-3xl animate-spin">⏳</span>
            </div>
            <div className="text-lg font-semibold text-gray-700">데이터를 불러오는 중...</div>
            <div className="text-sm text-gray-500">잠시만 기다려주세요</div>
          </div>
        </div>
      )}

      <div className="relative mx-auto max-w-7xl space-y-4 px-4 py-4 z-10">
        <header className="rounded-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm shadow-xl p-5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              📋 출석부
            </h1>
            {stats && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-sm shadow-sm">
                <span className="text-xs">✅</span>
                <span>오늘 {stats.todayCount}명</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="flex items-center gap-2 bg-blue-50/80 rounded-lg px-3 py-2">
              <span className="text-lg">👥</span>
              <div className="flex-1">
                <div className="text-xs text-gray-600">이번달 평균</div>
                <div className="text-lg font-bold text-blue-700">
                  {stats ? `${stats.month.avgAttendance.toFixed(1)}명` : "-"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-purple-50/80 rounded-lg px-3 py-2">
              <span className="text-lg">📊</span>
              <div className="flex-1">
                <div className="text-xs text-gray-600">전체 평균</div>
                <div className="text-lg font-bold text-purple-700">
                  {stats ? `${stats.all.avgAttendance.toFixed(1)}명` : "-"}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${admin.isAdmin ? "bg-blue-50 border border-blue-300" : "bg-gray-50 border border-gray-300"} transition-all duration-300`}>
              <span className="text-sm font-medium text-gray-700">관리자:</span>
              <span className={`font-bold text-sm ${admin.isAdmin ? "text-blue-700" : "text-gray-600"}`}>
                {admin.isAdmin ? (
                  <>
                    ✅ 인증됨
                    {adminLeftText && <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 border border-blue-300">{adminLeftText}</span>}
                  </>
                ) : (
                  "⏳ 미인증"
                )}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {!admin.isAdmin ? (
                <button
                  type="button"
                  onClick={() => handleOpenLoginModal()}
                  className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-sm font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  🔐 로그인
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleOpenCreateMember}
                    className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ➕ 추가
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleLogout}
                    className="rounded-xl border-2 border-gray-400 bg-white px-4 py-2 text-sm font-bold text-gray-800 hover:bg-gray-50 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🚪 로그아웃
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <RankingPodium rankedGroups={rankedGroups} onOpen={handleOpenMemberModal} />

        <MemberSection
          title="청년회"
          subtitle="20세 이상"
          members={youth}
          loading={loading}
          isAdmin={admin.isAdmin}
          onCheck={handleCheckAttendance}
          onAddBonusPoints={handleAddBonusPoints}
          onAbsent={handleMarkAbsent}
          onOpen={handleOpenMemberModal}
        />

        <MemberSection
          title="학생회"
          subtitle="20세 미만"
          members={student}
          loading={loading}
          isAdmin={admin.isAdmin}
          onCheck={handleCheckAttendance}
          onAddBonusPoints={handleAddBonusPoints}
          onAbsent={handleMarkAbsent}
          onOpen={handleOpenMemberModal}
        />

        <BirthdaySection members={[...youth, ...student]} onOpen={handleOpenMemberModal} />

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

        {/* 게임 메뉴 플로팅 버튼 */}
        <GameMenuButton />
      </div>
    </div>
  );
}
