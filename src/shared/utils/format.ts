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
  if (status === "PRESENT") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "LATE") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-neutral-50 text-neutral-700 border-neutral-200";
}
