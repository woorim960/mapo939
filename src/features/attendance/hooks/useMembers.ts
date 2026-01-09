// 멤버 데이터 훅

import { useEffect, useState } from "react";
import { fetchMembers, fetchStats } from "../api/members";
import type { Member, Stats } from "../types";

export function useMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  async function refreshAll() {
    setLoading(true);
    try {
      const [membersData, statsData] = await Promise.all([fetchMembers(), fetchStats()]);
      setMembers(membersData);
      setStats(statsData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
  }, []);

  return { members, stats, loading, refreshAll };
}
