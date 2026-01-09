import { NextResponse } from "next/server";
import { prisma, getOrCreateGame, updateGameCAS } from "@/lib/liar/db";
import type { GameState } from "@/lib/liar/types";

export const runtime = "nodejs";

type Body = { playerId: string };

const AUTO_RESTART_DELAY_MS = 4500;
const FINAL_SCORE = 300;

async function buildScoreMap(playerIds: string[]): Promise<Record<string, number>> {
  if (playerIds.length === 0) return {};
  const p = prisma();
  const rows = await p.liarPlayer.findMany({
    where: { id: { in: playerIds } },
    select: { id: true, score: true },
  });
  const map: Record<string, number> = {};
  for (const r of rows) map[r.id] = r.score ?? 0;
  return map;
}

function computeFinalChampions(playerIds: string[], scoreById: Record<string, number>): string[] {
  return playerIds.filter(id => (scoreById[id] ?? 0) >= FINAL_SCORE);
}

function isAlive(state: GameState, playerId: string): boolean {
  return Boolean(state.players?.find(p => p.playerId === playerId)?.isAlive);
}

function computeVoteCounts(votesByVoterId: Record<string, string>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const voterId of Object.keys(votesByVoterId)) {
    const t = votesByVoterId[voterId];
    if (!t) continue;
    counts[t] = (counts[t] ?? 0) + 1;
  }
  return counts;
}

function pickEliminated(counts: Record<string, number>): { eliminatedId: string | null; isTie: boolean } {
  const entries = Object.entries(counts);
  if (entries.length === 0) return { eliminatedId: null, isTie: false };
  entries.sort((a, b) => b[1] - a[1]);

  const top = entries[0][1];
  const topIds = entries.filter(([, c]) => c === top).map(([id]) => id);
  if (topIds.length >= 2) return { eliminatedId: null, isTie: true };
  return { eliminatedId: topIds[0], isTie: false };
}

type Role = "AUDIENCE" | "LIAR" | "TROLL";

function aliveCountByRole(
  state: GameState,
  rolesByPlayerId: Record<string, Role>
): { aliveAudience: number; aliveLiar: number; aliveTroll: number } {
  let aliveAudience = 0;
  let aliveLiar = 0;
  let aliveTroll = 0;

  for (const pl of state.players ?? []) {
    if (!pl.isAlive) continue;
    const role = rolesByPlayerId[pl.playerId];
    if (!role) continue;

    if (role === "AUDIENCE") aliveAudience += 1;
    else if (role === "LIAR") aliveLiar += 1;
    else if (role === "TROLL") aliveTroll += 1;
  }

  return { aliveAudience, aliveLiar, aliveTroll };
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as Body | null;
  const playerId = body?.playerId?.trim();

  if (!playerId) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const p = prisma();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { state, dbVersion } = await getOrCreateGame();

    if (!isAlive(state, playerId)) {
      return NextResponse.json({ error: "not_alive" }, { status: 403 });
    }

    if (state.phase !== "RESULT") {
      return NextResponse.json({ error: "not_result_phase" }, { status: 409 });
    }

    const round = (state.round ?? ({} as any)) as any;

    const trollDeathRewarded: boolean = Boolean(round.trollDeathRewarded);

    const votesByVoterId: Record<string, string> = round.votesByVoterId ?? {};
    const counts = computeVoteCounts(votesByVoterId);

    const { eliminatedId, isTie } = pickEliminated(counts);

    // 동점/무효 -> TIE_DISCUSS
    if (isTie || !eliminatedId) {
      const nextTie: GameState = {
        ...state,
        phase: "TIE_DISCUSS",
        version: (state.version ?? 0) + 1,
        round: {
          ...round,
          tieDiscussEndsAt: Date.now() + 60_000,
          votesByVoterId: {},
        },
      };

      const r = await updateGameCAS(dbVersion, nextTie);
      if (r.ok) return NextResponse.json({ ok: true, movedTo: "TIE_DISCUSS" });
      continue;
    }

    const rolesByPlayerId = (round.rolesByPlayerId ?? {}) as Record<string, Role>;
    const eliminatedRole = (rolesByPlayerId?.[eliminatedId] ?? null) as Role | null;
    const lastEliminatedWasTroll = eliminatedRole === "TROLL";

    // 탈락 반영
    const nextPlayers = (state.players ?? []).map(pl =>
      pl.playerId === eliminatedId ? { ...pl, isAlive: false } : pl
    );

    const stateAfterElim: GameState = { ...state, players: nextPlayers };
    const { aliveAudience, aliveLiar, aliveTroll } = aliveCountByRole(stateAfterElim, rolesByPlayerId);

    // 게임 종료 조건
    const audienceWin = aliveLiar === 0;
    const liarWin = !audienceWin && aliveLiar === aliveAudience;

    const shouldPayTrollDeathBonus = Boolean(lastEliminatedWasTroll && !trollDeathRewarded);

    // ✅ 승리 조건이 만족되지 않으면: 300점 달성자 확인
    if (!audienceWin && !liarWin) {
      const ids = (stateAfterElim.players ?? []).map(p => p.playerId);
      
      // ✅ 트롤 보너스 지급 (트랜잭션으로 원자성 보장)
      if (shouldPayTrollDeathBonus) {
        await p.liarPlayer.update({
          where: { id: eliminatedId },
          data: { score: { increment: 100 } },
        });
      }

      // 점수 확인 (트롤 보너스 반영 후)
      const scoreMap = await buildScoreMap(ids);
      const finalChampions = computeFinalChampions(ids, scoreMap);

      // ✅ 300점 달성자가 있으면 GAME_OVER (최종 우승)
      if (finalChampions.length > 0) {
        const now = Date.now();
        const nextGameOver: GameState = {
          ...state,
          version: (state.version ?? 0) + 1,
          players: nextPlayers,
          lastEliminatedPlayerId: eliminatedId,
          lastEliminatedWasTroll,
          championPlayerId: finalChampions[0] ?? null,
          winnerPlayerIds: finalChampions,
          finalChampionPlayerIds: finalChampions,
          phase: "GAME_OVER",
          autoRestartAt: now + AUTO_RESTART_DELAY_MS,
          round: {
            ...round,
            trollDeathRewarded: lastEliminatedWasTroll ? true : trollDeathRewarded,
          },
        };

        const res = await updateGameCAS(dbVersion, nextGameOver);
        if (!res.ok) continue;

        return NextResponse.json({
          ok: true,
          eliminatedId,
          winners: finalChampions,
          winType: "FINAL_CHAMPION",
          aliveAudience,
          aliveLiar,
          aliveTroll,
          trollDeathBonusApplied: shouldPayTrollDeathBonus,
          movedTo: "GAME_OVER",
        });
      }

      // ✅ 300점 달성자가 없으면 RESULT에서 멈춤 (방장이 '이번판 초기화' 필요)
      const nextStayResult: GameState = {
        ...state,
        players: nextPlayers,
        lastEliminatedPlayerId: eliminatedId,
        lastEliminatedWasTroll,
        version: (state.version ?? 0) + 1,
        phase: "RESULT",
        round: {
          ...round,
          trollDeathRewarded: lastEliminatedWasTroll ? true : trollDeathRewarded,
        },
      };

      const r = await updateGameCAS(dbVersion, nextStayResult);
      if (!r.ok) continue;

      return NextResponse.json({
        ok: true,
        eliminatedId,
        movedTo: "RESULT",
        aliveAudience,
        aliveLiar,
        aliveTroll,
        trollDeathBonusApplied: shouldPayTrollDeathBonus,
        needsReset: true, // 프론트에서 '이번판 초기화' 버튼 표시용
      });
    }

    // ✅ 게임 종료 케이스: 승리 조건 만족
    const winners: string[] = [];
    for (const pl of stateAfterElim.players ?? []) {
      const role = rolesByPlayerId?.[pl.playerId] ?? null;
      if (!role) continue;

      if (audienceWin) {
        if (role === "AUDIENCE") winners.push(pl.playerId);
      } else if (liarWin) {
        if (role === "LIAR") winners.push(pl.playerId);
      }
    }

    // ✅ 점수 지급 (트랜잭션으로 원자성 보장)
    const ids = (stateAfterElim.players ?? []).map(p => p.playerId);
    const tx: any[] = [];

    if (winners.length > 0) {
      tx.push(
        p.liarPlayer.updateMany({
          where: { id: { in: winners } },
          data: { score: { increment: 100 } },
        })
      );
    }

    if (shouldPayTrollDeathBonus) {
      tx.push(
        p.liarPlayer.update({
          where: { id: eliminatedId },
          data: { score: { increment: 100 } },
        })
      );
    }

    // ✅ 트랜잭션 실행 (원자성 보장 - 모든 점수 지급이 함께 처리됨)
    if (tx.length > 0) {
      await p.$transaction(tx);
    }

    // ✅ 점수 지급 후 확인하여 최종 우승자 확인
    const scoreMapAfter = await buildScoreMap(ids);
    const finalChampionsAfter = computeFinalChampions(ids, scoreMapAfter);

    const championPlayerId = finalChampionsAfter.length > 0 
      ? finalChampionsAfter[0] 
      : (winners[0] ?? null);

    const now = Date.now();

    // ✅ GAME_OVER 상태로 전환 (CAS로 원자성 보장)
    const nextGameOver: GameState = {
      ...state,
      version: (state.version ?? 0) + 1,
      players: nextPlayers,
      lastEliminatedPlayerId: eliminatedId,
      lastEliminatedWasTroll,
      championPlayerId,
      winnerPlayerIds: winners,
      finalChampionPlayerIds: finalChampionsAfter,
      phase: "GAME_OVER",
      autoRestartAt: now + AUTO_RESTART_DELAY_MS,
      round: {
        ...round,
        trollDeathRewarded: lastEliminatedWasTroll ? true : trollDeathRewarded,
      },
    };

    const res = await updateGameCAS(dbVersion, nextGameOver);
    if (!res.ok) continue;

    return NextResponse.json({
      ok: true,
      eliminatedId,
      winners,
      winType: audienceWin ? "AUDIENCE" : "LIAR",
      aliveAudience,
      aliveLiar,
      aliveTroll,
      trollDeathBonusApplied: shouldPayTrollDeathBonus,
      finalChampions: finalChampionsAfter,
    });
  }

  return NextResponse.json({ error: "concurrent_update" }, { status: 409 });
}
