// 출석 포인트 조회 API

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get("playerId");

    if (!playerId) {
      return NextResponse.json({ error: "player_id_required" }, { status: 400 });
    }

    // 플레이어 찾기
    const player = await prisma.watermelonPlayer.findUnique({
      where: { id: playerId },
      select: { id: true, memberId: true },
    });

    if (!player) {
      return NextResponse.json({ error: "player_not_found" }, { status: 404 });
    }

    // 연결된 멤버가 없으면 출석 포인트 0
    if (!player.memberId) {
      return NextResponse.json({
        attendancePoints: 0,
        connected: false,
      });
    }

    // 멤버 정보 조회
    const member = await prisma.member.findUnique({
      where: { id: player.memberId },
      select: { id: true, name: true },
    }).catch(() => null); // 멤버가 없어도 계속 진행

    // 출석 포인트 계산 (사용 내역 제외)
    let usedPoints = { _sum: { pointsUsed: 0 } };
    
    // attendancePointsUsage 모델이 있는지 확인하고 조회
    try {
      // Prisma Client에 모델이 있는지 확인
      if ('attendancePointsUsage' in prisma && typeof (prisma as any).attendancePointsUsage !== 'undefined') {
        usedPoints = await (prisma as any).attendancePointsUsage.aggregate({
          where: { memberId: player.memberId },
          _sum: { pointsUsed: true },
        });
      } else {
        console.warn("attendancePointsUsage model not available in Prisma Client");
      }
    } catch (err: any) {
      console.warn("Failed to get attendance points usage, assuming 0:", err?.message);
      // 모델이 없거나 에러가 발생하면 사용 내역을 0으로 처리
      usedPoints = { _sum: { pointsUsed: 0 } };
    }

    const [attendancePoints, bonusPoints] = await Promise.all([
      prisma.attendance.aggregate({
        where: {
          memberId: player.memberId,
          status: { in: ["PRESENT", "LATE"] },
        },
        _sum: { points: true },
      }),
      prisma.bonusPoints.aggregate({
        where: { memberId: player.memberId },
        _sum: { points: true },
      }),
    ]);

    const totalEarned =
      (attendancePoints._sum.points ?? 0) + (bonusPoints._sum.points ?? 0);
    const totalUsed = usedPoints._sum.pointsUsed ?? 0;
    const availablePoints = totalEarned - totalUsed;

    return NextResponse.json({
      attendancePoints: availablePoints,
      totalEarned,
      totalUsed,
      connected: true,
      memberId: player.memberId,
      memberName: member?.name || null,
    });
  } catch (error: any) {
    console.error("Get attendance points API error:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      stack: error?.stack?.substring(0, 500), // 스택 트레이스 일부만
    });
    
    // 플레이어가 연결되지 않은 경우는 정상적인 응답으로 처리
    if (error?.code === "P2025" || error?.message?.includes("not found")) {
      return NextResponse.json({
        attendancePoints: 0,
        connected: false,
      });
    }
    
    return NextResponse.json(
      {
        error: "internal_error",
        message: error?.message || "Failed to get attendance points",
      },
      { status: 500 }
    );
  }
}
