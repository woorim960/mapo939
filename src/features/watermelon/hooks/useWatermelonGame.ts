// 수박게임 메인 Hook

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Matter from "matter-js";
import type { Fruit, ContainerBounds, FruitTier, ScoreAnimation, MergeAnimation, PopAnimation } from "../types";
import {
  FRUIT_CONFIGS,
  GAME_CONFIG,
  FRUIT_SPAWN_CONFIG,
  CONTAINER_CONFIG,
  PHYSICS_CONFIG,
} from "../utils/config";
import {
  createEngine,
  createContainer,
  createFruitBody,
  removeFruitBody,
} from "../utils/physics";
import { playMergeSound, playDropSound, playGameOverSound } from "../utils/sound";
import { getLS, setLS, removeLS } from "@/shared/utils/storage";

const BEST_SCORE_KEY = "watermelon_best_score";
const SCORE_HISTORY_KEY = "watermelon_score_history";
const MAX_HISTORY_SIZE = 100; // 최대 100개의 기록만 저장

// 시드 기반 PRNG (디버깅 및 재현성)
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

export type ScoreStats = {
  bestScore: number;
  averageScore: number;
  playCount: number;
  recentScores: number[];
};

export function useWatermelonGame(containerBounds: ContainerBounds, playerId?: string) {
  const [fruits, setFruits] = useState<Map<string, Fruit>>(new Map());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [scoreStats, setScoreStats] = useState<ScoreStats>({
    bestScore: 0,
    averageScore: 0,
    playCount: 0,
    recentScores: [],
  });
  const [isGameOver, setIsGameOver] = useState(false);
  const [maxUnlockedTier, setMaxUnlockedTier] = useState<FruitTier>(FRUIT_SPAWN_CONFIG.firstFruit); // 현재 게임에서 만든 최대 레벨
  const [nextTier, setNextTier] = useState<FruitTier>(FRUIT_SPAWN_CONFIG.firstFruit);
  const [nextNextTier, setNextNextTier] = useState<FruitTier>(FRUIT_SPAWN_CONFIG.firstFruit);
  const [scoreAnimations, setScoreAnimations] = useState<ScoreAnimation[]>([]);
  const [mergeAnimations, setMergeAnimations] = useState<MergeAnimation[]>([]);
  const [popAnimations, setPopAnimations] = useState<PopAnimation[]>([]);

  const engineRef = useRef<Matter.Engine | null>(null);
  const fruitsRef = useRef<Map<string, Fruit>>(new Map());
  const fruitsByBodyRef = useRef<Map<Matter.Body, Fruit>>(new Map()); // bodyRef를 키로 하는 Map (O(1) 조회)
  const mergingIdsRef = useRef<Set<string>>(new Set());
  const rngRef = useRef(new SeededRandom(Date.now()));
  const animationFrameRef = useRef<number | null>(null);
  const lastDropTimeRef = useRef<number>(0);
  const scoreSavedRef = useRef(false);
  const gameStartTimeRef = useRef<number>(Date.now());
  const scoreRef = useRef(0); // 최신 점수를 추적하기 위한 ref
  const bestScoreRef = useRef(0); // 최신 최고점수를 추적하기 위한 ref
  const lastSavedScoreRef = useRef<number | null>(null); // 마지막으로 저장한 점수를 추적
  const isSavingRef = useRef(false); // 현재 저장 중인지 추적
  const gameSessionIdRef = useRef<string | null>(null); // 현재 게임 세션 ID
  const maxUnlockedTierRef = useRef<FruitTier>(FRUIT_SPAWN_CONFIG.firstFruit); // 현재 게임에서 만든 최대 레벨을 ref로 추적
  const scoreMultiplierRef = useRef<number>(1); // 점수 배수 (기본 1배)
  const scoreMultiplierEndTimeRef = useRef<number>(0); // 점수 배수 종료 시간
  const scoreMultiplierStartTimeRef = useRef<number>(0); // 점수 배수 시작 시간
  const gravityMultiplierRef = useRef<number>(1); // 중력 배수 (기본 1배)
  const gravityMultiplierEndTimeRef = useRef<number>(0); // 중력 배수 종료 시간
  const gravityMultiplierStartTimeRef = useRef<number>(0); // 중력 배수 시작 시간
  const gameOverLineOffsetRef = useRef<number>(0); // 게임 오버 라인 오프셋 (기본 0, 음수면 위로 올라감)
  const gameOverLineOffsetEndTimeRef = useRef<number>(0); // 게임 오버 라인 오프셋 종료 시간
  const gameOverLineOffsetStartTimeRef = useRef<number>(0); // 게임 오버 라인 오프셋 시작 시간
  const gameOverLineItemUsedRef = useRef<boolean>(false); // 게임 오버 라인 아이템 사용 여부 (게임당 한 번만)

  // 점수 통계 로드 및 계산
  const loadAndCalculateStats = useCallback(() => {
    const savedHistory = getLS(SCORE_HISTORY_KEY);
    const savedBest = getLS(BEST_SCORE_KEY);
    
    let history: number[] = [];
    if (savedHistory) {
      try {
        history = JSON.parse(savedHistory);
        if (!Array.isArray(history)) history = [];
      } catch {
        history = [];
      }
    }
    
    const best = savedBest ? parseInt(savedBest, 10) || 0 : 0;
    
    // 통계 계산
    const playCount = history.length;
    const averageScore = playCount > 0 
      ? Math.round(history.reduce((sum, s) => sum + s, 0) / playCount)
      : 0;
    const recentScores = history.slice(-10).reverse(); // 최근 10개, 최신순
    
    setBestScore(best);
    bestScoreRef.current = best; // ref 초기화
    setScoreStats({
      bestScore: best,
      averageScore,
      playCount,
      recentScores,
    });
  }, []);

  // 점수 기록 저장 (로컬 스토리지 + DB)
  const saveScore = useCallback(async (playerId?: string) => {
    const currentScore = scoreRef.current; // ref에서 최신 점수 가져오기
    if (currentScore < 200) return; // 200점 미만은 저장하지 않음
    
    // 저장 중이면 새로운 저장 요청 무시
    if (isSavingRef.current) {
      console.log(`[Score Save] Save already in progress. Ignoring duplicate request. Score: ${currentScore}`);
      return;
    }
    
    // 같은 세션에서 이미 저장했고 점수가 같거나 낮으면 저장하지 않음
    if (gameSessionIdRef.current && lastSavedScoreRef.current !== null && currentScore <= lastSavedScoreRef.current && scoreSavedRef.current) {
      console.log(`[Score Save] Same session save prevented. Score: ${currentScore} (previous: ${lastSavedScoreRef.current})`);
      return;
    }
    
    // 저장 시작 플래그 설정
    isSavingRef.current = true;
    
    // 로컬 스토리지에 저장 (기존 로직 유지)
    const savedHistory = getLS(SCORE_HISTORY_KEY);
    let history: number[] = [];
    
    if (savedHistory) {
      try {
        history = JSON.parse(savedHistory);
        if (!Array.isArray(history)) history = [];
      } catch {
        history = [];
      }
    }
    
    // 새 점수 추가
    history.push(currentScore);
    
    // 최대 크기 제한
    if (history.length > MAX_HISTORY_SIZE) {
      history = history.slice(-MAX_HISTORY_SIZE);
    }
    
    // 저장
    setLS(SCORE_HISTORY_KEY, JSON.stringify(history));
    
    // 최고점수 업데이트
    if (currentScore > bestScoreRef.current) {
      setBestScore(currentScore);
      bestScoreRef.current = currentScore;
      setLS(BEST_SCORE_KEY, currentScore.toString());
    }
    
    // DB에 저장 (playerId가 있으면)
    if (playerId) {
      try {
        const { saveScore: saveScoreApi } = await import("../api");
        await saveScoreApi(playerId, currentScore, gameSessionIdRef.current || undefined, maxUnlockedTierRef.current);
        console.log(`[Score Saved] Player: ${playerId}, Score: ${currentScore}, MaxTier: ${maxUnlockedTierRef.current}, Session: ${gameSessionIdRef.current}`);
        // 저장 성공 시 플래그 업데이트
        scoreSavedRef.current = true;
        lastSavedScoreRef.current = currentScore;
      } catch (error) {
        console.error("Failed to save score to DB:", error);
        console.error("Error details:", {
          playerId,
          score: currentScore,
          error: error instanceof Error ? error.message : String(error),
        });
        // DB 저장 실패해도 계속 진행
      }
    } else {
      console.warn("[Score Save] No playerId provided, skipping DB save");
    }
    
    // 통계 재계산
    loadAndCalculateStats();
    
    // 저장 완료 플래그 해제
    isSavingRef.current = false;
  }, [loadAndCalculateStats]);

  // 초기 로드
  useEffect(() => {
    loadAndCalculateStats();
    gameStartTimeRef.current = Date.now();
    // 초기 게임 세션 ID 생성
    gameSessionIdRef.current = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, [loadAndCalculateStats]);

  // 아이템 효과 타이머 체크 (점수 배수, 중력, 게임 오버 라인)
  useEffect(() => {
    const checkItemEffects = () => {
      const now = Date.now();
      
      // 점수 배수 체크
      if (now >= scoreMultiplierEndTimeRef.current) {
        scoreMultiplierRef.current = 1;
      }
      
      // 중력 배수 체크
      if (now >= gravityMultiplierEndTimeRef.current) {
        gravityMultiplierRef.current = 1;
        if (engineRef.current) {
          engineRef.current.world.gravity.y = PHYSICS_CONFIG.gravity.y;
        }
      }
      
      // 게임 오버 라인 오프셋 체크 (영구 효과는 체크하지 않음)
      if (gameOverLineOffsetEndTimeRef.current !== Infinity && now >= gameOverLineOffsetEndTimeRef.current) {
        gameOverLineOffsetRef.current = 0;
      }
    };
    
    const interval = setInterval(checkItemEffects, 100);
    return () => clearInterval(interval);
  }, []);

  // 물리 엔진 초기화
  useEffect(() => {
    const engine = createEngine();
    engineRef.current = engine;

    createContainer(engine, containerBounds);

    // 물리 시뮬레이션 루프
    const run = () => {
      Matter.Engine.update(engine);
      animationFrameRef.current = requestAnimationFrame(run);
    };
    run();

    // 충돌 이벤트 처리
    const handleCollision = (event: Matter.IEventCollision<Matter.Engine>) => {
      const pairs = event.pairs;
      const now = Date.now() / 1000;

      for (const pair of pairs) {
        const { bodyA, bodyB } = pair;
        // O(1) 조회로 최적화
        const fruitA = fruitsByBodyRef.current.get(bodyA);
        const fruitB = fruitsByBodyRef.current.get(bodyB);

        if (!fruitA || !fruitB) continue;
        if (fruitA.tier !== fruitB.tier) continue;
        if (fruitA.tier >= 10) continue; // 최대 레벨
        if (mergingIdsRef.current.has(fruitA.id) || mergingIdsRef.current.has(fruitB.id)) continue;

        const timeSinceSpawnA = now - fruitA.spawnTime;
        const timeSinceSpawnB = now - fruitB.spawnTime;
        if (timeSinceSpawnA < GAME_CONFIG.mergeCooldown || timeSinceSpawnB < GAME_CONFIG.mergeCooldown) continue;

        const posA = bodyA.position;
        const posB = bodyB.position;
        const distance = Math.sqrt(
          Math.pow(posA.x - posB.x, 2) + Math.pow(posA.y - posB.y, 2)
        );
        const sumRadius = fruitA.radius + fruitB.radius;
        const maxDistance = sumRadius * GAME_CONFIG.maxMergeDistance;

        if (distance <= maxDistance) {
          // 합성 실행
          mergingIdsRef.current.add(fruitA.id);
          mergingIdsRef.current.add(fruitB.id);

          const newTier = (fruitA.tier + 1) as FruitTier;
          const mergeX = (posA.x + posB.x) / 2;
          const mergeY = (posA.y + posB.y) / 2;

          // 최대 unlock 레벨 업데이트
          setMaxUnlockedTier((prev) => {
            if (newTier > prev) {
              maxUnlockedTierRef.current = newTier;
              return newTier;
            }
            return prev;
          });

          // 기존 과일 제거
          removeFruitBody(engine, bodyA);
          removeFruitBody(engine, bodyB);

          // 상태 업데이트 배치 처리 (한 번에 제거 + 생성)
          const newBody = createFruitBody(engine, newTier, mergeX, mergeY);
          const newFruit: Fruit = {
            id: `fruit_${Date.now()}_${Math.random()}`,
            tier: newTier,
            x: mergeX,
            y: mergeY,
            radius: FRUIT_CONFIGS[newTier].radius,
            alive: true,
            bodyRef: newBody,
            spawnTime: Date.now() / 1000,
          };

          // requestAnimationFrame으로 다음 프레임에 상태 업데이트 (배치 처리)
          requestAnimationFrame(() => {
            setFruits((prev) => {
              const newMap = new Map(prev);
              newMap.delete(fruitA.id);
              newMap.delete(fruitB.id);
              newMap.set(newFruit.id, newFruit);
              fruitsRef.current = newMap;
              // bodyRef Map도 업데이트
              fruitsByBodyRef.current.delete(bodyA);
              fruitsByBodyRef.current.delete(bodyB);
              fruitsByBodyRef.current.set(newBody, newFruit);
              return newMap;
            });

            // 점수 추가 (아이템 배수 적용)
            const basePoints = newTier * GAME_CONFIG.scoreMultiplier;
            const points = Math.floor(basePoints * scoreMultiplierRef.current);
            setScore((prev) => {
              const newScore = prev + points;
              scoreRef.current = newScore; // ref 업데이트
              if (newScore > bestScoreRef.current) {
                setBestScore(newScore);
                bestScoreRef.current = newScore; // ref 업데이트
                setLS(BEST_SCORE_KEY, newScore.toString());
              }
              return newScore;
            });

            // 애니메이션 추가
            setMergeAnimations((prev) => [
              ...prev,
              {
                id: `merge_${Date.now()}`,
                x: mergeX,
                y: mergeY,
                startTime: Date.now(),
                duration: 500,
                tier: newTier,
              },
            ]);

            setScoreAnimations((prev) => [
              ...prev,
              {
                id: `score_${Date.now()}`,
                x: mergeX,
                y: mergeY,
                score: points,
                startTime: Date.now(),
                duration: 1000,
              },
            ]);

            playMergeSound();

            // 머지 ID 제거
            setTimeout(() => {
              mergingIdsRef.current.delete(fruitA.id);
              mergingIdsRef.current.delete(fruitB.id);
            }, 500);
          });
        }
      }
    };

    Matter.Events.on(engine, "collisionStart", handleCollision);

    // 주기적 체크 (충돌 이벤트가 놓칠 수 있는 경우 대비) - 빈도 줄이기 및 최적화
    let lastCheckTime = 0;
    const checkMergeInterval = setInterval(() => {
      const now = Date.now();
      // 200ms마다만 체크 (성능 최적화)
      if (now - lastCheckTime < 200) return;
      lastCheckTime = now;
      
      const nowSeconds = now / 1000;
      const currentFruits = Array.from(fruitsRef.current.values()).filter(
        (f) => f.alive && f.bodyRef
      );

      // 과일이 너무 많으면 체크 스킵 (성능 보호)
      if (currentFruits.length > 30) return;

      // 같은 tier끼리만 그룹화하여 O(n²) -> O(n*k)로 최적화 (k는 같은 tier 개수)
      const fruitsByTier = new Map<FruitTier, Fruit[]>();
      for (const fruit of currentFruits) {
        if (fruit.tier >= 10) continue;
        if (mergingIdsRef.current.has(fruit.id)) continue;
        
        const timeSinceSpawn = nowSeconds - fruit.spawnTime;
        if (timeSinceSpawn < GAME_CONFIG.secondaryMergeCooldown) continue;
        
        if (!fruitsByTier.has(fruit.tier)) {
          fruitsByTier.set(fruit.tier, []);
        }
        fruitsByTier.get(fruit.tier)!.push(fruit);
      }

      // 같은 tier 내에서만 체크
      for (const [tier, tierFruits] of fruitsByTier.entries()) {
        if (tierFruits.length < 2) continue;
        
        for (let i = 0; i < tierFruits.length; i++) {
          const fruitA = tierFruits[i];
          if (!fruitA.bodyRef) continue;
          
          for (let j = i + 1; j < tierFruits.length; j++) {
            const fruitB = tierFruits[j];
            if (!fruitB.bodyRef) continue;
            
            const posA = fruitA.bodyRef.position;
            const posB = fruitB.bodyRef.position;
            // 거리 제곱으로 비교 (sqrt 제거로 성능 향상)
            const dx = posA.x - posB.x;
            const dy = posA.y - posB.y;
            const distanceSquared = dx * dx + dy * dy;
            const maxDistance = (fruitA.radius + fruitB.radius) * GAME_CONFIG.secondaryMergeDistance;
            const maxDistanceSquared = maxDistance * maxDistance;

            if (distanceSquared <= maxDistanceSquared) {
              // 합성 실행
              mergingIdsRef.current.add(fruitA.id);
              mergingIdsRef.current.add(fruitB.id);

              const newTier = (tier + 1) as FruitTier;
              const mergeX = (posA.x + posB.x) / 2;
              const mergeY = (posA.y + posB.y) / 2;

              // 최대 unlock 레벨 업데이트
              setMaxUnlockedTier((prev) => {
                if (newTier > prev) {
                  return newTier;
                }
                return prev;
              });

              removeFruitBody(engine, fruitA.bodyRef);
              removeFruitBody(engine, fruitB.bodyRef);

              const newBody = createFruitBody(engine, newTier, mergeX, mergeY);
              const newFruit: Fruit = {
                id: `fruit_${Date.now()}_${Math.random()}`,
                tier: newTier,
                x: mergeX,
                y: mergeY,
                radius: FRUIT_CONFIGS[newTier].radius,
                alive: true,
                bodyRef: newBody,
                spawnTime: nowSeconds,
              };

              // 배치 처리
              requestAnimationFrame(() => {
                setFruits((prev) => {
                  const newMap = new Map(prev);
                  newMap.delete(fruitA.id);
                  newMap.delete(fruitB.id);
                  newMap.set(newFruit.id, newFruit);
                  fruitsRef.current = newMap;
                  fruitsByBodyRef.current.delete(fruitA.bodyRef!);
                  fruitsByBodyRef.current.delete(fruitB.bodyRef!);
                  fruitsByBodyRef.current.set(newBody, newFruit);
                  return newMap;
                });

                const basePoints = newTier * GAME_CONFIG.scoreMultiplier;
                const points = Math.floor(basePoints * scoreMultiplierRef.current);
                setScore((prev) => {
                  const newScore = prev + points;
                  scoreRef.current = newScore;
                  if (newScore > bestScoreRef.current) {
                    setBestScore(newScore);
                    bestScoreRef.current = newScore;
                    setLS(BEST_SCORE_KEY, newScore.toString());
                  }
                  return newScore;
                });

                const isWatermelon = newTier === 10;
                setMergeAnimations((prev) => [
                  ...prev,
                  {
                    id: `merge_${Date.now()}`,
                    x: mergeX,
                    y: mergeY,
                    startTime: Date.now(),
                    duration: isWatermelon ? 1200 : 500,
                    tier: newTier,
                  },
                ]);

                setScoreAnimations((prev) => [
                  ...prev,
                  {
                    id: `score_${Date.now()}`,
                    x: mergeX,
                    y: mergeY,
                    score: points,
                    startTime: Date.now(),
                    duration: 1000,
                  },
                ]);

                playMergeSound();

                setTimeout(() => {
                  mergingIdsRef.current.delete(fruitA.id);
                  mergingIdsRef.current.delete(fruitB.id);
                }, 500);
              });
              
              return; // 한 번에 하나씩만 합성
            }
          }
        }
      }
    }, 50);

    // 초기 과일 생성 제거 - 게임은 0개부터 시작

    return () => {
      Matter.Events.off(engine, "collisionStart", handleCollision);
      clearInterval(checkMergeInterval);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      mergingIdsRef.current.clear();
    };
  }, [containerBounds.width, containerBounds.height, bestScore]);

  // 과일 위치 업데이트
  useEffect(() => {
    if (!engineRef.current) return;

    const updatePositions = () => {
      setFruits((prev) => {
        const newMap = new Map(prev);
        for (const [id, fruit] of newMap.entries()) {
          if (fruit.bodyRef) {
            const pos = fruit.bodyRef.position;
            newMap.set(id, {
              ...fruit,
              x: pos.x,
              y: pos.y,
            });
          }
        }
        fruitsRef.current = newMap;
        return newMap;
      });
    };

    const interval = setInterval(updatePositions, 16); // ~60fps
    return () => clearInterval(interval);
  }, []);

  // 게임 오버 체크 (requestAnimationFrame과 연동하여 정확하게 체크)
  useEffect(() => {
    if (isGameOver) return;
    if (!engineRef.current) return;

    let animationFrameId: number | null = null;
    let lastCheckTime = Date.now();
    let checkCount = 0;

    const checkGameOver = () => {
      // 50ms마다 체크 (성능 최적화)
      const now = Date.now();
      if (now - lastCheckTime < 50) {
        animationFrameId = requestAnimationFrame(checkGameOver);
        return;
      }
      lastCheckTime = now;
      checkCount++;

      // 게임 시작 후 1초 동안은 게임 오버 체크를 하지 않음 (초기 안정화 시간)
      const gameStartTime = gameStartTimeRef.current;
      const timeSinceStart = now - gameStartTime;
      if (timeSinceStart < 1000) {
        animationFrameId = requestAnimationFrame(checkGameOver);
        return;
      }

      const aliveFruits = Array.from(fruitsRef.current.values()).filter(
        (f) => f.alive && f.bodyRef
      );

      if (aliveFruits.length === 0) {
        animationFrameId = requestAnimationFrame(checkGameOver);
        return;
      }

      // 게임 오버 라인 체크 (과일들이 쌓여진 높이 중 가장 높은 위치가 빨간 점선을 넘으면 게임 오버)
      // 빨간 점선의 Y축 위치 (Canvas 상단에서 50px 아래, Y=50)
      // 아이템 효과 적용 (게임 오버 라인 상향/하향)
      // 오프셋이 음수면 라인이 위로 올라감 (최소 0까지)
      const gameOverLineY = Math.max(0, GAME_CONFIG.gameOverLineMargin + gameOverLineOffsetRef.current);
      
      // 모든 과일 중 가장 위에 있는 과일의 상단 위치 계산
      // Canvas 좌표계: Y=0이 상단, Y가 증가할수록 아래로 내려감
      // 과일이 쌓이면 Y 값이 증가하므로, 가장 위에 있는 과일은 Y 값이 가장 작음
      let highestTopY = Infinity;
      let highestFruitInfo: { id: string; centerY: number; radius: number; topY: number; velocity: number } | null = null;
      
      for (const f of aliveFruits) {
        if (!f.bodyRef) continue;
        
        // 물리 엔진에서 직접 최신 위치 가져오기
        const currentY = f.bodyRef.position.y;
        // 과일의 중심 y 좌표에서 반지름을 빼면 상단 위치
        const topY = currentY - f.radius;
        
        // 속도 확인 (떨어지고 있는지 확인)
        const velocityY = Math.abs(f.bodyRef.velocity.y);
        
        // 가장 위에 있는 과일의 상단 위치 업데이트 (Y 값이 작을수록 위에 있음)
        // 단, 속도가 임계값 이하인 정지 상태의 과일만 체크 (떨어지고 있는 과일은 제외)
        if (topY < highestTopY && velocityY < GAME_CONFIG.gameOverVelocityThreshold) {
          highestTopY = topY;
          highestFruitInfo = {
            id: f.id,
            centerY: currentY,
            radius: f.radius,
            topY: topY,
            velocity: velocityY,
          };
        }
      }
      
      // 가장 높은 과일의 상단 위치가 빨간 점선의 Y축 위치와 같아지거나 그 이상이 되면 게임 오버
      // 조건: highestTopY <= gameOverLineY (50)
      // 예: 과일의 상단이 Y=50에 도달하거나 그 위로 올라가면 게임 오버
      // 단, 정지 상태인 과일만 체크 (떨어지고 있는 과일은 제외)
      if (highestTopY !== Infinity && highestTopY <= gameOverLineY) {
        console.log(`[GAME OVER] Highest fruit reached game over line!`, {
          highestFruit: highestFruitInfo,
          highestTopY: highestTopY.toFixed(2),
          gameOverLineY,
          diff: (gameOverLineY - highestTopY).toFixed(2),
          totalFruits: aliveFruits.length,
        });
        if (!scoreSavedRef.current) {
          console.log("[Game Over] Saving score...", { playerId, currentScore: scoreRef.current });
          saveScore(playerId)
            .then(() => {
              console.log("[Game Over] Score saved successfully");
            })
            .catch((err) => {
              console.error("[Game Over] Failed to save score:", err);
            });
          // scoreSavedRef는 saveScore 내부에서 업데이트됨
        }
        setIsGameOver(true);
        playGameOverSound();
        return;
      }
      
      // 디버깅: 1초마다 상태 출력 (checkCount가 20의 배수일 때, 50ms * 20 = 1초)
      if (checkCount % 20 === 0 && highestTopY !== Infinity) {
        console.log(`[DEBUG] Game over check (${checkCount}):`, {
          highestTopY: highestTopY.toFixed(2),
          gameOverLineY,
          willTrigger: highestTopY <= gameOverLineY,
          totalFruits: aliveFruits.length,
          sampleFruits: aliveFruits.slice(0, 3).map(f => ({
            id: f.id.substring(0, 8),
            centerY: f.bodyRef?.position.y.toFixed(2),
            radius: f.radius,
            topY: (f.bodyRef ? f.bodyRef.position.y - f.radius : 0).toFixed(2),
          })),
        });
      }

      // 합성 가능 여부 체크 (보조 게임 오버 조건)
      let canMerge = false;
      for (let i = 0; i < aliveFruits.length; i++) {
        for (let j = i + 1; j < aliveFruits.length; j++) {
          if (aliveFruits[i].tier === aliveFruits[j].tier && aliveFruits[i].tier < 10) {
            canMerge = true;
            break;
          }
        }
        if (canMerge) break;
      }

      if (!canMerge && aliveFruits.length >= 10) {
        // 합성 불가능하고 과일이 많으면 게임 오버
        if (!scoreSavedRef.current) {
          console.log("[Game Over] Saving score (no merge)...", { playerId, currentScore: scoreRef.current });
          saveScore(playerId)
            .then(() => {
              console.log("[Game Over] Score saved successfully (no merge)");
            })
            .catch((err) => {
              console.error("[Game Over] Failed to save score (no merge):", err);
            });
          // scoreSavedRef는 saveScore 내부에서 업데이트됨
        }
        setIsGameOver(true);
        playGameOverSound();
        return;
      }

      // 다음 프레임에서 다시 체크
      animationFrameId = requestAnimationFrame(checkGameOver);
    };

    // 체크 시작
    animationFrameId = requestAnimationFrame(checkGameOver);

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isGameOver]);

  // 과일 드롭
  const dropFruit = useCallback(
    (x: number): boolean => {
      if (!engineRef.current) return false;

      const clampedX = Math.max(
        FRUIT_CONFIGS[nextTier].radius,
        Math.min(x, containerBounds.width - FRUIT_CONFIGS[nextTier].radius)
      );

      const body = createFruitBody(
        engineRef.current!,
        nextTier,
        clampedX,
        CONTAINER_CONFIG.spawnY
      );

      Matter.Body.setVelocity(body, { x: 0, y: GAME_CONFIG.dropInitialVelocityY });
      Matter.Body.setAngularVelocity(body, (rngRef.current.next() - 0.5) * GAME_CONFIG.dropAngularVelocityRange);

      const fruit: Fruit = {
        id: `fruit_${Date.now()}`,
        tier: nextTier,
        x: clampedX,
        y: CONTAINER_CONFIG.spawnY,
        radius: FRUIT_CONFIGS[nextTier].radius,
        alive: true,
        bodyRef: body,
        spawnTime: Date.now() / 1000,
      };

      setFruits((prev) => {
        const newMap = new Map(prev);
        newMap.set(fruit.id, fruit);
        fruitsRef.current = newMap;
        fruitsByBodyRef.current.set(body, fruit);
        return newMap;
      });

      // 다다음 과일을 다음 과일로 이동하고, 새로운 다다음 과일 생성
      setNextTier(nextNextTier);
      // unlock된 최대 레벨까지만 랜덤 생성 (레벨 10 수박은 랜덤 생성 불가, 무조건 9+9로만 생성)
      const maxAvailableTier = Math.min(maxUnlockedTier, 9); // 레벨 10은 랜덤 생성 불가
      const newNextNextTier =
        FRUIT_SPAWN_CONFIG.minRandomFruitNum +
        Math.floor(
          rngRef.current.next() *
            (maxAvailableTier + 1 - FRUIT_SPAWN_CONFIG.minRandomFruitNum)
        );
      setNextNextTier(Math.min(newNextNextTier, maxAvailableTier) as FruitTier);

      playDropSound();

      return true;
    },
    [nextTier, nextNextTier, maxUnlockedTier, containerBounds.width]
  );

  // 게임 리셋
  const resetGame = useCallback(() => {
    if (engineRef.current) {
      // 모든 과일 제거
      for (const fruit of fruitsRef.current.values()) {
        if (fruit.bodyRef) {
          removeFruitBody(engineRef.current, fruit.bodyRef);
        }
      }
      
      // 아이템 효과 리셋 (중력 원래대로)
      engineRef.current.world.gravity.y = PHYSICS_CONFIG.gravity.y;
    }

    setFruits(new Map());
    fruitsRef.current = new Map();
    fruitsByBodyRef.current.clear();
    setScore(0);
    scoreRef.current = 0; // ref 초기화
    setIsGameOver(false);
    setMaxUnlockedTier(FRUIT_SPAWN_CONFIG.firstFruit); // unlock 레벨 초기화
    maxUnlockedTierRef.current = FRUIT_SPAWN_CONFIG.firstFruit; // ref도 초기화
    setNextTier(FRUIT_SPAWN_CONFIG.firstFruit);
    setNextNextTier(FRUIT_SPAWN_CONFIG.firstFruit); // 처음에는 최소 레벨만
    setScoreAnimations([]);
    setMergeAnimations([]);
    setPopAnimations([]);
    mergingIdsRef.current.clear();
    rngRef.current = new SeededRandom(Date.now());
    scoreSavedRef.current = false; // 게임 리셋 시 저장 플래그도 리셋
    lastSavedScoreRef.current = null; // 마지막 저장 점수도 리셋
    isSavingRef.current = false; // 저장 중 플래그도 리셋
    gameStartTimeRef.current = Date.now();
    // 새로운 게임 세션 ID 생성
    gameSessionIdRef.current = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 아이템 효과 리셋
        scoreMultiplierRef.current = 1;
        scoreMultiplierEndTimeRef.current = 0;
        scoreMultiplierStartTimeRef.current = 0;
        gravityMultiplierRef.current = 1;
        gravityMultiplierEndTimeRef.current = 0;
        gravityMultiplierStartTimeRef.current = 0;
    gameOverLineOffsetRef.current = 0;
    gameOverLineOffsetEndTimeRef.current = 0;
    gameOverLineOffsetStartTimeRef.current = 0;
    gameOverLineItemUsedRef.current = false; // 게임 리셋 시 사용 여부도 초기화

    // 초기 과일 생성 제거 - 게임은 0개부터 시작
  }, [containerBounds.width, containerBounds.height]);

  // 최고점수 리셋
  const resetBestScore = useCallback(() => {
    setBestScore(0);
    removeLS(BEST_SCORE_KEY);
  }, []);

  // 애니메이션 완료 처리
  const handleAnimationComplete = useCallback(
    (type: "score" | "merge" | "pop", id: string) => {
      if (type === "score") {
        setScoreAnimations((prev) => prev.filter((a) => a.id !== id));
      } else if (type === "merge") {
        setMergeAnimations((prev) => prev.filter((a) => a.id !== id));
      } else if (type === "pop") {
        setPopAnimations((prev) => prev.filter((a) => a.id !== id));
      }
    },
    []
  );

  // 수박 클릭 처리
  const handleWatermelonClick = useCallback(
    (clickX: number, clickY: number) => {
      if (!engineRef.current) return;

      // 클릭한 위치에서 수박(레벨 10) 찾기
      const clickedWatermelon = Array.from(fruitsRef.current.values()).find((fruit) => {
        if (fruit.tier !== 10) return false;
        const distance = Math.sqrt(
          Math.pow(fruit.x - clickX, 2) + Math.pow(fruit.y - clickY, 2)
        );
        return distance <= fruit.radius;
      });

      if (!clickedWatermelon) return;

      // 수박과 붙어있는 과일들 찾기 (거리 기반)
      const connectedFruits: Fruit[] = [];
      const maxConnectionDistance = GAME_CONFIG.watermelonClickMaxDistance; // 수박과 연결된 것으로 간주할 최대 거리

      for (const fruit of fruitsRef.current.values()) {
        if (fruit.id === clickedWatermelon.id) continue; // 수박 자신은 제외
        if (!fruit.alive) continue;

        const distance = Math.sqrt(
          Math.pow(fruit.x - clickedWatermelon.x, 2) +
          Math.pow(fruit.y - clickedWatermelon.y, 2)
        );

        // 수박의 반지름 + 과일의 반지름 + 여유 공간을 고려한 거리
        const minDistance = clickedWatermelon.radius + fruit.radius + GAME_CONFIG.watermelonClickMinDistance;
        if (distance <= minDistance || distance <= maxConnectionDistance) {
          connectedFruits.push(fruit);
        }
      }

      if (connectedFruits.length === 0) return;

      // 점수 계산 및 터지는 애니메이션 추가
      let totalScore = 0;
      const newPopAnimations: PopAnimation[] = [];

      connectedFruits.forEach((fruit) => {
        const points = fruit.tier * GAME_CONFIG.scoreMultiplier;
        totalScore += points;

        // 랜덤한 방향으로 터지는 효과
        const angle = Math.random() * Math.PI * 2;
        const velocity = GAME_CONFIG.watermelonClickExplosionVelocityMin + Math.random() * (GAME_CONFIG.watermelonClickExplosionVelocityMax - GAME_CONFIG.watermelonClickExplosionVelocityMin);
        const velocityX = Math.cos(angle) * velocity;
        const velocityY = Math.sin(angle) * velocity;

        newPopAnimations.push({
          id: `pop_${fruit.id}_${Date.now()}`,
          x: fruit.x,
          y: fruit.y,
          startTime: Date.now(),
          duration: 600,
          tier: fruit.tier,
          velocityX,
          velocityY,
        });

        // 점수 애니메이션
        setScoreAnimations((prev) => [
          ...prev,
          {
            id: `score_pop_${fruit.id}_${Date.now()}`,
            x: fruit.x,
            y: fruit.y,
            score: points,
            startTime: Date.now(),
            duration: 1000,
          },
        ]);

        // 물리 엔진에서 제거
        if (fruit.bodyRef) {
          removeFruitBody(engineRef.current!, fruit.bodyRef);
        }
      });

      // 수박도 제거
      if (clickedWatermelon.bodyRef) {
        removeFruitBody(engineRef.current!, clickedWatermelon.bodyRef);
      }

      // 과일 제거
      setFruits((prev) => {
        const newMap = new Map(prev);
        connectedFruits.forEach((fruit) => {
          newMap.delete(fruit.id);
          if (fruit.bodyRef) {
            fruitsByBodyRef.current.delete(fruit.bodyRef);
          }
        });
        newMap.delete(clickedWatermelon.id);
        if (clickedWatermelon.bodyRef) {
          fruitsByBodyRef.current.delete(clickedWatermelon.bodyRef);
        }
        fruitsRef.current = newMap;
        return newMap;
      });

      // 터지는 애니메이션 추가
      setPopAnimations((prev) => [...prev, ...newPopAnimations]);

      // 점수 추가 (아이템 배수 적용)
      const multipliedScore = Math.floor(totalScore * scoreMultiplierRef.current);
      setScore((prev) => {
        const newScore = prev + multipliedScore;
        scoreRef.current = newScore; // ref 업데이트
        if (newScore > bestScoreRef.current) {
          setBestScore(newScore);
          bestScoreRef.current = newScore; // ref 업데이트
          setLS(BEST_SCORE_KEY, newScore.toString());
        }
        return newScore;
      });

      playMergeSound(); // 터지는 소리 재생
    },
    [bestScore]
  );

  // 점진적 과일 제거 함수 (애니메이션 포함)
  const removeFruitsGradually = useCallback((fruitsToRemove: Fruit[], delay: number = 150) => {
    if (fruitsToRemove.length === 0) return;
    
    fruitsToRemove.forEach((fruit, index) => {
      setTimeout(() => {
        if (!fruit.alive || !fruit.bodyRef) return;
        
        // 팡팡 터지는 애니메이션 추가
        const angle = Math.random() * Math.PI * 2;
        const velocity = 3 + Math.random() * 2;
        const velocityX = Math.cos(angle) * velocity;
        const velocityY = Math.sin(angle) * velocity;
        
        setPopAnimations((prev) => [
          ...prev,
          {
            id: `item_pop_${fruit.id}_${Date.now()}`,
            x: fruit.x,
            y: fruit.y,
            startTime: Date.now(),
            duration: 600,
            tier: fruit.tier,
            velocityX,
            velocityY,
          },
        ]);
        
        // 물리 엔진에서 제거
        if (engineRef.current) {
          removeFruitBody(engineRef.current, fruit.bodyRef);
        }
        
        // 과일 목록에서 제거
        setFruits((prev) => {
          const newMap = new Map(prev);
          newMap.delete(fruit.id);
          fruitsRef.current = newMap;
          if (fruit.bodyRef) {
            fruitsByBodyRef.current.delete(fruit.bodyRef);
          }
          return newMap;
        });
        
        // 터지는 소리 재생 (첫 번째 과일만)
        if (index === 0) {
          playMergeSound();
        }
      }, index * delay);
    });
  }, []);

  // 아이템 효과 적용 함수
  const applyItemEffect = useCallback((effectType: string, effectValue: any) => {
    const now = Date.now();
    
    switch (effectType) {
      case "slow_gravity": {
        // 중력 감소 (점진적으로 적용)
        const duration = effectValue?.duration || 30000;
        const multiplier = effectValue?.gravityMultiplier || 0.5;
        const targetGravity = PHYSICS_CONFIG.gravity.y * multiplier;
        const currentGravity = engineRef.current?.world.gravity.y || PHYSICS_CONFIG.gravity.y;
        
        gravityMultiplierRef.current = multiplier;
        gravityMultiplierStartTimeRef.current = now;
        gravityMultiplierEndTimeRef.current = now + duration;
        
        // 점진적으로 중력 감소 (애니메이션 효과)
        if (engineRef.current) {
          const steps = 10;
          const stepDuration = 200; // 200ms 간격
          const gravityStep = (currentGravity - targetGravity) / steps;
          
          for (let i = 0; i <= steps; i++) {
            setTimeout(() => {
              if (engineRef.current) {
                const newGravity = currentGravity - (gravityStep * i);
                engineRef.current.world.gravity.y = newGravity;
              }
            }, i * stepDuration);
          }
        }
        
        return `중력이 감소했습니다! (${Math.floor(duration / 1000)}초간 지속)`;
      }
      
      case "bonus_score": {
        // 점수 2배 (점진적으로 증가)
        const duration = effectValue?.duration || 30000;
        const multiplier = effectValue?.multiplier || 2;
        const currentMultiplier = scoreMultiplierRef.current;
        scoreMultiplierStartTimeRef.current = now;
        scoreMultiplierEndTimeRef.current = now + duration;
        
        // 점진적으로 배수 증가 (애니메이션 효과)
        const steps = 10;
        const stepDuration = 50; // 50ms 간격
        const multiplierStep = (multiplier - currentMultiplier) / steps;
        
        for (let i = 0; i <= steps; i++) {
          setTimeout(() => {
            scoreMultiplierRef.current = currentMultiplier + (multiplierStep * i);
          }, i * stepDuration);
        }
        
        return `점수가 ${multiplier}배가 됩니다! (${Math.floor(duration / 1000)}초간 지속)`;
      }
      
      case "remove_fruits": {
        // 과일 제거
        const count = effectValue?.count || 3;
        const position = effectValue?.position || "bottom";
        
        const aliveFruits = Array.from(fruitsRef.current.values()).filter(
          (f) => f.alive && f.bodyRef
        );
        
        if (aliveFruits.length === 0) {
          return "제거할 과일이 없습니다.";
        }
        
        let fruitsToRemove: Fruit[] = [];
        
        if (position === "bottom") {
          // 하단 과일 제거 (Y 좌표가 큰 순서대로)
          fruitsToRemove = [...aliveFruits]
            .sort((a, b) => {
              const yA = a.bodyRef?.position.y || 0;
              const yB = b.bodyRef?.position.y || 0;
              return yB - yA; // 내림차순
            })
            .slice(0, count);
        } else         if (position === "random") {
          // 랜덤 과일 제거
          const shuffled = [...aliveFruits].sort(() => Math.random() - 0.5);
          fruitsToRemove = shuffled.slice(0, Math.min(count, shuffled.length));
        }
        
        // 점진적으로 과일 제거 (애니메이션 포함)
        if (fruitsToRemove.length > 0) {
          removeFruitsGradually(fruitsToRemove, 150); // 150ms 간격으로 제거
        }
        
        return `${fruitsToRemove.length}개의 과일이 제거되었습니다!`;
      }
      
      case "lower_game_over_line": {
        // 게임 오버 라인 상향 (게임당 한 번만 사용 가능, 캔버스 최고 위로 올림)
        if (gameOverLineItemUsedRef.current) {
          return "이미 사용한 아이템입니다. 게임당 한 번만 사용할 수 있습니다.";
        }
        
        gameOverLineItemUsedRef.current = true;
        
        // 라인을 캔버스 최고 위로 올림 (오프셋을 음수로 설정하여 라인을 위로 이동)
        // gameOverLineY = GAME_CONFIG.gameOverLineMargin + gameOverLineOffsetRef.current
        // 라인이 최고 위(0)에 붙으려면: gameOverLineMargin + offset = 0
        // 따라서 offset = -gameOverLineMargin
        const targetOffset = -GAME_CONFIG.gameOverLineMargin;
        const currentOffset = gameOverLineOffsetRef.current;
        
        // 점진적으로 라인 상향 (천천히 올라가는 애니메이션)
        const steps = 30; // 더 많은 단계로 천천히
        const stepDuration = 50; // 50ms 간격
        const offsetStep = (targetOffset - currentOffset) / steps;
        
        for (let i = 0; i <= steps; i++) {
          setTimeout(() => {
            gameOverLineOffsetRef.current = currentOffset + (offsetStep * i);
          }, i * stepDuration);
        }
        
        // 영구적으로 유지 (duration 없음)
        gameOverLineOffsetStartTimeRef.current = now;
        gameOverLineOffsetEndTimeRef.current = Infinity; // 영구적으로 유지
        
        return `게임 오버 라인이 최고 위로 올라갔습니다!`;
      }
      
      case "extra_life": {
        // 추가 생명 (게임 오버 시 자동으로 사용되므로 여기서는 메시지만 반환)
        return "추가 생명이 활성화되었습니다! 게임 오버 시 자동으로 사용됩니다.";
      }
      
      default:
        return "알 수 없는 아이템입니다.";
    }
  }, []);

  // 활성 아이템 효과 정보 계산
  const getActiveItemEffects = useCallback(() => {
    const now = Date.now();
    const activeEffects: Array<{
      type: string;
      name: string;
      icon: string;
      remainingTime: number; // 남은 시간 (ms)
      duration: number; // 전체 지속 시간 (ms)
      progress: number; // 진행률 (0-1)
    }> = [];

    // 점수 배수 효과
    if (scoreMultiplierEndTimeRef.current > now && scoreMultiplierRef.current > 1) {
      const remaining = scoreMultiplierEndTimeRef.current - now;
      const duration = scoreMultiplierEndTimeRef.current - scoreMultiplierStartTimeRef.current;
      activeEffects.push({
        type: "bonus_score",
        name: `점수 ${scoreMultiplierRef.current}배`,
        icon: "⭐",
        remainingTime: remaining,
        duration: duration,
        progress: Math.max(0, Math.min(1, 1 - (remaining / duration))),
      });
    }

    // 중력 감소 효과
    if (gravityMultiplierEndTimeRef.current > now && gravityMultiplierRef.current < 1) {
      const remaining = gravityMultiplierEndTimeRef.current - now;
      const duration = gravityMultiplierEndTimeRef.current - gravityMultiplierStartTimeRef.current;
      activeEffects.push({
        type: "slow_gravity",
        name: "중력 감소",
        icon: "⬇️", // 아이템 데이터와 일치
        remainingTime: remaining,
        duration: duration,
        progress: Math.max(0, Math.min(1, 1 - (remaining / duration))),
      });
    }

    // 게임 오버 라인 상향 효과 (영구 효과이므로 타이머 표시 안 함)
    // 영구 효과는 타이머를 표시하지 않음

    return activeEffects;
  }, []);

  // 활성 아이템 효과 정보를 실시간으로 업데이트하기 위한 state
  const [activeItemEffects, setActiveItemEffects] = useState<Array<{
    type: string;
    name: string;
    icon: string;
    remainingTime: number;
    duration: number;
    progress: number;
  }>>([]);

  // 활성 아이템 효과 업데이트
  useEffect(() => {
    const updateInterval = setInterval(() => {
      const effects = getActiveItemEffects();
      setActiveItemEffects(effects);
    }, 100); // 100ms마다 업데이트

    return () => clearInterval(updateInterval);
  }, [getActiveItemEffects]);

  // 게임 오버 라인 Y 위치 계산 (아이템 효과 반영)
  const gameOverLineY = Math.max(0, GAME_CONFIG.gameOverLineMargin + gameOverLineOffsetRef.current);

    return {
    fruits: Array.from(fruits.values()),
    score,
    bestScore,
    scoreStats,
    isGameOver,
    maxUnlockedTier,
    nextTier,
    nextNextTier,
    scoreAnimations,
    mergeAnimations,
    popAnimations,
    dropFruit,
    resetGame,
    resetBestScore,
    handleAnimationComplete,
    handleWatermelonClick,
    saveScore, // 외부에서 직접 호출할 수 있도록 노출
    applyItemEffect, // 아이템 효과 적용 함수
    activeItemEffects, // 활성 아이템 효과 정보
    gameOverLineY, // 게임 오버 라인 Y 위치
  };
}
