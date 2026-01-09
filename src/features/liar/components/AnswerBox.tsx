// 답변 입력 박스 컴포넌트

import { useEffect, useState } from "react";
import { submitAnswer } from "../api";
import { remainingMs, msgFromErrorCode } from "../utils";
import { ApiError } from "@/shared/utils/error";

type AnswerBoxProps = {
  playerId: string;
  min: number;
  max: number;
  submittedCount: number;
  aliveCount: number;
  endsAt: number | null;
  alreadySubmitted: boolean;
  submittedValue: number | null;
  onToast: (msg: string) => void;
};

export function AnswerBox({
  playerId,
  min,
  max,
  submittedCount,
  aliveCount,
  endsAt,
  alreadySubmitted,
  submittedValue,
  onToast,
}: AnswerBoxProps) {
  const [value, setValue] = useState<string>("");
  const [err, setErr] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  const [, setTick] = useState<number>(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((v) => v + 1), 250);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (alreadySubmitted) setValue("");
  }, [alreadySubmitted]);

  const sec = Math.ceil(remainingMs(endsAt) / 1000);

  async function submit(): Promise<void> {
    if (alreadySubmitted) {
      setErr("이미 제출");
      return;
    }

    setErr("");
    const n = Number(value);
    if (!Number.isInteger(n)) {
      setErr("정수만");
      return;
    }
    if (n < min || n > max) {
      setErr("범위 밖");
      return;
    }

    setBusy(true);
    try {
      await submitAnswer(playerId, n);
      setValue("");
      onToast("제출 완료");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setErr("이미 제출");
        } else {
          setErr(msgFromErrorCode(err.code));
        }
      } else {
        setErr("잠시 후 다시 시도해주세요");
      }
    } finally {
      setBusy(false);
    }
  }

  const progress = endsAt ? Math.max(0, Math.min(100, (remainingMs(endsAt) / 60_000) * 100)) : 100;
  const isUrgent = sec < 10;

  return (
    <section className="rounded-2xl border-2 border-white/50 bg-white/80 backdrop-blur-sm shadow-xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent flex items-center gap-2">
          <span>✍️</span>
          <span>답변 입력</span>
        </div>
        <div className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isUrgent ? "bg-red-100 text-red-700 animate-pulse" : "bg-emerald-100 text-emerald-700"}`}>
          {submittedCount}/{aliveCount} · {sec}초
        </div>
      </div>

      {/* 타이머 진행바 */}
      <div className="mb-4">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${isUrgent ? "bg-gradient-to-r from-red-500 to-orange-500" : "bg-gradient-to-r from-emerald-500 to-teal-500"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-gray-500 text-center">
          {min} ~ {max} 범위의 정수 입력
        </div>
      </div>

      <input
        className="w-full rounded-xl border-2 border-emerald-300 px-4 py-3 text-base font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200 transition-all disabled:bg-gray-100 disabled:border-gray-300 disabled:cursor-not-allowed"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={`${min} ~ ${max} 정수`}
        inputMode="numeric"
        disabled={busy || alreadySubmitted}
      />

      {alreadySubmitted ? (
        <div className="mt-3 p-3 rounded-xl bg-emerald-50 border-2 border-emerald-200 flex items-center gap-2">
          <span className="text-xl">✅</span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-emerald-800">제출 완료</div>
            {typeof submittedValue === "number" && (
              <div className="text-xs text-emerald-600 mt-0.5">내 답변: {submittedValue}</div>
            )}
          </div>
        </div>
      ) : null}

      {err ? (
        <div className="mt-3 p-3 rounded-xl bg-red-50 border-2 border-red-200 flex items-center gap-2 animate-in slide-in-from-top-1 duration-200">
          <span className="text-xl">❌</span>
          <div className="text-sm font-semibold text-red-700">{err}</div>
        </div>
      ) : null}

      <button
        className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-base font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg"
        onClick={submit}
        disabled={busy || alreadySubmitted}
      >
        {busy ? "제출 중..." : alreadySubmitted ? "✅ 제출 완료" : "📤 제출하기"}
      </button>

      {!alreadySubmitted && (
        <div className="mt-2 text-xs text-center text-gray-500">⚠️ 제출 후 수정할 수 없습니다</div>
      )}
    </section>
  );
}
