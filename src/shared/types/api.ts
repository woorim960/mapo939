// API 관련 타입 정의

export type ApiErrorResponse = {
  error: string;
  code?: string;
};

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | { success: false; error: ApiErrorResponse };

/**
 * API 에러 응답인지 확인
 */
export function isApiErrorResponse(obj: unknown): obj is ApiErrorResponse {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "error" in obj &&
    typeof (obj as ApiErrorResponse).error === "string"
  );
}

/**
 * API 요청 본문 타입 가드
 */
export function hasProperty<T extends string>(
  obj: unknown,
  prop: T
): obj is Record<T, unknown> {
  return typeof obj === "object" && obj !== null && prop in obj;
}
