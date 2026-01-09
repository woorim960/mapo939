export type Role = "AUDIENCE" | "LIAR" | "TROLL";

export type Phase =
  | "LOBBY"
  | "PREP"
  | "ANSWERING"
  | "REVEAL"
  | "DISCUSS"
  | "VOTING"
  | "TIE_DISCUSS"
  | "RESULT"
  | "GAME_OVER";

export type PlayerInState = {
  playerId: string;
  nickname: string;
  isAlive: boolean;
  isHost: boolean;
  joinedAt: number;
};

export type RoundState = {
  index: number;
  questionId: string | null;
  min: number;
  max: number;

  rolesByPlayerId: Record<string, Role>;
  answersByPlayerId: Record<string, number>;
  votesByVoterId: Record<string, string>;
  questionChangeByPlayerId: Record<string, boolean>;

  answeringEndsAt: number | null;
  discussEndsAt: number | null;
  tieDiscussEndsAt: number | null;
};

export type GameState = {
  phase: Phase;
  version: number;
  createdAt: number;

  hostPlayerId: string | null;
  players: PlayerInState[];

  usedQuestionIds: string[];
  round: RoundState;

  lastEliminatedPlayerId: string | null;
  lastEliminatedWasTroll: boolean;
  winnerPlayerIds?: string[];
  trollDeathRewarded?: boolean;

  // 최종 우승(300점)
  championPlayerId: string | null;
  finalChampionPlayerIds?: string[];

  // ✅ GAME_OVER 이후 자동 리셋 예약 시간(ms epoch)
  autoRestartAt?: number | null;
};
