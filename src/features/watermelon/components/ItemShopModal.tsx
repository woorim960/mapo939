// 아이템 상점 모달 컴포넌트

"use client";

import { useState, useEffect } from "react";
import { getItems, type WatermelonItem } from "../api";
import { PaymentWidget } from "./PaymentWidget";

type ItemShopModalProps = {
  open: boolean;
  onClose: () => void;
  onPurchaseSuccess?: () => void;
  playerId?: string;
};

export function ItemShopModal({ open, onClose, onPurchaseSuccess, playerId }: ItemShopModalProps) {
  const [items, setItems] = useState<WatermelonItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedItem, setSelectedItem] = useState<WatermelonItem | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    if (open) {
      loadItems();
      setSelectedItem(null);
      setShowPayment(false);
      setError("");
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
    if (!playerId) {
      setError("로그인이 필요합니다.");
      return;
    }
    setSelectedItem(item);
    setShowPayment(true);
    setError("");
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
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200"
      style={{ height: '100dvh' }}
      role="dialog"
      aria-modal="true"
      aria-label="아이템 상점"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border-2 border-white/50 bg-white/95 backdrop-blur-sm shadow-2xl animate-in zoom-in slide-in-from-bottom-2 duration-300 flex flex-col"
        style={{ maxHeight: 'calc(100dvh - 1rem)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-purple-200/50 bg-gradient-to-r from-purple-50 to-pink-50 px-4 sm:px-5 py-3 sm:py-4 rounded-t-2xl flex-shrink-0">
          <div className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
            <span className="text-2xl">🛒</span>
            <span>아이템 상점</span>
          </div>
          <button
            type="button"
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/50 transition-colors"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <div className="px-4 sm:px-5 py-4 sm:py-6 overflow-y-auto flex-1 min-h-0">
          {showPayment && selectedItem && playerId ? (
            <div>
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
                playerId={playerId}
                itemId={selectedItem.id}
                itemName={selectedItem.name}
                amount={selectedItem.price}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onClose={() => {
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
                              onClick={() => handlePurchase(item)}
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
