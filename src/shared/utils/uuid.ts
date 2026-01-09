// UUID 유틸리티

export function uuid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `p_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}
