// 관리자 로그인 모달 컴포넌트

import { useRef, useState, useEffect } from "react";
import { Modal } from "@/shared/components/Modal";
import { ApiError } from "@/shared/utils/error";
import { login } from "../api/admin";

type LoginModalProps = {
  open: boolean;
  initialError?: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function LoginModal({ open, initialError, onClose, onSuccess }: LoginModalProps) {
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginErr, setLoginErr] = useState<string | null>(initialError ?? null);
  const usernameRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setLoginErr(initialError ?? null);
  }, [initialError]);

  useEffect(() => {
    if (open && usernameRef.current) {
      setTimeout(() => usernameRef.current?.focus(), 100);
    }
  }, [open]);

  async function doLogin() {
    if (loginLoading) return;

    const username = usernameRef.current?.value?.trim() ?? "";
    const password = passwordRef.current?.value ?? "";

    if (!username || !password) {
      setLoginErr("아이디/비밀번호를 입력하세요.");
      return;
    }

    setLoginLoading(true);
    setLoginErr(null);
    try {
      await login(username, password);
      onSuccess();
      onClose();
      setLoginErr(null);
      if (usernameRef.current) usernameRef.current.value = "";
      if (passwordRef.current) passwordRef.current.value = "";
    } catch (err) {
      if (err instanceof ApiError) {
        setLoginErr(err.message);
      } else {
        setLoginErr("로그인 실패");
      }
    } finally {
      setLoginLoading(false);
    }
  }

  if (!open) return null;

  return (
    <Modal onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
            <span>🔐</span>
            <span>관리자 로그인</span>
          </div>
          <button
            type="button"
            className="text-xs px-2 py-1 rounded-md text-gray-600 hover:bg-white/50 hover:text-gray-800 transition-colors"
            onClick={onClose}
            aria-label="닫기"
          >
            ✕ 닫기
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">아이디</label>
            <input
              ref={usernameRef}
              className="w-full rounded-xl border-2 border-blue-300 px-4 py-3 text-base font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all disabled:bg-gray-100 disabled:border-gray-300"
              placeholder="관리자 아이디를 입력하세요"
              autoComplete="username"
              disabled={loginLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">비밀번호</label>
            <input
              ref={passwordRef}
              type="password"
              className="w-full rounded-xl border-2 border-blue-300 px-4 py-3 text-base font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all disabled:bg-gray-100 disabled:border-gray-300"
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
              disabled={loginLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter") doLogin();
              }}
            />
          </div>

          {loginErr && (
            <div className="p-3 rounded-xl bg-red-50 border-2 border-red-200 flex items-center gap-2 animate-in slide-in-from-top-1 duration-200">
              <span className="text-xl">❌</span>
              <div className="text-sm font-semibold text-red-700">{loginErr}</div>
            </div>
          )}

          <button
            type="button"
            disabled={loginLoading}
            onClick={doLogin}
            className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3 text-base font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg"
          >
            {loginLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                <span>로그인 중...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>✨</span>
                <span>로그인</span>
              </span>
            )}
          </button>
        </div>

        <div className="p-3 rounded-xl bg-blue-50 border-2 border-blue-200">
          <div className="text-xs text-blue-700">
            <span className="font-semibold">💡 참고:</span> 로그인 후 20분 동안 인증이 유지됩니다.
          </div>
        </div>
      </div>
    </Modal>
  );
}
