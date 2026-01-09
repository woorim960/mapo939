// 출석 관련 API 클라이언트

import { apiPost } from "@/shared/api/client";

type CheckAttendanceResponse = {
  record: {
    id: string;
    memberId: string;
    date: string;
    status: "PRESENT" | "LATE";
    points: number;
  };
  todayYmd: string;
};

export async function checkAttendance(
  memberId: string,
  status: "PRESENT" | "LATE"
): Promise<CheckAttendanceResponse> {
  return await apiPost<CheckAttendanceResponse>("/api/attendance/check", {
    memberId,
    status,
  });
}

export async function markAbsent(memberId: string): Promise<void> {
  await apiPost("/api/attendance/absent", { memberId });
}
