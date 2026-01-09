// 라이어 게임 타입

export type { Phase, Role, GameState, RoundState, PlayerInState } from "@/lib/liar/types";

export type PublicPlayer = {
  playerId: string;
  nickname: string;
  isAlive: boolean;
  isHost: boolean;
  score?: number;
};

export type PublicState = {
  version: number;
  phase: Phase;
  hostPlayerId: string | null;
  players: PublicPlayer[];
  round: {
    index: number;
    questionId: string | null;
    min: number;
    max: number;
    answersByPlayerId: Record<string, number>;
    voteCounts: Record<string, number>;
    questionChangeCount: number;
    answeringEndsAt: number | null;
    discussEndsAt: number | null;
    tieDiscussEndsAt: number | null;
  };
  lastEliminatedPlayerId: string | null;
  lastEliminatedWasTroll: boolean;
  championPlayerId: string | null;
  winnerPlayerIds?: string[];
  finalChampionPlayerIds?: string[];
  autoRestartAt?: number | null;
};

export type MeState = {
  role: Role | null;
  min: number;
  max: number;
  question: string | null;
};
