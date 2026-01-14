// 아이템 상점 모달 컴포넌트

"use client";

import { useState, useEffect } from "react";
import { purchaseWithPoints, getAttendancePoints } from "../api";
import { FRUIT_CONFIGS } from "../utils/config";
import type { FruitTier } from "../types";
import { getAllItems, type WatermelonItem } from "../utils/items";

type ItemShopModalProps = {
  open: boolean;
  onClose: () => void;
  onPurchaseSuccess?: () => void;
  onToast?: (message: string) => void;
  playerId?: string;
  gamePoints?: number; // 현재 보유 수박게임 포인트
  memberId?: string; // 출석부 연결 여부
  onItemEffect?: (effectType: string, effectValue: any, itemIcon?: string, itemName?: string) => string | null; // 아이템 효과 적용 함수
  gameOverLineItemUsed?: boolean; // 게임 오버 라인 아이템 사용 여부
};

export function ItemShopModal({
  open,
  onClose,
  onPurchaseSuccess,
  onToast,
  playerId,
  gamePoints = 0,
  memberId,
  onItemEffect,
  gameOverLineItemUsed = false,
}: ItemShopModalProps) {
  const [items] = useState<WatermelonItem[]>(getAllItems());
  const [error, setError] = useState("");
  const [selectedItem, setSelectedItem] = useState<WatermelonItem | null>(null);
  const [showPointSelection, setShowPointSelection] = useState(false);
  const [attendancePoints, setAttendancePoints] = useState<number | null>(null);
  const [loadingAttendancePoints, setLoadingAttendancePoints] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false);
  const [pendingPurchase, setPendingPurchase] = useState<{ item: WatermelonItem; pointType: "game" | "attendance" } | null>(null);
  const [showFruitSelection, setShowFruitSelection] = useState(false);
  const [pendingFruitSelection, setPendingFruitSelection] = useState<{ item: WatermelonItem; pointType: "game" | "attendance" } | null>(null);
  const [selectedFruitTier, setSelectedFruitTier] = useState<FruitTier | null>(null);

  // 아이템 이름 정규화 (DB에 저장된 이름을 올바른 이름으로 매핑)
  const normalizeItemName = (item: WatermelonItem): string => {
    if (item.effectType === "lower_game_over_line") {
      // 기존 이름 "게임 오버 라인 하향"을 "게임 오버 라인 상향"으로 변경
      if (item.name === "게임 오버 라인 하향") {
        return "게임 오버 라인 상향";
      }
    }
    return item.name;
  };

  // 아이템 설명 정규화
  const normalizeItemDescription = (item: WatermelonItem): string | null => {
    if (item.effectType === "lower_game_over_line") {
      // 올바른 설명으로 교체
      return "게임 오버 라인을 최고 위로 올립니다. 게임당 한 번만 사용 가능하며, 게임 종료까지 효과가 유지됩니다.";
    }
    return item.description;
  };

  // 모달이 열릴 때 body 스크롤 방지, 닫힐 때 복원
  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";

      if (playerId && memberId) {
        loadAttendancePoints();
      }

      setSelectedItem(null);
      setShowPointSelection(false);
      setError("");

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.width = "";
      };
    }
  }, [open, playerId, memberId]);

  const loadAttendancePoints = async () => {
    if (!playerId) return;
    try {
      setLoadingAttendancePoints(true);
      const data = await getAttendancePoints(playerId);
      if (data) {
        setAttendancePoints(data.attendancePoints);
      } else {
        setAttendancePoints(0);
      }
    } catch (err) {
      console.error("Failed to load attendance points:", err);
      setAttendancePoints(0);
    } finally {
      setLoadingAttendancePoints(false);
    }
  };

  const handlePurchase = (item: WatermelonItem) => {
    if (!playerId) {
      setError("로그인이 필요합니다.");
      return;
    }

    // 게임 오버 라인 상향 아이템은 이미 사용되었으면 구매 불가
    if (item.effectType === "lower_game_over_line" && gameOverLineItemUsed) {
      setError("이미 사용한 아이템입니다. 게임당 한 번만 사용할 수 있습니다.");
      return;
    }

    // 다음 과일 지정 아이템은 과일 선택 모달 표시
    if (item.effectType === "select_next_fruit") {
      setPendingFruitSelection({ item, pointType: memberId && attendancePoints !== null ? "attendance" : "game" });
      setShowFruitSelection(true);
      return;
    }

    setSelectedItem(item);
    setError("");

    // 출석부와 연결되어 있으면 포인트 선택 화면 표시, 아니면 바로 구매 확인
    if (memberId && attendancePoints !== null) {
      setShowPointSelection(true);
    } else {
      // 수박게임 포인트로 구매 확인
      setPendingPurchase({ item, pointType: "game" });
      setShowPurchaseConfirm(true);
    }
  };

  const handlePurchaseWithPoints = async (item: WatermelonItem, pointType: "game" | "attendance", selectedTier?: number) => {
    if (!playerId) {
      setError("로그인이 필요합니다.");
      return;
    }

    // 게임 오버 라인 상향 아이템은 이미 사용되었으면 구매 불가
    if (item.effectType === "lower_game_over_line" && gameOverLineItemUsed) {
      setError("이미 사용한 아이템입니다. 게임당 한 번만 사용할 수 있습니다.");
      return;
    }

    // 다음 과일 지정 아이템은 동적 가격 (선택한 과일의 레벨 x 10)
    const itemPrice = item.effectType === "select_next_fruit" && selectedTier !== undefined
      ? selectedTier * 10
      : item.price;

    if (pointType === "game" && (gamePoints ?? 0) < itemPrice) {
      setError("수박게임 포인트가 부족합니다.");
      return;
    }

    if (pointType === "attendance" && (attendancePoints ?? 0) < itemPrice) {
      setError("출석 포인트가 부족합니다.");
      return;
    }

    try {
      setPurchasing(true);
      setError("");

      const result = await purchaseWithPoints(playerId, item.id, pointType, 1, selectedTier);

      // 출석 포인트 갱신
      if (pointType === "attendance" && memberId) {
        await loadAttendancePoints();
      }

      setSelectedItem(null);
      setShowPointSelection(false);
      
      // 과일 제거 아이템은 모달이 닫힌 후 실행
      const isRemoveFruitsItem = result.item.effectType === "remove_fruits";
      
      if (isRemoveFruitsItem) {
        // 모달 먼저 닫기
        onClose();
        
        // 모달 애니메이션 완료 후 아이템 효과 적용 (300ms 딜레이)
        setTimeout(() => {
          if (onItemEffect && result.item.effectType) {
            const normalizedResultItem = {
              ...result.item,
              name: normalizeItemName({ ...item, ...result.item } as WatermelonItem),
            };
            const effectMessage = onItemEffect(
              result.item.effectType, 
              result.item.effectValue || (selectedTier !== undefined ? { tier: selectedTier } : null),
              result.item.icon || item.icon || undefined,
              normalizedResultItem.name || normalizeItemName(item) || undefined
            );
            
            // 토스트 메시지
            if (onToast && effectMessage) {
              onToast(`${item.icon || "🎁"} ${normalizeItemName(item)} 구매 완료! ${effectMessage}`);
            }
          }
          
          if (onPurchaseSuccess) {
            onPurchaseSuccess();
          }
        }, 300);
      } else {
        // 다른 아이템은 즉시 효과 적용
        let effectMessage: string | null = null;
        if (onItemEffect && result.item.effectType) {
          // result.item을 정규화된 이름으로 변환
          const normalizedResultItem = {
            ...result.item,
            name: normalizeItemName({ ...item, ...result.item } as WatermelonItem),
          };
          effectMessage = onItemEffect(
            result.item.effectType, 
            result.item.effectValue || (selectedTier !== undefined ? { tier: selectedTier } : null),
            result.item.icon || item.icon || undefined,
            normalizedResultItem.name || normalizeItemName(item) || undefined
          );
        }

        if (onPurchaseSuccess) {
          onPurchaseSuccess();
        }

        // 토스트 메시지 (효과 메시지가 있으면 효과 메시지 우선, 없으면 구매 완료 메시지)
        if (onToast) {
          if (effectMessage) {
            onToast(`${item.icon || "🎁"} ${normalizeItemName(item)} 구매 완료! ${effectMessage}`);
          } else {
            onToast(`${item.icon || "🎁"} ${normalizeItemName(item)} 구매 완료!`);
          }
        }
        
        // 구매 완료 후 모달 즉시 닫기
        onClose();
      }
    } catch (err: any) {
      console.error("Purchase failed:", err);
      const errorMessage = err?.message || "구매에 실패했습니다.";

      if (errorMessage.includes("insufficient_points")) {
        setError("포인트가 부족합니다.");
      } else if (errorMessage.includes("not_connected")) {
        setError("출석부와 연결되어 있지 않습니다.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleBack = () => {
    setShowPointSelection(false);
    setSelectedItem(null);
    setError("");
  };

  const handleConfirmPurchase = async () => {
    if (!pendingPurchase) return;
    setShowPurchaseConfirm(false);
    const itemToPurchase = pendingPurchase.item;
    const pointTypeToUse = pendingPurchase.pointType;
    const tierToUse = selectedFruitTier; // 다음 과일 지정 아이템인 경우 선택한 tier 사용
    setPendingPurchase(null);
    setSelectedFruitTier(null);
    
    // 구매 실행 (구매 완료 후 모달이 자동으로 닫힘)
    await handlePurchaseWithPoints(itemToPurchase, pointTypeToUse, tierToUse ?? undefined);
  };

  const handleFruitSelect = (tier: FruitTier) => {
    if (!pendingFruitSelection) return;
    
    const item = pendingFruitSelection.item;
    const pointType = pendingFruitSelection.pointType;
    const price = tier * 10;
    
    // 포인트 확인
    if (pointType === "game" && (gamePoints ?? 0) < price) {
      setError("수박게임 포인트가 부족합니다.");
      return;
    }
    
    if (pointType === "attendance" && (attendancePoints ?? 0) < price) {
      setError("출석 포인트가 부족합니다.");
      return;
    }
    
    // 과일 선택 후 구매 확인 모달 표시
    setSelectedFruitTier(tier);
    setShowFruitSelection(false);
    setPendingPurchase({ item, pointType });
    setShowPurchaseConfirm(true);
  };

  const handleCancelPurchase = () => {
    setShowPurchaseConfirm(false);
    setPendingPurchase(null);
    setSelectedFruitTier(null);
    // 다음 과일 지정 아이템인 경우 과일 선택 모달로 돌아가기
    if (pendingFruitSelection) {
      setShowFruitSelection(true);
    }
  };

  // 아이템 효과 설명 텍스트 생성
  const getItemEffectDescription = (item: WatermelonItem): string => {
    if (!item.effectType) return "";
    
    switch (item.effectType) {
      case "select_next_fruit":
        return "원하는 과일을 선택하여 다음에 떨어지도록 지정합니다. 가격은 선택한 과일의 레벨 x 10입니다.";
      case "bonus_score":
        return "획득하는 점수가 2배가 됩니다 (30초간 지속).";
      case "remove_fruits":
        if (item.effectValue?.position === "top") {
          return "화면 상단의 과일 3개가 즉시 제거됩니다.";
        } else if (item.effectValue?.position === "bottom") {
          return "화면 하단의 과일 3개가 즉시 제거됩니다.";
        } else {
          return "화면의 랜덤 과일 5개가 즉시 제거됩니다.";
        }
      case "lower_game_over_line":
        return "게임 오버 라인이 최고 위로 올라갑니다. 게임당 한 번만 사용 가능하며, 게임 종료까지 효과가 유지됩니다.";
      default:
        return "구매 즉시 효과가 적용됩니다.";
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="아이템 상점"
      onClick={(e) => {
        if (e.target === e.currentTarget && !showPointSelection) {
          onClose();
        }
      }}
      onTouchStart={(e) => {
        if (e.target === e.currentTarget && !showPointSelection) {
          onClose();
        }
      }}
      style={{
        touchAction: "none",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        // 모바일 safe area 적용
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border-2 border-white/50 bg-white/95 backdrop-blur-sm shadow-2xl animate-in zoom-in slide-in-from-bottom-2 duration-300 flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          e.stopPropagation();
        }}
        style={{
          pointerEvents: "auto",
          touchAction: "pan-y",
          position: "relative",
          zIndex: 50,
          // 모바일 safe area를 고려한 max-height 계산
          maxHeight: 'calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 2rem)',
        }}
      >
        <div className="flex items-center justify-between border-b-2 border-purple-200/50 bg-gradient-to-r from-purple-50 to-pink-50 px-5 py-4 rounded-t-2xl sticky top-0 z-10 flex-shrink-0">
          <div className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
            <span className="text-2xl">🛒</span>
            <span>아이템 상점</span>
          </div>
          <button
            type="button"
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/50 transition-colors"
            onClick={onClose}
            onTouchStart={(e) => e.stopPropagation()}
            aria-label="닫기"
            style={{
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            ×
          </button>
        </div>

        <div
          className="px-5 py-6 overflow-y-auto flex-1"
          style={{
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y",
          }}
        >
          {/* 포인트 선택 화면 */}
          {showPointSelection && selectedItem && playerId ? (
            <div>
              <button
                type="button"
                onClick={handleBack}
                className="mb-4 text-gray-600 hover:text-gray-800 text-sm flex items-center gap-1"
              >
                ← 뒤로
              </button>

              <div className="mb-6 pb-4 border-b">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-4xl">{selectedItem.icon || "🎁"}</div>
                  <div>
                    <div className="font-bold text-xl text-gray-800">{normalizeItemName(selectedItem)}</div>
                    <div className="text-lg font-bold text-purple-600">
                      {selectedItem.effectType === "select_next_fruit" 
                        ? "레벨 x 10" 
                        : `${selectedItem.price.toLocaleString()}P`}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">포인트 선택</div>

                {/* 수박게임 포인트 */}
                <button
                  type="button"
                  onClick={() => {
                    // 다음 과일 지정 아이템은 과일 선택 모달 표시
                    if (selectedItem.effectType === "select_next_fruit") {
                      setPendingFruitSelection({ item: selectedItem, pointType: "game" });
                      setShowFruitSelection(true);
                    } else {
                      setPendingPurchase({ item: selectedItem, pointType: "game" });
                      setShowPurchaseConfirm(true);
                    }
                  }}
                  disabled={purchasing || (selectedItem.effectType === "select_next_fruit" ? false : (gamePoints ?? 0) < selectedItem.price)}
                  className="w-full rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-4 hover:shadow-lg transition-all duration-200 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-lg text-gray-800">수박게임 포인트</div>
                      <div className="text-sm text-gray-600">
                        보유: <span className="font-semibold text-purple-600">{(gamePoints ?? 0).toLocaleString()}P</span>
                      </div>
                    </div>
                    <div className="text-2xl">🍉</div>
                  </div>
                  {selectedItem.effectType !== "select_next_fruit" && (gamePoints ?? 0) < selectedItem.price && (
                    <div className="mt-2 text-xs text-red-600">포인트가 부족합니다</div>
                  )}
                </button>

                {/* 출석 포인트 */}
                {memberId && attendancePoints !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      // 다음 과일 지정 아이템은 과일 선택 모달 표시
                      if (selectedItem.effectType === "select_next_fruit") {
                        setPendingFruitSelection({ item: selectedItem, pointType: "attendance" });
                        setShowFruitSelection(true);
                      } else {
                        setPendingPurchase({ item: selectedItem, pointType: "attendance" });
                        setShowPurchaseConfirm(true);
                      }
                    }}
                    disabled={purchasing || loadingAttendancePoints || (selectedItem.effectType === "select_next_fruit" ? false : attendancePoints < selectedItem.price)}
                    className="w-full rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 hover:shadow-lg transition-all duration-200 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-lg text-gray-800">출석 포인트</div>
                        <div className="text-sm text-gray-600">
                          보유:{" "}
                          {loadingAttendancePoints ? (
                            <span className="text-gray-400">로딩 중...</span>
                          ) : (
                            <span className="font-semibold text-blue-600">
                              {attendancePoints.toLocaleString()}P
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-2xl">📋</div>
                    </div>
                    {selectedItem.effectType !== "select_next_fruit" && attendancePoints < selectedItem.price && (
                      <div className="mt-2 text-xs text-red-600">포인트가 부족합니다</div>
                    )}
                  </button>
                )}
              </div>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 border-2 border-red-200 p-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {purchasing && (
                <div className="text-center text-gray-600 text-sm py-2">구매 중...</div>
              )}
            </div>
          ) : (
            <>
              {/* 포인트 표시 */}
              {playerId && (
                <div className="mb-4 pb-4 border-b">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50">
                      <span className="text-xl">🍉</span>
                      <div>
                        <div className="text-xs text-gray-600">수박게임 포인트</div>
                        <div className="font-bold text-purple-600">
                          {(gamePoints ?? 0).toLocaleString()}P
                        </div>
                      </div>
                    </div>
                    {memberId && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50">
                        <span className="text-xl">📋</span>
                        <div>
                          <div className="text-xs text-gray-600">출석 포인트</div>
                          <div className="font-bold text-blue-600">
                            {loadingAttendancePoints ? (
                              <span className="text-gray-400">로딩 중...</span>
                            ) : attendancePoints !== null ? (
                              `${attendancePoints.toLocaleString()}P`
                            ) : (
                              "-"
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {error ? (
                <div className="rounded-lg bg-red-50 border-2 border-red-200 p-4 text-red-700 text-center">
                  {error}
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-12 text-gray-500">아이템이 없습니다.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((item) => {
                    // 게임 오버 라인 상향 아이템이 이미 사용되었는지 확인
                    const isGameOverLineItemUsed = item.effectType === "lower_game_over_line" && gameOverLineItemUsed;
                    const isDisabled = !playerId || isGameOverLineItemUsed;
                    
                    return (
                      <div
                        key={item.id}
                        className={`rounded-xl border-2 p-4 transition-all duration-200 flex flex-col ${
                          isGameOverLineItemUsed
                            ? "border-gray-300 bg-gradient-to-br from-gray-100 to-gray-200/50 opacity-60"
                            : "border-purple-200 bg-gradient-to-br from-white to-purple-50/30 hover:shadow-lg"
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <div className="text-4xl flex-shrink-0">{item.icon || "🎁"}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-lg text-gray-800 mb-1">{normalizeItemName(item)}</div>
                            {normalizeItemDescription(item) && (
                              <div className="text-sm text-gray-600 mb-3">{normalizeItemDescription(item)}</div>
                            )}
                            {isGameOverLineItemUsed && (
                              <div className="text-xs text-red-600 font-semibold mb-2 bg-red-50 border border-red-200 rounded-lg px-2 py-1 inline-block">
                                ⚠️ 이미 사용한 아이템입니다
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-200">
                          <div className="text-lg font-bold text-purple-600">
                            {item.effectType === "select_next_fruit" 
                              ? "레벨 x 10" 
                              : `${item.price.toLocaleString()}P`}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isDisabled) {
                                handlePurchase(item);
                              }
                            }}
                            disabled={isDisabled}
                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-sm hover:from-purple-600 hover:to-pink-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                          >
                            {isGameOverLineItemUsed ? "사용 완료" : "구매하기"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 구매 확인 모달 */}
      {showPurchaseConfirm && pendingPurchase && (
        <div
          className="fixed z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="구매 확인"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            // 모바일 safe area 적용
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
              // 모바일 safe area를 고려한 max-height 계산
              maxHeight: 'calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 2rem)',
            }}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-4xl">{pendingPurchase.item.icon || "🎁"}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800 mb-1">{normalizeItemName(pendingPurchase.item)}</h3>
                  <div className="text-lg font-bold text-purple-600">
                    {pendingPurchase.item.effectType === "select_next_fruit" && selectedFruitTier !== null
                      ? `${(selectedFruitTier * 10).toLocaleString()}P`
                      : `${pendingPurchase.item.price.toLocaleString()}P`}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl">⚠️</span>
                    <div className="flex-1">
                      <div className="font-bold text-yellow-800 mb-1">구매 즉시 사용됩니다</div>
                      <div className="text-sm text-yellow-700">
                        이 아이템은 구매하시면 즉시 효과가 적용됩니다.
                      </div>
                    </div>
                  </div>
                </div>

                  {pendingPurchase.item.effectType === "select_next_fruit" && selectedFruitTier !== null && (
                    <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="text-4xl">{FRUIT_CONFIGS[selectedFruitTier].emoji}</div>
                        <div>
                          <div className="font-bold text-purple-800">{FRUIT_CONFIGS[selectedFruitTier].name}</div>
                          <div className="text-sm text-purple-600">가격: {selectedFruitTier * 10}P</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {normalizeItemDescription(pendingPurchase.item) && (
                    <div className="text-sm text-gray-600 mb-2">
                      {normalizeItemDescription(pendingPurchase.item)}
                    </div>
                  )}

                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <span className="text-xl">💡</span>
                    <div className="flex-1">
                      <div className="font-semibold text-blue-800 mb-1">효과</div>
                      <div className="text-sm text-blue-700">
                        {getItemEffectDescription(pendingPurchase.item)}
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

      {/* 과일 선택 모달 (다음 과일 지정 아이템용) */}
      {showFruitSelection && pendingFruitSelection && (
        <div
          className="fixed z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="과일 선택"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            // 모바일 safe area 적용
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
              // 모바일 safe area를 고려한 max-height 계산
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
                    setPendingFruitSelection(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/50 transition-colors"
                  aria-label="닫기"
                >
                  ×
                </button>
              </div>

              <div className="mb-4 text-sm text-gray-600">
                다음에 떨어질 과일을 선택하세요. 가격은 선택한 과일의 레벨 x 10입니다.
              </div>

              <div className="grid grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
                {([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as FruitTier[]).map((tier) => {
                  const config = FRUIT_CONFIGS[tier];
                  const price = tier * 10;
                  const canAfford = pendingFruitSelection.pointType === "game"
                    ? (gamePoints ?? 0) >= price
                    : (attendancePoints ?? 0) >= price;
                  
                  return (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => handleFruitSelect(tier)}
                      disabled={!canAfford || purchasing}
                      className={`rounded-xl border-2 p-4 flex flex-col items-center justify-center gap-2 transition-all duration-200 ${
                        canAfford && !purchasing
                          ? "border-purple-300 bg-gradient-to-br from-white to-purple-50/30 hover:shadow-lg hover:scale-105 active:scale-95"
                          : "border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <div className="text-4xl">{config.emoji}</div>
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
    </div>
  );
}
