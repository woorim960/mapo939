// 플레이어의 대기 중인 연결 요청 취소 API

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const playerId = typeof body.playerId === "string" ? body.playerId.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!playerId || !password) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    // 플레이어 찾기 및 패스워드 확인
    const player = await prisma.watermelonPlayer.findUnique({
      where: { id: playerId },
      select: { id: true, passwordHash: true },
    });

    if (!player) {
      return NextResponse.json({ error: "player_not_found" }, { status: 404 });
    }

    if (!player.passwordHash) {
      return NextResponse.json({ error: "password_not_set" }, { status: 400 });
    }

    const passwordMatch = await bcrypt.compare(password, player.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json({ error: "invalid_password" }, { status: 401 });
    }

    // 대기 중인 요청 찾기
    const pendingRequest = await prisma.watermelonConnectionRequest.findFirst({
      where: {
        playerId,
        status: "pending",
      },
    });

    if (!pendingRequest) {
      return NextResponse.json({ error: "no_pending_request" }, { status: 404 });
    }

    // 요청 취소 (삭제)
    await prisma.watermelonConnectionRequest.delete({
      where: { id: pendingRequest.id },
    });

    return NextResponse.json({ 
      success: true,
      message: "대기 중인 요청이 취소되었습니다.",
    });
  } catch (error: any) {
    console.error("Cancel request API error:", error);
    
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "request_not_found" }, { status: 404 });
    }
    
    return NextResponse.json(
      {
        error: "internal_error",
        message: error?.message || "Failed to cancel request",
      },
      { status: 500 }
    );
  }
}
