// 수박게임 계정과 출석부 멤버 연결 해제 API

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const memberId = typeof body.memberId === "string" ? body.memberId.trim() : "";
    const nickname = typeof body.nickname === "string" ? body.nickname.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!memberId || !nickname || !password) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    // 멤버 존재 확인
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true },
    });

    if (!member) {
      return NextResponse.json({ error: "member_not_found" }, { status: 404 });
    }

    // 수박게임 계정 찾기 및 패스워드 확인
    const player = await prisma.watermelonPlayer.findUnique({
      where: { nickname },
      select: { id: true, passwordHash: true, memberId: true },
    });

    if (!player) {
      return NextResponse.json({ error: "player_not_found" }, { status: 404 });
    }

    if (!player.passwordHash) {
      return NextResponse.json({ error: "password_not_set" }, { status: 400 });
    }

    // 패스워드 확인
    const passwordMatch = await bcrypt.compare(password, player.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json({ error: "invalid_password" }, { status: 401 });
    }

    // 연결 확인
    if (player.memberId !== memberId) {
      return NextResponse.json({ error: "not_connected" }, { status: 400 });
    }

    // 연결 해제
    await prisma.watermelonPlayer.update({
      where: { id: player.id },
      data: { memberId: null },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Disconnect watermelon player API error:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      stack: error?.stack?.substring(0, 500),
    });
    
    // 특정 에러는 더 구체적으로 처리
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "player_not_found" }, { status: 404 });
    }
    
    return NextResponse.json(
      {
        error: "internal_error",
        message: error?.message || "Failed to disconnect watermelon account",
      },
      { status: 500 }
    );
  }
}
