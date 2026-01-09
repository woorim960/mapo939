// 업로드 관련 API 클라이언트

export async function uploadMemberPhoto(file: File): Promise<{ url: string }> {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch("/api/uploads/member-photo", { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? "업로드 실패");
  }
  return await res.json();
}

export async function deleteBlob(url: string): Promise<void> {
  if (!url) return;
  if (!url.includes("vercel-storage.com")) return;

  await fetch("/api/uploads/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  }).catch(() => {
    // ignore
  });
}
