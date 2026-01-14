// 수박게임 연결 요청 거부 API (관리자용)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-session";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await ctx.params;

    // 요청 찾기
    const request = await prisma.watermelonConnectionRequest.findUnique({
      where: { id },
    });

    if (!request) {
      return NextResponse.json({ error: "request_not_found" }, { status: 404 });
    }

    if (request.status !== "pending") {
      return NextResponse.json({ error: "request_already_processed" }, { status: 400 });
    }

    // 요청 거부
    await prisma.watermelonConnectionRequest.update({
      where: { id },
      data: {
        status: "rejected",
        adminId: admin.adminId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to reject connection request:", error);
    
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "request_not_found" }, { status: 404 });
    }
    
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
