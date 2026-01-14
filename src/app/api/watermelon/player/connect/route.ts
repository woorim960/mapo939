// 수박게임 계정과 출석부 멤버 연결 API

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
    let member = null;
    try {
      member = await prisma.member.findUnique({
        where: { id: memberId },
        select: { id: true, isActive: true },
      });
    } catch (err: any) {
      console.error("Failed to find member:", err?.message);
      return NextResponse.json({ error: "member_not_found" }, { status: 404 });
    }

    if (!member || !member.isActive) {
      return NextResponse.json({ error: "member_not_found" }, { status: 404 });
    }

    // 이미 연결된 수박게임 계정이 있는지 확인 (정보 제공용, 요청은 계속 진행)
    let existingConnection: { id: string; nickname: string } | null = null;
    try {
      // memberId는 unique이지만 Prisma Client 타입이 업데이트되지 않았을 수 있으므로 findFirst 사용
      // @ts-ignore - Prisma 클라이언트 타입이 업데이트되지 않았을 수 있음
      existingConnection = await (prisma.watermelonPlayer as any).findFirst({
        where: { memberId },
        select: { id: true, nickname: true },
      });
    } catch (err: any) {
      console.warn("Failed to check existing connection, continuing:", err?.message);
      // 조회 실패는 계속 진행
    }

    // 수박게임 계정 찾기 및 패스워드 확인
    // 정확한 닉네임 매칭 (대소문자 구분)
    let player = null;
    try {
      // @ts-ignore - Prisma 클라이언트 타입이 업데이트되지 않았을 수 있음
      player = await (prisma.watermelonPlayer as any).findUnique({
        where: { nickname },
        select: { id: true, passwordHash: true, memberId: true, nickname: true },
      });
      
      // 디버깅: 플레이어를 찾지 못한 경우 로그
      if (!player) {
        console.log(`[Watermelon Connect] Player not found. Searched nickname: "${nickname}"`);
      }
    } catch (err: any) {
      console.error("[Watermelon Connect] Failed to find player:", err?.message);
      return NextResponse.json({ error: "player_not_found" }, { status: 404 });
    }

    if (!player) {
      return NextResponse.json({ error: "player_not_found" }, { status: 404 });
    }

    if (!player.passwordHash) {
      return NextResponse.json({ error: "password_not_set" }, { status: 400 });
    }

    // 패스워드 확인
    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(password, player.passwordHash);
    } catch (err: any) {
      console.error("Failed to compare password:", err?.message);
      return NextResponse.json({ error: "invalid_password" }, { status: 401 });
    }
    
    if (!passwordMatch) {
      return NextResponse.json({ error: "invalid_password" }, { status: 401 });
    }

    // 이미 다른 멤버와 연결되어 있는지 확인
    if ((player as any).memberId) {
      return NextResponse.json({ error: "player_already_connected" }, { status: 409 });
    }

    // 이미 대기 중인 요청이 있는지 확인
    // @ts-ignore - Prisma 클라이언트 타입이 업데이트되지 않았을 수 있음
    const existingRequest = await prisma.watermelonConnectionRequest.findFirst({
      where: {
        playerId: player.id,
        memberId,
        status: "pending",
      },
    });

    if (existingRequest) {
      return NextResponse.json({ error: "request_already_pending" }, { status: 409 });
    }

    // 연결 요청 생성 (관리자 승인 대기)
    try {
      // @ts-ignore - Prisma 클라이언트 타입이 업데이트되지 않았을 수 있음
      await prisma.watermelonConnectionRequest.create({
        data: {
          playerId: player.id,
          memberId,
          status: "pending",
        },
      });
    } catch (createErr: any) {
      console.error("Failed to create connection request:", createErr);
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
    console.error("Connect watermelon player API error:", error);
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
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "member_already_connected" }, { status: 409 });
    }
    
    return NextResponse.json(
      {
        error: "internal_error",
        message: error?.message || "Failed to connect watermelon account",
      },
      { status: 500 }
    );
  }
}
