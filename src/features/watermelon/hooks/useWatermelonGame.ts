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
        const fruitA = Array.from(fruitsRef.current.values()).find(
          (f) => f.bodyRef === bodyA
        );
        const fruitB = Array.from(fruitsRef.current.values()).find(
          (f) => f.bodyRef === bodyB
        );

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

          setFruits((prev) => {
            const newMap = new Map(prev);
            newMap.delete(fruitA.id);
            newMap.delete(fruitB.id);
            fruitsRef.current = newMap;
            return newMap;
          });

          // 새 과일 생성
          setTimeout(() => {
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

            setFruits((prev) => {
              const newMap = new Map(prev);
              newMap.set(newFruit.id, newFruit);
              fruitsRef.current = newMap;
              return newMap;
            });

            // 점수 추가
            const points = newTier * GAME_CONFIG.scoreMultiplier;
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
          }, 50);
        }
      }
    };

    Matter.Events.on(engine, "collisionStart", handleCollision);

    // 주기적 체크 (충돌 이벤트가 놓칠 수 있는 경우 대비)
    const checkMergeInterval = setInterval(() => {
      const now = Date.now() / 1000;
      const currentFruits = Array.from(fruitsRef.current.values()).filter(
        (f) => f.alive && f.bodyRef
      );

      for (let i = 0; i < currentFruits.length; i++) {
        for (let j = i + 1; j < currentFruits.length; j++) {
          const fruitA = currentFruits[i];
          const fruitB = currentFruits[j];

          if (!fruitA.bodyRef || !fruitB.bodyRef) continue;
          if (fruitA.tier !== fruitB.tier) continue;
          if (fruitA.tier >= 10) continue;
          if (mergingIdsRef.current.has(fruitA.id) || mergingIdsRef.current.has(fruitB.id)) continue;

          const timeSinceSpawnA = now - fruitA.spawnTime;
          const timeSinceSpawnB = now - fruitB.spawnTime;
          if (timeSinceSpawnA < GAME_CONFIG.secondaryMergeCooldown || timeSinceSpawnB < GAME_CONFIG.secondaryMergeCooldown) continue;

          const posA = fruitA.bodyRef.position;
          const posB = fruitB.bodyRef.position;
          const distance = Math.sqrt(
            Math.pow(posA.x - posB.x, 2) + Math.pow(posA.y - posB.y, 2)
          );
          const maxDistance = (fruitA.radius + fruitB.radius) * GAME_CONFIG.secondaryMergeDistance;

          if (distance <= maxDistance) {
            // 합성 실행 (위와 동일한 로직)
            mergingIdsRef.current.add(fruitA.id);
            mergingIdsRef.current.add(fruitB.id);

            const newTier = (fruitA.tier + 1) as FruitTier;
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

            setFruits((prev) => {
              const newMap = new Map(prev);
              newMap.delete(fruitA.id);
              newMap.delete(fruitB.id);
              fruitsRef.current = newMap;
              return newMap;
            });

            setTimeout(() => {
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

              setFruits((prev) => {
                const newMap = new Map(prev);
                newMap.set(newFruit.id, newFruit);
                fruitsRef.current = newMap;
                return newMap;
              });

              const points = newTier * GAME_CONFIG.scoreMultiplier;
              setScore((prev) => {
                const newScore = prev + points;
                if (newScore > bestScore) {
                  setBestScore(newScore);
                  setLS(BEST_SCORE_KEY, newScore.toString());
                }
                return newScore;
              });

              // 레벨 10 수박 합성 시 더 긴 시간과 특별한 효과
              const isWatermelon = newTier === 10;
              setMergeAnimations((prev) => [
                ...prev,
                {
                  id: `merge_${Date.now()}`,
                  x: mergeX,
                  y: mergeY,
                  startTime: Date.now(),
                  duration: isWatermelon ? 1200 : 500, // 수박은 더 긴 애니메이션
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
            }, 50);
            break; // 한 번에 하나씩만 합성
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
      const gameOverLineY = GAME_CONFIG.gameOverLineMargin;
      
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
    }

    setFruits(new Map());
    fruitsRef.current = new Map();
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
        connectedFruits.forEach((fruit) => newMap.delete(fruit.id));
        newMap.delete(clickedWatermelon.id);
        fruitsRef.current = newMap;
        return newMap;
      });

      // 터지는 애니메이션 추가
      setPopAnimations((prev) => [...prev, ...newPopAnimations]);

      // 점수 추가
      setScore((prev) => {
        const newScore = prev + totalScore;
        if (newScore > bestScore) {
          setBestScore(newScore);
          setLS(BEST_SCORE_KEY, newScore.toString());
        }
        return newScore;
      });
      scoreRef.current += totalScore;

      playMergeSound(); // 터지는 소리 재생
    },
    [bestScore]
  );

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
  };
}
