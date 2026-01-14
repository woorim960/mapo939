// 수박게임 플레이어 아이템 인벤토리 조회 API

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getItemById } from "@/features/watermelon/utils/items";

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
      orderBy: {
        itemId: "asc",
      },
    });

    // 하드코딩된 아이템 목록에서 아이템 정보 가져오기
    const inventoryWithItems = inventory
      .map((inv) => {
        const item = getItemById(inv.itemId);
        if (!item) return null;
        return {
          itemId: inv.itemId,
          quantity: inv.quantity,
          item: {
            id: item.id,
            name: item.name,
            description: item.description,
            effectType: item.effectType,
            effectValue: item.effectValue,
            icon: item.icon,
          },
        };
      })
      .filter((inv): inv is NonNullable<typeof inv> => inv !== null)
      .sort((a, b) => {
        // sortOrder로 정렬
        const itemA = getItemById(a.itemId);
        const itemB = getItemById(b.itemId);
        const sortOrderA = itemA?.sortOrder ?? 999;
        const sortOrderB = itemB?.sortOrder ?? 999;
        return sortOrderA - sortOrderB;
      });

    return NextResponse.json({
      inventory: inventoryWithItems,
    });
  } catch (error) {
    console.error("Watermelon inventory API error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
