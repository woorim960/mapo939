// 아이템 상점 모달 컴포넌트

"use client";

import { useState, useEffect } from "react";
import { getItems, type WatermelonItem } from "../api";
import { PaymentWidget } from "./PaymentWidget";

type ItemShopModalProps = {
  open: boolean;
  onClose: () => void;
  onPurchaseSuccess?: () => void;
  onToast?: (message: string) => void;
  playerId?: string;
};

export function ItemShopModal({ open, onClose, onPurchaseSuccess, onToast, playerId }: ItemShopModalProps) {
  const [items, setItems] = useState<WatermelonItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedItem, setSelectedItem] = useState<WatermelonItem | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  // 모달이 열릴 때 body 스크롤 방지, 닫힐 때 복원
  useEffect(() => {
    if (open) {
      // 모달 열릴 때 body 스크롤 방지
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      document.body.style.overflow = 'hidden';
      // iOS Safari에서 스크롤 방지를 위한 추가 설정
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      
      console.log("[ItemShopModal] Modal opened, resetting state");
      loadItems();
      setSelectedItem(null);
      setShowPayment(false);
      setError("");

      return () => {
        // 모달 닫힐 때 body 스크롤 복원
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.width = '';
      };
    } else {
      console.log("[ItemShopModal] Modal closed");
    }
  }, [open]);

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

  const handlePurchase = (item: WatermelonItem) => {
    console.log("[ItemShopModal] handlePurchase called", { item, playerId });
    if (!playerId) {
      setError("로그인이 필요합니다.");
      return;
    }
    console.log("[ItemShopModal] Setting selectedItem and showPayment");
    setSelectedItem(item);
    setShowPayment(true);
    setError("");
    console.log("[ItemShopModal] State updated:", { 
      selectedItem: item.id, 
      showPayment: true,
      playerId 
    });
  };

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    setSelectedItem(null);
    if (onPurchaseSuccess) {
      onPurchaseSuccess();
    }
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
    // "취소되었습니다" 오류가 포함된 경우 토스트 메시지 표시
    if (errorMessage.includes("취소") || errorMessage.includes("cancel") || errorMessage.includes("Cancel")) {
      if (onToast) {
        onToast("결제가 취소되었습니다.");
      }
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
        // 배경 클릭 시에만 모달 닫기 (결제 화면에서는 닫지 않음)
        if (e.target === e.currentTarget && !showPayment) {
          onClose();
        }
      }}
      onTouchStart={(e) => {
        // 배경 터치 시에만 모달 닫기 (결제 화면에서는 닫지 않음)
        if (e.target === e.currentTarget && !showPayment) {
          onClose();
        }
      }}
      style={{
        touchAction: 'none', // 배경에서는 터치 이벤트 차단
      }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border-2 border-white/50 bg-white/95 backdrop-blur-sm shadow-2xl animate-in zoom-in slide-in-from-bottom-2 duration-300 max-h-[90vh] flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          e.stopPropagation();
        }}
        style={{
          pointerEvents: 'auto',
          touchAction: 'pan-y', // 세로 스크롤만 허용
          position: 'relative',
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
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            ×
          </button>
        </div>

        <div 
          className="px-5 py-6 overflow-y-auto flex-1"
          style={{
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
          }}
        >
          {showPayment && selectedItem && playerId ? (
            <div
              style={{
                pointerEvents: 'auto',
                touchAction: 'auto',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <div className="mb-4 pb-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{selectedItem.icon || "🎁"}</div>
                  <div>
                    <div className="font-bold text-lg text-gray-800">{selectedItem.name}</div>
                    <div className="text-lg font-bold text-purple-600">
                      {selectedItem.price.toLocaleString()}원
                    </div>
                  </div>
                </div>
              </div>
              {error && (
                <div className="mb-4 rounded-lg bg-red-50 border-2 border-red-200 p-3 text-red-700 text-sm">
                  {error}
                </div>
              )}
              <PaymentWidget
                key={`payment-${selectedItem.id}`}
                playerId={playerId}
                itemId={selectedItem.id}
                itemName={selectedItem.name}
                amount={selectedItem.price}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onClose={() => {
                  console.log("[ItemShopModal] PaymentWidget onClose called");
                  setShowPayment(false);
                  setSelectedItem(null);
                }}
              />
            </div>
          ) : (
            <>
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
                              {item.price.toLocaleString()}원
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log("[ItemShopModal] 구매하기 버튼 클릭됨", { item, playerId });
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
    </div>
  );
}
