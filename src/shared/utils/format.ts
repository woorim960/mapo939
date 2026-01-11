// 포맷팅 유틸리티

import type { AttendanceStatus } from "../types";

export function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

export function todayLabel(status?: AttendanceStatus): string {
  if (status === "PRESENT") return "오늘 출석";
  if (status === "LATE") return "오늘 지각";
  return "오늘 결석";
}

export function badgeTone(status?: AttendanceStatus): string {
  if (status === "PRESENT") return "bg-emerald-600 text-white border-emerald-600";
  if (status === "LATE") return "bg-amber-700 text-white border-amber-700";
  return "bg-neutral-200 text-neutral-600 border-neutral-300";
}
