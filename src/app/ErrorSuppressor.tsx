// 브라우저 확장 프로그램 관련 에러 억제 컴포넌트
"use client";

import { useEffect } from "react";

export function ErrorSuppressor() {
  useEffect(() => {
    // 필터링할 에러 메시지 패턴
    const shouldIgnoreError = (message: string): boolean => {
      const lowerMessage = message.toLowerCase();
      return (
        lowerMessage.includes("runtime.lasterror") ||
        lowerMessage.includes("message port closed") ||
        lowerMessage.includes("extension context invalidated") ||
        lowerMessage.includes("unchecked runtime.lasterror")
      );
    };

    // 원본 console.error 저장
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    // console.error 오버라이드
    console.error = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'string' ? arg : 
        arg instanceof Error ? arg.message : 
        String(arg)
      ).join(' ');

      if (!shouldIgnoreError(message)) {
        originalConsoleError.apply(console, args);
      }
    };

    // console.warn 오버라이드 (일부 확장 프로그램이 warn으로 출력)
    console.warn = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'string' ? arg : 
        arg instanceof Error ? arg.message : 
        String(arg)
      ).join(' ');

      if (!shouldIgnoreError(message)) {
        originalConsoleWarn.apply(console, args);
      }
    };

    // 브라우저 확장 프로그램 관련 에러를 무시하는 핸들러
    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.message || "";
      
      if (shouldIgnoreError(errorMessage)) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    // unhandledrejection 이벤트 핸들러 (Promise rejection)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const errorMessage = 
        (reason instanceof Error ? reason.message : String(reason)) || "";

      if (shouldIgnoreError(errorMessage)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    // window.onerror 오버라이드
    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      const errorMessage = typeof message === 'string' ? message : String(message);
      
      if (shouldIgnoreError(errorMessage)) {
        return true; // 에러 처리됨
      }
      
      // 원본 핸들러가 있으면 호출
      if (originalOnError) {
        return originalOnError.call(window, message, source, lineno, colno, error);
      }
      
      return false;
    };

    window.addEventListener("error", handleError, true); // capture phase
    window.addEventListener("unhandledrejection", handleUnhandledRejection, true);

    return () => {
      // 원본 함수 복원
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      window.onerror = originalOnError;
      
      window.removeEventListener("error", handleError, true);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection, true);
    };
  }, []);

  return null;
}
