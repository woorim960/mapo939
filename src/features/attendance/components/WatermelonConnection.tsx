// 수박게임 계정 연결 컴포넌트

"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { getMemberWatermelonAccount, connectWatermelonAccount, disconnectWatermelonAccount } from "@/features/watermelon/api";

type WatermelonConnectionProps = {
  memberId: string;
  onUpdate?: () => void;
};

export function WatermelonConnection({ memberId, onUpdate }: WatermelonConnectionProps) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [player, setPlayer] = useState<{ id: string; nickname: string; gamePoints: number; createdAt: Date } | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadConnection();
  }, [memberId]);

  // 모달이 열릴 때 body 스크롤 방지 및 ESC 키 처리
  useEffect(() => {
    if (showConnectModal || showDisconnectModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (showConnectModal) {
            setShowConnectModal(false);
            setError("");
          }
          if (showDisconnectModal) {
            setShowDisconnectModal(false);
            setError("");
          }
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        document.body.style.overflow = originalOverflow;
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [showConnectModal, showDisconnectModal]);

  const loadConnection = async () => {
    try {
      setLoading(true);
      const data = await getMemberWatermelonAccount(memberId);
      if (data) {
        setConnected(data.connected);
        if (data.connected && data.player) {
          setPlayer(data.player);
        } else {
          setPlayer(null);
        }
      } else {
        // API 호출 실패 시 연결 안 됨으로 표시
        setConnected(false);
        setPlayer(null);
      }
    } catch (err) {
      console.error("Failed to load watermelon connection:", err);
      setConnected(false);
      setPlayer(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!nickname.trim() || !password) {
      setError("닉네임과 패스워드를 입력해주세요.");
      return;
    }

    try {
      setConnecting(true);
      setError("");
      await connectWatermelonAccount(memberId, nickname.trim(), password);
      setShowConnectModal(false);
      setNickname("");
      setPassword("");
      await loadConnection();
      if (onUpdate) {
        onUpdate();
      }
    } catch (err: any) {
      console.error("Failed to connect:", err);
      const errorMessage = err?.message || err?.error || "연결에 실패했습니다.";
      
      if (errorMessage.includes("invalid_password") || errorMessage.includes("password")) {
        setError("패스워드가 일치하지 않습니다.");
      } else if (errorMessage.includes("player_not_found")) {
        setError("수박게임 계정을 찾을 수 없습니다. 수박게임에서 먼저 계정을 생성해주세요.");
      } else if (errorMessage.includes("already_connected")) {
        setError("이미 연결된 계정이 있습니다.");
      } else if (errorMessage.includes("member_not_found")) {
        setError("멤버 정보를 찾을 수 없습니다.");
      } else if (errorMessage.includes("password_not_set")) {
        setError("수박게임 계정에 패스워드가 설정되지 않았습니다.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!player) return;
    if (!password) {
      setError("패스워드를 입력해주세요.");
      return;
    }

    try {
      setConnecting(true);
      setError("");
      await disconnectWatermelonAccount(memberId, player.nickname, password);
      setShowDisconnectModal(false);
      setPassword("");
      await loadConnection();
      if (onUpdate) {
        onUpdate();
      }
    } catch (err: any) {
      console.error("Failed to disconnect:", err);
      const errorMessage = err?.message || err?.error || "연결 해제에 실패했습니다.";
      
      if (errorMessage.includes("invalid_password") || errorMessage.includes("password")) {
        setError("패스워드가 일치하지 않습니다.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4 text-center">
        <div className="text-sm text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍉</span>
            <div className="font-bold text-gray-800">수박게임 계정</div>
          </div>
          {connected ? (
            <button
              type="button"
              onClick={() => {
                setShowDisconnectModal(true);
                setPassword("");
                setError("");
              }}
              className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
            >
              연결 해제
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowConnectModal(true);
                setNickname("");
                setPassword("");
                setError("");
              }}
              className="px-3 py-1.5 rounded-lg bg-purple-500 text-white text-xs font-semibold hover:bg-purple-600 transition-colors"
            >
              연결하기
            </button>
          )}
        </div>

        {connected && player ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">닉네임:</span>
              <span className="font-semibold text-gray-800">{player.nickname}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">수박게임 포인트:</span>
              <span className="font-semibold text-purple-600">{player.gamePoints.toLocaleString()}P</span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500 text-center py-2">
            수박게임 계정이 연결되어 있지 않습니다.
          </div>
        )}
      </div>

      {/* 연결 모달 - Portal로 body에 직접 렌더링 */}
      {showConnectModal && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            margin: 0,
            padding: '1rem',
          }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 opacity-100"
            onClick={() => {
              setShowConnectModal(false);
              setError("");
            }}
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0,
              margin: 0,
            }}
          />
          
          {/* Modal Content - 화면 정중앙 배치 */}
          <div
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border-2 border-purple-200/50 p-6 transition-all duration-300 animate-in fade-in zoom-in-95"
            style={{ 
              position: 'relative',
              zIndex: 201,
              margin: 'auto',
              transform: 'translate(0, 0)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  🍉 수박게임 계정 연결
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowConnectModal(false);
                    setError("");
                  }}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="닫기"
                >
                  ×
                </button>
              </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                수박게임 닉네임
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="닉네임 입력"
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                maxLength={20}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                패스워드
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="패스워드 입력"
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border-2 border-red-200 p-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConnect}
                disabled={connecting || !nickname.trim() || !password}
                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {connecting ? "연결 중..." : "연결하기"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConnectModal(false);
                  setError("");
                }}
                className="px-4 py-2 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 연결 해제 모달 - Portal로 body에 직접 렌더링 */}
      {showDisconnectModal && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            margin: 0,
            padding: '1rem',
          }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 opacity-100"
            onClick={() => {
              setShowDisconnectModal(false);
              setError("");
            }}
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0,
              margin: 0,
            }}
          />
          
          {/* Modal Content - 화면 정중앙 배치 */}
          <div
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border-2 border-red-200/50 p-6 transition-all duration-300 animate-in fade-in zoom-in-95"
            style={{ 
              position: 'relative',
              zIndex: 201,
              margin: 'auto',
              transform: 'translate(0, 0)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-lg font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  🔗 수박게임 계정 연결 해제
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowDisconnectModal(false);
                    setError("");
                  }}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="닫기"
                >
                  ×
                </button>
              </div>

          {player && (
            <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-3">
              <div className="text-sm text-gray-600 mb-1">연결된 계정:</div>
              <div className="font-semibold text-gray-800">{player.nickname}</div>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                패스워드 확인
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="패스워드 입력"
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border-2 border-red-200 p-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={connecting || !password}
                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold hover:from-red-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {connecting ? "해제 중..." : "연결 해제"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDisconnectModal(false);
                  setError("");
                }}
                className="px-4 py-2 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
