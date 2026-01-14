// 수박게임 연결 요청 승인 API (관리자용)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-session";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const force = body.force === true;

    // 요청 찾기
    const request = await prisma.watermelonConnectionRequest.findUnique({
      where: { id },
      include: {
        player: {
          select: {
            id: true,
            memberId: true,
            nickname: true,
          },
        },
        member: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    if (!request) {
      return NextResponse.json({ error: "request_not_found" }, { status: 404 });
    }

    if (request.status !== "pending") {
      return NextResponse.json({ error: "request_already_processed" }, { status: 400 });
    }

    // 멤버가 이미 다른 플레이어와 연결되어 있는지 확인
    const existingConnection = await prisma.watermelonPlayer.findFirst({
      where: {
        memberId: request.memberId,
        id: { not: request.playerId },
      },
      select: {
        id: true,
        nickname: true,
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 플레이어가 이미 다른 멤버와 연결되어 있는지 확인
    let existingPlayerMember = null;
    if (request.player.memberId) {
      const playerWithMember = await prisma.watermelonPlayer.findUnique({
        where: { id: request.playerId },
        select: {
          member: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      if (playerWithMember?.member) {
        existingPlayerMember = playerWithMember.member;
      }
    }

    // 이미 연결된 멤버가 있고 force가 false면 경고 정보 반환
    if (existingConnection && !force) {
      return NextResponse.json({
        warning: "member_already_connected",
        existingPlayer: {
          id: existingConnection.id,
          nickname: existingConnection.nickname,
          memberName: existingConnection.member?.name || null,
        },
        newPlayer: {
          id: request.player.id,
          nickname: request.player.nickname,
          existingMemberName: existingPlayerMember?.name || null,
        },
        member: {
          id: request.member.id,
          name: request.member.name,
        },
      });
    }

    // 플레이어가 이미 다른 멤버와 연결되어 있고 force가 false면 경고 정보 반환
    if (existingPlayerMember && !force) {
      return NextResponse.json({
        warning: "player_already_connected",
        existingPlayer: {
          id: request.player.id,
          nickname: request.player.nickname,
          memberName: existingPlayerMember.name,
        },
        newPlayer: {
          id: request.player.id,
          nickname: request.player.nickname,
        },
        member: {
          id: request.member.id,
          name: request.member.name,
        },
      });
    }

    // 트랜잭션으로 승인 처리
    await prisma.$transaction(async (tx) => {
      // 같은 playerId, memberId 조합의 기존 "approved" 또는 "rejected" 요청 삭제 (unique 제약조건 위반 방지)
      await tx.watermelonConnectionRequest.deleteMany({
        where: {
          playerId: request.playerId,
          memberId: request.memberId,
          status: { in: ["approved", "rejected"] },
          id: { not: id }, // 현재 요청은 제외
        },
      });

      // 멤버가 이미 다른 플레이어와 연결되어 있으면 기존 연결 해제
      if (existingConnection) {
        // 기존 플레이어와의 연결 해제
        await tx.watermelonPlayer.update({
          where: { id: existingConnection.id },
          data: { memberId: null },
        });
      }

      // 요청 상태를 승인으로 변경
      await tx.watermelonConnectionRequest.update({
        where: { id },
        data: {
          status: "approved",
          adminId: admin.adminId,
        },
      });

      // 플레이어가 이미 다른 멤버와 연결되어 있으면 기존 연결 해제
      if (request.player.memberId) {
        // 기존 멤버와의 연결 해제 (멤버 변경인 경우)
        await tx.watermelonPlayer.update({
          where: { id: request.playerId },
          data: { memberId: null },
        });
      }

      // 플레이어와 새 멤버 연결
      await tx.watermelonPlayer.update({
        where: { id: request.playerId },
        data: { memberId: request.memberId },
      });

      // 같은 멤버에 대한 다른 대기 중인 요청들을 거부 처리
      await tx.watermelonConnectionRequest.updateMany({
        where: {
          memberId: request.memberId,
          playerId: { not: request.playerId },
          status: "pending",
        },
        data: {
          status: "rejected",
          adminId: admin.adminId,
        },
      });

      // 같은 플레이어의 다른 대기 중인 요청들을 거부 처리
      await tx.watermelonConnectionRequest.updateMany({
        where: {
          playerId: request.playerId,
          memberId: { not: request.memberId },
          status: "pending",
        },
        data: {
          status: "rejected",
          adminId: admin.adminId,
        },
      });
    });

    return NextResponse.json({ 
      success: true,
      memberName: request.member.name,
    });
  } catch (error: any) {
    console.error("Failed to approve connection request:", error);
    
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "request_not_found" }, { status: 404 });
    }
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "member_already_connected" }, { status: 409 });
    }
    
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
