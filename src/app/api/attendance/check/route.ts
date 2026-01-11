import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-session";
import { getKstYmdKey, isSundayKst, kstYmdToUtcDate, pointsFor } from "@/lib/kst-attendance";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  const status = body.status === "PRESENT" || body.status === "LATE" ? body.status : null;
  const customPoints = typeof body.points === "number" ? body.points : null;

  if (!memberId || !status) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const todayYmd = getKstYmdKey();
  const isSunday = isSundayKst(todayYmd);

  // 커스텀 포인트 입력 시 관리자 인증 필수
  if (customPoints !== null) {
    const admin = await requireAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "admin_required" }, { status: 401 });
    }
  } else if (!isSunday) {
    const admin = await requireAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "admin_required" }, { status: 401 });
    }
  }

  const date = kstYmdToUtcDate(todayYmd);
  const points = customPoints !== null ? customPoints : pointsFor(status);

  // 포인트 유효성 검증
  if (!Number.isFinite(points) || points < 0) {
    return NextResponse.json({ error: "invalid_points" }, { status: 400 });
  }

  // upsert: 같은 날이면 status/points가 자동 정정됨
  const record = await prisma.attendance.upsert({
    where: { memberId_date: { memberId, date } }, // @@unique([memberId, date]) 필요
    update: { status, points },
    create: { memberId, date, status, points },
    select: { id: true, memberId: true, date: true, status: true, points: true },
  });

  return NextResponse.json({ record, todayYmd });
}
