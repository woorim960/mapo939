// 멤버별 연결된 플레이어 정보 조회 API

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const memberIds = searchParams.get("memberIds");
    
    if (!memberIds) {
      return NextResponse.json({ error: "memberIds_required" }, { status: 400 });
    }

    const memberIdArray = memberIds.split(",").filter((id) => id.trim());

    if (memberIdArray.length === 0) {
      return NextResponse.json({ connectedPlayers: {} });
    }

    // 멤버별 연결된 플레이어 정보 조회
    const players = await prisma.watermelonPlayer.findMany({
      where: {
        memberId: { in: memberIdArray },
      },
      select: {
        id: true,
        nickname: true,
        memberId: true,
      },
    });

    // memberId -> nickname 매핑 생성
    const connectedPlayers: Record<string, string> = {};
    players.forEach((player) => {
      if (player.memberId) {
        connectedPlayers[player.memberId] = player.nickname;
      }
    });

    return NextResponse.json({ connectedPlayers });
  } catch (error: any) {
    console.error("Failed to fetch connected players:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
