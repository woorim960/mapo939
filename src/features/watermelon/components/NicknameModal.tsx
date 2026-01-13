// 닉네임 입력 모달 컴포넌트

"use client";

import { useState, useEffect } from "react";

type NicknameModalProps = {
  open: boolean;
  onClose?: () => void;
  onSubmit: (nickname: string, password: string) => void;
  initialNickname?: string;
  externalError?: string; // 외부에서 전달받은 에러 메시지
};

export function NicknameModal({ open, onSubmit, initialNickname = "", externalError }: NicknameModalProps) {
  const [nickname, setNickname] = useState(initialNickname);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setNickname(initialNickname);
      setPassword("");
      setError("");
    }
  }, [open, initialNickname]);

  // 외부에서 전달받은 에러 메시지 표시
  useEffect(() => {
    if (externalError) {
      setError(externalError);
    }
  }, [externalError]);

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

    if (!password) {
      setError("패스워드를 입력해주세요.");
      return;
    }

    if (password.length < 4) {
      setError("패스워드는 4자 이상 입력해주세요.");
      return;
    }
    
    setError("");
    onSubmit(trimmed, password);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200"
      style={{ height: '100dvh' }}
      role="dialog"
      aria-modal="true"
      aria-label="닉네임 입력"
    >
      <div
        className="w-full max-w-md rounded-2xl border-2 border-white/50 bg-white/95 backdrop-blur-sm shadow-2xl animate-in zoom-in slide-in-from-bottom-2 duration-300 flex flex-col"
        style={{ maxHeight: 'calc(100dvh - 1rem)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-green-200/50 bg-gradient-to-r from-green-50 to-emerald-50 px-4 sm:px-5 py-3 sm:py-4 rounded-t-2xl flex-shrink-0">
          <div className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent flex items-center gap-2">
            <span className="text-2xl">🍉</span>
            <span>닉네임 입력</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-4 sm:px-5 py-4 sm:py-6 space-y-3 sm:space-y-4 overflow-y-auto flex-1 min-h-0">
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
                if (externalError) setError(""); // 외부 에러도 입력 시 초기화
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
            {(error || externalError) && (
              <div className="mt-2 p-2 rounded-lg bg-red-50 border-2 border-red-200 flex items-center gap-2 animate-in slide-in-from-top-1 duration-200">
                <span className="text-xl">⚠️</span>
                <div className="text-sm font-semibold text-red-700">{error || externalError}</div>
              </div>
            )}
            <div className="mt-2 text-xs text-gray-500">
              닉네임은 게임 통계에 사용되며, 최대 20자까지 입력 가능합니다.
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              패스워드
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
                if (externalError) setError(""); // 외부 에러도 입력 시 초기화
              }}
              placeholder="패스워드를 입력하세요"
              className={`w-full rounded-xl border-2 px-4 py-3 text-base font-medium outline-none focus:ring-4 transition-all ${
                error || externalError
                  ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                  : "border-green-300 focus:border-green-500 focus:ring-green-200"
              }`}
            />
            <div className="mt-2 text-xs text-gray-500">
              패스워드는 4자 이상 입력해주세요. 중복된 닉네임이 있으면 패스워드로 본인을 확인합니다.
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 border-2 border-blue-200 p-3 space-y-1.5">
            <div className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
              <span>ℹ️</span>
              <span>안내</span>
            </div>
            <div className="text-xs text-blue-700 space-y-0.5">
              <div>• 중복된 닉네임이 없으면 자동으로 회원가입됩니다.</div>
              <div>• 중복된 닉네임이 있으면 패스워드로 본인 확인 후 기존 계정으로 플레이합니다.</div>
              <div>• 패스워드가 일치하지 않으면 해당 닉네임으로 플레이할 수 없습니다.</div>
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
