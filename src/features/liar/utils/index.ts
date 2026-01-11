// 라이어 게임 유틸리티

import type { Phase, Role } from "../types";

export { remainingMs } from "@/shared/utils/date";
export { getLS, setLS, removeLS } from "@/shared/utils/storage";
export { uuid } from "@/shared/utils/uuid";
export { defaultRoleCounts } from "./roleCounts";

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

export function msgFromErrorCode(code?: string, message?: string): string {
  // 서버에서 제공한 메시지가 있으면 우선 사용
  if (message) return message;
  
  switch (code) {
    case "invalid_input":
      return "입력값을 확인해주세요";
    case "room_not_found":
      return "방이 존재하지 않거나 삭제되었습니다";
    case "only_host":
      return "방장만 가능한 기능입니다";
    case "not_enough_players":
      return "인원이 부족합니다";
    case "nickname_taken":
      return "이미 사용 중인 닉네임입니다";
    case "not_in_game":
      return "게임에 참가하지 않았습니다";
    case "not_alive":
      return "이미 탈락하셨습니다";
    case "not_voting":
      return "아직 투표 단계가 아닙니다";
    case "already_voted":
      return "이미 투표하셨습니다";
    case "invalid_target":
      return "선택한 대상이 없습니다";
    case "target_not_alive":
      return "선택한 대상이 이미 탈락했습니다";
    case "cannot_vote_self":
      return "자신에게는 투표할 수 없습니다";
    case "not_result_phase":
      return "아직 결과 단계가 아닙니다";
    case "concurrent_update":
      return "잠시 후 다시 시도해주세요";
    case "not_allowed_phase":
      return "지금은 사용할 수 없습니다";
    default:
      return "잠시 후 다시 시도해주세요";
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

// Phase별 색상 테마
export type PhaseTheme = {
  bgGradient: string;
  badgeColor: string;
  badgeBg: string;
  accent: string;
  text: string;
};

export function getPhaseTheme(phase: Phase): PhaseTheme {
  switch (phase) {
    case "LOBBY":
    case "PREP":
      return {
        bgGradient: "from-blue-50 via-indigo-50 to-purple-50",
        badgeColor: "text-blue-700",
        badgeBg: "bg-blue-100",
        accent: "blue",
        text: "text-blue-900",
      };
    case "ANSWERING":
      return {
        bgGradient: "from-emerald-50 via-teal-50 to-cyan-50",
        badgeColor: "text-emerald-700",
        badgeBg: "bg-emerald-100",
        accent: "emerald",
        text: "text-emerald-900",
      };
    case "REVEAL":
    case "DISCUSS":
    case "TIE_DISCUSS":
      return {
        bgGradient: "from-amber-50 via-orange-50 to-yellow-50",
        badgeColor: "text-amber-700",
        badgeBg: "bg-amber-100",
        accent: "amber",
        text: "text-amber-900",
      };
    case "VOTING":
      return {
        bgGradient: "from-rose-50 via-red-50 to-pink-50",
        badgeColor: "text-rose-700",
        badgeBg: "bg-rose-100",
        accent: "rose",
        text: "text-rose-900",
      };
    case "RESULT":
      return {
        bgGradient: "from-violet-50 via-purple-50 to-fuchsia-50",
        badgeColor: "text-violet-700",
        badgeBg: "bg-violet-100",
        accent: "violet",
        text: "text-violet-900",
      };
    case "GAME_OVER":
      return {
        bgGradient: "from-purple-100 via-pink-100 to-rose-100",
        badgeColor: "text-purple-700",
        badgeBg: "bg-purple-200",
        accent: "purple",
        text: "text-purple-900",
      };
    default:
      return {
        bgGradient: "from-gray-50 via-slate-50 to-zinc-50",
        badgeColor: "text-gray-700",
        badgeBg: "bg-gray-100",
        accent: "gray",
        text: "text-gray-900",
      };
  }
}

// 역할별 색상
export function getRoleColor(role: Role | null): { bg: string; text: string; border: string } {
  switch (role) {
    case "AUDIENCE":
      return {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-300",
      };
    case "LIAR":
      return {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-300",
      };
    case "TROLL":
      return {
        bg: "bg-orange-50",
        text: "text-orange-700",
        border: "border-orange-300",
      };
    default:
      return {
        bg: "bg-gray-50",
        text: "text-gray-700",
        border: "border-gray-300",
      };
  }
}

// 점수에 따른 색상
export function getScoreColor(score: number): { bg: string; text: string; glow: string } {
  if (score >= 300) {
    return {
      bg: "bg-gradient-to-r from-purple-600 to-pink-600",
      text: "text-white",
      glow: "shadow-lg shadow-purple-500/50",
    };
  }
  if (score >= 200) {
    return {
      bg: "bg-gradient-to-r from-yellow-400 to-orange-500",
      text: "text-white",
      glow: "shadow-md shadow-yellow-500/30",
    };
  }
  if (score >= 100) {
    return {
      bg: "bg-gradient-to-r from-green-500 to-emerald-500",
      text: "text-white",
      glow: "shadow-md shadow-green-500/30",
    };
  }
  return {
    bg: "bg-gray-800",
    text: "text-white",
    glow: "",
  };
}
