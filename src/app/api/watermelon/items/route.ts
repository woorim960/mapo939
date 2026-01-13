// 수박게임 아이템 목록 조회 API

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 활성화된 아이템만 조회 (정렬 순서대로)
    const items = await prisma.watermelonItem.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        effectType: true,
        effectValue: true,
        icon: true,
      },
    });

    return NextResponse.json({
      items,
    });
  } catch (error) {
    console.error("Watermelon items API error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
