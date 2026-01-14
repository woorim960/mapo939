// 다음 과일 변경 모달 컴포넌트

"use client";

import { useState, useEffect } from "react";
import type { FruitTier } from "../types";
import { FRUIT_CONFIGS } from "../utils/config";
import { FruitEmoji } from "./FruitEmoji";

type ChangeNextFruitModalProps = {
  open: boolean;
  onClose: () => void;
  currentTier: FruitTier;
  maxUnlockedTier: FruitTier;
  playerId?: string;
  gamePoints: number;
  onSuccess: (newTier: FruitTier) => void;
  onToast: (message: string) => void;
  onPointsUpdate: (newPoints: number) => void;
};

export function ChangeNextFruitModal({
  open,
  onClose,
  currentTier,
  maxUnlockedTier,
  playerId,
  gamePoints,
  onSuccess,
  onToast,
  onPointsUpdate,
}: ChangeNextFruitModalProps) {
  const [showFruitSelection, setShowFruitSelection] = useState(false);
  const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false);
  const [selectedFruitTier, setSelectedFruitTier] = useState<FruitTier | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  // 모달이 열릴 때 상태 초기화
  useEffect(() => {
    if (open) {
      setShowFruitSelection(false);
      setShowPurchaseConfirm(false);
      setSelectedFruitTier(null);
      setPurchasing(false);
    }
  }, [open]);

  if (!open) return null;

  const handleRandomChange = async () => {
    if (!playerId) {
      onToast("플레이어 정보가 없습니다.");
      return;
    }

    if (gamePoints < 5) {
      onToast("포인트가 부족합니다. (필요: 5P)");
      return;
    }

    setPurchasing(true);
    try {
      const response = await fetch("/api/watermelon/change-next-fruit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          changeType: "random",
          pointType: "game",
          maxTier: maxUnlockedTier,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "랜덤 변경 실패");
      }

      const data = await response.json();
      onPointsUpdate(data.newGamePoints || gamePoints - 5);
      onSuccess(data.newTier as FruitTier);
      onToast(`다음 과일이 랜덤으로 변경되었습니다! (${FRUIT_CONFIGS[data.newTier as FruitTier].emoji} ${FRUIT_CONFIGS[data.newTier as FruitTier].name})`);
      
      // 모든 상태 초기화 및 모달 동시에 닫기
      // onClose를 먼저 호출하여 메인 모달을 즉시 닫고, 내부 모달들도 상태 업데이트로 닫기
      onClose();
      setShowFruitSelection(false);
      setShowPurchaseConfirm(false);
      setSelectedFruitTier(null);
    } catch (error: any) {
      console.error("Random change failed:", error);
      onToast(error.message || "랜덤 변경에 실패했습니다.");
    } finally {
      setPurchasing(false);
    }
  };

  const handleSelectChange = (e?: React.MouseEvent) => {
    // 이벤트 전파 방지
    if (e) {
      e.stopPropagation();
    }
    // 바로 과일 선택 모달 표시
    setShowFruitSelection(true);
  };

  const handleFruitSelect = (tier: FruitTier, e?: React.MouseEvent) => {
    // 이벤트 전파 방지
    if (e) {
      e.stopPropagation();
    }
    
    const price = tier * 10;
    
    // 포인트 확인
    if (gamePoints < price) {
      onToast(`포인트가 부족합니다. (필요: ${price}P)`);
      return;
    }
    
    // 과일 선택 후 구매 확인 모달 표시
    setSelectedFruitTier(tier);
    setShowFruitSelection(false);
    setShowPurchaseConfirm(true);
  };

  const handleConfirmPurchase = async () => {
    if (!playerId || selectedFruitTier === null) {
      onToast("플레이어 정보가 없습니다.");
      return;
    }

    const price = selectedFruitTier * 10;
    if (gamePoints < price) {
      onToast(`포인트가 부족합니다. (필요: ${price}P)`);
      return;
    }

    setPurchasing(true);
    try {
      const response = await fetch("/api/watermelon/change-next-fruit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          changeType: "select",
          selectedTier: selectedFruitTier,
          pointType: "game",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "과일 지정 실패");
      }

      const data = await response.json();
      onPointsUpdate(data.newGamePoints || gamePoints - price);
      onSuccess(selectedFruitTier);
      onToast(`다음 과일이 ${FRUIT_CONFIGS[selectedFruitTier].emoji} ${FRUIT_CONFIGS[selectedFruitTier].name}로 지정되었습니다!`);
      
      // 모든 상태 초기화 및 모달 동시에 닫기
      // onClose를 먼저 호출하여 메인 모달을 즉시 닫고, 내부 모달들도 상태 업데이트로 닫기
      onClose();
      setSelectedFruitTier(null);
      setShowFruitSelection(false);
      setShowPurchaseConfirm(false);
    } catch (error: any) {
      console.error("Fruit select failed:", error);
      onToast(error.message || "과일 지정에 실패했습니다.");
    } finally {
      setPurchasing(false);
    }
  };

  const handleCancelPurchase = () => {
    setShowPurchaseConfirm(false);
    setSelectedFruitTier(null);
    // 과일 선택 모달로 돌아가기
    setShowFruitSelection(true);
  };

  const handleClose = () => {
    // 모든 상태 초기화
    setShowFruitSelection(false);
    setShowPurchaseConfirm(false);
    setSelectedFruitTier(null);
    setPurchasing(false);
    onClose();
  };

  return (
    <>
      {/* 메인 모달 (랜덤/지정 선택) */}
      {!showFruitSelection && !showPurchaseConfirm && (
        <div
          className="fixed z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="다음 과일 변경"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            paddingTop: 'max(1rem, env(safe-area-inset-top))',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
          }}
          onClick={handleClose}
        >
        <div
          className="w-full max-w-md rounded-2xl border-2 border-white/50 bg-white/95 backdrop-blur-sm shadow-2xl animate-in zoom-in slide-in-from-bottom-2 duration-300"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          style={{
            maxHeight: 'calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 2rem)',
          }}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                <span className="text-2xl">🍎</span>
                <span>다음 과일 변경</span>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/50 transition-colors"
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            <div className="mb-4 text-sm text-gray-600">
              현재 다음 과일: <span className="font-semibold">{FRUIT_CONFIGS[currentTier].emoji} {FRUIT_CONFIGS[currentTier].name}</span>
            </div>

            <div className="space-y-3">
              {/* 랜덤 변경 버튼 */}
              <button
                type="button"
                onClick={handleRandomChange}
                disabled={purchasing || gamePoints < 5}
                className={`w-full rounded-xl border-2 p-4 flex items-center justify-between transition-all duration-200 ${
                  gamePoints >= 5 && !purchasing
                    ? "border-blue-300 bg-gradient-to-br from-blue-50 to-purple-50/30 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                    : "border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🎲</span>
                  <div className="text-left">
                    <div className="font-bold text-gray-800">랜덤으로 변경</div>
                    <div className="text-xs text-gray-600">최대 레벨({FRUIT_CONFIGS[maxUnlockedTier].name})까지 랜덤</div>
                  </div>
                </div>
                <div className={`text-lg font-bold ${gamePoints >= 5 ? "text-blue-600" : "text-gray-400"}`}>
                  5P
                </div>
              </button>

              {/* 지정 변경 버튼 */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectChange(e);
                }}
                disabled={purchasing}
                className="w-full rounded-xl border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50/30 p-4 flex items-center justify-between hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🎯</span>
                  <div className="text-left">
                    <div className="font-bold text-gray-800">지정해서 변경</div>
                    <div className="text-xs text-gray-600">원하는 과일을 선택하세요</div>
                  </div>
                </div>
                <div className="text-lg font-bold text-purple-600">
                  레벨 × 10P
                </div>
              </button>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* 과일 선택 모달 (지정 변경용) */}
      {showFruitSelection && (
        <div
          className="fixed z-[71] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="과일 선택"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            paddingTop: 'max(1rem, env(safe-area-inset-top))',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
          }}
          onClick={() => {
            setShowFruitSelection(false);
            setSelectedFruitTier(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border-2 border-white/50 bg-white/95 backdrop-blur-sm shadow-2xl animate-in zoom-in slide-in-from-bottom-2 duration-300"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            style={{
              maxHeight: 'calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 2rem)',
            }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  <span>과일 선택</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowFruitSelection(false);
                    setSelectedFruitTier(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/50 transition-colors"
                  aria-label="닫기"
                >
                  ×
                </button>
              </div>

              <div className="mb-4 text-sm text-gray-600">
                다음에 떨어질 과일을 선택하세요. 가격은 선택한 과일의 레벨 × 10입니다.
              </div>

              <div className="grid grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
                {([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as FruitTier[]).map((tier) => {
                  const config = FRUIT_CONFIGS[tier];
                  const price = tier * 10;
                  const canAfford = gamePoints >= price;
                  
                  return (
                    <button
                      key={tier}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFruitSelect(tier, e);
                      }}
                      disabled={!canAfford || purchasing}
                      className={`rounded-xl border-2 p-4 flex flex-col items-center justify-center gap-2 transition-all duration-200 ${
                        canAfford && !purchasing
                          ? "border-purple-300 bg-gradient-to-br from-white to-purple-50/30 hover:shadow-lg hover:scale-105 active:scale-95"
                          : "border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <div className="text-4xl">
                        <FruitEmoji tier={tier} />
                      </div>
                      <div className="text-xs font-semibold text-gray-700">{config.name}</div>
                      <div className={`text-sm font-bold ${canAfford ? "text-purple-600" : "text-gray-400"}`}>
                        {price}P
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 구매 확인 모달 */}
      {showPurchaseConfirm && selectedFruitTier !== null && (
        <div
          className="fixed z-[72] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="구매 확인"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            paddingTop: 'max(1rem, env(safe-area-inset-top))',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border-2 border-white/50 bg-white/95 backdrop-blur-sm shadow-2xl animate-in zoom-in slide-in-from-bottom-2 duration-300"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            style={{
              maxHeight: 'calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 2rem)',
            }}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-4xl">🎯</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800 mb-1">다음 과일 지정</h3>
                  <div className="text-lg font-bold text-purple-600">
                    {selectedFruitTier !== null ? (selectedFruitTier * 10).toLocaleString() : 0}P
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl">⚠️</span>
                    <div className="flex-1">
                      <div className="font-bold text-yellow-800 mb-1">구매 즉시 적용됩니다</div>
                      <div className="text-sm text-yellow-700">
                        다음에 떨어질 과일이 선택한 과일로 변경됩니다.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">
                      <FruitEmoji tier={selectedFruitTier} />
                    </div>
                    <div>
                      <div className="font-bold text-purple-800">{FRUIT_CONFIGS[selectedFruitTier].name}</div>
                      <div className="text-sm text-purple-600">가격: {selectedFruitTier !== null ? selectedFruitTier * 10 : 0}P</div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <span className="text-xl">💡</span>
                    <div className="flex-1">
                      <div className="font-semibold text-blue-800 mb-1">효과</div>
                      <div className="text-sm text-blue-700">
                        다음에 떨어질 과일이 선택한 과일로 지정됩니다.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancelPurchase}
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPurchase}
                  disabled={purchasing}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                >
                  {purchasing ? "구매 중..." : "구매 및 사용"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
