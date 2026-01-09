// 역할 수 계산 유틸리티

export function defaultRoleCounts(n: number): { liar: number; troll: number; audience: number } {
  if (n < 3) return { liar: 0, troll: 0, audience: n };

  const liar = Math.max(1, Math.floor((n + 1) / 4));

  let troll = 0;
  if (n === 3) troll = 0;
  else {
    const r = n % 4;
    if (r === 0 || r === 1) troll = liar;
    else if (r === 2) troll = liar + 1;
    else troll = Math.max(0, liar - 1);
  }

  const audience = n - liar - troll;
  return { liar, troll, audience };
}
