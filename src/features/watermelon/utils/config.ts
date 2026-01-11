// 수박게임 설정

import type { FruitTier } from "../types";

export const FRUIT_CONFIGS: Record<
  FruitTier,
  { emoji: string; radius: number; name: string }
> = {
  0: { emoji: "🍒", radius: 20, name: "체리" },
  1: { emoji: "🍓", radius: 25, name: "딸기" },
  2: { emoji: "🍇", radius: 30, name: "포도" },
  3: { emoji: "🍊", radius: 35, name: "오렌지" },
  4: { emoji: "🍋", radius: 40, name: "레몬" },
  5: { emoji: "🥝", radius: 45, name: "키위" },
  6: { emoji: "🍍", radius: 50, name: "파인애플" },
  7: { emoji: "🍑", radius: 55, name: "복숭아" },
  8: { emoji: "🍈", radius: 60, name: "멜론" },
  9: { emoji: "🍉", radius: 65, name: "수박 반쪽" },
  10: { emoji: "🍉", radius: 70, name: "수박" },
};

// 물리 설정
export const PHYSICS_CONFIG = {
  gravity: { x: 0, y: 1 },
  restitution: 0.6, // 반발력
  friction: 0.1, // 마찰
  frictionAir: 0.01, // 공기 저항
  density: 0.001,
  groundRestitution: 0.7, // 바닥 반발력
};

// 컨테이너 설정
export const CONTAINER_CONFIG = {
  wallThickness: 10,
  spawnY: -50, // 스폰 Y 위치 (화면 위)
  spawnVelocityRange: { x: [-3, 3], y: [0, 2] }, // 초기 속도 범위
};

// 게임 설정
export const GAME_CONFIG = {
  gameOverLineMargin: 100, // 게임 오버 라인 여백
  dropCooldown: 0.3, // 드롭 쿨다운 (초)
  mergeCooldown: 0.1, // 합성 쿨다운 (초)
  scoreMultiplier: 10, // 점수 배수 (레벨 × 배수)
  maxMergeDistance: 1.2, // 합성 가능 거리 배수 (반지름 합 × 배수)
};

// 과일 생성 설정 (extraSettings.js 참고)
export const FRUIT_SPAWN_CONFIG = {
  minRandomFruitNum: 0, // 최소 과일 레벨
  maxRandomFruitNum: 5, // 최대 과일 레벨 (포함 안됨, 0-4 생성)
  firstFruit: 0 as FruitTier, // 첫 번째 과일
  startFruits: [0, 0, 1, 2, 2, 3] as FruitTier[], // 시작 과일들
};
