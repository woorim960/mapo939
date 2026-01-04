import { PrismaClient } from "@prisma/client";
import type { GameState } from "./types";

let prismaSingleton: PrismaClient | null = null;
export function prisma(): PrismaClient {
  if (prismaSingleton) return prismaSingleton;
  prismaSingleton = new PrismaClient();
  return prismaSingleton;
}

export async function getOrCreateGame(): Promise<{ state: GameState; dbVersion: number }> {
  const p = prisma();
  const row = await p.liarGame.findUnique({ where: { id: 1 } });

  if (row) {
    const state = row.stateJson as unknown as GameState;
    return { state: { ...state, version: row.version }, dbVersion: row.version };
  }

  const now = Date.now();
  const initial: GameState = {
    phase: "LOBBY",
    version: 0,
    createdAt: now,
    hostPlayerId: null,
    players: [],
    usedQuestionIds: [],
    round: {
      index: 0,
      questionId: null,
      min: 0,
      max: 0,
      rolesByPlayerId: {},
      answersByPlayerId: {},
      votesByVoterId: {},
      questionChangeByPlayerId: {},
      answeringEndsAt: null,
      discussEndsAt: null,
      tieDiscussEndsAt: null,
    },
    lastEliminatedPlayerId: null,
    lastEliminatedWasTroll: false,
    championPlayerId: null,
  };

  await p.liarGame.create({
    data: { id: 1, version: 0, stateJson: initial as unknown as object },
  });

  return { state: initial, dbVersion: 0 };
}

export async function updateGameCAS(
  expectedVersion: number,
  nextState: GameState
): Promise<{ ok: true; newVersion: number } | { ok: false }> {
  const p = prisma();
  const result = await p.liarGame.updateMany({
    where: { id: 1, version: expectedVersion },
    data: { version: expectedVersion + 1, stateJson: nextState as unknown as object },
  });

  if (result.count !== 1) return { ok: false };
  return { ok: true, newVersion: expectedVersion + 1 };
}
