// 멤버 데이터 훅

import { useEffect, useState } from "react";
import { fetchMembers, fetchStats } from "../api/members";
import type { Member, Stats } from "../types";

export function useMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  async function refreshAll() {
    setLoading(true);
    try {
      const [membersData, statsData] = await Promise.all([fetchMembers(), fetchStats()]);
      setMembers(membersData);
      setStats(statsData);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
  }, []);

  return { members, stats, loading, initialLoading, refreshAll };
}
