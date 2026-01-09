// 관리자 관련 API 클라이언트

import { apiGet, apiPost } from "@/shared/api/client";
import type { AdminMe } from "../types";

export async function fetchAdminMe(): Promise<AdminMe> {
  try {
    return await apiGet<AdminMe>("/api/admin/me", { cache: "no-store" });
  } catch {
    return { isAdmin: false };
  }
}

export async function login(username: string, password: string): Promise<void> {
  await apiPost("/api/admin/login", { username, password });
}

export async function logout(): Promise<void> {
  await apiPost("/api/admin/logout", {}, { skipErrorLog: true });
}
