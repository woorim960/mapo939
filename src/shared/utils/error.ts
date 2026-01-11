// 공유 에러 처리 유틸리티

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 0,
    public code?: string,
    public serverMessage?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiErrorResponse = {
  error: string;
  code?: string;
  message?: string;
};

/**
 * API 응답에서 에러 정보 추출
 */
export async function extractApiError(res: Response): Promise<ApiErrorResponse> {
  try {
    const data = await res.json();
    if (typeof data === "object" && data !== null && "error" in data) {
      return {
        error: data.error || "잠시 후 다시 시도해주세요",
        code: data.code,
        message: data.message,
      } as ApiErrorResponse;
    }
    return { error: "잠시 후 다시 시도해주세요" };
  } catch {
    return { error: "잠시 후 다시 시도해주세요" };
  }
}

/**
 * 알 수 없는 에러를 사용자 친화적 메시지로 변환
 */
export function handleUnknownError(err: unknown): string {
  if (err instanceof ApiError) {
    return err.message;
  }
  if (err instanceof Error) {
    // Error 메시지가 오류처럼 보이지 않도록 처리
    const message = err.message;
    if (message.includes("실패") || message.includes("오류") || message.includes("에러") || message.includes("Failed")) {
      return "잠시 후 다시 시도해주세요";
    }
    return message;
  }
  if (typeof err === "string") {
    // 문자열 오류 메시지도 처리
    if (err.includes("실패") || err.includes("오류") || err.includes("에러") || err.includes("Failed")) {
      return "잠시 후 다시 시도해주세요";
    }
    return err;
  }
  return "잠시 후 다시 시도해주세요";
}

/**
 * 에러 로깅 (개발 환경에서만)
 * room_not_found 같은 예상된 에러는 로깅하지 않음
 */
export function logError(context: string, err: unknown): void {
  if (process.env.NODE_ENV === "development") {
    // room_not_found 같은 예상된 에러는 로깅하지 않음 (polling 중 정상적으로 발생할 수 있음)
    if (err instanceof ApiError && (err.code === "room_not_found" || err.status === 404)) {
      return;
    }
    console.error(`[${context}]`, err);
  }
  // 프로덕션에서는 Sentry 등으로 전송 가능
}

/**
 * 안전한 JSON 파싱
 */
export async function safeJsonParse<T>(res: Response): Promise<T | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
