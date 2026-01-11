// Toast 컴포넌트

import { useEffect, useState } from "react";

type ToastProps = {
  message: string;
  onClose: () => void;
  duration?: number;
  variant?: "success" | "error" | "info";
};

export function Toast({ message, onClose, duration = 1000, variant = "success" }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      // duration 후에 토스트를 숨김
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
      }, duration);
      
      // duration + 300ms 후에 onClose 호출 (fade-out 애니메이션 시간 고려)
      const closeTimer = setTimeout(() => {
        onClose();
      }, duration + 300);
      
      return () => {
        clearTimeout(hideTimer);
        clearTimeout(closeTimer);
      };
    } else {
      setIsVisible(false);
    }
  }, [message, onClose, duration]);

  if (!message || !isVisible) return null;

  const isError = variant === "error";
  const borderColor = isError ? "border-red-300" : "border-emerald-300";
  const bgGradient = isError 
    ? "bg-gradient-to-r from-red-50 via-rose-50 to-red-50" 
    : "bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50";
  const iconBg = isError ? "bg-red-500" : "bg-emerald-500";
  const textColor = isError ? "text-red-800" : "text-emerald-800";
  const buttonColor = isError 
    ? "text-red-600 hover:text-red-800 hover:bg-red-100" 
    : "text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100";
  const icon = isError ? (
    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ) : (
    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );

  return (
    <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[60] transition-all duration-300 ${
      isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
    }`}>
      <div className={`rounded-2xl border-2 ${borderColor} ${bgGradient} shadow-2xl px-5 py-4 flex items-center gap-4 min-w-[300px] max-w-md backdrop-blur-sm`}>
        <div className={`flex-shrink-0 h-8 w-8 rounded-full ${iconBg} flex items-center justify-center shadow-lg`}>
          {icon}
        </div>
        <div className={`flex-1 text-sm font-bold ${textColor}`}>{message}</div>
        <button
          className={`flex-shrink-0 h-6 w-6 rounded-full ${buttonColor} transition-all duration-200 flex items-center justify-center`}
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          aria-label="닫기"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
