// 토스페이먼츠 결제위젯 컴포넌트

"use client";

import { useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    if (!paymentMethodsRef.current || !agreementRef.current) return;

    const initializeWidget = async () => {
      try {
        // 환경 변수에서 클라이언트 키 가져오기 (NEXT_PUBLIC_ 접두사 필요)
        // .env.local에 NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY=test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm 추가 필요
        const clientKey = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY || "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";
        const tossPayments = await loadTossPayments(clientKey);

        const widget = tossPayments.widgets({
          customerKey: playerId,
        });

        // 결제 금액 설정
        widget.setAmount({
          value: amount,
          currency: "KRW",
        });

        // 결제 UI 렌더링
        await widget.renderPaymentMethods({
          selector: "#payment-methods-widget",
        });

        // 이용약관 UI 렌더링
        await widget.renderAgreement({
          selector: "#agreement-widget",
        });

        paymentWidgetRef.current = widget;
        setWidgetReady(true);
      } catch (error) {
        console.error("Failed to initialize payment widget:", error);
        onError("결제위젯 초기화에 실패했습니다.");
      }
    };

    initializeWidget();

    return () => {
      if (paymentWidgetRef.current) {
        paymentWidgetRef.current.destroy();
      }
    };
  }, [playerId, amount, onError]);

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
      onError(error.message || "결제 요청에 실패했습니다.");
      setLoading(false);
    }
  };

  if (!widgetReady) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">결제위젯을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">결제 수단 선택</h3>
        <div id="payment-methods-widget" ref={paymentMethodsRef} className="min-h-[200px]"></div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">이용약관</h3>
        <div id="agreement-widget" ref={agreementRef} className="min-h-[100px]"></div>
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handlePayment}
          disabled={loading}
          className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? "처리 중..." : `${amount.toLocaleString()}원 결제하기`}
        </button>
      </div>
    </div>
  );
}
