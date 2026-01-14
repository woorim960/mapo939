// 게임 Canvas 컴포넌트

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { Fruit, ScoreAnimation, MergeAnimation, PopAnimation, FruitTier, ContainerBounds } from "../types";
import { FRUIT_CONFIGS, CONTAINER_CONFIG, GAME_CONFIG } from "../utils/config";

type GameCanvasProps = {
  fruits: Fruit[];
  scoreAnimations?: ScoreAnimation[];
  mergeAnimations?: MergeAnimation[];
  popAnimations?: PopAnimation[];
  containerBounds: ContainerBounds;
  currentFruitTier?: FruitTier; // 선택적 (드래그 가이드용)
  gameOverLineY?: number; // 게임 오버 라인 Y 위치 (아이템 효과 반영)
  onDrop?: (x: number) => void;
  onWatermelonClick?: (x: number, y: number) => void;
  onAnimationComplete?: (type: "score" | "merge" | "pop", id: string) => void;
};

export function GameCanvas({
  fruits,
  scoreAnimations = [],
  mergeAnimations = [],
  popAnimations = [],
  containerBounds,
  currentFruitTier,
  gameOverLineY,
  onDrop,
  onWatermelonClick,
  onAnimationComplete,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const animationRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const dragXRef = useRef<number | null>(null);
  const [dragX, setDragX] = useState<number | null>(null);
  const isAnimatingRef = useRef(false);

  const fruitsRef = useRef(fruits);
  const scoreAnimationsRef = useRef(scoreAnimations);
  const mergeAnimationsRef = useRef(mergeAnimations);
  const popAnimationsRef = useRef(popAnimations);
  const currentFruitTierRef = useRef(currentFruitTier);
  const containerBoundsRef = useRef(containerBounds);

  useEffect(() => {
    fruitsRef.current = fruits;
    scoreAnimationsRef.current = scoreAnimations;
    mergeAnimationsRef.current = mergeAnimations;
    popAnimationsRef.current = popAnimations;
    currentFruitTierRef.current = currentFruitTier;
    containerBoundsRef.current = containerBounds;
  }, [fruits, scoreAnimations, mergeAnimations, popAnimations, currentFruitTier, containerBounds]);

  // 캔버스 테두리 고려
  const borderWidth = 4;
  const canvasWidth = containerBounds.width - borderWidth;
  const canvasHeight = containerBounds.height - borderWidth;
  const defaultFruitX = canvasWidth / 2;
  
  // 드래그 가이드용 (현재 과일은 NextFruit에 표시되므로 여기서는 가이드만)
  const currentFruitRadius = currentFruitTier ? FRUIT_CONFIGS[currentFruitTier].radius : 30;

  const fontCacheRef = useRef<Map<number, string>>(new Map());
  const getFontSize = useCallback((radius: number) => {
    const size = Math.floor(radius * 1.2);
    if (!fontCacheRef.current.has(size)) {
      fontCacheRef.current.set(size, `bold ${size}px Arial`);
    }
    return fontCacheRef.current.get(size)!;
  }, []);

  // 수박 반쪽을 그리기 위한 클리핑 함수
  const drawHalfWatermelon = useCallback((
    ctx: CanvasRenderingContext2D,
    emoji: string,
    x: number,
    y: number,
    radius: number,
    fontSize: string,
    isLeftHalf: boolean = true // true: 왼쪽 반, false: 오른쪽 반
  ) => {
    ctx.save();
    
    // 클리핑 영역 설정 (수직으로 반 자르기)
    ctx.beginPath();
    const emojiSize = radius * 1.2; // 이모지 크기
    const halfWidth = emojiSize / 2;
    
    if (isLeftHalf) {
      // 왼쪽 반만 표시
      ctx.rect(x - emojiSize / 2, y - emojiSize / 2, halfWidth, emojiSize);
    } else {
      // 오른쪽 반만 표시
      ctx.rect(x - emojiSize / 2 + halfWidth, y - emojiSize / 2, halfWidth, emojiSize);
    }
    ctx.clip();
    
    // 이모지 그리기
    ctx.font = fontSize;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, x, y);
    
    ctx.restore();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = ctxRef.current;
    if (!ctx) return;

    const currentFruits = fruitsRef.current;
    const currentScoreAnims = scoreAnimationsRef.current;
    const currentMergeAnims = mergeAnimationsRef.current;
    const currentPopAnims = popAnimationsRef.current;
    const bounds = containerBoundsRef.current;
    // 캔버스 테두리 고려 (border-2 = 좌우 각 2px = 총 4px)
    const borderWidth = 4;
    const canvasWidth = bounds.width - borderWidth;
    const canvasHeight = bounds.height - borderWidth;
    const currentDragX = dragXRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 배경
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    bgGradient.addColorStop(0, "#f0fdf4");
    bgGradient.addColorStop(1, "#ecfdf5");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 컨테이너 테두리
    ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.strokeStyle = "#d1fae5";
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, canvasWidth, canvasHeight);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    // 게임 오버 라인 (더 눈에 띄게)
    // 위치는 GAME_CONFIG.gameOverLineMargin에서 설정하거나 prop으로 전달받음
    const lineY = gameOverLineY !== undefined ? gameOverLineY : GAME_CONFIG.gameOverLineMargin;
    const warningHeight = GAME_CONFIG.gameOverLineWarningHeight;
    const textOffset = GAME_CONFIG.gameOverLineTextOffset;
    
    // 라인이 최고 위에 있으면 경고 표시 안 함
    if (lineY > 0) {
      // 경고 배경 그라데이션
      const warningGradient = ctx.createLinearGradient(0, 0, 0, lineY + warningHeight);
      warningGradient.addColorStop(0, "rgba(239, 68, 68, 0.15)");
      warningGradient.addColorStop(1, "rgba(239, 68, 68, 0.05)");
      ctx.fillStyle = warningGradient;
      ctx.fillRect(0, 0, canvasWidth, lineY + warningHeight);
      
      // 점선 라인 (더 두껍고 눈에 띄게)
      ctx.shadowColor = "rgba(239, 68, 68, 0.8)";
      ctx.shadowBlur = 12;
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(canvasWidth, lineY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      
      // 경고 텍스트
      ctx.font = "bold 14px Arial";
      ctx.fillStyle = "#ef4444";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⚠️ 게임 오버 라인", canvasWidth / 2, lineY - textOffset);
    }

    // 과일 렌더링
    currentFruits.forEach((fruit) => {
      if (!fruit.alive) return;

      const config = FRUIT_CONFIGS[fruit.tier];
      const pos = { x: fruit.x, y: fruit.y };

      ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 3;

      // 외곽 글로우
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, fruit.radius + 2, 0, Math.PI * 2);
      const glowGradient = ctx.createRadialGradient(
        pos.x,
        pos.y,
        fruit.radius * 0.5,
        pos.x,
        pos.y,
        fruit.radius + 2
      );
      glowGradient.addColorStop(0, "rgba(255, 255, 255, 0.3)");
      glowGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = glowGradient;
      ctx.fill();

      // 메인 원
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, fruit.radius, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(
        pos.x - fruit.radius * 0.4,
        pos.y - fruit.radius * 0.4,
        0,
        pos.x,
        pos.y,
        fruit.radius
      );
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(0.5, "#f9fafb");
      gradient.addColorStop(1, "#e5e7eb");
      ctx.fillStyle = gradient;
      ctx.fill();

      // 테두리
      const borderGradient = ctx.createLinearGradient(
        pos.x - fruit.radius,
        pos.y - fruit.radius,
        pos.x + fruit.radius,
        pos.y + fruit.radius
      );
      borderGradient.addColorStop(0, "#d1d5db");
      borderGradient.addColorStop(0.5, "#9ca3af");
      borderGradient.addColorStop(1, "#d1d5db");
      ctx.strokeStyle = borderGradient;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 하이라이트
      ctx.beginPath();
      ctx.arc(
        pos.x - fruit.radius * 0.3,
        pos.y - fruit.radius * 0.3,
        fruit.radius * 0.3,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.fill();

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // 이모지
      ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;
      ctx.font = getFontSize(fruit.radius);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // 수박 반쪽 (레벨 9)은 클리핑하여 반만 표시
      if (fruit.tier === 9) {
        drawHalfWatermelon(ctx, config.emoji, pos.x, pos.y, fruit.radius, getFontSize(fruit.radius), true);
      } else {
        ctx.fillText(config.emoji, pos.x, pos.y);
      }
      
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    });

    // 드래그 중일 때만 가이드 라인 표시 (현재 과일은 NextFruit에 표시)
    if (isDraggingRef.current && dragXRef.current !== null) {
      const currentFruitX = dragXRef.current;
      const targetY = canvasHeight - 20;
      const currentFruitRadius = currentFruitTierRef.current ? FRUIT_CONFIGS[currentFruitTierRef.current].radius : 30;
      
      // 드롭 가이드 라인 (더 눈에 띄게)
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.shadowColor = "rgba(59, 130, 246, 0.4)";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(currentFruitX, 0);
      ctx.lineTo(currentFruitX, targetY);
      ctx.stroke();
      ctx.setLineDash([]);

      // 드롭 위치 표시
      ctx.beginPath();
      ctx.arc(currentFruitX, targetY, currentFruitRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }

    // 머지 애니메이션
    const now = Date.now();
    const completedMergeIds: string[] = [];

    currentMergeAnims.forEach((anim) => {
      const elapsed = now - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);

      if (progress >= 1) {
        completedMergeIds.push(anim.id);
        return;
      }

      const config = FRUIT_CONFIGS[anim.tier];
      const isWatermelon = anim.tier === 10;
      
      // 레벨 10 수박은 더 화려한 효과
      if (isWatermelon) {
        // 수박 합성 시 팡팡 터지는 효과
        const explosionProgress = progress;
        const explosionScale = explosionProgress < 0.3 
          ? 0.3 + (explosionProgress / 0.3) * 0.7 
          : explosionProgress < 0.7
          ? 1.0 + ((explosionProgress - 0.3) / 0.4) * 0.5
          : 1.5 - ((explosionProgress - 0.7) / 0.3) * 0.5;
        const currentRadius = config.radius * explosionScale;
        const opacity = 1 - progress * 0.3; // 더 오래 보이도록

        // 여러 겹의 폭발 효과
        for (let i = 0; i < 5; i++) {
          const explosionRadius = currentRadius + (i + 1) * 20;
          const explosionOpacity = opacity * (0.4 - i * 0.08);
          const angle = (i * Math.PI * 2) / 5 + progress * Math.PI * 2;
          const offsetX = Math.cos(angle) * explosionRadius * 0.3;
          const offsetY = Math.sin(angle) * explosionRadius * 0.3;
          
          ctx.beginPath();
          ctx.arc(anim.x + offsetX, anim.y + offsetY, explosionRadius * 0.3, 0, Math.PI * 2);
          const explosionGradient = ctx.createRadialGradient(
            anim.x + offsetX,
            anim.y + offsetY,
            0,
            anim.x + offsetX,
            anim.y + offsetY,
            explosionRadius * 0.3
          );
          explosionGradient.addColorStop(0, `rgba(255, 215, 0, ${explosionOpacity})`);
          explosionGradient.addColorStop(0.5, `rgba(255, 165, 0, ${explosionOpacity * 0.7})`);
          explosionGradient.addColorStop(1, `rgba(255, 69, 0, 0)`);
          ctx.fillStyle = explosionGradient;
          ctx.fill();
        }

        // 중심 글로우 효과 (더 강렬하게)
        for (let i = 0; i < 4; i++) {
          const glowRadius = currentRadius + (i + 1) * 25;
          const glowOpacity = opacity * (0.5 - i * 0.12);
          ctx.beginPath();
          ctx.arc(anim.x, anim.y, glowRadius, 0, Math.PI * 2);
          const glowGradient = ctx.createRadialGradient(
            anim.x,
            anim.y,
            currentRadius,
            anim.x,
            anim.y,
            glowRadius
          );
          glowGradient.addColorStop(0, `rgba(255, 215, 0, ${glowOpacity})`);
          glowGradient.addColorStop(0.3, `rgba(255, 165, 0, ${glowOpacity * 0.8})`);
          glowGradient.addColorStop(0.6, `rgba(255, 69, 0, ${glowOpacity * 0.5})`);
          glowGradient.addColorStop(1, `rgba(255, 69, 0, 0)`);
          ctx.fillStyle = glowGradient;
          ctx.fill();
        }

        // 중심 원
        ctx.beginPath();
        ctx.arc(anim.x, anim.y, currentRadius, 0, Math.PI * 2);
        const centerGradient = ctx.createRadialGradient(
          anim.x - currentRadius * 0.3,
          anim.y - currentRadius * 0.3,
          0,
          anim.x,
          anim.y,
          currentRadius
        );
        centerGradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
        centerGradient.addColorStop(0.3, `rgba(255, 215, 0, ${opacity * 0.9})`);
        centerGradient.addColorStop(0.6, `rgba(255, 165, 0, ${opacity * 0.8})`);
        centerGradient.addColorStop(1, `rgba(255, 69, 0, ${opacity * 0.6})`);
        ctx.fillStyle = centerGradient;
        ctx.fill();

        // 테두리 (더 두껍게)
        ctx.strokeStyle = `rgba(255, 215, 0, ${opacity})`;
        ctx.lineWidth = 5;
        ctx.shadowColor = `rgba(255, 215, 0, ${opacity * 0.8})`;
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 이모지
        ctx.font = getFontSize(currentRadius);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
        ctx.fillText(config.emoji, anim.x, anim.y);
      } else {
        // 일반 과일 머지 애니메이션
        const pulseScale = progress < 0.5 ? 0.3 + (progress / 0.5) * 0.7 : 1.0 + ((progress - 0.5) / 0.5) * 0.3;
        const currentRadius = config.radius * pulseScale;
        const opacity = 1 - progress * 0.5;

        for (let i = 0; i < 3; i++) {
          const glowRadius = currentRadius + (i + 1) * 10;
          const glowOpacity = opacity * (0.3 - i * 0.1);
          ctx.beginPath();
          ctx.arc(anim.x, anim.y, glowRadius, 0, Math.PI * 2);
          const glowGradient = ctx.createRadialGradient(
            anim.x,
            anim.y,
            currentRadius,
            anim.x,
            anim.y,
            glowRadius
          );
          glowGradient.addColorStop(0, `rgba(255, 215, 0, ${glowOpacity})`);
          glowGradient.addColorStop(0.5, `rgba(255, 165, 0, ${glowOpacity * 0.5})`);
          glowGradient.addColorStop(1, `rgba(255, 165, 0, 0)`);
          ctx.fillStyle = glowGradient;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(anim.x, anim.y, currentRadius, 0, Math.PI * 2);
        const centerGradient = ctx.createRadialGradient(
          anim.x - currentRadius * 0.3,
          anim.y - currentRadius * 0.3,
          0,
          anim.x,
          anim.y,
          currentRadius
        );
        centerGradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
        centerGradient.addColorStop(0.5, `rgba(255, 215, 0, ${opacity * 0.8})`);
        centerGradient.addColorStop(1, `rgba(255, 165, 0, ${opacity * 0.6})`);
        ctx.fillStyle = centerGradient;
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 215, 0, ${opacity})`;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.font = getFontSize(currentRadius);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
        
        // 수박 반쪽 (레벨 9)은 클리핑하여 반만 표시
        if (anim.tier === 9) {
          drawHalfWatermelon(ctx, config.emoji, anim.x, anim.y, config.radius, getFontSize(currentRadius), true);
        } else {
          ctx.fillText(config.emoji, anim.x, anim.y);
        }
      }
    });

    if (completedMergeIds.length > 0 && onAnimationComplete) {
      completedMergeIds.forEach((id) => {
        onAnimationComplete("merge", id);
      });
    }

    // 점수 애니메이션
    const completedScoreIds: string[] = [];

    currentScoreAnims.forEach((anim) => {
      const elapsed = now - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);

      if (progress >= 1) {
        completedScoreIds.push(anim.id);
        return;
      }

      const moveDistance = 80;
      const currentY = anim.y - moveDistance * progress;
      const opacity = 1 - progress;
      const scale = progress < 0.3 ? 0.5 + (progress / 0.3) * 0.5 : 1.0 - ((progress - 0.3) / 0.7) * 0.3;

      ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      const gradient = ctx.createLinearGradient(
        anim.x - 50,
        currentY - 20,
        anim.x + 50,
        currentY + 20
      );
      gradient.addColorStop(0, `rgba(34, 197, 94, ${opacity})`);
      gradient.addColorStop(0.5, `rgba(16, 185, 129, ${opacity})`);
      gradient.addColorStop(1, `rgba(5, 150, 105, ${opacity})`);

      ctx.fillStyle = gradient;
      ctx.font = `bold ${Math.floor(24 * scale)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const scoreText = `+${anim.score.toLocaleString()}`;
      ctx.fillText(scoreText, anim.x, currentY);

      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
      ctx.lineWidth = 2;
      ctx.strokeText(scoreText, anim.x, currentY);

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    });

    if (completedScoreIds.length > 0 && onAnimationComplete) {
      completedScoreIds.forEach((id) => {
        onAnimationComplete("score", id);
      });
    }

    // 터지는 애니메이션
    const completedPopIds: string[] = [];

    currentPopAnims.forEach((anim) => {
      const elapsed = now - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);

      if (progress >= 1) {
        completedPopIds.push(anim.id);
        return;
      }

      const config = FRUIT_CONFIGS[anim.tier];
      const currentX = anim.x + anim.velocityX * elapsed * 0.01;
      const currentY = anim.y + anim.velocityY * elapsed * 0.01;
      const scale = 1.0 - progress;
      const opacity = 1 - progress;
      const currentRadius = config.radius * scale;

      // 폭발 파티클 효과
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI * 2) / 8;
        const distance = progress * 30;
        const particleX = currentX + Math.cos(angle) * distance;
        const particleY = currentY + Math.sin(angle) * distance;
        const particleOpacity = opacity * (1 - progress * 0.5);
        
        ctx.beginPath();
        ctx.arc(particleX, particleY, currentRadius * 0.3, 0, Math.PI * 2);
        const particleGradient = ctx.createRadialGradient(
          particleX,
          particleY,
          0,
          particleX,
          particleY,
          currentRadius * 0.3
        );
        particleGradient.addColorStop(0, `rgba(255, 215, 0, ${particleOpacity})`);
        particleGradient.addColorStop(1, `rgba(255, 69, 0, 0)`);
        ctx.fillStyle = particleGradient;
        ctx.fill();
      }

      // 중심 이모지
      ctx.font = getFontSize(currentRadius);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = opacity;
      
      if (anim.tier === 9) {
        drawHalfWatermelon(ctx, config.emoji, currentX, currentY, config.radius, getFontSize(currentRadius), true);
      } else {
        ctx.fillText(config.emoji, currentX, currentY);
      }
      
      ctx.globalAlpha = 1.0;
    });

    if (completedPopIds.length > 0 && onAnimationComplete) {
      completedPopIds.forEach((id) => {
        onAnimationComplete("pop", id);
      });
    }

    isAnimatingRef.current = true;
    animationRef.current = requestAnimationFrame(draw);
  }, [getFontSize, drawHalfWatermelon, onAnimationComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const initCanvas = () => {
      try {
        const dpr = window.devicePixelRatio || 1;
        const bounds = containerBoundsRef.current;
        
        // 캔버스 테두리 고려 (border-2 = 좌우 각 2px = 총 4px)
        const borderWidth = 4;
        const canvasWidth = bounds.width - borderWidth;
        const canvasHeight = bounds.height - borderWidth;

        canvas.width = canvasWidth * dpr;
        canvas.height = canvasHeight * dpr;
        canvas.style.width = `${canvasWidth}px`;
        canvas.style.height = `${canvasHeight}px`;

        const ctx = canvas.getContext("2d", {
          alpha: true,
          desynchronized: false,
          willReadFrequently: false,
        });

        if (!ctx) {
          console.error("Failed to get 2d context");
          return;
        }

        ctxRef.current = ctx;

        if (dpr !== 1) {
          ctx.scale(dpr, dpr);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        isAnimatingRef.current = true;
        animationRef.current = requestAnimationFrame(draw);
      } catch (error) {
        console.error("Canvas initialization error:", error);
      }
    };

    initCanvas();

    let resizeTimer: NodeJS.Timeout | null = null;
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        initCanvas();
      }, 100);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
        isAnimatingRef.current = false;
      }
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [draw, containerBounds.width, containerBounds.height]);

  const getEventPosition = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement> | MouseEvent | TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      let clientX: number;
      let clientY: number;

      if ("touches" in e) {
        if (e.touches.length === 0) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    },
    []
  );

  const handleDrop = useCallback(
    (x: number) => {
      if (!onDrop) return;

      const bounds = containerBoundsRef.current;
      const borderWidth = 4;
      const canvasWidth = bounds.width - borderWidth;
      const fruitRadius = currentFruitTierRef.current ? FRUIT_CONFIGS[currentFruitTierRef.current].radius : 30;
      const clampedX = Math.max(
        fruitRadius,
        Math.min(x, canvasWidth - fruitRadius)
      );

      onDrop(clampedX);
    },
    [onDrop]
  );

  const handleDragStart = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const pos = getEventPosition(e);
      if (!pos) return;

      // 먼저 수박 클릭 체크
      const clickedFruit = Array.from(fruitsRef.current.values()).find((fruit) => {
        if (fruit.tier !== 10) return false; // 수박(레벨 10)만 체크
        const distance = Math.sqrt(
          Math.pow(fruit.x - pos.x, 2) + Math.pow(fruit.y - pos.y, 2)
        );
        return distance <= fruit.radius;
      });

      if (clickedFruit && onWatermelonClick) {
        // 수박 클릭 처리
        onWatermelonClick(pos.x, pos.y);
        return;
      }

      // 드래그 시작
      const bounds = containerBoundsRef.current;
      const borderWidth = 4;
      const canvasWidth = bounds.width - borderWidth;
      const fruitRadius = currentFruitTierRef.current ? FRUIT_CONFIGS[currentFruitTierRef.current].radius : 30;
      const clampedX = Math.max(
        fruitRadius,
        Math.min(pos.x, canvasWidth - fruitRadius)
      );

      isDraggingRef.current = true;
      dragXRef.current = clampedX;
      setDragX(clampedX);
    },
    [getEventPosition, onWatermelonClick]
  );

  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;

      e.preventDefault();
      const pos = getEventPosition(e);
      if (!pos) return;

      const bounds = containerBoundsRef.current;
      const borderWidth = 4;
      const canvasWidth = bounds.width - borderWidth;
      const fruitRadius = currentFruitTierRef.current ? FRUIT_CONFIGS[currentFruitTierRef.current].radius : 30;
      const clampedX = Math.max(
        fruitRadius,
        Math.min(pos.x, canvasWidth - fruitRadius)
      );

      dragXRef.current = clampedX;
      setDragX(clampedX);
    },
    [getEventPosition]
  );

  const handleDragEnd = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;

      e.preventDefault();
      isDraggingRef.current = false;

      if (dragXRef.current !== null) {
        handleDrop(dragXRef.current);
      }

      dragXRef.current = null;
      setDragX(null);
    },
    [handleDrop]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        handleDragMove(e);
      }
    };
    const handleMouseUp = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        handleDragEnd(e);
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current) {
        handleDragMove(e);
      }
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (isDraggingRef.current) {
        handleDragEnd(e);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleDragMove, handleDragEnd]);

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden">
      <canvas
        ref={canvasRef}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        className="rounded-xl border-2 border-gray-200 bg-gray-50 cursor-grab active:cursor-grabbing touch-none select-none shadow-inner max-w-full max-h-full"
        style={{
          display: "block",
          WebkitTapHighlightColor: "transparent",
          touchAction: "none",
          imageRendering: "crisp-edges",
        }}
      />
    </div>
  );
}
