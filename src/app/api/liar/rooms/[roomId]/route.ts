import { NextResponse } from "next/server";
import { getGame, deleteRoom } from "@/lib/liar/db";
import { prisma } from "@/lib/liar/db";

export const runtime = "nodejs";

// 방 정보 조회
export async function GET(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
): Promise<Response> {
  const { roomId } = await params;

  try {
    const game = await prisma().liarGame.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        stateJson: true,
      },
    });

    if (!game) {
      return NextResponse.json({ error: "room_not_found" }, { status: 404 });
    }

    const state = game.stateJson as any;
    return NextResponse.json({
      id: game.id,
      name: game.name,
      phase: state.phase ?? "LOBBY",
      playerCount: (state.players ?? []).length,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    });
  } catch (err) {
    console.error("Failed to get room:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// 방 제목 수정
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
): Promise<Response> {
  const { roomId } = await params;

  try {
    const body = (await req.json().catch(() => null)) as { name?: string; playerId?: string } | null;
    const name = body?.name?.trim();
    const playerId = body?.playerId?.trim();

    if (!name || !playerId) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    // 방장 확인 및 게임 상태 가져오기
    const game = await prisma().liarGame.findUnique({
      where: { id: roomId },
      select: { stateJson: true },
    });

    if (!game) {
      return NextResponse.json({ error: "room_not_found" }, { status: 404 });
    }

    const state = game.stateJson as any;
    const hostPlayerId = state.hostPlayerId;

    if (hostPlayerId !== playerId) {
      return NextResponse.json({ error: "only_host" }, { status: 403 });
    }

    // 방 제목 업데이트 및 게임 상태 버전 증가 (다른 플레이어들이 변경 감지하도록)
    const { getOrCreateGame, updateGameCAS } = await import("@/lib/liar/db");
    const { state: currentState, dbVersion } = await getOrCreateGame(roomId);
    
    // 게임 상태 버전 증가 (다른 플레이어들이 polling으로 감지)
    const nextState = {
      ...currentState,
      version: (currentState.version ?? 0) + 1,
    };
    
    await updateGameCAS(roomId, dbVersion, nextState);
    
    // 방 제목 업데이트
    await prisma().liarGame.update({
      where: { id: roomId },
      data: { name: name },
    });

    return NextResponse.json({ ok: true, name });
  } catch (err) {
    console.error("Failed to update room name:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// 방 삭제
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
): Promise<Response> {
  const { roomId } = await params;

  try {
    const success = await deleteRoom(roomId);
    if (!success) {
      return NextResponse.json({ error: "room_not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete room:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
