// 물리 엔진 유틸리티

import Matter from "matter-js";
import type { ContainerBounds, FruitTier } from "../types";
import { FRUIT_CONFIGS, PHYSICS_CONFIG, CONTAINER_CONFIG } from "./config";

export function createEngine(): Matter.Engine {
  const engine = Matter.Engine.create();
  engine.world.gravity.y = PHYSICS_CONFIG.gravity.y;
  return engine;
}

export function createContainer(
  engine: Matter.Engine,
  bounds: ContainerBounds
): Matter.Body[] {
  const walls: Matter.Body[] = [];
  const thickness = CONTAINER_CONFIG.wallThickness;
  const borderWidth = 4; // 캔버스 테두리 두께 (border-2 = 2px * 2 = 4px)
  const actualCanvasHeight = bounds.height - borderWidth; // 실제 캔버스 높이

  // 바닥 (실제 캔버스 하단에 위치)
  const ground = Matter.Bodies.rectangle(
    bounds.width / 2,
    actualCanvasHeight - thickness / 2, // 바닥의 상단이 캔버스 하단에 맞도록
    bounds.width + thickness * 2,
    thickness,
    {
      isStatic: true,
      label: "ground",
      restitution: PHYSICS_CONFIG.groundRestitution,
      friction: PHYSICS_CONFIG.groundFriction, // 바닥 마찰력
    }
  );

  // 왼쪽 벽
  const leftWall = Matter.Bodies.rectangle(
    -thickness / 2,
    actualCanvasHeight / 2,
    thickness,
    actualCanvasHeight,
    { isStatic: true, label: "leftWall" }
  );

  // 오른쪽 벽
  const rightWall = Matter.Bodies.rectangle(
    bounds.width + thickness / 2,
    actualCanvasHeight / 2,
    thickness,
    actualCanvasHeight,
    { isStatic: true, label: "rightWall" }
  );

  walls.push(ground, leftWall, rightWall);
  Matter.World.add(engine.world, walls);

  return walls;
}

export function createFruitBody(
  engine: Matter.Engine,
  tier: FruitTier,
  x: number,
  y: number
): Matter.Body {
  const config = FRUIT_CONFIGS[tier];
  const body = Matter.Bodies.circle(x, y, config.radius, {
    restitution: PHYSICS_CONFIG.restitution,
    friction: PHYSICS_CONFIG.friction,
    frictionAir: PHYSICS_CONFIG.frictionAir,
    density: PHYSICS_CONFIG.density,
    label: `fruit_${tier}`,
  });

  Matter.World.add(engine.world, body);
  return body;
}

export function removeFruitBody(engine: Matter.Engine, body: Matter.Body): void {
  Matter.World.remove(engine.world, body);
}
