// 수박게임 아이템 목록 조회 API (하드코딩된 목록 사용)

import { NextResponse } from "next/server";
import { getAllItems } from "@/features/watermelon/utils/items";

export async function GET() {
  try {
    // 하드코딩된 아이템 목록 반환
    const items = getAllItems();

    return NextResponse.json({
      items,
    });
  } catch (error) {
    console.error("Watermelon items API error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
