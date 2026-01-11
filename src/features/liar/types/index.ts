// 라이어 게임 타입

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
  roomName: string | null;
  roomDeleted?: boolean;
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
  lastEliminatedRole: "AUDIENCE" | "LIAR" | "TROLL" | null;
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
  votedTargetId?: string | null;
};
