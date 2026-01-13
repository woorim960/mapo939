// 결제 성공 페이지

"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { approvePayment } from "@/features/watermelon/api";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const processPayment = async () => {
      try {
        const paymentKey = searchParams.get("paymentKey");
        const orderId = searchParams.get("orderId");
        const amount = searchParams.get("amount");

        if (!paymentKey || !orderId || !amount) {
          setStatus("error");
          setMessage("결제 정보가 올바르지 않습니다.");
          return;
        }

        // 클라이언트에서 amount 검증
        const amountNum = parseInt(amount, 10);
        if (isNaN(amountNum) || amountNum <= 0) {
          setStatus("error");
          setMessage("결제 금액이 올바르지 않습니다.");
          return;
        }

        // 서버로 결제 승인 요청
        const result = await approvePayment(paymentKey, orderId, amountNum);

        if (result.success) {
          setStatus("success");
          setMessage("결제가 완료되었습니다!");
          
          // 3초 후 게임 페이지로 이동
          setTimeout(() => {
            router.push("/watermelon");
          }, 3000);
        } else {
          setStatus("error");
          setMessage("결제 승인에 실패했습니다.");
        }
      } catch (error: any) {
        console.error("Payment processing error:", error);
        setStatus("error");
        setMessage(error.message || "결제 처리 중 오류가 발생했습니다.");
      }
    };

    processPayment();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4">
      <div className="w-full max-w-md rounded-2xl border-2 border-white/50 bg-white/95 backdrop-blur-sm shadow-2xl p-8 text-center">
        {status === "loading" && (
          <>
            <div className="text-6xl mb-4">⏳</div>
            <div className="text-xl font-bold text-gray-800 mb-2">결제 처리 중...</div>
            <div className="text-sm text-gray-600">잠시만 기다려주세요.</div>
          </>
        )}
        {status === "success" && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <div className="text-xl font-bold text-green-600 mb-2">결제 완료!</div>
            <div className="text-sm text-gray-600 mb-4">{message}</div>
            <div className="text-xs text-gray-500">잠시 후 게임 페이지로 이동합니다...</div>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <div className="text-xl font-bold text-red-600 mb-2">결제 실패</div>
            <div className="text-sm text-gray-600 mb-4">{message}</div>
            <button
              onClick={() => router.push("/watermelon")}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:from-green-600 hover:to-emerald-600 transition-all"
            >
              게임으로 돌아가기
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4">
        <div className="w-full max-w-md rounded-2xl border-2 border-white/50 bg-white/95 backdrop-blur-sm shadow-2xl p-8 text-center">
          <div className="text-6xl mb-4">⏳</div>
          <div className="text-xl font-bold text-gray-800 mb-2">로딩 중...</div>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
