// 공유 API 클라이언트

import { ApiError, extractApiError, handleUnknownError, logError } from "../utils/error";
import type { ApiErrorResponse } from "../types/api";

type RequestOptions = RequestInit & {
  skipErrorLog?: boolean;
};

/**
 * 안전한 fetch 래퍼
 */
export async function apiRequest<T>(
  url: string,
  options?: RequestOptions
): Promise<T> {
  const { skipErrorLog, ...fetchOptions } = options || {};

  try {
    const res = await fetch(url, fetchOptions);

    if (!res.ok) {
      const error = await extractApiError(res);
      const apiError = new ApiError(error.error, res.status, error.code);
      
      if (!skipErrorLog) {
        logError(`API Request Failed: ${url}`, apiError);
      }
      
      throw apiError;
    }

    // 204 No Content 처리
    if (res.status === 204) {
      return null as T;
    }

    return await res.json();
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    
    const message = handleUnknownError(err);
    logError(`API Request Error: ${url}`, err);
    throw new ApiError(message, 0);
  }
}

/**
 * POST 요청 헬퍼
 */
export async function apiPost<T>(
  url: string,
  body: unknown,
  options?: RequestOptions
): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    body: JSON.stringify(body),
  });
}

/**
 * GET 요청 헬퍼
 */
export async function apiGet<T>(url: string, options?: RequestOptions): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: "GET",
  });
}

/**
 * DELETE 요청 헬퍼
 */
export async function apiDelete<T>(url: string, options?: RequestOptions): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: "DELETE",
  });
}

/**
 * PATCH 요청 헬퍼
 */
export async function apiPatch<T>(
  url: string,
  body: unknown,
  options?: RequestOptions
): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    body: JSON.stringify(body),
  });
}
