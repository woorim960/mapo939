"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { koreanAgeFromBirthDate } from "@/lib/ui-age";

type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT";

type Member = {
  id: string;
  name: string;
  phone: string;
  birthDate: string; // ISO
  photoUrl: string;
  yearAttendanceCount: number;
  totalPoints?: number;
  todayStatus?: AttendanceStatus;
};

type Stats = {
  todayYmd: string;
  todayCount: number; // 지각 포함
  month: { performedDays: number; totalAttendance: number; avgAttendance: number };
  all: { performedDays: number; totalAttendance: number; avgAttendance: number };
};

type MemberStats = {
  member: { id: string; name: string; phone: string; birthDate: string; photoUrl: string; age: number };
  points: { total: number; yearTotal: number };
  attendance: {
    month: { present: number; late: number; count: number; meetingDays: number; rate: number };
    year: { present: number; late: number; count: number; meetingDays: number; rate: number };
  };
};

type AdminMe = {
  isAdmin: boolean;
  adminId?: string;
  username?: string;
  expiresAt?: string; // ISO
};

type MemberFormMode = "create" | "edit";
type MemberFormState = {
  mode: MemberFormMode;
  open: boolean;
  memberId?: string;

  name: string;
  phone: string;
  birthDateYmd: string; // YYYY-MM-DD
  photoUrl: string; // blob url
};

type CropPixels = { x: number; y: number; width: number; height: number };

function fmtYmd(iso: string) {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isoToYmd(iso: string) {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function pct(x: number) {
  return `${Math.round(x * 100)}%`;
}

function todayLabel(status?: AttendanceStatus) {
  if (status === "PRESENT") return "오늘 출석";
  if (status === "LATE") return "오늘 지각";
  return "오늘 결석";
}

function badgeTone(status?: AttendanceStatus) {
  if (status === "PRESENT") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "LATE") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-neutral-50 text-neutral-700 border-neutral-200";
}

function formatLeftMs(ms: number) {
  if (ms <= 0) return "만료됨";
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function isLikelyBlobUrl(url: string) {
  // Vercel Blob public URL은 보통 https://<...>.public.blob.vercel-storage.com/... 형태
  // 환경에 따라 다를 수 있어 "vercel-storage.com" 포함이면 삭제 대상으로 취급.
  return typeof url === "string" && url.includes("vercel-storage.com");
}

/** 이미지(src)를 cropPixels 영역으로 잘라서 Blob(JPEG)로 반환 (회전 없음) */
async function getCroppedBlob(imageSrc: string, cropPixels: CropPixels) {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no_canvas_context");

  ctx.drawImage(
    img,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height
  );

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob_failed"))), "image/jpeg", 0.92);
  });
}

/** 크롭 결과를 DataURL로 만들어 원형 미리보기용으로 사용 */
async function getCroppedDataUrl(imageSrc: string, cropPixels: CropPixels) {
  const blob = await getCroppedBlob(imageSrc, cropPixels);
  return await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

export default function MembersBoard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  // 상세 모달
  const [openMemberId, setOpenMemberId] = useState<string | null>(null);
  const [memberStats, setMemberStats] = useState<MemberStats | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // 관리자
  const [admin, setAdmin] = useState<AdminMe>({ isAdmin: false });
  const [adminLeftText, setAdminLeftText] = useState<string>("미인증");
  const adminTimerRef = useRef<number | null>(null);

  const [loginOpen, setLoginOpen] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginErr, setLoginErr] = useState<string | null>(null);
  const usernameRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);

  // 멤버 폼 (CUD)
  const [memberForm, setMemberForm] = useState<MemberFormState>({
    mode: "create",
    open: false,
    memberId: undefined,
    name: "",
    phone: "",
    birthDateYmd: "",
    photoUrl: "",
  });
  const [memberFormSaving, setMemberFormSaving] = useState(false);
  const [memberFormErr, setMemberFormErr] = useState<string | null>(null);

  // ✅ 이미지 교체 삭제 정책용
  const [originalPhotoUrl, setOriginalPhotoUrl] = useState<string | null>(null); // edit 시작 시 원본
  const [tempUploadedUrls, setTempUploadedUrls] = useState<string[]>([]); // 폼에서 새로 업로드된 임시들(저장 전)

  // 크롭 모달
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropPixels, setCropPixels] = useState<CropPixels | null>(null);
  const [cropPreviewUrl, setCropPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function refreshAll() {
    setLoading(true);
    try {
      const [mRes, sRes] = await Promise.all([fetch("/api/members", { cache: "no-store" }), fetch("/api/stats", { cache: "no-store" })]);
      const mJson = await mRes.json();
      const sJson = await sRes.json();
      setMembers(mJson.members ?? []);
      setStats(sJson ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function refreshAdminMe() {
    const res = await fetch("/api/admin/me", { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as AdminMe | null;
    setAdmin(json ?? { isAdmin: false });
  }

  function startAdminCountdown(expiresAtIso?: string) {
    if (adminTimerRef.current) window.clearInterval(adminTimerRef.current);
    if (!expiresAtIso) {
      setAdminLeftText("미인증");
      return;
    }

    const tick = () => {
      const left = new Date(expiresAtIso).getTime() - Date.now();
      setAdminLeftText(formatLeftMs(left));
      if (left <= 0) refreshAdminMe().catch(() => {});
    };

    tick();
    adminTimerRef.current = window.setInterval(tick, 1000);
  }

  useEffect(() => {
    (async () => {
      await Promise.all([refreshAll(), refreshAdminMe()]);
    })();

    return () => {
      if (adminTimerRef.current) window.clearInterval(adminTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (admin.isAdmin && admin.expiresAt) startAdminCountdown(admin.expiresAt);
    else startAdminCountdown(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin.isAdmin, admin.expiresAt]);

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

  // ---------------------------
  // 출석/지각/결석
  // ---------------------------
  async function checkAttendance(memberId: string, status: "PRESENT" | "LATE") {
    if (loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/attendance/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, status }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 401) {
          openLoginModal("평일 출석/지각 변경은 관리자 인증이 필요합니다.");
        } else {
          alert(err?.error ?? "처리 실패");
        }
        return;
      }

      await Promise.all([refreshAll(), refreshAdminMe()]);
      if (openMemberId === memberId) await openMemberModal(memberId);
    } finally {
      setLoading(false);
    }
  }

  async function markAbsent(memberId: string) {
    if (loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/attendance/absent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 401) {
          openLoginModal("평일 결석 변경은 관리자 인증이 필요합니다.");
        } else {
          alert(err?.error ?? "결석 처리 실패");
        }
        return;
      }

      await Promise.all([refreshAll(), refreshAdminMe()]);
      if (openMemberId === memberId) await openMemberModal(memberId);
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------
  // 상세 모달
  // ---------------------------
  async function openMemberModal(memberId: string) {
    setOpenMemberId(memberId);
    setModalLoading(true);
    try {
      const res = await fetch(`/api/members/${memberId}/stats`, { cache: "no-store" });
      const json = await res.json();
      setMemberStats(json);
    } finally {
      setModalLoading(false);
    }
  }

  function closeMemberModal() {
    setOpenMemberId(null);
    setMemberStats(null);
  }

  // ---------------------------
  // 관리자 로그인/로그아웃
  // ---------------------------
  function openLoginModal(message?: string) {
    setLoginErr(message ?? null);
    setLoginOpen(true);
    setTimeout(() => usernameRef.current?.focus(), 0);
  }

  async function doLogin() {
    if (loginLoading) return;

    const username = usernameRef.current?.value?.trim() ?? "";
    const password = passwordRef.current?.value ?? "";

    if (!username || !password) {
      setLoginErr("아이디/비밀번호를 입력하세요.");
      return;
    }

    setLoginLoading(true);
    setLoginErr(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setLoginErr(err?.error ?? "로그인 실패");
        return;
      }

      await Promise.all([refreshAdminMe(), refreshAll()]);
      setLoginOpen(false);
      setLoginErr(null);
      if (usernameRef.current) usernameRef.current.value = "";
      if (passwordRef.current) passwordRef.current.value = "";
    } finally {
      setLoginLoading(false);
    }
  }

  async function doLogout() {
    if (loading) return;
    setLoading(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
      await refreshAdminMe();
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------
  // 멤버 폼 (추가/수정/비활성화)
  // ---------------------------
  async function blobDelete(url: string) {
    if (!url) return;
    if (!isLikelyBlobUrl(url)) return;

    await fetch("/api/uploads/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }).catch(() => {});
  }

  function openCreateMember() {
    if (!admin.isAdmin) {
      openLoginModal("멤버 추가는 관리자 인증이 필요합니다.");
      return;
    }
    setMemberFormErr(null);
    setOriginalPhotoUrl(null);
    setTempUploadedUrls([]);
    setMemberForm({
      mode: "create",
      open: true,
      memberId: undefined,
      name: "",
      phone: "",
      birthDateYmd: "",
      photoUrl: "",
    });
  }

  function openEditMemberFromStats() {
    if (!admin.isAdmin) {
      openLoginModal("멤버 수정은 관리자 인증이 필요합니다.");
      return;
    }
    if (!memberStats) return;

    setMemberFormErr(null);
    setOriginalPhotoUrl(memberStats.member.photoUrl);
    setTempUploadedUrls([]);
    setMemberForm({
      mode: "edit",
      open: true,
      memberId: memberStats.member.id,
      name: memberStats.member.name,
      phone: memberStats.member.phone,
      birthDateYmd: isoToYmd(memberStats.member.birthDate),
      photoUrl: memberStats.member.photoUrl,
    });
  }

  async function softDeleteMemberFromStats() {
    if (!admin.isAdmin) {
      openLoginModal("멤버 비활성화는 관리자 인증이 필요합니다.");
      return;
    }
    if (!memberStats) return;

    const ok = window.confirm(`"${memberStats.member.name}" 멤버를 비활성화(삭제)할까요?\n(기록은 유지됩니다)`);
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/members/${memberStats.member.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.error ?? "비활성화 실패");
        return;
      }
      await Promise.all([refreshAll(), refreshAdminMe()]);
      closeMemberModal();
    } finally {
      setLoading(false);
    }
  }

  async function closeMemberForm() {
    // ✅ 저장 안 하고 닫으면 폼에서 업로드된 임시 이미지들은 정리(삭제)
    // edit 모드: originalPhotoUrl은 남겨야 하니까 tempUploadedUrls만 삭제
    // create 모드: 최종 저장 안 했으면 업로드한 것도 모두 삭제
    if (tempUploadedUrls.length > 0) {
      await Promise.all(tempUploadedUrls.map((u) => blobDelete(u)));
    }
    setTempUploadedUrls([]);
    setOriginalPhotoUrl(null);
    setMemberFormErr(null);
    setMemberForm((p) => ({ ...p, open: false }));
  }

  function validateMemberForm(): string | null {
    const name = memberForm.name.trim();
    const phone = memberForm.phone.trim();
    const birth = memberForm.birthDateYmd.trim();
    const photo = memberForm.photoUrl.trim();

    if (!name) return "이름은 필수입니다.";
    if (!phone) return "핸드폰 번호는 필수입니다.";
    if (!birth) return "생년월일은 필수입니다.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) return "생년월일 형식이 올바르지 않습니다. (YYYY-MM-DD)";
    if (!photo) return "사진 업로드 후 크롭을 완료해주세요.";
    return null;
  }

  async function saveMember() {
    if (memberFormSaving) return;
    if (!admin.isAdmin) {
      openLoginModal("관리자 인증이 필요합니다.");
      return;
    }

    const v = validateMemberForm();
    if (v) {
      setMemberFormErr(v);
      return;
    }

    setMemberFormSaving(true);
    setMemberFormErr(null);
    try {
      if (memberForm.mode === "create") {
        const res = await fetch("/api/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: memberForm.name.trim(),
            phone: memberForm.phone.trim(),
            birthDate: memberForm.birthDateYmd.trim(), // 서버에서 UTC 변환 처리 or 여기서도 가능
            photoUrl: memberForm.photoUrl.trim(),
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setMemberFormErr(err?.error ?? "멤버 추가 실패");
          return;
        }

        // ✅ create 성공이면 tempUploadedUrls 중 "최종 photoUrl"은 보존해야 하므로 제외하고 삭제
        const finalUrl = memberForm.photoUrl;
        const toDelete = tempUploadedUrls.filter((u) => u !== finalUrl);
        if (toDelete.length) await Promise.all(toDelete.map((u) => blobDelete(u)));

        setTempUploadedUrls([]);
        setOriginalPhotoUrl(null);

        await Promise.all([refreshAll(), refreshAdminMe()]);
        setMemberForm((p) => ({ ...p, open: false }));
        return;
      }

      // edit
      if (!memberForm.memberId) {
        setMemberFormErr("memberId_missing");
        return;
      }

      const res = await fetch(`/api/members/${memberForm.memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: memberForm.name.trim(),
          phone: memberForm.phone.trim(),
          birthDate: memberForm.birthDateYmd.trim(),
          photoUrl: memberForm.photoUrl.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMemberFormErr(err?.error ?? "멤버 수정 실패");
        return;
      }

      // ✅ edit 성공 후: 원본과 달라졌으면 "원본 이미지 삭제"
      if (originalPhotoUrl && originalPhotoUrl !== memberForm.photoUrl) {
        await blobDelete(originalPhotoUrl);
      }

      // ✅ edit 성공 후: tempUploadedUrls 중 최종 photoUrl만 남기고 나머지 삭제(이미 교체 때 삭제했더라도 안전하게)
      const finalUrl = memberForm.photoUrl;
      const toDelete = tempUploadedUrls.filter((u) => u !== finalUrl);
      if (toDelete.length) await Promise.all(toDelete.map((u) => blobDelete(u)));

      setTempUploadedUrls([]);
      setOriginalPhotoUrl(null);

      await Promise.all([refreshAll(), refreshAdminMe()]);
      if (openMemberId === memberForm.memberId) await openMemberModal(memberForm.memberId);

      setMemberForm((p) => ({ ...p, open: false }));
    } finally {
      setMemberFormSaving(false);
    }
  }

  // ---------------------------
  // 사진 업로드 + 크롭
  // ---------------------------
  async function onPickPhoto(file: File) {
    const url = URL.createObjectURL(file);
    setCropImageSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropPixels(null);
    setCropPreviewUrl(null);
    setCropOpen(true);
  }

  async function confirmCropAndUpload() {
    if (!cropImageSrc || !cropPixels) return;

    if (!admin.isAdmin) {
      openLoginModal("사진 업로드는 관리자 인증이 필요합니다.");
      return;
    }

    setUploading(true);
    try {
      const cropped = await getCroppedBlob(cropImageSrc, cropPixels);
      const fd = new FormData();
      fd.append("file", new File([cropped], "member.jpg", { type: "image/jpeg" }));

      const res = await fetch("/api/uploads/member-photo", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.error ?? "업로드 실패");
        return;
      }

      const { url } = await res.json();

      // ✅ 같은 폼에서 여러 번 업로드(교체)하면, 이전에 업로드된 "임시"는 삭제
      // 단, edit 모드에서 originalPhotoUrl은 PATCH 성공 후에 삭제해야 하므로 여기서 삭제하지 않는다.
      const current = memberForm.photoUrl;
      const original = originalPhotoUrl;

      // 현재 photoUrl이 "원본"이 아니라면 (=폼에서 업로드한 임시) -> 즉시 삭제 가능
      if (current && current !== original) {
        await blobDelete(current);
        setTempUploadedUrls((prev) => prev.filter((u) => u !== current));
      }

      // 새 업로드 url을 폼에 반영 + temp로 기록(저장 전)
      setMemberForm((p) => ({ ...p, photoUrl: url }));
      setTempUploadedUrls((prev) => (prev.includes(url) ? prev : [...prev, url]));

      setCropOpen(false);
    } finally {
      setUploading(false);
    }
  }

  // 크롭 프리뷰(원형) 업데이트 (cropPixels가 생기면)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!cropOpen || !cropImageSrc || !cropPixels) {
        setCropPreviewUrl(null);
        return;
      }
      try {
        const durl = await getCroppedDataUrl(cropImageSrc, cropPixels);
        if (alive) setCropPreviewUrl(durl);
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, [cropOpen, cropImageSrc, cropPixels]);

  // ---------------------------
  // Render
  // ---------------------------
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-2xl border p-4 shadow-sm">
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
                <button onClick={() => openLoginModal()} className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-neutral-50">
                  관리자 로그인
                </button>
              ) : (
                <>
                  <button
                    disabled={loading}
                    onClick={openCreateMember}
                    className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
                  >
                    멤버 추가
                  </button>
                  <button
                    disabled={loading}
                    onClick={doLogout}
                    className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
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

      <Section
        title="청년회"
        subtitle="20세 이상"
        members={youth}
        loading={loading}
        onCheck={checkAttendance}
        onAbsent={markAbsent}
        onOpen={openMemberModal}
      />

      <Section
        title="학생회"
        subtitle="20세 미만"
        members={student}
        loading={loading}
        onCheck={checkAttendance}
        onAbsent={markAbsent}
        onOpen={openMemberModal}
      />

      {/* 상세 모달 */}
      {openMemberId && (
        <Modal onClose={closeMemberModal}>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">개인 정보 / 통계</h2>
              <div className="flex items-center gap-2">
                {admin.isAdmin && memberStats && (
                  <>
                    <button
                      className="rounded-lg border px-3 py-1 text-sm hover:bg-neutral-50"
                      onClick={openEditMemberFromStats}
                    >
                      수정
                    </button>
                    <button
                      className="rounded-lg border px-3 py-1 text-sm hover:bg-neutral-50"
                      onClick={softDeleteMemberFromStats}
                    >
                      비활성화
                    </button>
                  </>
                )}
                <button className="rounded-lg border px-3 py-1 text-sm" onClick={closeMemberModal}>
                  닫기
                </button>
              </div>
            </div>

            {modalLoading || !memberStats ? (
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

                  <p className="mt-3 text-xs text-neutral-500">* 결석은 “기록 없음”으로 처리됩니다. (오늘 기준만 수정 가능)</p>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* 멤버 추가/수정 모달 */}
      {memberForm.open && (
        <Modal onClose={closeMemberForm}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{memberForm.mode === "create" ? "멤버 추가" : "멤버 수정"}</h2>
              <button className="rounded-lg border px-3 py-1 text-sm" onClick={closeMemberForm}>
                닫기
              </button>
            </div>

            <div className="grid gap-3 rounded-2xl border p-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm text-neutral-600">이름 *</label>
                <input
                  value={memberForm.name}
                  onChange={(e) => setMemberForm((p) => ({ ...p, name: e.target.value }))}
                  className="rounded-xl border px-3 py-2 text-sm"
                  placeholder="홍길동"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm text-neutral-600">핸드폰 번호 *</label>
                <input
                  value={memberForm.phone}
                  onChange={(e) => setMemberForm((p) => ({ ...p, phone: e.target.value }))}
                  className="rounded-xl border px-3 py-2 text-sm"
                  placeholder="010-1234-5678"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm text-neutral-600">생년월일(YYYY-MM-DD) *</label>
                <input
                  value={memberForm.birthDateYmd}
                  onChange={(e) => setMemberForm((p) => ({ ...p, birthDateYmd: e.target.value }))}
                  className="rounded-xl border px-3 py-2 text-sm"
                  placeholder="2004-03-21"
                />
                <div className="text-xs text-neutral-500">* 한국나이 계산은 서버 기준입니다.</div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm text-neutral-600">사진 업로드 *</label>
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    onPickPhoto(f);
                    e.currentTarget.value = "";
                  }}
                />
                {!memberForm.photoUrl && <div className="text-xs text-neutral-500">* 업로드 후 크롭 완료해야 저장 가능</div>}
              </div>

              <div className="md:col-span-2">
                <div className="flex items-start gap-3 rounded-2xl border p-3">
                  <div className="h-20 w-20 overflow-hidden rounded-2xl border bg-neutral-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {memberForm.photoUrl ? (
                      <img src={memberForm.photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">미리보기</div>
                    )}
                  </div>

                  <div className="flex-1 text-sm text-neutral-700">
                    <div className="font-semibold">사진 미리보기</div>
                    <div className="mt-1 text-xs text-neutral-500">
                      * 업로드 후 서버에서 webp(예: 512x512)로 저장된 URL이 들어갑니다.
                    </div>
                  </div>

                  <div className="h-20 w-20 overflow-hidden rounded-full border bg-neutral-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {memberForm.photoUrl ? (
                      <img src={memberForm.photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-400">원형</div>
                    )}
                  </div>
                </div>
              </div>

              {memberFormErr && (
                <div className="md:col-span-2 rounded-xl border bg-neutral-50 p-3 text-sm text-neutral-700">{memberFormErr}</div>
              )}

              <div className="md:col-span-2 flex items-center justify-end gap-2">
                <button className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" onClick={closeMemberForm}>
                  취소
                </button>
                <button
                  disabled={memberFormSaving}
                  className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
                  onClick={saveMember}
                >
                  {memberFormSaving ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 관리자 로그인 모달 */}
      {loginOpen && (
        <Modal onClose={() => setLoginOpen(false)}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">관리자 로그인</h2>
              <button className="rounded-lg border px-3 py-1 text-sm" onClick={() => setLoginOpen(false)}>
                닫기
              </button>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="grid gap-3">
                <div className="grid gap-1">
                  <label className="text-sm text-neutral-600">아이디</label>
                  <input
                    ref={usernameRef}
                    className="rounded-xl border px-3 py-2 text-sm"
                    placeholder="admin"
                    autoComplete="username"
                  />
                </div>

                <div className="grid gap-1">
                  <label className="text-sm text-neutral-600">비밀번호</label>
                  <input
                    ref={passwordRef}
                    type="password"
                    className="rounded-xl border px-3 py-2 text-sm"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") doLogin();
                    }}
                  />
                </div>

                {loginErr && <div className="rounded-xl border bg-neutral-50 p-3 text-sm text-neutral-700">{loginErr}</div>}

                <button
                  disabled={loginLoading}
                  onClick={doLogin}
                  className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
                >
                  {loginLoading ? "로그인 중..." : "로그인"}
                </button>
              </div>
            </div>

            <p className="text-xs text-neutral-500">* 로그인 후 20분 동안 인증이 유지됩니다.</p>
          </div>
        </Modal>
      )}

      {/* 크롭 모달 */}
      {cropOpen && cropImageSrc && (
        <Modal
          onClose={() => {
            setCropOpen(false);
          }}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">사진 크롭</h2>
              <button className="rounded-lg border px-3 py-1 text-sm" onClick={() => setCropOpen(false)}>
                닫기
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="relative h-[360px] w-full overflow-hidden rounded-2xl border bg-black">
                <Cropper
                  image={cropImageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, pixels) => setCropPixels(pixels as CropPixels)}
                />
              </div>

              <div className="rounded-2xl border p-4">
                <div className="text-sm font-semibold">원형 미리보기</div>
                <div className="mt-3 flex items-center gap-4">
                  <div className="h-28 w-28 overflow-hidden rounded-full border bg-neutral-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {cropPreviewUrl ? (
                      <img src={cropPreviewUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <img src={cropImageSrc} alt="" className="h-full w-full object-cover opacity-70" />
                    )}
                  </div>
                  <div className="flex-1 text-xs text-neutral-500">
                    * 회전 없음<br />
                    * 크롭 후 업로드하면 서버에서 webp로 저장됩니다.
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-sm text-neutral-600">줌</label>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="mt-2 w-full"
                  />
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" onClick={() => setCropOpen(false)}>
                    취소
                  </button>
                  <button
                    disabled={uploading}
                    className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
                    onClick={confirmCropAndUpload}
                  >
                    {uploading ? "업로드 중..." : "크롭 완료"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  members,
  loading,
  onCheck,
  onAbsent,
  onOpen,
}: {
  title: string;
  subtitle: string;
  members: (Member & { age: number })[];
  loading: boolean;
  onCheck: (memberId: string, status: "PRESENT" | "LATE") => void;
  onAbsent: (memberId: string) => void;
  onOpen: (memberId: string) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="text-sm text-neutral-500">{subtitle}</div>
        </div>
        <div className="text-sm text-neutral-600">인원: {members.length}명</div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {members.map((m) => (
          <div key={m.id} className="w-[280px] shrink-0 rounded-2xl border bg-white p-3 shadow-sm">
            <button className="w-full text-left" onClick={() => onOpen(m.id)}>
              <div className="relative">
                <div className="h-40 w-full overflow-hidden rounded-2xl border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.photoUrl} alt="" className="h-full w-full object-cover" />
                </div>

                <div
                  className={[
                    "absolute right-3 top-3 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur",
                    badgeTone(m.todayStatus),
                  ].join(" ")}
                >
                  {todayLabel(m.todayStatus)}
                </div>

                <div className="absolute -bottom-5 left-3 h-14 w-14 overflow-hidden rounded-full border bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.photoUrl} alt="" className="h-full w-full object-cover" />
                </div>
              </div>

              <div className="mt-7">
                <div className="text-base font-semibold">{m.name}</div>
                <div className="text-sm text-neutral-600">
                  {m.age}세 · {fmtYmd(m.birthDate)}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <Pill label="출석 포인트" value={`${(m.totalPoints ?? 0).toLocaleString()}P`} />
                  <Pill label="올해 출석" value={`${m.yearAttendanceCount}회`} />
                </div>
              </div>
            </button>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                disabled={loading}
                onClick={() => onCheck(m.id, "PRESENT")}
                className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
              >
                출석
              </button>
              <button
                disabled={loading}
                onClick={() => onCheck(m.id, "LATE")}
                className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
              >
                지각
              </button>
              <button
                disabled={loading}
                onClick={() => onAbsent(m.id)}
                className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
              >
                결석
              </button>
            </div>
          </div>
        ))}

        {members.length === 0 && <div className="rounded-2xl border p-4 text-sm text-neutral-600">멤버가 없습니다.</div>}
      </div>
    </section>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
      <span className="text-neutral-500">{label}</span>
      <span className="font-semibold text-neutral-900">{value}</span>
    </span>
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

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="close overlay" />
      <div className="absolute left-1/2 top-1/2 w-[min(920px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-4 shadow-xl md:p-6">
        {children}
      </div>
    </div>
  );
}
