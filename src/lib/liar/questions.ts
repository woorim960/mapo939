export type LiarQuestion = {
  id: string;
  text: string;
  min: number;
  max: number;
};

// TODO: 여기에 50개 채우면 됨
export const QUESTIONS: readonly LiarQuestion[] = [
  { id: "q1", text: "당신의 신체 나이는?", min: 0, max: 120 },
  { id: "q2", text: "최근 일주일 동안 운동한 횟수는?", min: 0, max: 21 },
  // ...
] as const;
