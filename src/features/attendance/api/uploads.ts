// 업로드 관련 API 클라이언트

import { ApiError, extractApiError, logError } from "@/shared/utils/error";

export async function uploadMemberPhoto(file: File): Promise<{ url: string }> {
  const fd = new FormData();
  fd.append("file", file);

  try {
    const res = await fetch("/api/uploads/member-photo", { method: "POST", body: fd });
    if (!res.ok) {
      const error = await extractApiError(res);
      throw new ApiError(error.error, res.status, error.code);
    }
    return await res.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logError("uploadMemberPhoto", err);
    throw new ApiError("업로드 실패", 0);
  }
}

export async function deleteBlob(url: string): Promise<void> {
  if (!url) return;
  if (!url.includes("vercel-storage.com")) return;

  try {
    await fetch("/api/uploads/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
  } catch (err) {
    // 업로드 삭제 실패는 조용히 무시 (이미 삭제되었을 수 있음)
    logError("deleteBlob", err);
  }
}
