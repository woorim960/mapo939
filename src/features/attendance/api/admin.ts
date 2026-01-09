// 관리자 관련 API 클라이언트

import type { AdminMe } from "../types";

export async function fetchAdminMe(): Promise<AdminMe> {
  const res = await fetch("/api/admin/me", { cache: "no-store" });
  const json = (await res.json().catch(() => null)) as AdminMe | null;
  return json ?? { isAdmin: false };
}

export async function login(username: string, password: string): Promise<Response> {
  return fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

export async function logout(): Promise<Response> {
  return fetch("/api/admin/logout", { method: "POST" });
}
