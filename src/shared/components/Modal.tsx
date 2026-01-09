// 공유 Modal 컴포넌트

import React from "react";

type ModalProps = {
  children: React.ReactNode;
  onClose: () => void;
};

export function Modal({ children, onClose }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50">
      {/* overlay를 button이 아니라 div로 (모바일에서 포커스/중첩 이슈 예방) */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="close overlay"
        role="button"
        tabIndex={0}
      />
      <div className="absolute left-1/2 top-1/2 w-[min(920px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-4 shadow-xl md:p-6">
        {children}
      </div>
    </div>
  );
}
