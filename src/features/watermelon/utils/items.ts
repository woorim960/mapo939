// 수박게임 아이템 목록 (하드코딩)

export type WatermelonItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  effectType: string;
  effectValue: any;
  icon: string | null;
  sortOrder: number;
};

// 아이템 목록 (정렬 순서대로)
export const WATERMELON_ITEMS: WatermelonItem[] = [
  {
    id: "select_next_fruit",
    name: "다음 과일 지정",
    description: "원하는 과일을 선택하여 다음에 떨어지도록 지정합니다. 가격은 선택한 과일의 레벨 x 10입니다.",
    price: 0, // 동적 가격 (레벨 x 10)
    effectType: "select_next_fruit",
    effectValue: null,
    icon: "🎯",
    sortOrder: 1,
  },
  {
    id: "bonus_score",
    name: "점수 2배",
    description: "30초 동안 획득하는 점수가 2배가 됩니다",
    price: 80,
    effectType: "bonus_score",
    effectValue: { duration: 30000, multiplier: 2 },
    icon: "⭐",
    sortOrder: 2,
  },
  {
    id: "remove_fruits_top",
    name: "상단 과일 제거",
    description: "화면 상단의 과일 3개를 제거합니다",
    price: 120,
    effectType: "remove_fruits",
    effectValue: { count: 3, position: "top" },
    icon: "⬆️",
    sortOrder: 3,
  },
  {
    id: "remove_fruits_bottom",
    name: "하단 과일 제거",
    description: "화면 하단의 과일 3개를 제거합니다",
    price: 120,
    effectType: "remove_fruits",
    effectValue: { count: 3, position: "bottom" },
    icon: "🧹",
    sortOrder: 4,
  },
  {
    id: "remove_fruits_random",
    name: "랜덤 과일 제거",
    description: "화면의 랜덤 과일 5개를 제거합니다",
    price: 150,
    effectType: "remove_fruits",
    effectValue: { count: 5, position: "random" },
    icon: "✨",
    sortOrder: 5,
  },
  {
    id: "lower_game_over_line",
    name: "게임 오버 라인 상향",
    description: "게임 오버 라인을 최고 위로 올립니다. 게임당 한 번만 사용 가능하며, 게임 종료까지 효과가 유지됩니다.",
    price: 200,
    effectType: "lower_game_over_line",
    effectValue: { duration: 60000, offset: 50 }, // duration과 offset은 사용되지 않음 (영구 효과)
    icon: "📉",
    sortOrder: 6,
  },
];

// 아이템 ID로 아이템 찾기
export function getItemById(itemId: string): WatermelonItem | undefined {
  return WATERMELON_ITEMS.find((item) => item.id === itemId);
}

// 모든 아이템 목록 반환
export function getAllItems(): WatermelonItem[] {
  return WATERMELON_ITEMS;
}
