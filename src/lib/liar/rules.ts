import type { Role, GameState } from "./types";

export function computeRoleCounts(nAlive: number): { liar: number; troll: number; audience: number } {
  if (nAlive <= 3) {
    // 3명: 관2 라1
    return { liar: 1, troll: 0, audience: 2 };
  }

  const base = nAlive % 2 === 0 ? nAlive : nAlive - 1; // 홀수면 -1 기준
  const audienceBase = base / 2;
  const liar = Math.floor(base / 4);
  const troll = base - audienceBase - liar;
  const audience = audienceBase + (nAlive - base); // 홀수면 +1 관객

  return { liar: Math.max(1, liar), troll, audience };
}

export function checkWin(state: GameState): { winner: "AUDIENCE" | "LIAR_TEAM" | null } {
  const alive = state.players.filter(p => p.isAlive);
  const aliveRole = (pid: string): Role => state.round.rolesByPlayerId[pid];

  let aliveLiar = 0;
  let aliveAudience = 0;
  for (const p of alive) {
    const r = aliveRole(p.playerId);
    if (r === "LIAR") aliveLiar += 1;
    if (r === "AUDIENCE") aliveAudience += 1;
  }

  if (aliveLiar === 0) return { winner: "AUDIENCE" };
  if (aliveLiar === aliveAudience) return { winner: "LIAR_TEAM" };
  return { winner: null };
}
