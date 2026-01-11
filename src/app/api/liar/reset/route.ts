import { NextResponse } from "next/server";
import { prisma, deleteRoom } from "@/lib/liar/db";

export const runtime = "nodejs";

type Body = { playerId?: string; roomId?: string };

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as Body | null;
  const roomId = body?.roomId?.trim();

  // roomId가 있으면 해당 방만 삭제
  if (roomId) {
    const success = await deleteRoom(roomId);
    if (!success) {
      return NextResponse.json({ ok: false, error: "room_not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  // roomId가 없으면 전체 초기화 (관리자용)
  const p = prisma();

  try {
    await p.$transaction(async tx => {
      // ✅ 플레이어/점수/닉네임 전부 삭제
      await tx.liarPlayer.deleteMany({});
      // ✅ 게임 상태 전부 삭제 (완전 초기화)
      await tx.liarGame.deleteMany({});
    });
  } catch {
    return NextResponse.json({ ok: false, error: "reset_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
