// 생일자 관련 유틸리티

import { getKstYmdKey } from "@/lib/kst-attendance";
import type { Member } from "../types";

export type BirthdayMember = {
  member: Member & { age: number };
  birthdayDate: string; // YYYY-MM-DD (올해 생일)
  daysUntil: number; // 오늘 기준 며칠 후 (오늘: 0, 내일: 1, ...)
  isToday: boolean;
  isThisWeek: boolean; // 이번 주 내 (오늘 포함 7일)
  month: number; // 1-12
  date: number; // 1-31
};

export type BirthdayMonthGroup = {
  month: number; // 1-12
  monthName: string; // "1월", "2월", ...
  isCurrentMonth: boolean;
  birthdays: BirthdayMember[];
};

/**
 * 모든 월의 생일자를 월별로 그룹화하여 반환
 * - 올해 생일 날짜 기준으로 계산
 * - 월별로 그룹화
 * - 각 월 내에서는 날짜순 정렬
 */
export function getAllMonthBirthdays(members: (Member & { age: number })[]): BirthdayMonthGroup[] {
  // KST 기준 오늘 날짜
  const todayYmd = getKstYmdKey();
  const [currentYear, currentMonth] = todayYmd.split("-").map(Number);
  const todayTime = new Date(`${todayYmd}T00:00:00+09:00`).getTime();

  // 월별 그룹 초기화
  const monthGroups = new Map<number, BirthdayMember[]>();

  for (const member of members) {
    // birthDate에서 월/일만 추출
    const birthDate = new Date(member.birthDate);
    const birthMonth = birthDate.getUTCMonth() + 1; // 1-12
    const birthDateNum = birthDate.getUTCDate();

    // 올해 생일 날짜 생성 (YYYY-MM-DD)
    const birthdayYmd = `${currentYear}-${String(birthMonth).padStart(2, "0")}-${String(birthDateNum).padStart(2, "0")}`;
    const birthdayTime = new Date(`${birthdayYmd}T00:00:00+09:00`).getTime();

    // 오늘부터 생일까지의 일수 (음수면 작년/올해 지난 날)
    const daysUntil = Math.floor((birthdayTime - todayTime) / (1000 * 60 * 60 * 24));

    const isToday = daysUntil === 0;
    const isThisWeek = daysUntil >= 0 && daysUntil <= 6; // 오늘 포함 7일

    if (!monthGroups.has(birthMonth)) {
      monthGroups.set(birthMonth, []);
    }

    monthGroups.get(birthMonth)!.push({
      member,
      birthdayDate: birthdayYmd,
      daysUntil,
      isToday,
      isThisWeek,
      month: birthMonth,
      date: birthDateNum,
    });
  }

  // 월별 그룹을 배열로 변환하고 정렬
  const result: BirthdayMonthGroup[] = [];
  const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

  for (let month = 1; month <= 12; month++) {
    const birthdays = monthGroups.get(month) || [];

    if (birthdays.length === 0) continue;

    // 날짜순 정렬
    birthdays.sort((a, b) => {
      if (a.month === currentMonth && b.month === currentMonth) {
        // 이번 달은 오늘 기준 정렬 (오늘이 가장 앞)
        return a.daysUntil - b.daysUntil;
      }
      // 다른 달은 날짜순 정렬
      return a.date - b.date;
    });

    result.push({
      month,
      monthName: monthNames[month - 1],
      isCurrentMonth: month === currentMonth,
      birthdays,
    });
  }

  // 이번 달을 가장 앞으로, 나머지는 월순
  result.sort((a, b) => {
    if (a.isCurrentMonth) return -1;
    if (b.isCurrentMonth) return 1;
    return a.month - b.month;
  });

  return result;
}
