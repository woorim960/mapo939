import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getKstYmdKey, kstYmdToUtcDate } from "@/lib/kst-attendance";
import { getKoreanAge } from "@/lib/kst";

function getMonthStartYmd(): string {
  const ymd = getKstYmdKey();
  const [y, m] = ymd.split("-").map(Number);
  const mm = String(m).padStart(2, "0");
  return `${y}-${mm}-01`;
}

function getYearStartYmd(): string {
  const ymd = getKstYmdKey();
  const [y] = ymd.split("-").map(Number);
  return `${y}-01-01`;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: memberId } = await ctx.params;

  if (!memberId) {
    return NextResponse.json({ error: "missing_member_id" }, { status: 400 });
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, name: true, phone: true, birthDate: true, photoUrl: true, isActive: true },
  });

  if (!member || !member.isActive) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const monthStart = kstYmdToUtcDate(getMonthStartYmd());
  const yearStart = kstYmdToUtcDate(getYearStartYmd());

  // "모임 수" = 출석체크 수행일자 수(해당 기간 내 attendance가 1건이라도 있는 날짜 수)
  const [monthMeetingDaysRows, yearMeetingDaysRows] = await Promise.all([
    prisma.attendance.findMany({
      where: { date: { gte: monthStart } },
      select: { date: true },
      distinct: ["date"],
    }),
    prisma.attendance.findMany({
      where: { date: { gte: yearStart } },
      select: { date: true },
      distinct: ["date"],
    }),
  ]);

  const monthMeetingDays = monthMeetingDaysRows.length;
  const yearMeetingDays = yearMeetingDaysRows.length;

  // ✅ 출석/지각 분리
  const [monthPresent, monthLate, yearPresent, yearLate, totalPoints, yearPoints] = await Promise.all([
    prisma.attendance.count({
      where: { memberId, date: { gte: monthStart }, status: "PRESENT" },
    }),
    prisma.attendance.count({
      where: { memberId, date: { gte: monthStart }, status: "LATE" },
    }),
    prisma.attendance.count({
      where: { memberId, date: { gte: yearStart }, status: "PRESENT" },
    }),
    prisma.attendance.count({
      where: { memberId, date: { gte: yearStart }, status: "LATE" },
    }),
    prisma.attendance.aggregate({
      where: { memberId, status: { in: ["PRESENT", "LATE"] } },
      _sum: { points: true },
    }),
    prisma.attendance.aggregate({
      where: { memberId, date: { gte: yearStart }, status: { in: ["PRESENT", "LATE"] } },
      _sum: { points: true },
    }),
  ]);

  const monthCount = monthPresent + monthLate;
  const yearCount = yearPresent + yearLate;

  const monthRate = monthMeetingDays === 0 ? 0 : monthCount / monthMeetingDays;
  const yearRate = yearMeetingDays === 0 ? 0 : yearCount / yearMeetingDays;

  const age = getKoreanAge(member.birthDate);

  return NextResponse.json({
    member: {
      id: member.id,
      name: member.name,
      phone: member.phone,
      birthDate: member.birthDate,
      photoUrl: member.photoUrl,
      age,
    },
    points: {
      total: totalPoints._sum.points ?? 0,
      yearTotal: yearPoints._sum.points ?? 0,
    },
    attendance: {
      month: {
        present: monthPresent,
        late: monthLate,
        count: monthCount,
        meetingDays: monthMeetingDays, // 프론트에서 "모임 수"로 표시
        rate: monthRate,
      },
      year: {
        present: yearPresent,
        late: yearLate,
        count: yearCount,
        meetingDays: yearMeetingDays, // 프론트에서 "모임 수"로 표시
        rate: yearRate,
      },
    },
  });
}
