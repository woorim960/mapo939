// 멤버 관련 API 클라이언트

import type { Member, Stats, MemberStats } from "../types";

export async function fetchMembers(): Promise<Member[]> {
  const res = await fetch("/api/members", { cache: "no-store" });
  const json = await res.json();
  return json.members ?? [];
}

export async function fetchStats(): Promise<Stats | null> {
  const res = await fetch("/api/stats", { cache: "no-store" });
  const json = await res.json();
  return json ?? null;
}

export async function fetchMemberStats(memberId: string): Promise<MemberStats> {
  const res = await fetch(`/api/members/${memberId}/stats`, { cache: "no-store" });
  return await res.json();
}

export async function createMember(data: {
  name: string;
  phone: string;
  birthDate: string;
  photoUrl: string;
}): Promise<Response> {
  return fetch("/api/members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateMember(memberId: string, data: {
  name: string;
  phone: string;
  birthDate: string;
  photoUrl: string;
}): Promise<Response> {
  return fetch(`/api/members/${memberId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteMember(memberId: string): Promise<Response> {
  return fetch(`/api/members/${memberId}`, { method: "DELETE" });
}
