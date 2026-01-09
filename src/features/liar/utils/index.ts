// 라이어 게임 유틸리티

import type { Phase, Role } from "../types";

export { remainingMs } from "@/shared/utils/date";
export { getLS, setLS, removeLS } from "@/shared/utils/storage";
export { uuid } from "@/shared/utils/uuid";

export function phaseLabel(phase: Phase): string {
  switch (phase) {
    case "LOBBY":
      return "대기";
    case "PREP":
      return "준비";
    case "ANSWERING":
      return "답변 입력";
    case "REVEAL":
      return "답변 공개";
    case "DISCUSS":
      return "토론";
    case "VOTING":
      return "투표";
    case "TIE_DISCUSS":
      return "동점 재논의";
    case "RESULT":
      return "결과";
    case "GAME_OVER":
      return "게임 종료";
    default:
      return "알 수 없음";
  }
}

export function roleLabel(role: Role | null): string {
  switch (role) {
    case "AUDIENCE":
      return "관객";
    case "LIAR":
      return "라이어";
    case "TROLL":
      return "트롤";
    default:
      return "미공개";
  }
}

export function msgFromErrorCode(code?: string): string {
  switch (code) {
    case "invalid_input":
      return "입력 오류";
    case "only_host":
      return "방장만 가능";
    case "not_enough_players":
      return "인원이 부족해요";
    case "nickname_taken":
      return "닉네임 사용 중";
    case "not_in_game":
      return "참가자 아님";
    case "not_alive":
      return "사망자는 불가";
    case "not_voting":
      return "투표 단계 아님";
    case "already_voted":
      return "이미 투표함";
    case "invalid_target":
      return "대상 없음";
    case "target_not_alive":
      return "대상은 사망자";
    case "cannot_vote_self":
      return "자기 투표 불가";
    case "not_result_phase":
      return "결과 단계 아님";
    case "concurrent_update":
      return "동시 처리 중";
    case "not_allowed_phase":
      return "지금은 불가";
    default:
      return "요청 실패";
  }
}

export function parseNonNegativeInt(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  if (!Number.isInteger(n)) return null;
  if (n < 0) return null;
  return n;
}

export function canJoinNow(phase: Phase): boolean {
  return phase === "LOBBY" || phase === "PREP";
}
