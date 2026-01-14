// 수박게임 메인 페이지

"use client";

import { useState, useEffect, useRef } from "react";
import { useWatermelonGame } from "@/features/watermelon/hooks/useWatermelonGame";
import { GameCanvas } from "@/features/watermelon/components/GameCanvas";
import { ScoreBoard } from "@/features/watermelon/components/ScoreBoard";
import { ScoreStats } from "@/features/watermelon/components/ScoreStats";
import { NextFruit } from "@/features/watermelon/components/NextFruit";
import { GameOverModal } from "@/features/watermelon/components/GameOverModal";
import { HowToModal } from "@/features/watermelon/components/HowToModal";
import { NicknameModal } from "@/features/watermelon/components/NicknameModal";
import { StatsModal } from "@/features/watermelon/components/StatsModal";
import { SaveConfirmModal } from "@/features/watermelon/components/SaveConfirmModal";
import { LogoutConfirmModal } from "@/features/watermelon/components/LogoutConfirmModal";
import { MenuButton } from "@/features/watermelon/components/MenuButton";
import { ItemShopModal } from "@/features/watermelon/components/ItemShopModal";
import { PlayerDashboard } from "@/features/watermelon/components/PlayerDashboard";
import { ChangeNextFruitModal } from "@/features/watermelon/components/ChangeNextFruitModal";
import { Toast } from "@/shared/components/Toast";
import { createOrGetPlayer } from "@/features/watermelon/api";
import { getLS, setLS, removeLS } from "@/shared/utils/storage";
import { FRUIT_CONFIGS } from "@/features/watermelon/utils/config";
import { FruitEmoji } from "@/features/watermelon/components/FruitEmoji";

const PLAYER_ID_KEY = "watermelon_player_id";
const PLAYER_NICKNAME_KEY = "watermelon_player_nickname";
const PLAYER_PASSWORD_KEY = "watermelon_player_password"; // 자동 로그인을 위한 패스워드 저장

export default function WatermelonPage() {
  const [containerBounds, setContainerBounds] = useState({
    x: 0,
    y: 0,
    width: 400,
    height: 500,
  });

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerNickname, setPlayerNickname] = useState<string>("");
  const [playerStats, setPlayerStats] = useState<{ bestScore?: number; averageScore?: number; playCount?: number; averageMaxTier?: number } | null>(null);
  const [gamePoints, setGamePoints] = useState<number>(1000);
  const [memberId, setMemberId] = useState<string | undefined>(undefined);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [loadingPlayer, setLoadingPlayer] = useState(true);
  const [nicknameModalError, setNicknameModalError] = useState<string>("");

  const game = useWatermelonGame(containerBounds, playerId || undefined);
  const [showHowTo, setShowHowTo] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showItemShop, setShowItemShop] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showChangeNextFruit, setShowChangeNextFruit] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [toast, setToast] = useState("");
  const [currentScoreTier, setCurrentScoreTier] = useState(0); // 현재 도달한 점수 단계
  const [celebrationMessage, setCelebrationMessage] = useState<{ message: string; intensity: number } | null>(null);
  const [gameOverModalDismissed, setGameOverModalDismissed] = useState(false); // 게임 오버 모달이 닫혔는지 추적
  const [itemEffectAnimation, setItemEffectAnimation] = useState<{ icon: string; message: string; itemName: string } | null>(null); // 아이템 효과 애니메이션
  const [textCompactMode, setTextCompactMode] = useState<{ currentMax: number; average: number; next: number }>({ currentMax: 0, average: 0, next: 0 }); // 0: 전체, 1: "최대" 제거, 2: "현재"도 제거
  const currentMaxRef = useRef<HTMLDivElement>(null);
  const averageRef = useRef<HTMLDivElement>(null);
  const nextFruitRef = useRef<HTMLButtonElement>(null);

  // 닉네임 확인 및 플레이어 로드
  useEffect(() => {
    const savedNickname = getLS(PLAYER_NICKNAME_KEY);
    const savedPassword = getLS(PLAYER_PASSWORD_KEY);

    if (savedNickname && savedPassword) {
      // 닉네임과 패스워드가 모두 있으면 자동 로그인 시도
      const autoLogin = async () => {
        try {
          setLoadingPlayer(true);
          const player = await createOrGetPlayer(savedNickname, savedPassword);
          setPlayerId(player.id);
          setPlayerNickname(player.nickname);
          setLS(PLAYER_ID_KEY, player.id);
          setLS(PLAYER_NICKNAME_KEY, player.nickname);
          setLS(PLAYER_PASSWORD_KEY, savedPassword); // 패스워드 유지
          setGamePoints(player.gamePoints ?? 1000);
          setMemberId(player.memberId || undefined);
          setPlayerStats({
            bestScore: player.bestScore ?? 0,
            averageScore: player.averageScore ?? 0,
            playCount: player.playCount ?? 0,
            averageMaxTier: player.averageMaxTier,
          });
          setLoadingPlayer(false);
        } catch (error: any) {
          console.error("Auto login failed:", error);
          // 자동 로그인 실패 시 모달 표시
          setNicknameModalError(""); // 모달 열 때 에러 초기화
      setShowNicknameModal(true);
          setLoadingPlayer(false);
        }
      };
      autoLogin();
    } else {
      setNicknameModalError(""); // 모달 열 때 에러 초기화
      setShowNicknameModal(true);
      setLoadingPlayer(false);
    }
  }, []);

  // 플레이어 통계 로드
  const loadPlayerStats = async (pid: string) => {
    try {
      const { getPlayerStats } = await import("@/features/watermelon/api");
      const stats = await getPlayerStats(pid);
      setGamePoints(stats.gamePoints ?? 1000);
      setMemberId(stats.memberId || undefined);
      setPlayerStats({
        bestScore: stats.bestScore ?? 0,
        averageScore: stats.averageScore ?? 0,
        playCount: stats.playCount ?? 0,
        averageMaxTier: stats.averageMaxTier,
      });
    } catch (error) {
      console.error("Failed to load player stats:", error);
    }
  };

  // 게임 오버 시 통계 업데이트 (약간의 지연을 두어 DB 저장이 완료된 후 로드)
  useEffect(() => {
    if (game.isGameOver && playerId) {
      // DB 저장이 완료될 시간을 주기 위해 약간의 지연
      const timer = setTimeout(() => {
        loadPlayerStats(playerId);
      }, 500); // 0.5초 후 통계 다시 로드
      return () => clearTimeout(timer);
    }
  }, [game.isGameOver, playerId]);

  const handleNicknameSubmit = async (nickname: string, password: string) => {
    try {
      setLoadingPlayer(true);
      setNicknameModalError(""); // 에러 초기화
      const player = await createOrGetPlayer(nickname, password);
      setPlayerId(player.id);
      setPlayerNickname(player.nickname);
      setLS(PLAYER_ID_KEY, player.id);
      setLS(PLAYER_NICKNAME_KEY, player.nickname);
      setLS(PLAYER_PASSWORD_KEY, password); // 자동 로그인을 위해 패스워드 저장
      setGamePoints(player.gamePoints ?? 1000);
      setMemberId(player.memberId || undefined);
      setPlayerStats({
        bestScore: player.bestScore,
        averageScore: player.averageScore,
        playCount: player.playCount,
        averageMaxTier: player.averageMaxTier,
      });
      setShowNicknameModal(false);
      setToast(`환영합니다, ${player.nickname}님! 🍉`);
    } catch (error: any) {
      console.error("Failed to create/get player:", error);
      // ApiError의 경우 error.error 필드에 에러 코드가 있음
      if (error && (error.error === "invalid_password" || error.code === "invalid_password" || error.status === 401)) {
        const errorMessage = "패스워드가 일치하지 않습니다. 올바른 패스워드를 입력하거나 다른 닉네임을 사용해주세요.";
        setNicknameModalError(errorMessage);
        setToast(errorMessage);
      } else {
        const errorMessage = "플레이어 생성에 실패했습니다. 다시 시도해주세요.";
        setNicknameModalError(errorMessage);
        setToast(errorMessage);
      }
    } finally {
      setLoadingPlayer(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = () => {
    // 로컬 스토리지에서 플레이어 정보 제거
    removeLS(PLAYER_ID_KEY);
    removeLS(PLAYER_NICKNAME_KEY);
    removeLS(PLAYER_PASSWORD_KEY);
    setPlayerId(null);
    setPlayerNickname("");
    setPlayerStats(null);
    setShowLogoutConfirm(false);
    setShowNicknameModal(true);
  };

  // 점수 단계 체크 및 축하 메시지 (500점, 이후 1000점 단위)
  useEffect(() => {
    const score = game.score;
    
    // 5000점까지는 500점 단위, 그 이후는 1000점 단위
    let milestone: number;
    if (score < 5000) {
      milestone = Math.floor(score / 500) * 500;
    } else {
      milestone = Math.floor(score / 1000) * 1000;
    }
    
    if (milestone >= 500 && milestone > currentScoreTier) {
      setCurrentScoreTier(milestone);
      
      let message = "";
      let intensity: number;
      
      // 5000점까지는 500점 단위 축하
      if (milestone < 5000) {
        const tier = milestone / 500; // 1, 2, 3, ..., 10
        intensity = Math.min(Math.floor(tier / 2) + 1, 4); // 1~4 사이
        
        const emojis = ["🎉", "🎊", "🔥", "💥", "⚡", "🌟", "🚀", "👑", "💎", "🏆"];
        const emoji = emojis[Math.min(tier - 1, emojis.length - 1)];
        
        if (tier === 1) {
          message = `${emoji} 500점 돌파! 대단해요!`;
        } else if (tier === 2) {
          message = `${emoji} 1000점 돌파! 정말 대단합니다!`;
        } else if (tier === 3) {
          message = `${emoji} 1500점 돌파! 놀라운 실력이에요!`;
        } else if (tier === 4) {
          message = `${emoji} 2000점 돌파! 엄청나세요!`;
        } else if (tier === 5) {
          message = `${emoji} 2500점 돌파! 경이로운 점수입니다!`;
        } else if (tier === 6) {
          message = `${emoji} 3000점 돌파! 전설적인 실력!`;
        } else if (tier === 7) {
          message = `${emoji} 3500점 돌파! 신의 경지입니다!`;
        } else if (tier === 8) {
          message = `${emoji} 4000점 돌파! 우주급 실력!`;
        } else if (tier === 9) {
          message = `${emoji} 4500점 돌파! 차원이 다른 실력!`;
        } else if (tier === 10) {
          message = `${emoji} 5000점 돌파! 불가사의한 실력입니다!`;
        }
      } else {
        // 5000점 이후는 1000점 단위
        const tier = milestone / 1000; // 6, 7, 8, ...
        intensity = Math.min(tier + 1, 10); // 최대 10까지
        
        const emojis = ["🎊", "🔥", "💥", "⚡", "🌟", "🚀", "👑", "💎", "🏆", "⭐"];
        const emoji = emojis[Math.min(tier - 6, emojis.length - 1)];
        
        const superlatives = [
          "전설 속의",
          "신화적인",
          "초월적인",
          "절대적인",
          "무한한",
          "궁극의",
        ];
        const superlative = superlatives[Math.min(tier - 6, superlatives.length - 1)];
        message = `${emoji} ${milestone.toLocaleString()}점 돌파! ${superlative} 실력입니다!`;
      }
      
      setCelebrationMessage({ message, intensity });
      setTimeout(() => setCelebrationMessage(null), intensity >= 4 ? 4000 : 3000);
    }
  }, [game.score, currentScoreTier]);

  // 점수 단계에 따른 UI 색상 계산 (1000점 단위)
  const getColorTheme = () => {
    const tier = Math.floor(currentScoreTier / 1000);
    
    // 색상 팔레트 (초록 → 에메랄드 → 틸 → 시안 → 블루 → 인디고 → 퍼플 → 핑크 → 로즈 → 오렌지 → 노랑)
    // 더 뚜렷한 색상 변화를 위해 채도와 명도를 높임
    const colorPalettes = [
      { bg: "from-green-50 via-emerald-50 to-teal-50", header: "from-white/80 to-white/80", canvas: "from-white/80 to-white/80", border: "border-green-200/50" },
      { bg: "from-emerald-100 via-teal-100 to-cyan-100", header: "from-emerald-200/95 to-teal-200/95", canvas: "from-emerald-100/95 to-teal-100/95", border: "border-emerald-300/60" },
      { bg: "from-teal-100 via-cyan-100 to-blue-100", header: "from-teal-200/95 to-cyan-200/95", canvas: "from-teal-100/95 to-cyan-100/95", border: "border-teal-300/60" },
      { bg: "from-cyan-100 via-blue-100 to-indigo-100", header: "from-cyan-200/95 to-blue-200/95", canvas: "from-cyan-100/95 to-blue-100/95", border: "border-cyan-300/60" },
      { bg: "from-blue-100 via-indigo-100 to-purple-100", header: "from-blue-200/95 to-indigo-200/95", canvas: "from-blue-100/95 to-indigo-100/95", border: "border-blue-300/60" },
      { bg: "from-indigo-100 via-purple-100 to-pink-100", header: "from-indigo-200/95 to-purple-200/95", canvas: "from-indigo-100/95 to-purple-100/95", border: "border-indigo-300/60" },
      { bg: "from-purple-100 via-pink-100 to-rose-100", header: "from-purple-200/95 to-pink-200/95", canvas: "from-purple-100/95 to-pink-100/95", border: "border-purple-300/60" },
      { bg: "from-pink-100 via-rose-100 to-orange-100", header: "from-pink-200/95 to-rose-200/95", canvas: "from-pink-100/95 to-rose-100/95", border: "border-pink-300/60" },
      { bg: "from-rose-100 via-orange-100 to-amber-100", header: "from-rose-200/95 to-orange-200/95", canvas: "from-rose-100/95 to-orange-100/95", border: "border-rose-300/60" },
      { bg: "from-orange-100 via-amber-100 to-yellow-100", header: "from-orange-200/95 to-amber-200/95", canvas: "from-orange-100/95 to-amber-100/95", border: "border-orange-300/60" },
    ];
    
    // 10단계 이상은 마지막 색상 반복
    const palette = colorPalettes[Math.min(tier, colorPalettes.length - 1)];
    
    return {
      ...palette,
      accent: tier >= 7 ? "pink" : tier >= 5 ? "purple" : tier >= 3 ? "blue" : "green",
    };
  };

  const colorTheme = getColorTheme();

  // 게임 오버 상태 감지
  useEffect(() => {
    if (game.isGameOver && !showGameOver && !gameOverModalDismissed) {
      const wasNewRecord = game.score >= game.bestScore && game.score > 0;
      setIsNewRecord(wasNewRecord);
      setShowGameOver(true);
    }
  }, [game.isGameOver, game.score, game.bestScore, showGameOver, gameOverModalDismissed]);

  // 화면 크기에 맞춰 컨테이너 크기 조정 (스크롤 절대 방지)
  useEffect(() => {
    const updateBounds = () => {
      // 모바일 브라우저의 주소창/툴바 문제를 해결하기 위해 visualViewport 사용
      const viewportWidth = window.visualViewport?.width || window.innerWidth;
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      
      // CSS 변수로 뷰포트 높이 설정 (모든 UI가 사용할 수 있도록)
      document.documentElement.style.setProperty('--viewport-height', `${viewportHeight}px`);
      document.documentElement.style.setProperty('--viewport-width', `${viewportWidth}px`);

      const headerElement = document.querySelector('header') as HTMLElement | null;
      const controlElement = document.querySelector('[data-control-buttons]') as HTMLElement | null;
      const gameContainerElement = document.querySelector('[data-game-container]') as HTMLElement | null;
      
      const padding = 16;
      const gap = 16;

      let headerHeight = 120;
      let controlHeight = 60;

      if (headerElement) {
        headerHeight = headerElement.offsetHeight;
      }
      if (controlElement) {
        controlHeight = controlElement.offsetHeight;
      }

      // 게임 컨테이너의 실제 너비 사용 (감싸는 div의 크기)
      let gameAreaWidth = 400; // 기본값
      if (gameContainerElement) {
        // 부모 컨테이너의 실제 크기를 넘지 않도록 제한
        const parentMaxWidth = viewportWidth - padding * 2;
        gameAreaWidth = Math.min(gameContainerElement.offsetWidth, parentMaxWidth);
      } else {
        // 컨테이너가 아직 렌더링되지 않았으면 뷰포트 기반 계산
        const maxWidth = Math.min(viewportWidth - padding * 2, 600); // 최대 600px
        gameAreaWidth = Math.max(300, maxWidth);
      }

      const availableHeight = viewportHeight - headerHeight - controlHeight - padding * 2 - gap * 2;
      const gameAreaHeight = Math.max(300, availableHeight);

      setContainerBounds({
        x: 0,
        y: 0,
        width: gameAreaWidth,
        height: gameAreaHeight,
      });
    };

    // 초기 뷰포트 높이 설정
    const initialViewportHeight = window.visualViewport?.height || window.innerHeight;
    document.documentElement.style.setProperty('--viewport-height', `${initialViewportHeight}px`);
    document.documentElement.style.setProperty('--viewport-width', `${window.visualViewport?.width || window.innerWidth}px`);

    const timeoutId1 = setTimeout(updateBounds, 0);
    const timeoutId2 = setTimeout(updateBounds, 100);

    window.addEventListener("resize", updateBounds);
    // 모바일 브라우저의 주소창/툴바 변화 감지
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateBounds);
      window.visualViewport.addEventListener("scroll", updateBounds);
    }

    const resizeObserver = new ResizeObserver(() => {
      updateBounds();
    });

    const headerElement = document.querySelector('header');
    const controlElement = document.querySelector('[data-control-buttons]');
    const gameContainerElement = document.querySelector('[data-game-container]');
    if (headerElement) resizeObserver.observe(headerElement);
    if (controlElement) resizeObserver.observe(controlElement);
    if (gameContainerElement) resizeObserver.observe(gameContainerElement);

    return () => {
      window.removeEventListener("resize", updateBounds);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", updateBounds);
        window.visualViewport.removeEventListener("scroll", updateBounds);
      }
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      resizeObserver.disconnect();
    };
  }, []);

  const handleSave = () => {
    if (!playerId) {
      setToast("플레이어 정보가 없습니다.");
      return;
    }
    // 저장 확인 모달 표시
    setShowSaveConfirm(true);
  };

  const handleSaveConfirm = async () => {
    if (!playerId) return;
    
    setShowSaveConfirm(false);
    
    try {
      await game.saveScore(playerId);
      setToast("점수가 저장되었습니다! 💾");
      // 저장 후 통계 다시 로드
      setTimeout(() => {
        loadPlayerStats(playerId);
      }, 300);
    } catch (error) {
      console.error("[Save] Failed to save score:", error);
      setToast("점수 저장에 실패했습니다.");
    }
  };

  const handleRestart = async () => {
    // 게임 오버 상태에서 다시 시작하기 전에 현재 점수를 저장
    // (게임 오버 시 저장이 완료되지 않았을 수 있으므로)
    if (game.isGameOver && playerId) {
      try {
        // hook의 saveScore 함수를 사용하여 최신 점수(scoreRef.current)를 저장
        // saveScore 내부에서 0점 체크를 하므로 여기서는 체크하지 않음
        await game.saveScore(playerId);
        console.log("[Restart] Score saved before restart");
      } catch (error) {
        console.error("[Restart] Failed to save score before restart:", error);
      }
    }
    
    game.resetGame();
    setShowGameOver(false);
    setIsNewRecord(false);
    setToast("");
    setCurrentScoreTier(0); // 점수 단계 리셋
    setCelebrationMessage(null); // 축하 메시지 리셋
    setGameOverModalDismissed(false); // 모달 닫힘 상태 리셋
    // 게임 재시작 시 통계 다시 로드
    if (playerId) {
      setTimeout(() => {
        loadPlayerStats(playerId);
      }, 300);
    }
  };

  const handleDrop = (x: number) => {
    game.dropFruit(x);
  };

  // 텍스트 두 줄 감지 및 자동 단축
  useEffect(() => {
    const checkTextOverflow = () => {
      setTextCompactMode((prevMode) => {
        const newMode = { ...prevMode };
        let changed = false;

        // "현재 최대" 체크
        if (currentMaxRef.current) {
          const element = currentMaxRef.current;
          const isTwoLines = element.scrollHeight > element.clientHeight;
          
          if (isTwoLines && newMode.currentMax === 0) {
            newMode.currentMax = 1; // "최대" 제거
            changed = true;
          } else if (isTwoLines && newMode.currentMax === 1) {
            newMode.currentMax = 2; // "현재"도 제거
            changed = true;
          } else if (!isTwoLines && newMode.currentMax > 0) {
            // 한 줄이면 다시 복원 시도
            if (newMode.currentMax === 2) {
              newMode.currentMax = 1;
              changed = true;
            } else if (newMode.currentMax === 1) {
              newMode.currentMax = 0;
              changed = true;
            }
          }
        }

        // "평균 레벨" 체크
        if (averageRef.current) {
          const element = averageRef.current;
          const isTwoLines = element.scrollHeight > element.clientHeight;
          
          if (isTwoLines && newMode.average === 0) {
            newMode.average = 1; // "레벨" 제거
            changed = true;
          } else if (isTwoLines && newMode.average === 1) {
            newMode.average = 2; // "평균"도 제거
            changed = true;
          } else if (!isTwoLines && newMode.average > 0) {
            if (newMode.average === 2) {
              newMode.average = 1;
              changed = true;
            } else if (newMode.average === 1) {
              newMode.average = 0;
              changed = true;
            }
          }
        }

        // "다음" 체크
        if (nextFruitRef.current) {
          const element = nextFruitRef.current;
          const isTwoLines = element.scrollHeight > element.clientHeight;
          
          if (isTwoLines && newMode.next === 0) {
            newMode.next = 1; // "다음" 제거
            changed = true;
          } else if (!isTwoLines && newMode.next === 1) {
            newMode.next = 0;
            changed = true;
          }
        }

        return changed ? newMode : prevMode;
      });
    };

    // 초기 체크 및 리사이즈 감지
    const timeoutId1 = setTimeout(checkTextOverflow, 100);
    const timeoutId2 = setTimeout(checkTextOverflow, 300);
    
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(checkTextOverflow, 50);
    });

    if (currentMaxRef.current) resizeObserver.observe(currentMaxRef.current);
    if (averageRef.current) resizeObserver.observe(averageRef.current);
    if (nextFruitRef.current) resizeObserver.observe(nextFruitRef.current);

    window.addEventListener('resize', checkTextOverflow);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', checkTextOverflow);
    }

    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      resizeObserver.disconnect();
      window.removeEventListener('resize', checkTextOverflow);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', checkTextOverflow);
      }
    };
  }, [game.maxUnlockedTier, playerStats?.averageMaxTier]);

  // body 스크롤 방지
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
      document.documentElement.style.overflow = '';
    };
  }, []);

  // 닉네임 모달이 열려있거나 로딩 중이면 게임 비활성화
  if (showNicknameModal || loadingPlayer) {
    return (
      <main className="fixed inset-0 w-screen overflow-hidden bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50" style={{ height: 'var(--viewport-height, 100vh)' }}>
        <NicknameModal
          open={showNicknameModal}
          onSubmit={handleNicknameSubmit}
          initialNickname={playerNickname}
          externalError={nicknameModalError}
        />
        {loadingPlayer && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-40">
            <div className="text-center">
              <div className="text-4xl mb-2 animate-spin">⏳</div>
              <div className="text-sm text-gray-600">로딩 중...</div>
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className={`fixed inset-0 w-screen overflow-hidden bg-gradient-to-br ${colorTheme.bg} p-4 transition-all duration-700`} style={{ height: 'var(--viewport-height, 100vh)' }}>
      <div className="mx-auto h-full max-w-md flex flex-col gap-4 overflow-hidden">
        {/* 축하 메시지 오버레이 */}
        {celebrationMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
            <div
              className={`text-center px-4 py-3 rounded-2xl shadow-2xl border-2 ${
                celebrationMessage.intensity >= 4
                  ? "bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 border-yellow-300 animate-bounce"
                  : celebrationMessage.intensity >= 3
                  ? "bg-gradient-to-r from-orange-400 to-pink-500 border-orange-300 animate-pulse"
                  : "bg-gradient-to-r from-green-400 to-emerald-500 border-green-300"
              } ${
                celebrationMessage.intensity >= 4 ? "scale-125" : celebrationMessage.intensity >= 3 ? "scale-115" : "scale-105"
              } transition-all duration-500 w-auto`}
              style={{
                maxWidth: celebrationMessage.intensity >= 4 
                  ? 'calc((100vw - 2rem) / 1.25)' 
                  : celebrationMessage.intensity >= 3 
                  ? 'calc((100vw - 2rem) / 1.15)' 
                  : 'calc((100vw - 2rem) / 1.05)',
              }}
            >
              <div className={`${celebrationMessage.intensity >= 4 ? "text-lg" : celebrationMessage.intensity >= 3 ? "text-base" : "text-sm"} font-extrabold text-white drop-shadow-lg break-words whitespace-normal ${
                celebrationMessage.intensity >= 4 ? "animate-pulse" : ""
              }`}>
                {celebrationMessage.message}
              </div>
              {celebrationMessage.intensity >= 4 && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer rounded-2xl"></div>
              )}
            </div>
          </div>
        )}

        {/* 아이템 효과 적용 애니메이션 */}
        {itemEffectAnimation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4 animate-in fade-in duration-300">
            <div className="relative">
              {/* 파티클 효과 (점진적으로 확장) */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-r from-purple-400/30 via-pink-400/30 to-purple-400/30 animate-ping" style={{ animationDelay: '0ms' }}></div>
                <div className="absolute w-24 h-24 rounded-full bg-gradient-to-r from-purple-500/40 via-pink-500/40 to-purple-500/40 animate-pulse" style={{ animationDelay: '100ms' }}></div>
                <div className="absolute w-16 h-16 rounded-full bg-gradient-to-r from-purple-600/50 via-pink-600/50 to-purple-600/50 animate-ping" style={{ animationDelay: '200ms' }}></div>
              </div>
              
              {/* 메인 아이템 효과 메시지 */}
              <div className="relative bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-2xl shadow-2xl border-2 border-white/50 px-6 py-4 animate-in zoom-in slide-in-from-bottom-2 duration-500">
                <div className="flex flex-col items-center gap-2">
                  <div className="text-6xl animate-bounce" style={{ animationDuration: '0.6s' }}>{itemEffectAnimation.icon}</div>
                  <div className="text-white font-bold text-base drop-shadow-lg text-center">
                    {itemEffectAnimation.itemName}
                  </div>
                  <div className="text-white/90 font-semibold text-sm drop-shadow-md text-center">
                    {itemEffectAnimation.message}
                  </div>
                </div>
                
                {/* 반짝이는 효과 */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer rounded-2xl pointer-events-none"></div>
              </div>
            </div>
          </div>
        )}

        {/* 헤더 */}
        <header className={`flex-shrink-0 rounded-2xl border-2 ${colorTheme.border || "border-white/50"} bg-gradient-to-br ${colorTheme.header} backdrop-blur-sm shadow-xl p-4 animate-in fade-in slide-in-from-top-2 duration-300 transition-all duration-700`}>
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent flex items-center gap-2">
              <span className="text-2xl">🍉</span>
              <span>수박게임</span>
            </h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-xs px-3 py-1.5 rounded-lg text-gray-600 hover:bg-green-50 hover:text-green-700 transition-colors border border-gray-200 hover:border-green-300 font-semibold"
                onClick={() => setShowStats(true)}
                title="리더보드 보기"
              >
                🏆 리더보드
              </button>
              <button
                type="button"
                className="text-xs px-3 py-1.5 rounded-lg text-gray-600 hover:bg-green-50 hover:text-green-700 transition-colors border border-gray-200 hover:border-green-300 font-semibold"
                onClick={() => setShowHowTo(true)}
                title="게임 방법 보기"
              >
                ❓ 게임 방법
              </button>
            </div>
          </div>

          {playerNickname && (
            <div className="mb-2">
              <div className="flex items-center justify-between w-full gap-2 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-500">플레이어</span>
                  <button
                    type="button"
                    onClick={() => setShowDashboard(true)}
                    className="text-xs px-2 py-1 rounded-lg bg-green-100 text-green-700 font-semibold border border-green-200 hover:bg-green-200 transition-colors"
                  >
                    {playerNickname}
                  </button>
                  {/* 포인트 표시 (닉네임 우측) */}
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-50 border border-purple-200">
                    <span className="text-sm">🍉</span>
                    <span className="text-xs font-bold text-purple-600">{gamePoints.toLocaleString()}P</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowDashboard(true)}
                    className="text-xs px-2 py-1 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors border border-gray-200 hover:border-gray-300"
                    title="대시보드"
                  >
                    📊
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-xs px-2 py-1 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors border border-gray-200 hover:border-gray-300 flex-shrink-0"
                    title="로그아웃"
                  >
                    🚪
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col gap-1.5 items-start">
              <div className="flex-1 min-w-0">
                {playerStats ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <span>최고</span>
                        <span className="font-semibold text-gray-800">{(playerStats.bestScore ?? 0).toLocaleString()}</span>
                      </div>
                      <span className="text-gray-300">•</span>
                      <div className="flex items-center gap-1">
                        <span>평균</span>
                        <span className="font-semibold text-gray-800">{(playerStats.averageScore ?? 0).toLocaleString()}</span>
                      </div>
                      <span className="text-gray-300">•</span>
                      <div className="flex items-center gap-1">
                        <span>플레이</span>
                        <span className="font-semibold text-gray-800">{(playerStats.playCount ?? 0)}회</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      {game.maxUnlockedTier !== undefined && (
                        <>
                          <div ref={currentMaxRef} className="flex items-center gap-1.5 whitespace-nowrap">
                            {textCompactMode.currentMax === 0 && <span className="font-medium text-gray-500">현재 최대</span>}
                            {textCompactMode.currentMax === 1 && <span className="font-medium text-gray-500">현재</span>}
                            {textCompactMode.currentMax === 2 && null}
                            <FruitEmoji tier={game.maxUnlockedTier} className="text-base" />
                            <span className="font-semibold text-gray-800">{FRUIT_CONFIGS[game.maxUnlockedTier].name}</span>
                            <span className="text-gray-400">(Lv.{game.maxUnlockedTier})</span>
                          </div>
                          {playerStats.averageMaxTier !== undefined && playerStats.averageMaxTier !== null && (
                            <>
                              <span className="text-gray-300">•</span>
                              <div ref={averageRef} className="flex items-center gap-1 whitespace-nowrap">
                                {textCompactMode.average === 0 && <span className="font-medium text-gray-500">평균 레벨</span>}
                                {textCompactMode.average === 1 && <span className="font-medium text-gray-500">평균</span>}
                                {textCompactMode.average === 2 && null}
                                <span className="font-semibold text-gray-800">{playerStats.averageMaxTier.toFixed(1)}</span>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <ScoreStats stats={game.scoreStats} />
                    {game.maxUnlockedTier !== undefined && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span className="font-medium text-gray-500">최대 과일</span>
                        <FruitEmoji tier={game.maxUnlockedTier} className="text-base" />
                        <span className="font-semibold text-gray-800">{FRUIT_CONFIGS[game.maxUnlockedTier].name}</span>
                        <span className="text-gray-400">(Lv.{game.maxUnlockedTier})</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <NextFruit 
              ref={nextFruitRef} 
              fruitLevel={game.nextTier} 
              hideText={textCompactMode.next === 1}
              onClick={() => setShowChangeNextFruit(true)}
            />
          </div>
        </header>

        {/* 게임 Canvas */}
        <div 
          data-game-container
          className={`flex-1 min-h-0 relative rounded-2xl border-2 ${colorTheme.border || "border-white/50"} bg-gradient-to-br ${colorTheme.canvas} backdrop-blur-sm shadow-xl p-0 animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-hidden transition-all duration-700`}
        >
          {/* 좌측 상단 점수 표시 */}
          <div className="absolute left-4 top-4 z-10">
            <ScoreBoard score={game.score} />
          </div>

          {/* 우측 상단 아이템 효과 타이머 */}
          {game.activeItemEffects && game.activeItemEffects.length > 0 && (
            <div className="absolute right-4 top-4 z-10 flex flex-col gap-1.5">
              {game.activeItemEffects.map((effect) => {
                const remainingSeconds = Math.ceil(effect.remainingTime / 1000);
                
                return (
                  <div
                    key={effect.type}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/90 backdrop-blur-sm border border-purple-200/50 shadow-md"
                  >
                    <span className="text-base">{effect.icon}</span>
                    <span className="text-xs font-bold text-purple-600 tabular-nums">
                      {remainingSeconds}s
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          
          <GameCanvas
            fruits={game.fruits}
            scoreAnimations={game.scoreAnimations}
            mergeAnimations={game.mergeAnimations}
            popAnimations={game.popAnimations}
            containerBounds={containerBounds}
            currentFruitTier={game.nextTier}
            gameOverLineY={game.gameOverLineY}
            onDrop={handleDrop}
            onWatermelonClick={game.handleWatermelonClick}
            onAnimationComplete={game.handleAnimationComplete}
          />
        </div>

        {/* 컨트롤 버튼 */}
        <div className="flex-shrink-0 flex gap-3" data-control-buttons>
          <button
            type="button"
            onClick={() => setShowItemShop(true)}
            className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-base font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
            title="아이템 상점"
          >
            <span className="text-lg">🛒</span>
            <span className="hidden sm:inline">아이템</span>
          </button>
          <button
            type="button"
            onClick={handleRestart}
            className="flex-1 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3 text-base font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
          >
            <span className="text-lg">🔄</span>
            <span>다시 시작</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3 text-base font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
          >
            <span className="text-lg">💾</span>
            <span>저장</span>
          </button>
        </div>
      </div>

      {/* 게임 방법 모달 */}
      <HowToModal open={showHowTo} onClose={() => setShowHowTo(false)} />

      {/* 아이템 상점 모달 */}
      <ItemShopModal
        open={showItemShop}
        onClose={() => setShowItemShop(false)}
        onPurchaseSuccess={() => {
          // 포인트 정보 다시 로드
          if (playerId) {
            loadPlayerStats(playerId);
          }
        }}
        onToast={(message) => setToast(message)}
        playerId={playerId || undefined}
        gamePoints={gamePoints}
        gameOverLineItemUsed={game.gameOverLineItemUsed}
        memberId={memberId}
        onItemEffect={(effectType, effectValue, itemIcon, itemName) => {
          // 게임 훅의 아이템 효과 적용 함수 호출
          if (game.applyItemEffect) {
            const message = game.applyItemEffect(effectType, effectValue);
            
            // 아이템 효과 애니메이션 표시
            if (message) {
              setItemEffectAnimation({ 
                icon: itemIcon || "✨", 
                message,
                itemName: itemName || "아이템"
              });
              setTimeout(() => setItemEffectAnimation(null), 3000);
            }
            
            return message;
          }
          return null;
        }}
      />

      {/* 플레이어 대시보드 모달 */}
      {playerId && (
        <PlayerDashboard
          open={showDashboard}
          onClose={() => setShowDashboard(false)}
          playerId={playerId}
          onToast={(message) => setToast(message)}
        />
      )}

      {/* 통계 모달 */}
      <StatsModal
        open={showStats}
        onClose={() => setShowStats(false)}
        currentPlayerId={playerId}
      />

      {/* 저장 확인 모달 */}
      <SaveConfirmModal
        open={showSaveConfirm}
        score={game.score}
        onConfirm={handleSaveConfirm}
        onCancel={() => setShowSaveConfirm(false)}
      />

      {/* 다음 과일 변경 모달 */}
      {playerId && (
        <ChangeNextFruitModal
          open={showChangeNextFruit}
          onClose={() => setShowChangeNextFruit(false)}
          currentTier={game.nextTier}
          maxUnlockedTier={game.maxUnlockedTier}
          playerId={playerId}
          gamePoints={gamePoints}
          onSuccess={(newTier) => {
            if (game.setNextTier) {
              game.setNextTier(newTier);
            }
          }}
          onToast={(message) => setToast(message)}
          onPointsUpdate={(newPoints) => {
            setGamePoints(newPoints);
            if (playerId) {
              loadPlayerStats(playerId);
            }
          }}
        />
      )}

      {/* 로그아웃 확인 모달 */}
      <LogoutConfirmModal
        open={showLogoutConfirm}
        playerNickname={playerNickname}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      {/* 게임 오버 모달 */}
      <GameOverModal
        open={showGameOver}
        score={game.score ?? 0}
        bestScore={game.bestScore ?? 0}
        isNewRecord={isNewRecord}
        playerId={playerId}
        onRestart={handleRestart}
        onClose={async () => {
          // 모달이 닫힐 때 무조건 다시하기처럼 동작
          await handleRestart();
        }}
      />

      {/* 토스트 */}
      {toast && (
        <Toast
          message={toast}
          onClose={() => setToast("")}
          duration={3000}
          variant="success"
        />
      )}

      {/* 플로팅 메뉴 버튼 */}
      <MenuButton
        items={[
          {
            id: "attendance",
            name: "출석부",
            emoji: "📋",
            path: "/",
          },
          {
            id: "liar",
            name: "라이어 게임",
            emoji: "🎭",
            path: "/liar",
          },
        ]}
        buttonEmoji="🎮"
        buttonGradient="from-green-500 to-emerald-500"
      />
    </main>
  );
}
