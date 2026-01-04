import { NextResponse } from "next/server";
import { prisma, getOrCreateGame, updateGameCAS } from "@/lib/liar/db";
import type { GameState } from "@/lib/liar/types";

export const runtime = "nodejs";

type Body = { playerId: string };

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

    // ✅ 중복 지급 방지 플래그(이 "RESULT 처리"에서만 의미있게 씀)
    const trollDeathRewarded: boolean = Boolean(round.trollDeathRewarded);

    const votesByVoterId: Record<string, string> = round.votesByVoterId ?? {};
    const counts = computeVoteCounts(votesByVoterId);

    const { eliminatedId, isTie } = pickEliminated(counts);

    if (isTie || !eliminatedId) {
      const nextTie: GameState = {
        ...state,
        phase: "TIE_DISCUSS",
        version: (state.version ?? 0) + 1,
        round: {
          ...round,
          tieDiscussEndsAt: Date.now() + 60_000,
          votesByVoterId: {},
          // trollDeathRewarded는 유지(어차피 아직 죽은 사람 없음)
        },
      };

      const r = await updateGameCAS(dbVersion, nextTie);
      if (r.ok) return NextResponse.json({ ok: true, movedTo: "TIE_DISCUSS" });
      continue;
    }

    const rolesByPlayerId = (round.rolesByPlayerId ?? {}) as Record<string, Role>;
    const eliminatedRole = (rolesByPlayerId?.[eliminatedId] ?? null) as Role | null;
    const lastEliminatedWasTroll = eliminatedRole === "TROLL";

    // ✅ eliminated는 사망 처리
    const nextPlayers = (state.players ?? []).map(pl =>
      pl.playerId === eliminatedId ? { ...pl, isAlive: false } : pl
    );

    const stateAfterElim: GameState = { ...state, players: nextPlayers };
    const { aliveAudience, aliveLiar, aliveTroll } = aliveCountByRole(stateAfterElim, rolesByPlayerId);

    const audienceWin = aliveLiar === 0;
    const liarTeamWin = !audienceWin && aliveLiar === aliveAudience;

    // ✅ 트롤 죽음 보상 지급 여부 (이번 RESULT 처리에서 딱 1회)
    const shouldPayTrollDeathBonus = Boolean(lastEliminatedWasTroll && !trollDeathRewarded);

    // ✅ 게임이 안 끝났으면 DISCUSS로 복귀 + 다음 라운드 준비
    if (!audienceWin && !liarTeamWin) {
      const nextContinue: GameState = {
        ...state,
        players: nextPlayers,
        lastEliminatedPlayerId: eliminatedId,
        lastEliminatedWasTroll,
        phase: "DISCUSS",
        version: (state.version ?? 0) + 1,
        round: {
          ...round,
          index: (round.index ?? 0) + 1,
          votesByVoterId: {},
          discussEndsAt: Date.now() + 180_000,
          tieDiscussEndsAt: null,

          // ✅ 이 라운드 RESULT 처리는 끝났다는 표식(중복 finalize 방지용)
          trollDeathRewarded: true,
        },
      };

      const r = await updateGameCAS(dbVersion, nextContinue);
      if (!r.ok) continue;

      // ✅ CAS 성공 후에 DB 점수 반영 (중복 지급 방지)
      if (shouldPayTrollDeathBonus) {
        await p.liarPlayer.update({
          where: { id: eliminatedId },
          data: { score: { increment: 100 } },
        });
      }

      return NextResponse.json({
        ok: true,
        eliminatedId,
        movedTo: "DISCUSS",
        aliveAudience,
        aliveLiar,
        aliveTroll,
        trollDeathBonusApplied: shouldPayTrollDeathBonus,
      });
    }

    // ✅ 승리자 산정
    const winners: string[] = [];
    for (const pl of stateAfterElim.players ?? []) {
      const role = rolesByPlayerId?.[pl.playerId] ?? null;
      if (!role) continue;

      if (audienceWin) {
        if (role === "AUDIENCE") winners.push(pl.playerId);
      } else if (liarTeamWin) {
        if (role === "LIAR" || role === "TROLL") winners.push(pl.playerId);
      }
    }

    const championPlayerId = winners[0] ?? null;

    const nextGameOver: GameState = {
      ...state,
      version: (state.version ?? 0) + 1,
      players: nextPlayers,
      lastEliminatedPlayerId: eliminatedId,
      lastEliminatedWasTroll,
      championPlayerId,
      winnerPlayerIds: winners,
      phase: "GAME_OVER",
      round: {
        ...round,
        // ✅ 이 RESULT 처리는 끝났다는 표식(중복 finalize 방지용)
        trollDeathRewarded: true,
      },
    };

    const res = await updateGameCAS(dbVersion, nextGameOver);
    if (!res.ok) continue;

    // ✅ CAS 성공 후에 DB 점수 반영 (중복 지급 방지)
    // - 승리자 +100
    // - 트롤 사망자(본인) +100
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

    if (tx.length > 0) {
      await p.$transaction(tx);
    }

    return NextResponse.json({
      ok: true,
      eliminatedId,
      winners,
      winType: audienceWin ? "AUDIENCE" : "LIAR_TEAM",
      aliveAudience,
      aliveLiar,
      aliveTroll,
      trollDeathBonusApplied: shouldPayTrollDeathBonus,
    });
  }

  return NextResponse.json({ error: "concurrent_update" }, { status: 409 });
}
