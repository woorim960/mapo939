// 아이템 사용 API

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const playerId = typeof body.playerId === "string" ? body.playerId.trim() : "";
    const itemId = typeof body.itemId === "string" ? body.itemId.trim() : "";
    const quantity = typeof body.quantity === "number" ? body.quantity : 1;

    if (!playerId || !itemId || quantity < 1) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    // 트랜잭션으로 처리
    const result = await prisma.$transaction(async (tx) => {
      // 플레이어 인벤토리에서 아이템 찾기
      const playerItem = await tx.watermelonPlayerItem.findUnique({
        where: {
          playerId_itemId: {
            playerId,
            itemId,
          },
        },
        include: {
          item: {
            select: {
              id: true,
              name: true,
              effectType: true,
              effectValue: true,
              icon: true,
            },
          },
        },
      });

      if (!playerItem || playerItem.quantity < quantity) {
        throw new Error("insufficient_quantity");
      }

      // 수량 감소
      if (playerItem.quantity === quantity) {
        // 수량이 0이 되면 삭제
        await tx.watermelonPlayerItem.delete({
          where: { id: playerItem.id },
        });
      } else {
        // 수량 감소
        await tx.watermelonPlayerItem.update({
          where: { id: playerItem.id },
          data: { quantity: { decrement: quantity } },
        });
      }

      return {
        item: playerItem.item,
        quantity,
        remainingQuantity: playerItem.quantity - quantity,
      };
    });

    return NextResponse.json({
      success: true,
      item: result.item,
      quantity: result.quantity,
      remainingQuantity: result.remainingQuantity,
    });
  } catch (error: any) {
    console.error("Use item API error:", error);
    
    const errorMessage = error.message || "internal_error";
    if (errorMessage === "insufficient_quantity") {
      return NextResponse.json({ error: "insufficient_quantity" }, { status: 400 });
    }
    
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
