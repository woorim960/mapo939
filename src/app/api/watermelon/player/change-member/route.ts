// 수박게임 계정의 연결된 멤버 변경 API (관리자 승인 필요)

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
    // @ts-ignore - Prisma 클라이언트 타입이 업데이트되지 않았을 수 있음
    const player = await (prisma.watermelonPlayer as any).findUnique({
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

    // 현재 멤버와 동일하면 에러
    if ((player as any).memberId === newMemberId) {
      return NextResponse.json({ error: "same_member" }, { status: 400 });
    }

    // 새 멤버가 이미 다른 플레이어와 연결되어 있는지 확인 (정보 제공용, 요청은 계속 진행)
    // @ts-ignore - Prisma 클라이언트 타입이 업데이트되지 않았을 수 있음
    const existingConnection = await (prisma.watermelonPlayer as any).findFirst({
      where: { 
        memberId: newMemberId,
        id: { not: playerId },
      },
      select: { id: true, nickname: true },
    });

    // 이미 대기 중인 변경 요청이 있는지 확인
    // @ts-ignore - Prisma 클라이언트 타입이 업데이트되지 않았을 수 있음
    const existingRequest = await prisma.watermelonConnectionRequest.findFirst({
      where: {
        playerId: player.id,
        memberId: newMemberId,
        status: "pending",
      },
    });

    if (existingRequest) {
      return NextResponse.json({ error: "request_already_pending" }, { status: 409 });
    }

    // 변경 요청 생성 (관리자 승인 대기)
    try {
      // @ts-ignore - Prisma 클라이언트 타입이 업데이트되지 않았을 수 있음
      await prisma.watermelonConnectionRequest.create({
        data: {
          playerId: player.id,
          memberId: newMemberId,
          status: "pending",
        },
      });
    } catch (createErr: any) {
      console.error("Failed to create change request:", createErr);
      if (createErr?.code === "P2002") {
        return NextResponse.json({ error: "request_already_exists" }, { status: 409 });
      }
      throw createErr;
    }

    return NextResponse.json({ 
      success: true,
      message: "관리자 승인 요청을 완료했습니다.",
      existingConnection: existingConnection ? {
        nickname: existingConnection.nickname,
      } : null,
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
