// 수박게임 타입 정의

export type FruitTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type Fruit = {
  id: string;
  tier: FruitTier;
  x: number;
  y: number;
  radius: number;
  alive: boolean;
  bodyRef?: Matter.Body;
  spawnTime: number;
};

export type ContainerBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ScoreAnimation = {
  id: string;
  x: number;
  y: number;
  score: number;
  startTime: number;
  duration: number;
};

export type MergeAnimation = {
  id: string;
  x: number;
  y: number;
  startTime: number;
  duration: number;
  tier: FruitTier;
};

export type PopAnimation = {
  id: string;
  x: number;
  y: number;
  startTime: number;
  duration: number;
  tier: FruitTier;
  velocityX: number;
  velocityY: number;
};
