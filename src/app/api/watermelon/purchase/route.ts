// 포인트로 아이템 구매 API

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getItemById } from "@/features/watermelon/utils/items";

type PointType = "game" | "attendance";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const playerId = typeof body.playerId === "string" ? body.playerId.trim() : "";
    const itemId = typeof body.itemId === "string" ? body.itemId.trim() : "";
    const quantity = typeof body.quantity === "number" ? body.quantity : 1;
    const pointType: PointType = body.pointType === "attendance" ? "attendance" : "game";
    const selectedTier = typeof body.selectedTier === "number" ? body.selectedTier : undefined; // 다음 과일 지정 아이템용

    if (!playerId || !itemId || quantity < 1) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    // 트랜잭션으로 처리
    const result = await prisma.$transaction(async (tx) => {
      // 플레이어 찾기
      const player = await tx.watermelonPlayer.findUnique({
        where: { id: playerId },
        select: { id: true, gamePoints: true, memberId: true },
      });

      if (!player) {
        throw new Error("player_not_found");
      }

      // 아이템 찾기 (하드코딩된 목록에서)
      const item = getItemById(itemId);
      if (!item) {
        throw new Error("item_not_found");
      }

      // 다음 과일 지정 아이템은 동적 가격 (선택한 과일의 레벨 x 10)
      let totalPrice = item.price * quantity;
      if (item.effectType === "select_next_fruit") {
        if (selectedTier === undefined || selectedTier < 0 || selectedTier > 10) {
          throw new Error("invalid_tier");
        }
        totalPrice = selectedTier * 10 * quantity;
      }

      // 포인트 확인 및 차감
      if (pointType === "game") {
        // 수박게임 포인트 사용
        const currentPoints = player.gamePoints ?? 1000;
        if (currentPoints < totalPrice) {
          throw new Error("insufficient_points");
        }

        // 포인트 차감
        await tx.watermelonPlayer.update({
          where: { id: playerId },
          data: { gamePoints: { decrement: totalPrice } },
        });
      } else {
        // 출석 포인트 사용
        if (!player.memberId) {
          throw new Error("not_connected");
        }

        // 출석 포인트 계산 (사용 내역 제외)
        let usedPoints = { _sum: { pointsUsed: null as number | null } };
        try {
          usedPoints = await tx.attendancePointsUsage.aggregate({
            where: { memberId: player.memberId },
            _sum: { pointsUsed: true },
          });
        } catch (err: any) {
          console.warn("Failed to get attendance points usage, assuming 0:", err?.message);
          usedPoints = { _sum: { pointsUsed: 0 } };
        }

        const [attendancePoints, bonusPoints] = await Promise.all([
          tx.attendance.aggregate({
            where: {
              memberId: player.memberId,
              status: { in: ["PRESENT", "LATE"] },
            },
            _sum: { points: true },
          }),
          tx.bonusPoints.aggregate({
            where: { memberId: player.memberId },
            _sum: { points: true },
          }),
        ]);

        const totalEarned =
          (attendancePoints._sum.points ?? 0) + (bonusPoints._sum.points ?? 0);
        const totalUsed = usedPoints._sum.pointsUsed ?? 0;
        const availablePoints = totalEarned - totalUsed;

        if (availablePoints < totalPrice) {
          throw new Error("insufficient_points");
        }
      }

      // 아이템 지급 (인벤토리에 추가)
      const existingItem = await tx.watermelonPlayerItem.findUnique({
        where: {
          playerId_itemId: {
            playerId,
            itemId,
          },
        },
      });

      if (existingItem) {
        // 이미 있으면 수량 증가
        await tx.watermelonPlayerItem.update({
          where: { id: existingItem.id },
          data: { quantity: { increment: quantity } },
        });
      } else {
        // 없으면 새로 생성
        await tx.watermelonPlayerItem.create({
          data: {
            playerId,
            itemId,
            quantity,
          },
        });
      }

      // 구매 내역 기록
      const purchase = await tx.watermelonItemPurchase.create({
        data: {
          playerId,
          itemId,
          quantity,
          pointType: pointType === "attendance" ? "attendance" : pointType === "game" ? "game" : null,
          pointsUsed: pointType !== "attendance" && pointType !== "game" ? null : totalPrice,
        },
      });

      // 출석 포인트 사용 내역 기록 (출석 포인트 사용 시)
      if (pointType === "attendance" && player.memberId) {
        try {
          await tx.attendancePointsUsage.create({
            data: {
              memberId: player.memberId,
              playerId,
              itemId,
              quantity,
              pointsUsed: totalPrice,
              purchaseId: purchase.id,
            },
          });
        } catch (err: any) {
          console.error("Failed to create attendance points usage:", err);
          // 사용 내역 기록 실패해도 구매는 완료된 것으로 처리
          // (포인트는 이미 차감되었으므로)
        }
      }

      return { quantity, pointType };
    }, {
      timeout: 10000, // 10초 타임아웃
    });

    // 트랜잭션 완료 후 아이템 정보 다시 가져오기 (트랜잭션 외부에서)
    const item = getItemById(itemId);
    if (!item) {
      throw new Error("item_not_found");
    }

    return NextResponse.json({
      success: true,
      item: {
        id: item.id,
        name: item.name,
        quantity: result.quantity,
        effectType: item.effectType,
        effectValue: item.effectType === "select_next_fruit" && selectedTier !== undefined
          ? { tier: selectedTier }
          : item.effectValue,
        icon: item.icon,
      },
      pointType: result.pointType,
    });
  } catch (error: any) {
    console.error("Purchase item API error:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      name: error?.name,
    });
    
    const errorMessage = error.message || "internal_error";
    if (errorMessage === "player_not_found") {
      return NextResponse.json({ error: "player_not_found" }, { status: 404 });
    }
    if (errorMessage === "item_not_found") {
      return NextResponse.json({ error: "item_not_found" }, { status: 404 });
    }
    if (errorMessage === "insufficient_points") {
      return NextResponse.json({ error: "insufficient_points" }, { status: 400 });
    }
    if (errorMessage === "not_connected") {
      return NextResponse.json({ error: "not_connected" }, { status: 400 });
    }
    if (errorMessage === "invalid_tier") {
      return NextResponse.json({ error: "invalid_tier" }, { status: 400 });
    }
    
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
