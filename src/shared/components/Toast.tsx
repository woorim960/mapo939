// Toast 컴포넌트

import { useEffect, useState } from "react";

type ToastProps = {
  message: string;
  onClose: () => void;
};

export function Toast({ message, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message || !isVisible) return null;

  return (
    <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[60] transition-all duration-300 ${
      isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
    }`}>
      <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 shadow-2xl px-5 py-4 flex items-center gap-4 min-w-[300px] max-w-md backdrop-blur-sm">
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="flex-1 text-sm font-bold text-emerald-800">{message}</div>
        <button
          className="flex-shrink-0 h-6 w-6 rounded-full text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 transition-all duration-200 flex items-center justify-center"
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
