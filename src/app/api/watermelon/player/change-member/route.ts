// 수박게임 계정의 연결된 멤버 변경 API

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const playerId = typeof body.playerId === "string" ? body.playerId.trim() : "";
    const newMemberId = typeof body.newMemberId === "string" ? body.newMemberId.trim() : "";
    const nickname = typeof body.nickname === "string" ? body.nickname.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!playerId || !newMemberId || !nickname || !password) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    // 플레이어 찾기 및 패스워드 확인
    const player = await prisma.watermelonPlayer.findUnique({
      where: { id: playerId },
      select: { id: true, passwordHash: true, nickname: true, memberId: true },
    });

    if (!player) {
      return NextResponse.json({ error: "player_not_found" }, { status: 404 });
    }

    // 닉네임 확인
    if (player.nickname !== nickname) {
      return NextResponse.json({ error: "nickname_mismatch" }, { status: 400 });
    }

    // 패스워드 확인
    if (!player.passwordHash) {
      return NextResponse.json({ error: "password_not_set" }, { status: 400 });
    }

    const passwordMatch = await bcrypt.compare(password, player.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json({ error: "invalid_password" }, { status: 401 });
    }

    // 새 멤버 찾기
    const newMember = await prisma.member.findUnique({
      where: { id: newMemberId },
      select: { id: true, name: true, isActive: true },
    });

    if (!newMember || !newMember.isActive) {
      return NextResponse.json({ error: "member_not_found" }, { status: 404 });
    }

    // 새 멤버가 이미 다른 플레이어와 연결되어 있는지 확인
    const existingConnection = await prisma.watermelonPlayer.findFirst({
      where: { 
        memberId: newMemberId,
        id: { not: playerId },
      },
      select: { id: true, nickname: true },
    });

    if (existingConnection) {
      return NextResponse.json({ error: "member_already_connected" }, { status: 409 });
    }

    // 멤버 변경 (트랜잭션으로 처리)
    await prisma.$transaction(async (tx) => {
      // 기존 연결 해제
      await tx.watermelonPlayer.update({
        where: { id: playerId },
        data: { memberId: null },
      });

      // 새 멤버 연결
      await tx.watermelonPlayer.update({
        where: { id: playerId },
        data: { memberId: newMemberId },
      });
    });

    return NextResponse.json({ 
      success: true,
      memberName: newMember.name,
    });
  } catch (error: any) {
    console.error("Change member API error:", error);
    
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "player_not_found" }, { status: 404 });
    }
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "member_already_connected" }, { status: 409 });
    }
    
    return NextResponse.json(
      {
        error: "internal_error",
        message: error?.message || "Failed to change member",
      },
      { status: 500 }
    );
  }
}
