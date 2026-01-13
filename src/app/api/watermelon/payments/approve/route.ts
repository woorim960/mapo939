// 결제 승인 API

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const paymentKey = typeof body.paymentKey === "string" ? body.paymentKey.trim() : "";
    const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
    const amount = typeof body.amount === "number" ? body.amount : 0;

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    // 결제 내역 조회
    const payment = await prisma.watermelonPayment.findFirst({
      where: { orderId },
      include: {
        item: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "payment_not_found" }, { status: 404 });
    }

    if (payment.status !== "pending") {
      return NextResponse.json({ error: "invalid_payment_status" }, { status: 400 });
    }

    // 금액 검증
    if (payment.amount !== amount) {
      return NextResponse.json({ error: "amount_mismatch" }, { status: 400 });
    }

    // 토스페이먼츠 결제 승인 API 호출
    // 환경 변수가 없으면 테스트 키 사용 (개발 환경)
    const secretKey = process.env.TOSS_PAYMENTS_WIDGET_SECRET_KEY || "test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6";

    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;

    const tossResponse = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount,
      }),
    });

    const tossData = await tossResponse.json();

    if (!tossResponse.ok) {
      // 결제 승인 실패
      await prisma.watermelonPayment.update({
        where: { id: payment.id },
        data: {
          status: "failed",
          metadata: {
            ...(payment.metadata as any),
            error: tossData,
          },
        },
      });

      return NextResponse.json(
        {
          error: "payment_approval_failed",
          code: tossData.code,
          message: tossData.message,
        },
        { status: 400 }
      );
    }

    // 결제 승인 성공
    // 결제 내역 업데이트
    await prisma.watermelonPayment.update({
      where: { id: payment.id },
      data: {
        paymentKey,
        status: "completed",
        metadata: {
          ...(payment.metadata as any),
          tossPayment: tossData,
        },
      },
    });

    // 아이템 구매 내역 생성
    const purchase = await prisma.watermelonItemPurchase.create({
      data: {
        playerId: payment.playerId,
        itemId: payment.itemId!,
        quantity: (payment.metadata as any)?.quantity || 1,
        paymentId: payment.id,
      },
    });

    // 플레이어 인벤토리 업데이트 (보유 아이템 추가)
    const quantity = (payment.metadata as any)?.quantity || 1;
    await prisma.watermelonPlayerItem.upsert({
      where: {
        playerId_itemId: {
          playerId: payment.playerId,
          itemId: payment.itemId!,
        },
      },
      create: {
        playerId: payment.playerId,
        itemId: payment.itemId!,
        quantity,
      },
      update: {
        quantity: {
          increment: quantity,
        },
      },
    });

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      purchaseId: purchase.id,
      item: payment.item,
      quantity,
    });
  } catch (error) {
    console.error("Payment approval API error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
