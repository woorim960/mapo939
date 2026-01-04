export type Role = "AUDIENCE" | "LIAR" | "TROLL";

export type Phase =
  | "LOBBY"
  | "PREP"               // 질문 변경/시작 가능
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
  questionId: string | null;  // PREP에서는 null 가능
  min: number;
  max: number;

  // 역할은 서버만 알고 있고 /state에는 절대 실어 보내지 않음
  rolesByPlayerId: Record<string, Role>;

  // 답변/투표
  answersByPlayerId: Record<string, number>;
  votesByVoterId: Record<string, string>; // voter -> target

  // 질문 변경 만장일치
  questionChangeByPlayerId: Record<string, boolean>;

  // 타이머
  answeringEndsAt: number | null;
  discussEndsAt: number | null;
  tieDiscussEndsAt: number | null;
};

export type GameState = {
  phase: Phase;
  version: number;             // DB version과 함께 관리
  createdAt: number;

  // 로비/참가자
  hostPlayerId: string | null;
  players: PlayerInState[];

  // 게임 단위
  usedQuestionIds: string[];   // “한 게임(300점 최종승리 전까지) 중복 금지”
  round: RoundState;

  // 마지막 결과
  lastEliminatedPlayerId: string | null;
  lastEliminatedWasTroll: boolean;
  winnerPlayerIds?: string[];
  trollDeathRewarded?: boolean;

  // 최종 우승(300점)
  championPlayerId: string | null;
};
