// 수박게임 플레이어 아이템 인벤토리 조회 API

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const playerId = url.searchParams.get("playerId")?.trim();

    if (!playerId) {
      return NextResponse.json({ error: "player_id_required" }, { status: 400 });
    }

    // 플레이어의 보유 아이템 조회
    const inventory = await prisma.watermelonPlayerItem.findMany({
      where: {
        playerId,
        quantity: {
          gt: 0, // 수량이 0보다 큰 것만
        },
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            description: true,
            effectType: true,
            effectValue: true,
            icon: true,
          },
        },
      },
      orderBy: {
        item: {
          sortOrder: "asc",
        },
      },
    });

    return NextResponse.json({
      inventory: inventory.map((inv) => ({
        itemId: inv.itemId,
        quantity: inv.quantity,
        item: inv.item,
      })),
    });
  } catch (error) {
    console.error("Watermelon inventory API error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
