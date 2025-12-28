import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getKstYmdKey, kstYmdToUtcDate } from "@/lib/kst-attendance";

/**
 * Vercel(Next build)에서 자주 터지는 포인트들:
 * 1) noImplicitAny: reduce/map 콜백 파라미터 any
 * 2) Prisma groupBy 반환 타입을 TS가 못 잡아 any로 붕괴 → reduce 제네릭도 안 먹힘
 * 3) ymd 파싱 실패(예외 케이스) 시 NaN 처리
 *
 * 아래는 위 문제들을 전부 방지한 "빌드 안전" 최종본
 */

type AttendanceStatus = "PRESENT" | "LATE";
type GroupByDateRow = { _count: { _all: number } };

function getMonthStartYmd(): string {
  const ymd = getKstYmdKey(); // "YYYY-MM-DD" (KST)
  const parts = ymd.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);

  // 방어: 형식이 깨지면(비정상) 오늘 기준 월 1일로 fallback
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    const nowYmd = getKstYmdKey();
    return `${nowYmd.slice(0, 7)}-01`;
  }

  const mm = String(m).padStart(2, "0");
  return `${y}-${mm}-01`;
}

export async function GET() {
  const todayYmd = getKstYmdKey();
  const todayDate = kstYmdToUtcDate(todayYmd);

  const statusIn: AttendanceStatus[] = ["PRESENT", "LATE"];

  // 오늘 출석 인원 수(지각 포함)
  const todayCount = await prisma.attendance.count({
    where: {
      date: todayDate,
      status: { in: statusIn },
    },
  });

  const monthStartYmd = getMonthStartYmd();
  const monthStartDate = kstYmdToUtcDate(monthStartYmd);

  // 이번 달 수행 일자 수: 해당 기간 내 "date distinct 개수"
  const monthPerformedDays = await prisma.attendance.findMany({
    where: { date: { gte: monthStartDate } },
    select: { date: true },
    distinct: ["date"],
  });

  const monthPerformedDayCount = monthPerformedDays.length;

  // 이번 달 총 출석 인원 수 합계: 날짜별 인원수 합
  const monthGroup = (await prisma.attendance.groupBy({
    by: ["date"],
    where: { date: { gte: monthStartDate }, status: { in: statusIn } },
    _count: { _all: true },
  })) as unknown as GroupByDateRow[];

  // ✅ noImplicitAny 완전 방지: 파라미터 타입 직접 지정
  const monthTotalAttendance = monthGroup.reduce(
    (sum: number, g: GroupByDateRow) => sum + g._count._all,
    0
  );
  const monthAvg = monthPerformedDayCount === 0 ? 0 : monthTotalAttendance / monthPerformedDayCount;

  // 전체 수행 일자 수
  const allPerformedDays = await prisma.attendance.findMany({
    select: { date: true },
    distinct: ["date"],
  });
  const allPerformedDayCount = allPerformedDays.length;

  const allGroup = (await prisma.attendance.groupBy({
    by: ["date"],
    where: { status: { in: statusIn } },
    _count: { _all: true },
  })) as unknown as GroupByDateRow[];

  const allTotalAttendance = allGroup.reduce(
    (sum: number, g: GroupByDateRow) => sum + g._count._all,
    0
  );
  const allAvg = allPerformedDayCount === 0 ? 0 : allTotalAttendance / allPerformedDayCount;

  return NextResponse.json({
    todayYmd,
    todayCount,
    month: {
      performedDays: monthPerformedDayCount,
      totalAttendance: monthTotalAttendance,
      avgAttendance: monthAvg,
    },
    all: {
      performedDays: allPerformedDayCount,
      totalAttendance: allTotalAttendance,
      avgAttendance: allAvg,
    },
  });
}
