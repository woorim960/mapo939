// 닉네임 입력 모달 컴포넌트

"use client";

import { useState, useEffect } from "react";

type NicknameModalProps = {
  open: boolean;
  onClose?: () => void;
  onSubmit: (nickname: string) => void;
  initialNickname?: string;
};

export function NicknameModal({ open, onSubmit, initialNickname = "" }: NicknameModalProps) {
  const [nickname, setNickname] = useState(initialNickname);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setNickname(initialNickname);
      setError("");
    }
  }, [open, initialNickname]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    
    if (!trimmed) {
      setError("닉네임을 입력해주세요.");
      return;
    }
    
    if (trimmed.length > 20) {
      setError("닉네임은 20자 이하로 입력해주세요.");
      return;
    }
    
    setError("");
    onSubmit(trimmed);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="닉네임 입력"
    >
      <div
        className="w-full max-w-md rounded-2xl border-2 border-white/50 bg-white/95 backdrop-blur-sm shadow-2xl animate-in zoom-in slide-in-from-bottom-2 duration-300"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-green-200/50 bg-gradient-to-r from-green-50 to-emerald-50 px-5 py-4 rounded-t-2xl">
          <div className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent flex items-center gap-2">
            <span className="text-2xl">🍉</span>
            <span>닉네임 입력</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-6 space-y-4">
          <div>
            <label htmlFor="nickname" className="block text-sm font-semibold text-gray-700 mb-2">
              닉네임
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                if (error) setError("");
              }}
              placeholder="닉네임을 입력하세요"
              className={`w-full rounded-xl border-2 px-4 py-3 text-base font-medium outline-none focus:ring-4 transition-all ${
                error
                  ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                  : "border-green-300 focus:border-green-500 focus:ring-green-200"
              }`}
              autoFocus
              maxLength={20}
            />
            {error && (
              <div className="mt-2 p-2 rounded-lg bg-red-50 border-2 border-red-200 flex items-center gap-2 animate-in slide-in-from-top-1 duration-200">
                <span className="text-xl">⚠️</span>
                <div className="text-sm font-semibold text-red-700">{error}</div>
              </div>
            )}
            <div className="mt-2 text-xs text-gray-500">
              닉네임은 게임 통계에 사용되며, 최대 20자까지 입력 가능합니다.
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3 text-base font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            시작하기
          </button>
        </form>
      </div>
    </div>
  );
}
