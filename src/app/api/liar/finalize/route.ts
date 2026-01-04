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

    // ✅ 중복 지급 방지 플래그 (한 라운드에 트롤 죽음 보상 1회만)
    const trollDeathRewarded: boolean = Boolean(round.trollDeathRewarded);

    const votesByVoterId: Record<string, string> = round.votesByVoterId ?? {};
    const counts = computeVoteCounts(votesByVoterId);

    const { eliminatedId, isTie } = pickEliminated(counts);

    if (isTie || !eliminatedId) {
      // ✅ 동점이면: 재논의 + 투표 초기화
      const nextTie: GameState = {
        ...state,
        phase: "TIE_DISCUSS",
        version: (state.version ?? 0) + 1,
        round: {
          ...round,
          tieDiscussEndsAt: Date.now() + 60_000, // 1분
          votesByVoterId: {}, // ✅ 재투표 가능하도록 초기화
          // ✅ 동점 재논의 들어가면 "트롤 죽음 보상" 플래그는 유지해도 됨(아직 죽은 트롤 없음)
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

    // ✅ eliminated는 사망 처리(isAlive=false)
    const nextPlayers = (state.players ?? []).map(pl =>
      pl.playerId === eliminatedId ? { ...pl, isAlive: false } : pl
    );

    // ✅ 다음 상태(탈락 반영 후) 기준으로 승리 조건 판단
    const stateAfterElim: GameState = { ...state, players: nextPlayers };
    const { aliveAudience, aliveLiar, aliveTroll } = aliveCountByRole(stateAfterElim, rolesByPlayerId);

    // ✅ 승리 조건
    // - 관객 승리: 라이어 전멸
    // - 라이어+트롤 승리: 라이어 수 === 관객 수 (트롤 수는 비교에 포함 X)
    const audienceWin = aliveLiar === 0;
    const liarTeamWin = !audienceWin && aliveLiar === aliveAudience;

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
          votesByVoterId: {}, // ✅ 다음 투표 대비 초기화
          discussEndsAt: Date.now() + 180_000, // 3분 토론
          tieDiscussEndsAt: null,

          // ✅ 새 라운드로 넘어가면 트롤 죽음 보상 플래그도 초기화
          trollDeathRewarded: false,
        },
      };

      const r = await updateGameCAS(dbVersion, nextContinue);
      if (r.ok) {
        return NextResponse.json({
          ok: true,
          eliminatedId,
          movedTo: "DISCUSS",
          aliveAudience,
          aliveLiar,
          aliveTroll,
        });
      }
      continue;
    }

    // ✅ 승리자 산정: 관객 승리면 AUDIENCE, 라이어팀 승리면 LIAR+TROLL
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

    // ✅ DB 점수 반영
    // - 승리자 전원 +100
    // - (추가) 트롤이 죽으면 그 트롤 본인 +100 (한 라운드 1회만, 중복 방지)
    //
    // ⚠️ Prisma 트랜잭션으로 묶어서 원자적으로 처리하는 게 안전
    const tx: any[] = [];

    if (winners.length > 0) {
      tx.push(
        p.liarPlayer.updateMany({
          where: { id: { in: winners } },
          data: { score: { increment: 100 } },
        })
      );
    }

    // ✅ 트롤 죽음 보상
    // - eliminatedRole이 TROLL일 때만
    // - trollDeathRewarded가 false일 때만
    if (lastEliminatedWasTroll && !trollDeathRewarded) {
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

    const championPlayerId = winners[0] ?? null;

    const nextGameOver: GameState = {
      ...state,
      version: (state.version ?? 0) + 1,
      players: nextPlayers,
      lastEliminatedPlayerId: eliminatedId,
      lastEliminatedWasTroll,
      championPlayerId,

      // ✅ UI에서 "승리자 목록" 보여주려면 이 필드 필요
      // GameState 타입에 winnerPlayerIds?: string[] 추가돼 있어야 함.
      winnerPlayerIds: winners,

      // ✅ 트롤 죽음 보상 중복 방지 플래그 세팅
      // (게임이 끝났으니 유지돼도 무방)
      round: {
        ...round,
        trollDeathRewarded: lastEliminatedWasTroll ? true : trollDeathRewarded,
      },

      phase: "GAME_OVER",
    };

    const res = await updateGameCAS(dbVersion, nextGameOver);
    if (res.ok) {
      return NextResponse.json({
        ok: true,
        eliminatedId,
        winners,
        winType: audienceWin ? "AUDIENCE" : "LIAR_TEAM",
        aliveAudience,
        aliveLiar,
        aliveTroll,
        trollDeathBonusApplied: Boolean(lastEliminatedWasTroll && !trollDeathRewarded),
      });
    }
  }

  return NextResponse.json({ error: "concurrent_update" }, { status: 409 });
}
