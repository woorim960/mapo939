// 수박게임 연결 요청 목록 조회 API (관리자용)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-session";

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const requests = await prisma.watermelonConnectionRequest.findMany({
      where: {
        status: "pending",
      },
      include: {
        player: {
          select: {
            id: true,
            nickname: true,
            gamePoints: true,
            createdAt: true,
          },
        },
        member: {
          select: {
            id: true,
            name: true,
            phone: true,
            photoUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error("Failed to fetch connection requests:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
