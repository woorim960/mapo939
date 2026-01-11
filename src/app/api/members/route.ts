import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getYearStartKst } from "@/lib/kst";
import { requireAdminOr401 } from "@/lib/require-admin";
import { getKstYmdKey, kstYmdToUtcDate } from "@/lib/kst-attendance";

type MemberRow = {
  id: string;
  name: string;
  phone: string | null;
  birthDate: Date | null;
  photoUrl: string | null;
  isActive: boolean;
};

type CountRow = { memberId: string; _count: { _all: number } };
type SumRow = { memberId: string; _sum: { points: number | null } };
type TodayRow = { memberId: string; status: "PRESENT" | "LATE" };

type TodayStatus = "PRESENT" | "LATE" | "ABSENT";

type MemberWithStats = MemberRow & {
  yearAttendanceCount: number;
  totalPoints: number;
  todayStatus: TodayStatus;
};

/**
 * GET /api/members
 * - 누구나 조회 가능
 * - isActive=true만 반환
 * - (요청대로) totalPoints(누적 포인트) 내림차순 정렬
 */
export async function GET() {
  try {
    const yearStart = getYearStartKst();

    // ✅ 오늘(KST) 키 -> UTC Date로 변환 (Attendance.date에 저장된 값과 동일 포맷)
    const todayYmd = getKstYmdKey();
    const todayDate = kstYmdToUtcDate(todayYmd);

    // ✅ 활성 멤버 기본 정보
    const members: MemberRow[] = await prisma.member.findMany({
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
    const counts = (await prisma.attendance.groupBy({
      by: ["memberId"],
      where: {
        date: { gte: yearStart },
        status: { in: ["PRESENT", "LATE"] },
      },
      _count: { _all: true },
    })) as unknown as CountRow[];

    const countMap = new Map<string, number>(counts.map((c) => [c.memberId, c._count._all]));

    // ✅ 누적 포인트 (출석)
    const sums = (await prisma.attendance.groupBy({
      by: ["memberId"],
      where: { status: { in: ["PRESENT", "LATE"] } },
      _sum: { points: true },
    })) as unknown as SumRow[];

    const attendanceSumMap = new Map<string, number>(sums.map((s) => [s.memberId, s._sum.points ?? 0]));

    // ✅ 보너스 점수 합계
    let bonusSumMap = new Map<string, number>();
    try {
      const bonusSums = (await prisma.bonusPoints.groupBy({
        by: ["memberId"],
        _sum: { points: true },
      })) as unknown as SumRow[];

      bonusSumMap = new Map<string, number>(bonusSums.map((s) => [s.memberId, s._sum.points ?? 0]));
    } catch (err) {
      // 보너스 점수 테이블이 없거나 에러가 발생하면 빈 맵 사용
      console.error("보너스 점수 조회 실패:", err);
    }

    // ✅ 총 포인트 계산 (출석 + 보너스)
    const sumMap = new Map<string, number>();
    members.forEach((m) => {
      const attendancePoints = attendanceSumMap.get(m.id) ?? 0;
      const bonusPoints = bonusSumMap.get(m.id) ?? 0;
      sumMap.set(m.id, attendancePoints + bonusPoints);
    });

    // ✅ 오늘 상태(PRESENT/LATE/ABSENT) 계산용: 오늘 날짜의 출석 기록만 조회
    const todayRows = (await prisma.attendance.findMany({
      where: { date: todayDate },
      select: { memberId: true, status: true },
    })) as unknown as TodayRow[];

    const todayMap = new Map<string, TodayRow["status"]>(todayRows.map((r) => [r.memberId, r.status]));

    const result: MemberWithStats[] = members
      .map((m) => ({
        ...m,
        yearAttendanceCount: countMap.get(m.id) ?? 0,
        totalPoints: sumMap.get(m.id) ?? 0,
        todayStatus: (todayMap.get(m.id) ?? "ABSENT") as TodayStatus,
      }))
      // ✅ 완전히 포인트만 기준으로 내림차순 정렬
      .sort((a, b) => b.totalPoints - a.totalPoints);

    return NextResponse.json({ members: result, todayYmd });
  } catch (err) {
    console.error("멤버 목록 조회 실패:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

/**
 * POST /api/members
 * - 관리자만 가능
 * - name, birthDate, phone, photoUrl 필수
 */
export async function POST(req: Request) {
  const { response } = await requireAdminOr401();
  if (response) return response;

  const body: unknown = await req.json().catch(() => ({}));

  const data = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;

  const name = typeof data.name === "string" ? data.name.trim() : "";
  const phone = typeof data.phone === "string" ? data.phone.trim() : "";
  const birthDateStr = typeof data.birthDate === "string" ? data.birthDate : "";
  const photoUrl = typeof data.photoUrl === "string" ? data.photoUrl.trim() : "";

  if (!name || !phone || !birthDateStr || !photoUrl) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const birthDate = new Date(birthDateStr);
  if (Number.isNaN(birthDate.getTime())) {
    return NextResponse.json({ error: "invalid_birthDate" }, { status: 400 });
  }

  const member: MemberRow = await prisma.member.create({
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
