export function getKstYmdKey(date = new Date()): string {
  // KST 기준 YYYY-MM-DD
  const utc = date.getTime() + date.getTimezoneOffset() * 60_000;
  const kst = new Date(utc + 9 * 60 * 60_000);

  const y = kst.getFullYear();
  const m = String(kst.getMonth() + 1).padStart(2, "0");
  const d = String(kst.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

export function kstYmdToUtcDate(ymd: string): Date {
  // ymd = YYYY-MM-DD
  // KST 00:00 === UTC 전날 15:00
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, -9, 0, 0));
}

export function isSundayKst(ymd: string): boolean {
  const utcDate = kstYmdToUtcDate(ymd);
  const kstTime = utcDate.getTime() + 9 * 60 * 60_000;
  const kstDate = new Date(kstTime);
  return kstDate.getDay() === 0;
}

export function pointsFor(status: "PRESENT" | "LATE"): number {
  return status === "PRESENT" ? 1000 : 500;
}
