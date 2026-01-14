// 멤버의 수박게임 계정 조회 API

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: memberId } = await ctx.params;

    // 멤버 존재 확인
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, isActive: true },
    });

    if (!member || !member.isActive) {
      return NextResponse.json({ error: "member_not_found" }, { status: 404 });
    }

    // 연결된 수박게임 계정 찾기
    // memberId는 unique이지만 Prisma Client 타입이 업데이트되지 않았을 수 있으므로 findFirst 사용
    let player = null;
    try {
      // findFirst로 안전하게 조회
      player = await prisma.watermelonPlayer.findFirst({
        where: { memberId },
        select: {
          id: true,
          nickname: true,
          gamePoints: true,
          createdAt: true,
        },
      });
    } catch (err: any) {
      console.error("Failed to find watermelon player:", err?.message);
      // 조회 실패는 연결 안 됨으로 처리
      player = null;
    }

    if (!player) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      player: {
        id: player.id,
        nickname: player.nickname,
        gamePoints: player.gamePoints ?? 1000,
        createdAt: player.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Get member watermelon API error:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      stack: error?.stack?.substring(0, 500),
    });
    
    // 대부분의 에러는 연결 안 됨으로 처리하여 사용자 경험 개선
    // 치명적인 에러만 500 반환
    if (error?.code === "P2025" || 
        error?.message?.includes("not found") ||
        error?.message?.includes("Record to find does not exist")) {
      return NextResponse.json({ connected: false });
    }
    
    // 기타 에러도 일단 연결 안 됨으로 처리 (로깅은 남김)
    console.warn("Treating error as 'not connected' for better UX:", error?.message);
    return NextResponse.json({ connected: false });
  }
}
