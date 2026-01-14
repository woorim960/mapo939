// 공유 Modal 컴포넌트

import React, { useEffect, useState } from "react";

type ModalProps = {
  children: React.ReactNode;
  onClose: () => void;
};

export function Modal({ children, onClose }: ModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 모달이 마운트된 후 애니메이션 시작
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      setIsVisible(false);
      setTimeout(onClose, 200);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setIsVisible(false);
      setTimeout(onClose, 200);
    }
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsVisible(false);
        setTimeout(onClose, 200);
      }
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [onClose]);

  return (
    <div 
      className="fixed z-[100] flex items-center justify-center p-4" 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        // 모바일 safe area 적용
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
    >
      {/* Backdrop */}
      <div
        className={`absolute bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleBackdropClick}
        aria-label="close overlay"
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{ 
          position: 'absolute', 
          // 모바일 safe area 적용
          top: 'env(safe-area-inset-top, 0)',
          bottom: 'env(safe-area-inset-bottom, 0)',
          left: 'env(safe-area-inset-left, 0)',
          right: 'env(safe-area-inset-right, 0)',
        }}
      />
      
      {/* Modal Content */}
      <div
        className={`relative w-full max-w-2xl overflow-y-auto rounded-3xl bg-gradient-to-br from-white via-white to-neutral-50/80 backdrop-blur-md shadow-2xl border-2 border-neutral-200/50 p-4 sm:p-6 md:p-8 transition-all duration-300 ${
          isVisible
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4"
        }`}
        style={{ 
          position: 'relative',
          zIndex: 101,
          margin: 'auto',
          // 모바일 safe area를 고려한 max-height 계산
          maxHeight: 'calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 2rem)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
