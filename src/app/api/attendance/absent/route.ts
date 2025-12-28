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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("id");

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

  const [monthPerformedDays, yearPerformedDays] = await Promise.all([
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

  const [monthCount, yearCount, totalPoints, yearPoints] = await Promise.all([
    prisma.attendance.count({
      where: { memberId, date: { gte: monthStart }, status: { in: ["PRESENT", "LATE"] } },
    }),
    prisma.attendance.count({
      where: { memberId, date: { gte: yearStart }, status: { in: ["PRESENT", "LATE"] } },
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

  const monthDen = monthPerformedDays.length;
  const yearDen = yearPerformedDays.length;

  const monthRate = monthDen === 0 ? 0 : monthCount / monthDen;
  const yearRate = yearDen === 0 ? 0 : yearCount / yearDen;

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
      month: { count: monthCount, performedDays: monthDen, rate: monthRate },
      year: { count: yearCount, performedDays: yearDen, rate: yearRate },
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const memberId = body?.memberId as string | undefined;

  if (!memberId) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const todayYmd = getKstYmdKey();
  const date = kstYmdToUtcDate(todayYmd);

  await prisma.attendance.deleteMany({
    where: { memberId, date },
  });

  return NextResponse.json({ ok: true, todayYmd });
}