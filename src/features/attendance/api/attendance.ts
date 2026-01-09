// 출석 관련 API 클라이언트

export async function checkAttendance(memberId: string, status: "PRESENT" | "LATE"): Promise<Response> {
  return fetch("/api/attendance/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memberId, status }),
  });
}

export async function markAbsent(memberId: string): Promise<Response> {
  return fetch("/api/attendance/absent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memberId }),
  });
}
