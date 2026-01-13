// 토스페이먼츠 결제위젯 컴포넌트

"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { requestPayment, approvePayment } from "../api";

type PaymentWidgetProps = {
  playerId: string;
  itemId: string;
  itemName: string;
  amount: number;
  onSuccess: () => void;
  onError: (error: string) => void;
  onClose: () => void;
};

export function PaymentWidget({
  playerId,
  itemId,
  itemName,
  amount,
  onSuccess,
  onError,
  onClose,
}: PaymentWidgetProps) {
  const [loading, setLoading] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);
  const paymentWidgetRef = useRef<any>(null);
  const agreementRef = useRef<HTMLDivElement>(null);
  const paymentMethodsRef = useRef<HTMLDivElement>(null);
  
  // 고유 ID 생성 (컴포넌트 마운트 시 한 번만 생성, useState로 보장)
  // useRef를 사용하여 컴포넌트 인스턴스마다 고유한 ID를 보장하되, 재렌더링 시에도 동일하게 유지
  const instanceIdRef = useRef<string>(`${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [paymentMethodsId] = useState(() => `payment-methods-${playerId}-${instanceIdRef.current}`);
  const [agreementId] = useState(() => `agreement-${playerId}-${instanceIdRef.current}`);

  // ref가 준비되었는지 확인하는 useEffect
  useEffect(() => {
    console.log("[PaymentWidget] Component mounted, checking refs...");
  }, []);

  // onError를 ref로 저장하여 dependency 문제 해결
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // 결제위젯 초기화 useEffect
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let isMounted = true;
    let isInitializing = false; // 초기화 중 플래그 추가

    const initializeWidget = async () => {
      if (!isMounted || isInitializing) return;
      isInitializing = true;

      try {
        console.log("[PaymentWidget] Initializing widget...");
        // 환경 변수에서 클라이언트 키 가져오기 (NEXT_PUBLIC_ 접두사 필요)
        const clientKey = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY || "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";
        console.log("[PaymentWidget] Loading TossPayments with clientKey:", clientKey.substring(0, 20) + "...");
        const tossPayments = await loadTossPayments(clientKey);
        console.log("[PaymentWidget] TossPayments loaded successfully");

        const widget = tossPayments.widgets({
          customerKey: playerId,
        });

        // 결제 금액 설정 (Amount 타입: { value: number, currency: string } 형태)
        await widget.setAmount({
          value: amount,
          currency: "KRW",
        });

        // DOM 요소가 확실히 존재하는지 다시 확인
        const paymentMethodsEl = document.getElementById(paymentMethodsId);
        const agreementEl = document.getElementById(agreementId);
        
        if (!paymentMethodsEl || !agreementEl) {
          const allIds = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
          throw new Error(
            `DOM elements not found: paymentMethodsEl=${!!paymentMethodsEl}, agreementEl=${!!agreementEl}. ` +
            `Looking for: ${paymentMethodsId}, ${agreementId}. ` +
            `Available IDs: ${allIds.filter(id => id.includes('payment') || id.includes('agreement')).join(', ')}`
          );
        }

        // DOM이 준비될 때까지 대기
        await new Promise((resolve) => setTimeout(resolve, 300));

        // 결제 UI 렌더링 (CSS selector 사용)
        console.log("[PaymentWidget] Rendering payment methods to:", `#${paymentMethodsId}`);
        await widget.renderPaymentMethods({
          selector: `#${paymentMethodsId}`,
        });
        console.log("[PaymentWidget] Payment methods rendered successfully");

        // 이용약관 UI 렌더링 (CSS selector 사용)
        console.log("[PaymentWidget] Rendering agreement to:", `#${agreementId}`);
        await widget.renderAgreement({
          selector: `#${agreementId}`,
        });
        console.log("[PaymentWidget] Agreement rendered successfully");

        if (isMounted) {
          paymentWidgetRef.current = widget;
          setWidgetReady(true);
          console.log("[PaymentWidget] Widget ready!");
        }
      } catch (error) {
        console.error("[PaymentWidget] Failed to initialize payment widget:", error);
        if (isMounted) {
          onErrorRef.current(`결제위젯 초기화에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`);
        }
      } finally {
        isInitializing = false;
      }
    };

    // DOM이 준비될 때까지 대기 후 초기화
    let retryCount = 0;
    const maxRetries = 30; // 최대 3초 대기 (30 * 100ms)
    
    const checkAndInitialize = () => {
      if (!isMounted || isInitializing) {
        return; // 이미 초기화 중이면 중단
      }
      
      // ref를 통해 직접 확인 (더 안정적)
      const paymentMethodsEl = paymentMethodsRef.current || document.getElementById(paymentMethodsId);
      const agreementEl = agreementRef.current || document.getElementById(agreementId);
      
      if (paymentMethodsEl && agreementEl) {
        // ID가 일치하는지 확인
        const paymentMethodsIdMatch = paymentMethodsEl.id === paymentMethodsId;
        const agreementIdMatch = agreementEl.id === agreementId;
        
        if (paymentMethodsIdMatch && agreementIdMatch) {
          console.log("[PaymentWidget] DOM elements found, initializing...", {
            paymentMethodsId,
            agreementId,
            paymentMethodsElId: paymentMethodsEl.id,
            agreementElId: agreementEl.id,
          });
          initializeWidget();
        } else {
          console.warn("[PaymentWidget] DOM elements found but IDs don't match", {
            expectedPaymentMethodsId: paymentMethodsId,
            actualPaymentMethodsId: paymentMethodsEl.id,
            expectedAgreementId: agreementId,
            actualAgreementId: agreementEl.id,
          });
          retryCount++;
          if (retryCount < maxRetries) {
            timeoutId = setTimeout(checkAndInitialize, 100);
          } else {
          if (isMounted) {
            onErrorRef.current("결제위젯을 초기화할 수 없습니다. DOM 요소 ID가 일치하지 않습니다.");
          }
          }
        }
      } else {
        retryCount++;
        if (retryCount < maxRetries) {
          // 무한 로그 방지: 10회마다만 로그 출력
          if (retryCount % 10 === 0 || retryCount === 1) {
            console.log("[PaymentWidget] DOM elements not ready, retrying...", {
              retryCount,
              maxRetries,
              paymentMethodsId,
              agreementId,
              paymentMethodsEl: !!paymentMethodsEl,
              agreementEl: !!agreementEl,
              paymentMethodsRefCurrent: !!paymentMethodsRef.current,
              agreementRefCurrent: !!agreementRef.current,
            });
          }
          timeoutId = setTimeout(checkAndInitialize, 100);
        } else {
          console.error("[PaymentWidget] Failed to find DOM elements after max retries", {
            paymentMethodsId,
            agreementId,
            allElements: Array.from(document.querySelectorAll('[id^="payment-methods"], [id^="agreement"]')).map(el => el.id),
          });
          if (isMounted) {
            onErrorRef.current("결제위젯을 초기화할 수 없습니다. DOM 요소를 찾을 수 없습니다.");
          }
        }
      }
    };
    
    // 초기 체크 시작 (약간의 지연을 두어 DOM이 확실히 렌더링되도록)
    timeoutId = setTimeout(checkAndInitialize, 500);

    return () => {
      isMounted = false;
      isInitializing = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (paymentWidgetRef.current) {
        try {
          paymentWidgetRef.current.destroy();
        } catch (e) {
          console.error("[PaymentWidget] Error destroying widget:", e);
        }
      }
    };
  }, [playerId, amount, paymentMethodsId, agreementId]); // onError 제거 (useRef로 처리)

  const handlePayment = async () => {
    if (!paymentWidgetRef.current || loading) return;

    try {
      setLoading(true);

      // 1. 주문 생성 (서버에 임시 저장)
      const { orderId, amount: orderAmount } = await requestPayment(playerId, itemId, 1);

      // 2. 결제 요청
      const successUrl = `${window.location.origin}/watermelon/payment/success`;
      const failUrl = `${window.location.origin}/watermelon/payment/fail`;

      await paymentWidgetRef.current.requestPayment({
        orderId,
        orderName: itemName,
        successUrl,
        failUrl,
        customerEmail: undefined,
        customerName: undefined,
        customerMobilePhone: undefined,
      });
    } catch (error: any) {
      console.error("Payment request error:", error);
      const errorMessage = error.message || "결제 요청에 실패했습니다.";
      // "취소되었습니다" 또는 "cancel" 관련 오류인지 확인
      if (errorMessage.includes("취소") || errorMessage.includes("cancel") || errorMessage.includes("Cancel")) {
        onErrorRef.current("결제가 취소되었습니다.");
      } else {
        onErrorRef.current(errorMessage);
      }
      setLoading(false);
    }
  };

  // ref가 설정되었는지 확인하는 useEffect
  useEffect(() => {
    if (paymentMethodsRef.current && agreementRef.current) {
      console.log("[PaymentWidget] Refs are set:", {
        paymentMethodsId,
        agreementId,
        paymentMethodsRefId: paymentMethodsRef.current.id,
        agreementRefId: agreementRef.current.id,
      });
    }
  }, [paymentMethodsId, agreementId]);

  return (
    <div 
      className="p-6 space-y-4"
      style={{
        pointerEvents: 'auto',
        touchAction: 'manipulation', // 더블탭 줌 방지, 터치 이벤트 최적화
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {!widgetReady && (
        <div className="text-center text-gray-500 py-4">
          <div className="animate-pulse">결제위젯을 불러오는 중...</div>
        </div>
      )}
      
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">결제 수단 선택</h3>
        <div 
          id={paymentMethodsId} 
          ref={paymentMethodsRef} 
          className="min-h-[200px] border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50"
          style={{
            pointerEvents: 'auto',
            touchAction: 'manipulation', // 터치 이벤트 최적화
            position: 'relative',
            zIndex: 2, // 위젯이 다른 요소 위에 표시되도록
            WebkitOverflowScrolling: 'touch',
            overflow: 'visible',
            isolation: 'isolate', // 새로운 stacking context 생성
          }}
        >
          {!widgetReady && (
            <div className="flex items-center justify-center h-full text-sm text-gray-400" style={{ pointerEvents: 'none' }}>
              결제 수단 UI 로딩 중...
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">이용약관</h3>
        <div 
          id={agreementId} 
          ref={agreementRef} 
          className="min-h-[100px] border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50"
          style={{
            pointerEvents: 'auto',
            touchAction: 'manipulation', // 터치 이벤트 최적화
            position: 'relative',
            zIndex: 2, // 위젯이 다른 요소 위에 표시되도록
            WebkitOverflowScrolling: 'touch',
            overflow: 'visible',
            isolation: 'isolate', // 새로운 stacking context 생성
          }}
        >
          {!widgetReady && (
            <div className="flex items-center justify-center h-full text-sm text-gray-400" style={{ pointerEvents: 'none' }}>
              이용약관 UI 로딩 중...
            </div>
          )}
        </div>
      </div>

      {widgetReady && (
        <div className="flex gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            onTouchStart={(e) => e.stopPropagation()}
            className="flex-1 px-4 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
            style={{
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handlePayment}
            onTouchStart={(e) => e.stopPropagation()}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {loading ? "처리 중..." : `${amount.toLocaleString()}원 결제하기`}
          </button>
        </div>
      )}
    </div>
  );
}
