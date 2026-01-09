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
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className="rounded-xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-xl px-4 py-3 flex items-center gap-3 min-w-[280px] max-w-md">
        <span className="text-xl flex-shrink-0">✅</span>
        <div className="flex-1 text-sm font-semibold text-emerald-800">{message}</div>
        <button
          className="flex-shrink-0 text-emerald-600 hover:text-emerald-800 transition-colors"
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          aria-label="닫기"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
