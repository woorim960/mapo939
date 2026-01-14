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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleBackdropClick}
        aria-label="close overlay"
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      
      {/* Modal Content */}
      <div
        className={`relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-gradient-to-br from-white via-white to-neutral-50/80 backdrop-blur-md shadow-2xl border-2 border-neutral-200/50 p-6 md:p-8 transition-all duration-300 ${
          isVisible
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4"
        }`}
        style={{ 
          position: 'relative',
          zIndex: 101,
          margin: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
