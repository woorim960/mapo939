import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getKstYmdKey, kstYmdToUtcDate } from "@/lib/kst-attendance";

function getMonthStartYmd(): string {
  const ymd = getKstYmdKey();
  const [y, m] = ymd.split("-").map(Number);
  const mm = String(m).padStart(2, "0");
  return `${y}-${mm}-01`;
}

export async function GET() {
  const todayYmd = getKstYmdKey();
  const todayDate = kstYmdToUtcDate(todayYmd);

  // 오늘 출석 인원 수(지각 포함)
  const todayCount = await prisma.attendance.count({
    where: {
      date: todayDate,
      status: { in: ["PRESENT", "LATE"] },
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

  // 이번 달 총 출석 인원 수 합계: 날짜별 인원수 합을 구해야 함
  // -> groupBy date 해서 각 date별 count를 더하면 됨
  const monthGroup = await prisma.attendance.groupBy({
    by: ["date"],
    where: { date: { gte: monthStartDate }, status: { in: ["PRESENT", "LATE"] } },
    _count: { _all: true },
  });

  const monthTotalAttendance = monthGroup.reduce((sum, g) => sum + g._count._all, 0);
  const monthAvg = monthPerformedDayCount === 0 ? 0 : monthTotalAttendance / monthPerformedDayCount;

  // 전체 수행 일자 수
  const allPerformedDays = await prisma.attendance.findMany({
    select: { date: true },
    distinct: ["date"],
  });
  const allPerformedDayCount = allPerformedDays.length;

  const allGroup = await prisma.attendance.groupBy({
    by: ["date"],
    where: { status: { in: ["PRESENT", "LATE"] } },
    _count: { _all: true },
  });

  const allTotalAttendance = allGroup.reduce((sum, g) => sum + g._count._all, 0);
  const allAvg = allPerformedDayCount === 0 ? 0 : allTotalAttendance / allPerformedDayCount;

  return NextResponse.json({
    todayYmd,
    todayCount,
    month: { performedDays: monthPerformedDayCount, totalAttendance: monthTotalAttendance, avgAttendance: monthAvg },
    all: { performedDays: allPerformedDayCount, totalAttendance: allTotalAttendance, avgAttendance: allAvg },
  });
}
