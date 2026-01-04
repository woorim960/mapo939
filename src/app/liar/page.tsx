"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Phase =
  | "LOBBY"
  | "PREP"
  | "ANSWERING"
  | "REVEAL"
  | "DISCUSS"
  | "VOTING"
  | "TIE_DISCUSS"
  | "RESULT"
  | "GAME_OVER";

type PublicPlayer = {
  playerId: string;
  nickname: string;
  isAlive: boolean;
  isHost: boolean;
};

type PublicState = {
  version: number;
  phase: Phase;
  hostPlayerId: string | null;
  players: PublicPlayer[];
  round: {
    index: number;
    questionId: string | null;
    min: number;
    max: number;
    answersByPlayerId: Record<string, number>;
    voteCounts: Record<string, number>;
    questionChangeCount: number;
    answeringEndsAt: number | null;
    discussEndsAt: number | null;
    tieDiscussEndsAt: number | null;
  };
  lastEliminatedPlayerId: string | null;
  lastEliminatedWasTroll: boolean;
  championPlayerId: string | null;
};

type MeState = {
  role: "AUDIENCE" | "LIAR" | "TROLL" | null;
  min: number;
  max: number;
  question: string | null;
};

function uuid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `p_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function getLS(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function setLS(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function removeLS(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function remainingMs(endsAt: number | null): number {
  if (!endsAt) return 0;
  return Math.max(0, endsAt - Date.now());
}

export default function LiarPage() {
  const [playerId, setPlayerId] = useState<string>("");
  const [nickname, setNickname] = useState<string>("");
  const [joined, setJoined] = useState<boolean>(false);

  const [publicState, setPublicState] = useState<PublicState | null>(null);
  const [me, setMe] = useState<MeState | null>(null);

  const [joinErr, setJoinErr] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  // 최신 version을 stale closure 없이 쓰기 위해 ref 유지
  const publicVersionRef = useRef<number>(0);
  useEffect(() => {
    publicVersionRef.current = publicState?.version ?? publicVersionRef.current;
  }, [publicState?.version]);

  async function resetAll(): Promise<void> {
    setBusy(true);
    try {
      const res = await fetch("/api/liar/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });

      if (!res.ok) {
        alert("초기화 실패. 잠시 후 다시 시도해줘.");
        return;
      }

      // 로컬도 제거
      removeLS("liar_player_id");
      removeLS("liar_nickname");
      removeLS("liar_version");

      location.reload();
    } finally {
      setBusy(false);
    }
  }

  // localStorage load + resume (A안)
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const pid = getLS("liar_player_id") ?? uuid();
      setLS("liar_player_id", pid);
      if (!cancelled) setPlayerId(pid);

      const savedNick = getLS("liar_nickname");
      if (!savedNick) {
        if (!cancelled) {
          setNickname("");
          setJoined(false);
        }
        return;
      }

      // ✅ resume는 /api/liar/me 호출로 서버에 존재 확인
      try {
        const res = await fetch(`/api/liar/me`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId: pid }),
        });

        if (!res.ok) {
          removeLS("liar_nickname");
          removeLS("liar_version");
          if (!cancelled) {
            setNickname("");
            setJoined(false);
            setMe(null);
            setPublicState(null);
          }
          return;
        }

        // ✅ /api/liar/me는 이제 MeState 그대로 반환한다
        const data = (await res.json()) as MeState;

        if (!cancelled) {
          setNickname(savedNick);
          setMe(data);
          setJoined(true);
        }
      } catch {
        // 네트워크 불안정 시: UI는 유지 (joined true)하고 폴링으로 회복
        if (!cancelled) {
          setNickname(savedNick);
          setJoined(true);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const isHost = useMemo(() => {
    if (!publicState || !playerId) return false;
    const meP = publicState.players.find(p => p.playerId === playerId);
    return Boolean(meP?.isHost);
  }, [publicState, playerId]);

  // polling public state
  useEffect(() => {
    if (!joined) return;

    let timer: number | null = null;
    let stopped = false;

    const loop = async () => {
      if (stopped) return;

      // ✅ stale closure 방지: ref + localStorage fallback
      const fromRef = publicVersionRef.current || 0;
      const fromLS = Number(getLS("liar_version") ?? "0") || 0;
      const currentV = Math.max(fromRef, fromLS);

      try {
        const res = await fetch(`/api/liar/state?v=${currentV}`, { method: "GET" });
        if (res.status === 204) {
          // no change
        } else if (res.ok) {
          const s = (await res.json()) as PublicState;
          setPublicState(s);
          setLS("liar_version", String(s.version));
          publicVersionRef.current = s.version;
        }
      } catch {
        // ignore
      }

      timer = window.setTimeout(loop, 1000);
    };

    void loop();
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [joined]);

  // poll my role/question
  useEffect(() => {
    if (!joined) return;
    if (!playerId) return; // ✅ playerId 없으면 절대 호출 금지

    let timer: number | null = null;
    let stopped = false;

    const loop = async () => {
      if (stopped) return;

      try {
        const res = await fetch(`/api/liar/me`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId }),
        });

        if (res.ok) {
          // ✅ MeState 그대로 온다 (d.me 아님)
          const d = (await res.json()) as MeState;
          setMe(d);
        } else {
          // resume 실패/세션 끊김: me만 비움 (joined는 유지해서 UI가 덜 흔들리게)
          setMe(null);
        }
      } catch {
        // ignore
      }

      timer = window.setTimeout(loop, 1500);
    };

    void loop();
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [joined, playerId]);

  async function join(): Promise<void> {
    setJoinErr("");
    const nn = nickname.trim();
    if (!nn) {
      setJoinErr("닉네임을 입력해줘.");
      return;
    }
    if (!playerId) {
      setJoinErr("세션이 아직 준비되지 않았어. 잠깐 후 다시 눌러줘.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/liar/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, nickname: nn }),
      });

      if (res.ok) {
        setLS("liar_nickname", nn);
        setNickname(nn);
        setJoined(true);

        // ✅ join 직후 me/state를 즉시 갱신 (첫 화면 안정화)
        removeLS("liar_version");
        setPublicState(null);
        setMe(null);
      } else {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        if (res.status === 409 && j?.error === "nickname_taken") {
          setJoinErr("이미 사용 중인 닉네임이야. 다른 이름으로 해줘.");
        } else {
          setJoinErr("참가에 실패했어. 새로고침 후 다시 시도해줘.");
        }
      }
    } catch {
      setJoinErr("네트워크 오류야. 잠깐 후 다시 시도해줘.");
    } finally {
      setBusy(false);
    }
  }

  async function startGame(): Promise<void> {
    if (!isHost) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/liar/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      // start 직후 role/question을 빠르게 반영
      void res;
      setTimeout(() => {
        removeLS("liar_version");
        publicVersionRef.current = 0;
      }, 0);
    } finally {
      setBusy(false);
    }
  }

  async function requestQuestionChange(): Promise<void> {
    setBusy(true);
    try {
      const res = await fetch(`/api/liar/question-change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      void res;
      // PREP에서 질문 바뀌면 me/state 빨리 반영
      setTimeout(() => {
        removeLS("liar_version");
        publicVersionRef.current = 0;
      }, 0);
    } finally {
      setBusy(false);
    }
  }

  async function restartGame(): Promise<void> {
    if (!isHost) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/liar/restart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      void res;

      // ✅ 재시작 직후: UI 캐시/스냅샷을 지워서 바로 PREP로 따라오게
      removeLS("liar_version");
      publicVersionRef.current = 0;
      setPublicState(null);
      setMe(null);
    } finally {
      setBusy(false);
    }
  }

  const aliveCount = publicState?.players.filter(p => p.isAlive).length ?? 0;
  const joinedCount = publicState?.players.length ?? 0;

  const phase = publicState?.phase ?? "LOBBY";
  const meRole = me?.role ?? null;

  // 질문은 서버가 라이어면 null로 내려주므로, 여기선 그대로 표시/비표시만 함
  const questionText = me?.question ?? null;

  return (
    <main className="min-h-screen bg-white p-4">
      <button className="text-xs underline text-gray-500" onClick={resetAll} disabled={busy}>
        전체 초기화
      </button>

      <div className="mx-auto max-w-md space-y-4">
        <header className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold">라이어</h1>
            <div className="text-xs text-gray-500">v{publicState?.version ?? 0}</div>
          </div>
          <div className="mt-2 text-sm text-gray-700">
            상태: <span className="font-semibold">{phase}</span>
          </div>
          <div className="mt-1 text-sm text-gray-700">
            인원: <span className="font-semibold">{joinedCount}</span> (생존 {aliveCount})
          </div>
          <div className="mt-1 text-sm text-gray-700">
            내 역할: <span className="font-semibold">{meRole ?? "?"}</span>
          </div>
        </header>

        {!joined ? (
          <section className="rounded-xl border bg-white p-4">
            <div className="text-sm font-semibold">닉네임</div>
            <input
              className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="중복 불가"
            />
            {joinErr ? <div className="mt-2 text-sm text-red-600">{joinErr}</div> : null}
            <button
              className="mt-3 w-full rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              onClick={join}
              disabled={busy}
            >
              참가하기
            </button>
          </section>
        ) : (
          <>
            <section className="rounded-xl border bg-white p-4">
              <div className="text-sm font-semibold">플레이어</div>
              <div className="mt-2 space-y-2">
                {(publicState?.players ?? []).map(p => (
                  <div key={p.playerId} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div className="text-sm">
                      {p.nickname} {p.isHost ? <span className="ml-1 text-xs text-blue-600">(방장)</span> : null}
                      {!p.isAlive ? <span className="ml-2 text-xs text-gray-500">(관전자)</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {isHost ? (
              <section className="rounded-xl border bg-white p-4">
                <div className="text-sm font-semibold">방장 메뉴</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    className="rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    onClick={startGame}
                    disabled={busy || joinedCount < 3 || phase !== "PREP"}
                  >
                    시작
                  </button>
                  <button
                    className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50"
                    onClick={restartGame}
                    disabled={busy}
                  >
                    재시작
                  </button>
                </div>

                <div className="mt-2 text-xs text-gray-500">
                  재시작은 “게임 상태만 초기화”야. PREP로 돌아간 뒤 다시 시작을 누르면 답변 입력이 뜬다.
                </div>
              </section>
            ) : null}

            <section className="rounded-xl border bg-white p-4">
              <div className="text-sm font-semibold">라운드</div>
              <div className="mt-2 text-sm text-gray-700">
                범위: <span className="font-semibold">{publicState?.round.min ?? 0}</span> ~{" "}
                <span className="font-semibold">{publicState?.round.max ?? 0}</span>
              </div>

              {questionText ? (
                <div className="mt-2 rounded-lg border bg-gray-50 p-3 text-sm">
                  <div className="text-xs text-gray-500">질문</div>
                  <div className="mt-1 font-semibold text-gray-900">{questionText}</div>
                </div>
              ) : (
                <div className="mt-2 text-sm text-gray-500">질문은 비공개</div>
              )}

              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  질문 변경 동의: {publicState?.round.questionChangeCount ?? 0}/{aliveCount}
                </div>
                <button
                  className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50"
                  onClick={requestQuestionChange}
                  disabled={busy || phase !== "PREP" || aliveCount < 3}
                >
                  질문 변경
                </button>
              </div>
            </section>

            {phase === "ANSWERING" ? (
              <AnswerBox
                playerId={playerId}
                min={publicState?.round.min ?? 0}
                max={publicState?.round.max ?? 0}
                submittedCount={Object.keys(publicState?.round.answersByPlayerId ?? {}).length}
                aliveCount={aliveCount}
                endsAt={publicState?.round.answeringEndsAt ?? null}
              />
            ) : null}

            {phase === "DISCUSS" || phase === "TIE_DISCUSS" ? (
              <TimerCard
                title={phase === "DISCUSS" ? "토론" : "동점 재논의"}
                endsAt={
                  phase === "DISCUSS"
                    ? publicState?.round.discussEndsAt ?? null
                    : publicState?.round.tieDiscussEndsAt ?? null
                }
              />
            ) : null}

            {phase === "REVEAL" || phase === "RESULT" ? (
              <RevealCard players={publicState?.players ?? []} answers={publicState?.round.answersByPlayerId ?? {}} />
            ) : null}

            {phase === "GAME_OVER" ? (
              <section className="rounded-xl border bg-white p-4">
                <div className="text-lg font-bold">게임 종료</div>
                <div className="mt-2 text-sm text-gray-700">
                  우승자:{" "}
                  <span className="font-semibold">
                    {publicState?.players.find(p => p.playerId === publicState?.championPlayerId)?.nickname ?? "?"}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-500">방장이 재시작하면 새 게임이 시작돼.</div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}

function TimerCard({ title, endsAt }: { title: string; endsAt: number | null }) {
  const [, setTick] = useState<number>(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick(v => v + 1), 250);
    return () => window.clearInterval(t);
  }, []);
  const ms = remainingMs(endsAt);
  const sec = Math.ceil(ms / 1000);
  return (
    <section className="rounded-xl border bg-white p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-2 text-2xl font-bold">{sec}s</div>
    </section>
  );
}

function RevealCard({ players, answers }: { players: PublicPlayer[]; answers: Record<string, number> }) {
  return (
    <section className="rounded-xl border bg-white p-4">
      <div className="text-sm font-semibold">답변 공개</div>
      <div className="mt-2 space-y-2">
        {players.map(p => (
          <div key={p.playerId} className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div className="text-sm">{p.nickname}</div>
            <div className="text-sm font-semibold">{answers[p.playerId] ?? "-"}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AnswerBox({
  playerId,
  min,
  max,
  submittedCount,
  aliveCount,
  endsAt,
}: {
  playerId: string;
  min: number;
  max: number;
  submittedCount: number;
  aliveCount: number;
  endsAt: number | null;
}) {
  const [value, setValue] = useState<string>("");
  const [err, setErr] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  const [, setTick] = useState<number>(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick(v => v + 1), 250);
    return () => window.clearInterval(t);
  }, []);

  const sec = Math.ceil(remainingMs(endsAt) / 1000);

  async function submit(): Promise<void> {
    setErr("");
    const n = Number(value);
    if (!Number.isInteger(n)) {
      setErr("정수만 입력 가능");
      return;
    }
    if (n < min || n > max) {
      setErr(`범위(${min}~${max}) 안에서 입력해줘`);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/liar/submit-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, value: n }),
      });
      if (!res.ok) setErr("제출 실패(상태가 바뀌었을 수 있음).");
    } catch {
      setErr("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">답변 입력</div>
        <div className="text-xs text-gray-500">
          {submittedCount}/{aliveCount} · {sec}s
        </div>
      </div>

      <input
        className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={`${min} ~ ${max} 정수`}
        inputMode="numeric"
      />

      {err ? <div className="mt-2 text-sm text-red-600">{err}</div> : null}

      <button
        className="mt-3 w-full rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        onClick={submit}
        disabled={busy}
      >
        제출
      </button>

      <div className="mt-2 text-xs text-gray-500">제출 후 수정 불가 · 시간 초과 시 10초씩 연장</div>
    </section>
  );
}
