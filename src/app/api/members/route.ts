import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getYearStartKst } from "@/lib/kst";
import { requireAdminOr401 } from "@/lib/require-admin";
import { getKstYmdKey, kstYmdToUtcDate } from "@/lib/kst-attendance";

/**
 * GET /api/members
 * - 누구나 조회 가능
 * - isActive=true만 반환
 * - yearAttendanceCount(올해 출석/지각 횟수) 내림차순 정렬
 */
export async function GET() {
  const yearStart = getYearStartKst();

  // ✅ 오늘(KST) 키 -> UTC Date로 변환 (Attendance.date에 저장된 값과 동일 포맷)
  const todayYmd = getKstYmdKey();
  const todayDate = kstYmdToUtcDate(todayYmd);

  const members = await prisma.member.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      phone: true, // ✅ 공개
      birthDate: true,
      photoUrl: true,
      isActive: true,
    },
  });

  // ✅ 올해 출석(출석/지각) 횟수
  const counts = await prisma.attendance.groupBy({
    by: ["memberId"],
    where: {
      date: { gte: yearStart },
      status: { in: ["PRESENT", "LATE"] },
    },
    _count: { _all: true },
  });
  const countMap = new Map(counts.map((c) => [c.memberId, c._count._all]));

  // ✅ 누적 포인트
  const sums = await prisma.attendance.groupBy({
    by: ["memberId"],
    where: { status: { in: ["PRESENT", "LATE"] } },
    _sum: { points: true },
  });
  const sumMap = new Map(sums.map((s) => [s.memberId, s._sum.points ?? 0]));

  // ✅ 오늘 상태(PRESENT/LATE/ABSENT) 계산용: 오늘 날짜의 출석 기록만 조회
  const todayRows = await prisma.attendance.findMany({
    where: { date: todayDate },
    select: { memberId: true, status: true },
  });
  const todayMap = new Map(todayRows.map((r) => [r.memberId, r.status])); // "PRESENT" | "LATE"

  const result = members
    .map((m) => ({
      ...m,
      yearAttendanceCount: countMap.get(m.id) ?? 0,
      totalPoints: sumMap.get(m.id) ?? 0,
      todayStatus: (todayMap.get(m.id) ?? "ABSENT") as "PRESENT" | "LATE" | "ABSENT",
    }))
    // ✅ 완전히 포인트만 기준으로 내림차순 정렬
    .sort((a, b) => b.totalPoints - a.totalPoints);

  return NextResponse.json({ members: result, todayYmd });
}



/**
 * POST /api/members
 * - 관리자만 가능
 * - name, birthDate, phone, photoUrl 필수
 */
export async function POST(req: Request) {
  const { response } = await requireAdminOr401();
  if (response) return response;

  const body = await req.json().catch(() => ({} as any));

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const birthDateStr = typeof body.birthDate === "string" ? body.birthDate : "";
  const photoUrl = typeof body.photoUrl === "string" ? body.photoUrl.trim() : "";

  if (!name || !phone || !birthDateStr || !photoUrl) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const birthDate = new Date(birthDateStr);
  if (Number.isNaN(birthDate.getTime())) {
    return NextResponse.json({ error: "invalid_birthDate" }, { status: 400 });
  }

  const member = await prisma.member.create({
    data: { name, phone, birthDate, photoUrl, isActive: true },
    select: {
      id: true,
      name: true,
      phone: true,
      birthDate: true,
      photoUrl: true,
      isActive: true,
    },
  });

  return NextResponse.json({ member }, { status: 201 });
}
