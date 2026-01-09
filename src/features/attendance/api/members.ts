// 멤버 관련 API 클라이언트

import { apiGet, apiPost, apiPatch, apiDelete } from "@/shared/api/client";
import type { Member, Stats, MemberStats } from "../types";

type MembersResponse = {
  members: Member[];
};

export async function fetchMembers(): Promise<Member[]> {
  const data = await apiGet<MembersResponse>("/api/members", {
    cache: "no-store",
  });
  return data.members ?? [];
}

export async function fetchStats(): Promise<Stats | null> {
  return await apiGet<Stats>("/api/stats", { cache: "no-store" });
}

export async function fetchMemberStats(memberId: string): Promise<MemberStats> {
  return await apiGet<MemberStats>(`/api/members/${memberId}/stats`, {
    cache: "no-store",
  });
}

export async function createMember(data: {
  name: string;
  phone: string;
  birthDate: string;
  photoUrl: string;
}): Promise<void> {
  await apiPost("/api/members", data);
}

export async function updateMember(
  memberId: string,
  data: {
    name: string;
    phone: string;
    birthDate: string;
    photoUrl: string;
  }
): Promise<void> {
  await apiPatch(`/api/members/${memberId}`, data);
}

export async function deleteMember(memberId: string): Promise<void> {
  await apiDelete(`/api/members/${memberId}`);
}
