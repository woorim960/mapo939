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

    // ✅ 한 라운드 RESULT 처리에서만 중복 방지
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
          // trollDeathRewarded 유지
        },
      };

      const r = await updateGameCAS(dbVersion, nextTie);
      if (r.ok) return NextResponse.json({ ok: true, movedTo: "TIE_DISCUSS" });
      continue;
    }

    const rolesByPlayerId = (round.rolesByPlayerId ?? {}) as Record<string, Role>;
    const eliminatedRole = (rolesByPlayerId?.[eliminatedId] ?? null) as Role | null;
    const lastEliminatedWasTroll = eliminatedRole === "TROLL";

    // ✅ 탈락 반영
    const nextPlayers = (state.players ?? []).map(pl =>
      pl.playerId === eliminatedId ? { ...pl, isAlive: false } : pl
    );

    const stateAfterElim: GameState = { ...state, players: nextPlayers };
    const { aliveAudience, aliveLiar, aliveTroll } = aliveCountByRole(stateAfterElim, rolesByPlayerId);

    // ✅ 게임 종료 조건(너가 말한 그대로)
    // 1) 라이어 전멸 -> 관객 승리
    const audienceWin = aliveLiar === 0;

    // 2) 라이어 수 == 관객 수 -> 라이어 승리
    // (트롤 수는 비교에 포함하지 않음)
    const liarWin = !audienceWin && aliveLiar === aliveAudience;

    // ✅ 트롤 죽음 보상: 트롤이 죽었고, 이번 RESULT에서 아직 지급 전이면 지급
    const shouldPayTrollDeathBonus = Boolean(lastEliminatedWasTroll && !trollDeathRewarded);

    // ✅ 게임이 계속되는 경우: DISCUSS로 복귀
    if (!audienceWin && !liarWin) {
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

          // ✅ 이번 RESULT 처리에서 트롤 보상은 더 못 하게 표시
          trollDeathRewarded: lastEliminatedWasTroll ? true : trollDeathRewarded,
        },
      };

      const r = await updateGameCAS(dbVersion, nextContinue);
      if (!r.ok) continue;

      // ✅ CAS 성공 후 점수 반영 (중복 지급 방지)
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

    // ✅ 여기부터는 "게임 종료" 케이스
    // 승리자 산정은 룰대로:
    // - 관객 승리: AUDIENCE만 +100
    // - 라이어 승리: LIAR만 +100 (트롤은 받지 않음)
    const winners: string[] = [];
    for (const pl of stateAfterElim.players ?? []) {
      const role = rolesByPlayerId?.[pl.playerId] ?? null;
      if (!role) continue;

      if (audienceWin) {
        if (role === "AUDIENCE") winners.push(pl.playerId);
      } else if (liarWin) {
        if (role === "LIAR") winners.push(pl.playerId); // ✅ 트롤 제외
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
        trollDeathRewarded: lastEliminatedWasTroll ? true : trollDeathRewarded,
      },
    };

    const res = await updateGameCAS(dbVersion, nextGameOver);
    if (!res.ok) continue;

    // ✅ CAS 성공 후 점수 반영
    const tx: any[] = [];

    // 승리자 +100
    if (winners.length > 0) {
      tx.push(
        p.liarPlayer.updateMany({
          where: { id: { in: winners } },
          data: { score: { increment: 100 } },
        })
      );
    }

    // 트롤이 죽은 경우, 게임이 종료되더라도 "트롤 본인 +100"은 룰에 따라 지급
    // (너의 룰: 트롤이 죽으면 본인만 100점 얻는다. 게임 종료와 무관)
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
      winType: audienceWin ? "AUDIENCE" : "LIAR",
      aliveAudience,
      aliveLiar,
      aliveTroll,
      trollDeathBonusApplied: shouldPayTrollDeathBonus,
    });
  }

  return NextResponse.json({ error: "concurrent_update" }, { status: 409 });
}
