// 플레이어의 연결 요청 조회 API (대기 중 + 최근 거부된 요청)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get("playerId");

    if (!playerId) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    // 대기 중인 요청
    const pendingRequests = await prisma.watermelonConnectionRequest.findMany({
      where: {
        playerId,
        status: "pending",
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 최근 거부된 요청 (최근 30일 이내)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const rejectedRequests = await prisma.watermelonConnectionRequest.findMany({
      where: {
        playerId,
        status: "rejected",
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ 
      requests: pendingRequests,
      rejectedRequests: rejectedRequests,
    });
  } catch (error: any) {
    console.error("Failed to fetch requests:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
