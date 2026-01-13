/**
 * 수박게임 설정 파일
 * 
 * 이 파일에서 과일의 동작과 게임 플레이를 조정할 수 있습니다.
 * 각 설정값의 의미와 조정 방법은 아래 주석을 참고하세요.
 * 
 * 주요 설정 카테고리:
 * - FRUIT_CONFIGS: 각 과일의 크기와 이름
 * - PHYSICS_CONFIG: 물리 엔진 설정 (중력, 반발력, 마찰 등)
 * - CONTAINER_CONFIG: 컨테이너(벽, 바닥) 설정
 * - GAME_CONFIG: 게임 플레이 설정 (합성, 드롭, 점수 등)
 * - FRUIT_SPAWN_CONFIG: 과일 생성 설정
 */

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
  // 중력 설정
  gravity: { x: 0, y: 1 }, // 중력 (y값이 클수록 빠르게 떨어짐)
  
  // 과일 물리 속성
  restitution: 0.6, // 반발력 (0~1, 높을수록 튕김)
  friction: 0.1, // 마찰력 (0~1, 높을수록 미끄러지지 않음)
  frictionAir: 0.01, // 공기 저항 (0~1, 높을수록 느려짐)
  density: 0.001, // 밀도 (높을수록 무거움)
  
  // 바닥 물리 속성
  groundRestitution: 0.7, // 바닥 반발력 (0~1, 높을수록 바닥에서 튕김)
  groundFriction: 0.1, // 바닥 마찰력 (0~1, 높을수록 바닥에 붙음)
};

// 컨테이너 설정
export const CONTAINER_CONFIG = {
  wallThickness: 10,
  spawnY: -50, // 스폰 Y 위치 (화면 위)
  spawnVelocityRange: { x: [-3, 3], y: [0, 2] }, // 초기 속도 범위
};

// 게임 설정
export const GAME_CONFIG = {
  // 게임 오버 라인 설정 (상단에서의 거리, 픽셀 단위)
  // 이 값만 변경하면 게임 오버 라인 위치가 변경됩니다
  gameOverLineMargin: 50, // 게임 오버 라인 Y축 위치 (픽셀 단위, 작을수록 위에 위치)
  gameOverLineWarningHeight: 20, // 경고 배경 그라데이션 높이 (픽셀 단위, 라인 아래로 확장)
  gameOverLineTextOffset: 12, // 경고 텍스트 오프셋 (픽셀 단위, 라인 위로)
  gameOverVelocityThreshold: 0.01, // 게임 오버 체크용 속도 임계값 (픽셀/프레임 단위)
  // 설명: 게임 오버 라인 체크 시, 과일이 정지 상태인지 판단하는 기준입니다.
  // - 과일의 Y축 속도(velocity.y)의 절댓값이 이 값보다 작으면 "정지 상태"로 간주합니다.
  // - 떨어지고 있는 과일은 게임 오버 체크에서 제외됩니다 (과일이 떨어지는 중에는 게임 오버가 발생하지 않음).
  // - 값이 너무 크면: 떨어지고 있는 과일도 정지로 잘못 인식 → 게임 오버가 너무 빨리 발생
  // - 값이 너무 작으면: 완전히 정지해야만 인식 → 게임 오버가 너무 늦게 발생
  // - 권장 범위: 0.3 ~ 0.8 (현재 0.5는 적절한 값)
  
  // 드롭 및 합성 설정
  dropCooldown: 0.3, // 드롭 쿨다운 (초, 이 시간 내에는 연속 드롭 불가)
  mergeCooldown: 0.1, // 합성 쿨다운 (초, 스폰 후 이 시간 내에는 합성 불가)
  secondaryMergeCooldown: 0.1, // 보조 합성 쿨다운 (초, 보조 합성 체크용)
  scoreMultiplier: 10, // 점수 배수 (레벨 × 배수 = 점수)
  
  // 합성 거리 설정
  maxMergeDistance: 1.2, // 합성 가능 거리 배수 (반지름 합 × 배수, 높을수록 멀리서도 합성)
  secondaryMergeDistance: 1.1, // 보조 합성 거리 배수 (반지름 합 × 배수)
  
  // 드롭 시 초기 속도 설정
  dropInitialVelocityY: 1, // 드롭 시 초기 Y 속도 (높을수록 빠르게 떨어짐)
  dropAngularVelocityRange: 0.15, // 드롭 시 각속도 범위 (±값, 높을수록 많이 회전)
  
  // 수박 클릭 폭발 설정
  watermelonClickMaxDistance: 150, // 수박 클릭 시 연결된 것으로 간주할 최대 거리 (픽셀)
  watermelonClickMinDistance: 20, // 수박 클릭 시 최소 연결 거리 오프셋 (픽셀, 반지름 합 + 이 값)
  watermelonClickExplosionVelocityMin: 2, // 폭발 시 최소 속도 (픽셀/프레임)
  watermelonClickExplosionVelocityMax: 5, // 폭발 시 최대 속도 (픽셀/프레임)
};

// 과일 생성 설정 (extraSettings.js 참고)
export const FRUIT_SPAWN_CONFIG = {
  minRandomFruitNum: 0, // 최소 과일 레벨
  maxRandomFruitNum: 5, // 최대 과일 레벨 (포함 안됨, 0-4 생성)
  firstFruit: 0 as FruitTier, // 첫 번째 과일
  startFruits: [0, 0, 1, 2, 2, 3] as FruitTier[], // 시작 과일들
};
