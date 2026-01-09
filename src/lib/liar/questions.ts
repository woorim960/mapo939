export type LiarQuestion = {
  id: string;
  text: string;
  min: number;
  max: number;
};

export const QUESTIONS: readonly LiarQuestion[] = [
  { id: "q1", text: "당신의 신체 나이는?", min: 0, max: 120 },
  { id: "q2", text: "최근 일주일 동안 운동한 날 수는?", min: 0, max: 14 },
  { id: "q3", text: "하루 평균 스마트폰 사용 시간(시간 단위)은?", min: 0, max: 24 },
  { id: "q4", text: "한달에 커피를 마시는 횟수는?", min: 0, max: 30 },
  { id: "q5", text: "최근 한 달 동안 영화를 본 횟수는?", min: 0, max: 30 },

  { id: "q6", text: "하루 평균 수면 시간은?", min: 0, max: 24 },
  { id: "q7", text: "한달에 외식을 하는 횟수는?", min: 0, max: 30 },
  { id: "q8", text: "최근 2주일 동안 집에 머문 날 수는?", min: 0, max: 14 },
  { id: "q9", text: "평균 한 달에 책을 읽는 권수는?", min: 0, max: 30 },
  { id: "q10", text: "최근 일주일 동안 대중교통을 이용한 횟수는?", min: 0, max: 30 },

  { id: "q11", text: "하루 평균 물을 마시는 컵 수는?", min: 0, max: 20 },
  { id: "q12", text: "최근 한 달 동안 배달 음식을 시킨 횟수는?", min: 0, max: 120 },
  { id: "q13", text: "살면서 읽어본 책 중 가장 긴 페이지의 쪽 수는?", min: 0, max: 1200 },
  { id: "q14", text: "최근 일주일 동안 커피를 안 마신 날 수는?", min: 0, max: 14 },
  { id: "q15", text: "하루 평균 앉아있는 시간(시간 단위)은?", min: 0, max: 24 },

  { id: "q16", text: "최근 1년 동안 친구를 만난 횟수는?", min: 0, max: 1200 },
  { id: "q17", text: "최근 네 달 동안 집에서 요리한 횟수는?", min: 0, max: 120 },
  { id: "q18", text: "최근 일주일 동안 야식을 먹은 횟수는?", min: 0, max: 14 },
  { id: "q19", text: "평균 한 달에 옷을 사는 횟수는?", min: 0, max: 14 },
  { id: "q20", text: "하루 평균 스트레칭하는 시간(분 단위)은?", min: 0, max: 120 },

  { id: "q21", text: "최근 한 달 동안 술을 마신 횟수는?", min: 0, max: 30 },
  { id: "q22", text: "최근 일주일 동안 술을 마신 횟수는?", min: 0, max: 14 },
  { id: "q23", text: "최근 일주일 동안 늦잠 잔 날 수는?", min: 0, max: 7 },
  { id: "q24", text: "최근 두 달 동안 지하철을 이용한 횟수는?", min: 0, max: 120 },
  { id: "q25", text: "하루 평균 음악을 듣는 시간(시간 단위)은?", min: 0, max: 24 },

  { id: "q26", text: "최근 한 달 동안 새로운 장소를 방문한 횟수는?", min: 0, max: 30 },
  { id: "q27", text: "일주일에 샤워하는 횟수는?", min: 0, max: 21 },
  { id: "q28", text: "최근 일주일 동안 단 음식을 먹은 횟수는?", min: 0, max: 21 },
  { id: "q29", text: "한 달에 사진을 찍은 날 수는?", min: 0, max: 31 },
  { id: "q30", text: "하루 평균 TV·영상 시청 시간(시간 단위)은?", min: 0, max: 24 },

  { id: "q31", text: "최근 한 달 동안 게임한 횟수는?", min: 0, max: 30 },
  { id: "q32", text: "일주일에 계단을 이용한 날 수는?", min: 0, max: 7 },
  { id: "q33", text: "최근 일주일 동안 과일을 먹은 날 수는?", min: 0, max: 7 },
  { id: "q34", text: "한 달에 알람을 끄고 다시 잔 날 수는?", min: 0, max: 31 },
  { id: "q35", text: "하루 평균 집중해서 일한 시간(시간 단위)은?", min: 0, max: 16 },

  { id: "q36", text: "최근 한 달 동안 산책한 횟수는?", min: 0, max: 30 },
  { id: "q37", text: "일주일에 간식을 먹은 횟수는?", min: 0, max: 21 },
  { id: "q38", text: "최근 일주일 동안 늦게 잔 날 수는?", min: 0, max: 7 },
  { id: "q39", text: "한 달에 계획을 세운 날 수는?", min: 0, max: 31 },
  { id: "q40", text: "하루 평균 메시지를 보낸 횟수는?", min: 0, max: 500 },

  { id: "q41", text: "최근 한 달 동안 운동을 쉰 날 수는?", min: 0, max: 31 },
  { id: "q42", text: "일주일에 물을 충분히 마셨다고 느낀 날 수는?", min: 0, max: 7 },
  { id: "q43", text: "최근 일주일 동안 웃은 횟수는?", min: 0, max: 100 },
  { id: "q44", text: "한 달에 새로 배운 것이 있다고 느낀 날 수는?", min: 0, max: 31 },
  { id: "q45", text: "하루 평균 휴식 시간(시간 단위)은?", min: 0, max: 24 },

  { id: "q46", text: "최근 한 달 동안 일찍 일어난 날 수는?", min: 0, max: 31 },
  { id: "q47", text: "일주일에 집중이 잘 된 날 수는?", min: 0, max: 7 },
  { id: "q48", text: "최근 일주일 동안 불필요한 소비를 한 횟수는?", min: 0, max: 21 },
  { id: "q49", text: "한 달에 목표를 달성했다고 느낀 날 수는?", min: 0, max: 31 },
  { id: "q50", text: "하루 평균 혼자 있는 시간(시간 단위)은?", min: 0, max: 24 },
] as const;
