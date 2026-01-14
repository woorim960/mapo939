// 아이템 사용 API

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getItemById } from "@/features/watermelon/utils/items";

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
      try {
        // 플레이어 인벤토리에서 아이템 찾기
        const playerItem = await tx.watermelonPlayerItem.findUnique({
          where: {
            playerId_itemId: {
              playerId,
              itemId,
            },
          },
        });

        if (!playerItem) {
          throw new Error("insufficient_quantity");
        }

        if (playerItem.quantity < quantity) {
          throw new Error("insufficient_quantity");
        }

        // 하드코딩된 아이템 목록에서 아이템 정보 가져오기
        const item = getItemById(itemId);
        if (!item) {
          throw new Error("item_not_found");
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
          item: {
            id: item.id,
            name: item.name,
            effectType: item.effectType,
            effectValue: item.effectValue,
            icon: item.icon,
          },
          quantity,
          remainingQuantity: playerItem.quantity - quantity,
        };
      } catch (txError: any) {
        // 트랜잭션 내 에러를 명확히 처리
        console.error("Transaction error in useItem:", txError);
        throw txError;
      }
    });

    return NextResponse.json({
      success: true,
      item: result.item,
      quantity: result.quantity,
      remainingQuantity: result.remainingQuantity,
    });
  } catch (error: any) {
    console.error("Use item API error:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    
    const errorMessage = error?.message || "internal_error";
    
    // Prisma 에러 처리
    if (error?.code === "P2025") {
      // Record not found
      return NextResponse.json({ error: "insufficient_quantity" }, { status: 400 });
    }
    
    if (errorMessage === "insufficient_quantity") {
      return NextResponse.json({ error: "insufficient_quantity" }, { status: 400 });
    }
    
    // 기타 Prisma 에러 코드 처리
    if (error?.code) {
      console.error("Prisma error code:", error.code);
    }
    
    return NextResponse.json({ 
      error: "internal_error",
      message: process.env.NODE_ENV === "development" ? errorMessage : undefined
    }, { status: 500 });
  }
}
