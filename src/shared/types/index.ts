// 공유 타입 정의

export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT";

export type Member = {
  id: string;
  name: string;
  phone: string;
  birthDate: string; // ISO
  photoUrl: string;
  yearAttendanceCount: number;
  totalPoints?: number;
  todayStatus?: AttendanceStatus;
};

export type Stats = {
  todayYmd: string;
  todayCount: number; // 지각 포함
  month: { performedDays: number; totalAttendance: number; avgAttendance: number };
  all: { performedDays: number; totalAttendance: number; avgAttendance: number };
};

export type BonusPointsRecord = {
  id: string;
  points: number;
  reason: string;
  createdAt: string; // ISO
};

export type MemberStats = {
  member: { id: string; name: string; phone: string; birthDate: string; photoUrl: string; age: number };
  points: {
    total: number;
    yearTotal: number;
    attendanceTotal: number;
    attendanceYearTotal: number;
    bonusTotal: number;
    bonusYearTotal: number;
  };
  attendance: {
    month: { present: number; late: number; count: number; meetingDays: number; rate: number };
    year: { present: number; late: number; count: number; meetingDays: number; rate: number };
  };
  bonusPoints: BonusPointsRecord[];
};

export type AdminMe = {
  isAdmin: boolean;
  adminId?: string;
  username?: string;
  expiresAt?: string; // ISO
};

export type MemberFormMode = "create" | "edit";

export type MemberFormState = {
  mode: MemberFormMode;
  open: boolean;
  memberId?: string;
  name: string;
  phone: string;
  birthDateYmd: string; // YYYY-MM-DD
  photoUrl: string; // blob url
};

export type CropPixels = { x: number; y: number; width: number; height: number };
