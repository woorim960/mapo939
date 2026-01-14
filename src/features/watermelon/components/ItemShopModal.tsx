// 아이템 상점 모달 컴포넌트

"use client";

import { useState, useEffect } from "react";
import { getItems, purchaseWithPoints, getAttendancePoints, type WatermelonItem } from "../api";

type ItemShopModalProps = {
  open: boolean;
  onClose: () => void;
  onPurchaseSuccess?: () => void;
  onToast?: (message: string) => void;
  playerId?: string;
  gamePoints?: number; // 현재 보유 수박게임 포인트
  memberId?: string; // 출석부 연결 여부
  onItemEffect?: (effectType: string, effectValue: any, itemIcon?: string, itemName?: string) => string | null; // 아이템 효과 적용 함수
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
}: ItemShopModalProps) {
  const [items, setItems] = useState<WatermelonItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedItem, setSelectedItem] = useState<WatermelonItem | null>(null);
  const [showPointSelection, setShowPointSelection] = useState(false);
  const [attendancePoints, setAttendancePoints] = useState<number | null>(null);
  const [loadingAttendancePoints, setLoadingAttendancePoints] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false);
  const [pendingPurchase, setPendingPurchase] = useState<{ item: WatermelonItem; pointType: "game" | "attendance" } | null>(null);

  // 모달이 열릴 때 body 스크롤 방지, 닫힐 때 복원
  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";

      loadItems();
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

  const loadItems = async () => {
    try {
      setLoading(true);
      setError("");
      const itemsData = await getItems();
      setItems(itemsData);
    } catch (err) {
      console.error("Failed to load items:", err);
      setError("아이템 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

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

  const handlePurchaseWithPoints = async (item: WatermelonItem, pointType: "game" | "attendance") => {
    if (!playerId) {
      setError("로그인이 필요합니다.");
      return;
    }

    if (pointType === "game" && (gamePoints ?? 0) < item.price) {
      setError("수박게임 포인트가 부족합니다.");
      return;
    }

    if (pointType === "attendance" && (attendancePoints ?? 0) < item.price) {
      setError("출석 포인트가 부족합니다.");
      return;
    }

    try {
      setPurchasing(true);
      setError("");

      const result = await purchaseWithPoints(playerId, item.id, pointType, 1);

      // 아이템 효과 적용 (extra_life 제외 - 게임 오버 시 자동 사용)
      let effectMessage: string | null = null;
      if (onItemEffect && result.item.effectType && result.item.effectType !== "extra_life") {
        effectMessage = onItemEffect(
          result.item.effectType, 
          result.item.effectValue,
          result.item.icon || item.icon || undefined,
          result.item.name || item.name || undefined
        );
      }

      if (onPurchaseSuccess) {
        onPurchaseSuccess();
      }

      // 토스트 메시지 (효과 메시지가 있으면 효과 메시지 우선, 없으면 구매 완료 메시지)
      if (onToast) {
        if (effectMessage) {
          onToast(`${item.icon || "🎁"} ${item.name} 구매 완료! ${effectMessage}`);
        } else if (result.item.effectType === "extra_life") {
          onToast(`${item.icon || "🎁"} ${item.name} 구매 완료! 게임 오버 시 자동으로 사용됩니다.`);
        } else {
          onToast(`${item.icon || "🎁"} ${item.name} 구매 완료!`);
        }
      }

      // 출석 포인트 갱신
      if (pointType === "attendance" && memberId) {
        await loadAttendancePoints();
      }

      setSelectedItem(null);
      setShowPointSelection(false);
      
      // 구매 완료 후 모달 즉시 닫기 (아이템 효과를 볼 수 있도록)
      onClose();
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
    setPendingPurchase(null);
    
    // 구매 실행 (구매 완료 후 모달이 자동으로 닫힘)
    await handlePurchaseWithPoints(itemToPurchase, pointTypeToUse);
  };

  const handleCancelPurchase = () => {
    setShowPurchaseConfirm(false);
    setPendingPurchase(null);
  };

  // 아이템 효과 설명 텍스트 생성
  const getItemEffectDescription = (item: WatermelonItem): string => {
    if (!item.effectType) return "";
    
    switch (item.effectType) {
      case "extra_life":
        return "게임 오버 시 자동으로 한 번 더 기회를 드립니다.";
      case "slow_gravity":
        return "과일이 천천히 떨어집니다 (30초간 지속).";
      case "bonus_score":
        return "획득하는 점수가 2배가 됩니다 (30초간 지속).";
      case "remove_fruits":
        if (item.effectValue?.position === "bottom") {
          return "화면 하단의 과일 3개가 즉시 제거됩니다.";
        } else {
          return "화면의 랜덤 과일 5개가 즉시 제거됩니다.";
        }
      case "lower_game_over_line":
        return "게임 오버 라인이 일시적으로 낮아집니다 (60초간 지속).";
      default:
        return "구매 즉시 효과가 적용됩니다.";
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
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
      }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border-2 border-white/50 bg-white/95 backdrop-blur-sm shadow-2xl animate-in zoom-in slide-in-from-bottom-2 duration-300 max-h-[90vh] flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          e.stopPropagation();
        }}
        style={{
          pointerEvents: "auto",
          touchAction: "pan-y",
          position: "relative",
          zIndex: 50,
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
                    <div className="font-bold text-xl text-gray-800">{selectedItem.name}</div>
                    <div className="text-lg font-bold text-purple-600">
                      {selectedItem.price.toLocaleString()}P
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
                    setPendingPurchase({ item: selectedItem, pointType: "game" });
                    setShowPurchaseConfirm(true);
                  }}
                  disabled={purchasing || (gamePoints ?? 0) < selectedItem.price}
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
                  {(gamePoints ?? 0) < selectedItem.price && (
                    <div className="mt-2 text-xs text-red-600">포인트가 부족합니다</div>
                  )}
                </button>

                {/* 출석 포인트 */}
                {memberId && attendancePoints !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setPendingPurchase({ item: selectedItem, pointType: "attendance" });
                      setShowPurchaseConfirm(true);
                    }}
                    disabled={purchasing || loadingAttendancePoints || attendancePoints < selectedItem.price}
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
                    {attendancePoints < selectedItem.price && (
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

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500">로딩 중...</div>
                </div>
              ) : error ? (
                <div className="rounded-lg bg-red-50 border-2 border-red-200 p-4 text-red-700 text-center">
                  {error}
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-12 text-gray-500">아이템이 없습니다.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border-2 border-purple-200 bg-gradient-to-br from-white to-purple-50/30 p-4 hover:shadow-lg transition-all duration-200"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-4xl flex-shrink-0">{item.icon || "🎁"}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-lg text-gray-800 mb-1">{item.name}</div>
                          {item.description && (
                            <div className="text-sm text-gray-600 mb-3">{item.description}</div>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="text-lg font-bold text-purple-600">
                              {item.price.toLocaleString()}P
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePurchase(item);
                              }}
                              disabled={!playerId}
                              className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-sm hover:from-purple-600 hover:to-pink-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                            >
                              구매하기
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 구매 확인 모달 */}
      {showPurchaseConfirm && pendingPurchase && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="구매 확인"
        >
          <div
            className="w-full max-w-md rounded-2xl border-2 border-white/50 bg-white/95 backdrop-blur-sm shadow-2xl animate-in zoom-in slide-in-from-bottom-2 duration-300"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-4xl">{pendingPurchase.item.icon || "🎁"}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800 mb-1">{pendingPurchase.item.name}</h3>
                  <div className="text-lg font-bold text-purple-600">
                    {pendingPurchase.item.price.toLocaleString()}P
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

                {pendingPurchase.item.description && (
                  <div className="text-sm text-gray-600 mb-2">
                    {pendingPurchase.item.description}
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
    </div>
  );
}
