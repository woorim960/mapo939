// 관리자 인증 훅

import { useEffect, useRef, useState } from "react";
import { fetchAdminMe } from "../api/admin";
import { formatLeftMs } from "../utils";

export function useAdmin() {
  const [admin, setAdmin] = useState({ isAdmin: false });
  const [adminLeftText, setAdminLeftText] = useState<string>("미인증");
  const adminTimerRef = useRef<number | null>(null);

  function startAdminCountdown(expiresAtIso?: string) {
    if (adminTimerRef.current) window.clearInterval(adminTimerRef.current);
    if (!expiresAtIso) {
      setAdminLeftText("미인증");
      return;
    }

    const tick = () => {
      const left = new Date(expiresAtIso).getTime() - Date.now();
      setAdminLeftText(formatLeftMs(left));
      if (left <= 0) {
        fetchAdminMe().then(setAdmin).catch(() => {});
      }
    };

    tick();
    adminTimerRef.current = window.setInterval(tick, 1000);
  }

  async function refreshAdminMe() {
    const data = await fetchAdminMe();
    setAdmin(data);
  }

  useEffect(() => {
    refreshAdminMe();
    return () => {
      if (adminTimerRef.current) window.clearInterval(adminTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (admin.isAdmin && admin.expiresAt) {
      startAdminCountdown(admin.expiresAt);
    } else {
      startAdminCountdown(undefined);
    }
  }, [admin.isAdmin, admin.expiresAt]);

  return { admin, adminLeftText, refreshAdminMe };
}
