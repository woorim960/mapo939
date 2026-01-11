import { NextResponse } from "next/server";
import { prisma, getOrCreateGame, updateGameCAS } from "@/lib/liar/db";
import type { GameState } from "@/lib/liar/types";
import {
  FINAL_SCORE,
  buildScoreMap,
  toPublicState,
  shouldAutoAdvanceToVoting,
  advanceToVoting,
  computeFinalChampions,
  restartStateKeepPlayersAndResetRound,
  type PublicState,
} from "../state-helpers";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const v = Number(url.searchParams.get("v") ?? "0") || 0;
  const roomId = url.searchParams.get("roomId")?.trim();
  const now = Date.now();

  if (!roomId) {
    return NextResponse.json({ error: "roomId_required" }, { status: 400 });
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { state, dbVersion, roomName, roomCreatedAt } = await getOrCreateGame(roomId);
    const ids = (state.players ?? []).map(p => p.playerId);

    // 점수는 매번 DB에서 (방별로)
    const scoreMap = await buildScoreMap(ids, roomId);

    // ✅ GAME_OVER 자동 리셋 처리
    if (state.phase === "GAME_OVER") {
      const finalChampions = computeFinalChampions(state, scoreMap);
      const autoRestartAt = (state as any).autoRestartAt as number | null | undefined;

      // 1) autoRestartAt이 없으면(과거 상태/예외) 지금부터 4.5초 예약을 박아줌
      if (!autoRestartAt) {
        const nextSetTimer: GameState = {
          ...state,
          version: (state.version ?? 0) + 1,
          autoRestartAt: now + 4500,
        };

        const r = await updateGameCAS(roomId, dbVersion, nextSetTimer);
        if (!r.ok) continue;

        // 예약 박은 상태 반환
        return NextResponse.json(toPublicState(nextSetTimer, scoreMap, roomName, roomCreatedAt));
      }

      // 2) 예약 시간이 지났고, 최종 우승자가 있다면 → 점수 0 + 새 게임으로 리셋
      if (finalChampions.length > 0 && now >= autoRestartAt) {
        const p = prisma();

        // 점수 전원 0 리셋(현재 방 참가자)
        if (ids.length > 0) {
          await p.liarPlayer.updateMany({
            where: { id: { in: ids }, gameId: roomId },
            data: { score: 0 },
          });
        }

        const next = restartStateKeepPlayersAndResetRound(state);
        next.version = (state.version ?? 0) + 1;

        const r = await updateGameCAS(roomId, dbVersion, next);
        if (!r.ok) continue;

        const scoreMapAfter = await buildScoreMap(ids, roomId);
        return NextResponse.json(toPublicState(next, scoreMapAfter, roomName, roomCreatedAt));
      }

      // 아직 시간 전이면 그냥 GAME_OVER 상태 반환(프론트가 축하 UI 띄움)
      return NextResponse.json(toPublicState(state, scoreMap, roomName, roomCreatedAt));
    }

    // ✅ 버전이 변하지 않았고 + 자동 전환 조건도 아니면 204
    if ((state.version ?? 0) <= v) {
      if (!shouldAutoAdvanceToVoting(state, now)) {
        return new Response(null, { status: 204 });
      }
    }

    // ✅ 자동 전환 조건이면: VOTING으로 CAS 업데이트 후 그 상태 반환
    if (shouldAutoAdvanceToVoting(state, now)) {
      const next = advanceToVoting(state);
      const res = await updateGameCAS(roomId, dbVersion, next);
      if (!res.ok) continue;

      const scoreMap2 = await buildScoreMap((next.players ?? []).map(p => p.playerId), roomId);
      return NextResponse.json(toPublicState(next, scoreMap2, roomName, roomCreatedAt));
    }

    // ✅ 그 외엔 현재 state 그대로 반환
    return NextResponse.json(toPublicState(state, scoreMap, roomName, roomCreatedAt));
  }

  // CAS 충돌 fallback
  const { state, roomName, roomCreatedAt } = await getOrCreateGame(roomId);
  const ids = (state.players ?? []).map(p => p.playerId);
  const scoreMap = await buildScoreMap(ids, roomId);
  return NextResponse.json(toPublicState(state, scoreMap, roomName, roomCreatedAt));
}
