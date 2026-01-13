// 결제 실패 페이지

"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function PaymentFailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const code = searchParams.get("code");
  const message = searchParams.get("message");
  const orderId = searchParams.get("orderId");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4">
      <div className="w-full max-w-md rounded-2xl border-2 border-white/50 bg-white/95 backdrop-blur-sm shadow-2xl p-8 text-center">
        <div className="text-6xl mb-4">❌</div>
        <div className="text-xl font-bold text-red-600 mb-2">결제 실패</div>
        {message && (
          <div className="text-sm text-gray-600 mb-2">{message}</div>
        )}
        {code && (
          <div className="text-xs text-gray-500 mb-4">에러 코드: {code}</div>
        )}
        {orderId && (
          <div className="text-xs text-gray-400 mb-4">주문 ID: {orderId}</div>
        )}
        <button
          onClick={() => router.push("/watermelon")}
          className="px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:from-green-600 hover:to-emerald-600 transition-all"
        >
          게임으로 돌아가기
        </button>
      </div>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4">
        <div className="w-full max-w-md rounded-2xl border-2 border-white/50 bg-white/95 backdrop-blur-sm shadow-2xl p-8 text-center">
          <div className="text-6xl mb-4">❌</div>
          <div className="text-xl font-bold text-red-600 mb-2">결제 실패</div>
        </div>
      </div>
    }>
      <PaymentFailContent />
    </Suspense>
  );
}
