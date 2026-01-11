import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOr401 } from "@/lib/require-admin";

export async function POST(req: Request) {
  try {
    const { response } = await requireAdminOr401();
    if (response) return response;

    const body = await req.json().catch(() => ({} as any));
    const memberId = typeof body.memberId === "string" ? body.memberId : "";
    const points = typeof body.points === "number" ? body.points : null;
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!memberId || points === null || !reason) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    if (points < 0 || !Number.isFinite(points)) {
      return NextResponse.json({ error: "invalid_points" }, { status: 400 });
    }

    // 멤버 존재 확인
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, isActive: true },
    });

    if (!member || !member.isActive) {
      return NextResponse.json({ error: "member_not_found" }, { status: 404 });
    }

    const bonusPoints = await prisma.bonusPoints.create({
      data: {
        memberId,
        points,
        reason,
      },
      select: {
        id: true,
        memberId: true,
        points: true,
        reason: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ bonusPoints }, { status: 201 });
  } catch (err) {
    console.error("보너스 점수 추가 실패:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
