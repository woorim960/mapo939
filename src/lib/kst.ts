export function getKstNow(): Date {
  // JS Date는 UTC 기반 타임스탬프 + 로컬표현이라,
  // KST 기준 계산용으로 "KST 시각"을 Date로 만들어 쓴다(계산 전용).
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utc + 9 * 60_60_000);
}

// 한국 나이: (현재연도 - 출생연도 + 1)
export function getKoreanAge(birthDate: Date, kstNow = getKstNow()): number {
  return kstNow.getFullYear() - birthDate.getFullYear() + 1;
}

export function getYearStartKst(kstNow = getKstNow()): Date {
  // KST 기준 1/1 00:00
  const y = kstNow.getFullYear();
  return new Date(Date.UTC(y, 0, 1, -9, 0, 0)); // KST 00:00 = UTC 전날 15:00
}
