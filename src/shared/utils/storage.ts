// localStorage 유틸리티

export function getLS(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setLS(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function removeLS(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
