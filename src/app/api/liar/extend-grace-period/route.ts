import { NextResponse } from "next/server";
import { prisma, getOrCreateGame, updateGameCAS } from "@/lib/liar/db";
import type { GameState } from "@/lib/liar/types";

export const runtime = "nodejs";

type Body = {
  roomId: string;
  playerId: string;
};

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json().catch(() => null)) as Body | null;
    const roomId = body?.roomId?.trim();
    const playerId = body?.playerId?.trim();

    if (!roomId || !playerId) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    // 방 정보 가져오기
    const p = prisma();
    const room = await p.liarGame.findUnique({
      where: { id: roomId },
      select: { createdAt: true },
    });

    if (!room) {
      return NextResponse.json({ error: "room_not_found" }, { status: 404 });
    }

    // 방 생성 시간을 1분 연장 (현재 시간으로 업데이트)
    await p.liarGame.update({
      where: { id: roomId },
      data: {
        createdAt: new Date(), // 현재 시간으로 업데이트하여 1분 연장
      },
    });

    // 게임 상태 버전 증가하여 클라이언트에 알림
    const { state, dbVersion } = await getOrCreateGame(roomId);
    const nextState: GameState = {
      ...state,
      version: (state.version ?? 0) + 1,
    };
    await updateGameCAS(roomId, dbVersion, nextState);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to extend grace period:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
