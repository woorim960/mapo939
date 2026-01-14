// 결제 요청 API (주문 생성)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getItemById } from "@/features/watermelon/utils/items";

// UUID 생성 헬퍼 함수
function generateOrderId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `order_${timestamp}_${random}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const playerId = typeof body.playerId === "string" ? body.playerId.trim() : "";
    const itemId = typeof body.itemId === "string" ? body.itemId.trim() : "";
    const quantity = typeof body.quantity === "number" ? body.quantity : 1;

    if (!playerId || !itemId) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    // 아이템 정보 조회 (하드코딩된 목록에서)
    const item = getItemById(itemId);
    if (!item) {
      return NextResponse.json({ error: "item_not_found" }, { status: 404 });
    }

    // 주문 ID 생성
    const orderId = generateOrderId();
    const amount = item.price * quantity;

    // 결제 내역 생성 (pending 상태)
    const payment = await prisma.watermelonPayment.create({
      data: {
        playerId,
        itemId,
        amount,
        paymentMethod: "toss",
        orderId,
        status: "pending",
        metadata: {
          quantity,
          itemName: item.name,
        },
      },
    });

    return NextResponse.json({
      orderId,
      amount,
      paymentId: payment.id,
    });
  } catch (error) {
    console.error("Payment request API error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
