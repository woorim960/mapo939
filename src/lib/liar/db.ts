import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import type { GameState } from "./types";

declare global {
  // eslint-disable-next-line no-var
  var __liarPrisma: PrismaClient | undefined;
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url || url.trim().length === 0) {
    throw new Error("DATABASE_URL missing (check .env.local and restart dev server)");
  }
  return url;
}

export function prisma(): PrismaClient {
  if (global.__liarPrisma) return global.__liarPrisma;

  const url = getDatabaseUrl();

  // ✅ Prisma 7 + adapter-neon 최신 방식
  const adapter = new PrismaNeon({
    connectionString: url,
  });

  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error"] : [],
  });

  global.__liarPrisma = client;
  return client;
}

/* ---------------- Game helpers ---------------- */

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

  try {
    await p.liarGame.create({
      data: { id: 1, version: 0, stateJson: initial as unknown as object },
    });
  } catch {
    const again = await p.liarGame.findUnique({ where: { id: 1 } });
    if (!again) throw new Error("Failed to create or load LiarGame");
    const state = again.stateJson as unknown as GameState;
    return { state: { ...state, version: again.version }, dbVersion: again.version };
  }

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
