import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-session";
import { getKstYmdKey, isSundayKst, kstYmdToUtcDate, pointsFor } from "@/lib/kst-attendance";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  const status = body.status === "PRESENT" || body.status === "LATE" ? body.status : null;

  if (!memberId || !status) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const todayYmd = getKstYmdKey();
  const isSunday = isSundayKst(todayYmd);

  if (!isSunday) {
    const admin = await requireAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "admin_required" }, { status: 401 });
    }
  }

  const date = kstYmdToUtcDate(todayYmd);
  const points = pointsFor(status);

  // upsert: 같은 날이면 status/points가 자동 정정됨
  const record = await prisma.attendance.upsert({
    where: { memberId_date: { memberId, date } }, // @@unique([memberId, date]) 필요
    update: { status, points },
    create: { memberId, date, status, points },
    select: { id: true, memberId: true, date: true, status: true, points: true },
  });

  return NextResponse.json({ record, todayYmd });
}
