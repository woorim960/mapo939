// 관리자 로그인 모달 컴포넌트

import { useRef, useState } from "react";
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
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">관리자 로그인</h2>
          <button type="button" className="rounded-lg border px-3 py-1 text-sm" onClick={onClose}>
            닫기
          </button>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="grid gap-3">
            <div className="grid gap-1">
              <label className="text-sm text-neutral-600">아이디</label>
              <input
                ref={usernameRef}
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="admin"
                autoComplete="username"
              />
            </div>

            <div className="grid gap-1">
              <label className="text-sm text-neutral-600">비밀번호</label>
              <input
                ref={passwordRef}
                type="password"
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="••••••••"
                autoComplete="current-password"
                onKeyDown={(e) => {
                  if (e.key === "Enter") doLogin();
                }}
              />
            </div>

            {loginErr && <div className="rounded-xl border bg-neutral-50 p-3 text-sm text-neutral-700">{loginErr}</div>}

            <button
              type="button"
              disabled={loginLoading}
              onClick={doLogin}
              className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
            >
              {loginLoading ? "로그인 중..." : "로그인"}
            </button>
          </div>
        </div>

        <p className="text-xs text-neutral-500">* 로그인 후 20분 동안 인증이 유지됩니다.</p>
      </div>
    </Modal>
  );
}
