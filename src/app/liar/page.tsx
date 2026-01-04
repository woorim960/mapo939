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

/** UI 텍스트 변환 */
function phaseLabel(phase: Phase): string {
  switch (phase) {
    case "LOBBY":
      return "대기";
    case "PREP":
      return "준비";
    case "ANSWERING":
      return "답변 입력";
    case "REVEAL":
      return "답변 공개";
    case "DISCUSS":
      return "토론";
    case "VOTING":
      return "투표";
    case "TIE_DISCUSS":
      return "동점 재논의";
    case "RESULT":
      return "결과";
    case "GAME_OVER":
      return "게임 종료";
    default:
      return phase;
  }
}

function roleLabel(role: MeState["role"]): string {
  switch (role) {
    case "AUDIENCE":
      return "관객";
    case "LIAR":
      return "라이어";
    case "TROLL":
      return "트롤";
    default:
      return "?";
  }
}

export default function LiarPage() {
  const [playerId, setPlayerId] = useState<string>("");
  const [nickname, setNickname] = useState<string>("");
  const [joined, setJoined] = useState<boolean>(false);

  const [publicState, setPublicState] = useState<PublicState | null>(null);
  const [me, setMe] = useState<MeState | null>(null);

  const [joinErr, setJoinErr] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  // ✅ 투표 UI 상태
  const [voteMode, setVoteMode] = useState<boolean>(false); // "투표하기" 눌렀는지
  const [selectedVoteTargetId, setSelectedVoteTargetId] = useState<string>("");

  // 최신 version을 stale closure 없이 쓰기 위해 ref 유지
  const publicVersionRef = useRef<number>(0);
  useEffect(() => {
    publicVersionRef.current = publicState?.version ?? publicVersionRef.current;
  }, [publicState?.version]);

  // phase가 바뀌면 투표 UI 초기화(특히 투표 이후 결과/재논의로 넘어갈 때)
  useEffect(() => {
    setVoteMode(false);
    setSelectedVoteTargetId("");
  }, [publicState?.phase]);

  async function resetAll(): Promise<void> {
    setBusy(true);
    try {
      const res = await fetch("/api/liar/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });

      if (!res.ok) {
        alert("전체 초기화에 실패했어. 잠시 후 다시 시도해줘.");
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

      // resume는 /api/liar/me 호출로 서버에 존재 확인
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

        const data = (await res.json()) as MeState;

        if (!cancelled) {
          setNickname(savedNick);
          setMe(data);
          setJoined(true);
        }
      } catch {
        // 네트워크 불안정 시: UI는 유지하고 폴링으로 회복
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

  const isAliveMe = useMemo(() => {
    if (!publicState || !playerId) return false;
    const meP = publicState.players.find(p => p.playerId === playerId);
    return Boolean(meP?.isAlive);
  }, [publicState, playerId]);

  // polling public state
  useEffect(() => {
    if (!joined) return;

    let timer: number | null = null;
    let stopped = false;

    const loop = async () => {
      if (stopped) return;

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
    if (!playerId) return;

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
          const d = (await res.json()) as MeState;
          setMe(d);
        } else {
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
      setTimeout(() => {
        removeLS("liar_version");
        publicVersionRef.current = 0;
      }, 0);
    } finally {
      setBusy(false);
    }
  }

  // ✅ "게임 초기화(이번 판)" = 기존 restartGame
  async function resetRound(): Promise<void> {
    if (!isHost) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/liar/restart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      void res;

      removeLS("liar_version");
      publicVersionRef.current = 0;
      setPublicState(null);
      setMe(null);
      setVoteMode(false);
      setSelectedVoteTargetId("");
    } finally {
      setBusy(false);
    }
  }

  // ✅ 투표 시작 버튼: phase만 VOTING으로 바꾸는 API가 있으면 호출(없으면 UI만 켬)
  // - 이미 서버가 DISCUSS 끝나면 자동으로 VOTING으로 바꾼다면, 이건 UI 토글만 하면 됨.
  async function openVotingUi(): Promise<void> {
    // 서버 설계에 따라 선택:
    // 1) 서버에 /api/liar/open-vote 같은게 있으면 여기서 호출
    // 2) 없으면, UI만 열어도 됨(phase가 VOTING일 때만 실제 투표 가능)
    setVoteMode(true);
  }

  async function submitVote(): Promise<void> {
    if (!playerId) return;
    if (!selectedVoteTargetId) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/liar/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, targetPlayerId: selectedVoteTargetId }),
      });

      if (!res.ok) {
        alert("투표에 실패했어. (상태가 바뀌었을 수 있어)");
        return;
      }

      // 투표 후 UI 잠깐 닫기 (상태는 폴링으로 반영)
      setVoteMode(false);
      setSelectedVoteTargetId("");

      removeLS("liar_version");
      publicVersionRef.current = 0;
    } finally {
      setBusy(false);
    }
  }

  const aliveCount = publicState?.players.filter(p => p.isAlive).length ?? 0;
  const joinedCount = publicState?.players.length ?? 0;

  const phase = publicState?.phase ?? "LOBBY";
  const phaseKo = phaseLabel(phase);

  const meRole = me?.role ?? null;
  const meRoleKo = roleLabel(meRole);

  const questionText = me?.question ?? null;

  const alivePlayers = useMemo(() => {
    return (publicState?.players ?? []).filter(p => p.isAlive);
  }, [publicState?.players]);

  const canVoteNow = useMemo(() => {
    // 투표는 살아있는 사람만 가능 + phase는 VOTING일 때만
    return joined && isAliveMe && phase === "VOTING";
  }, [joined, isAliveMe, phase]);

  // 투표 대상(살아있는 사람 중 자기 자신 제외)
  const voteTargets = useMemo(() => {
    return alivePlayers.filter(p => p.playerId !== playerId);
  }, [alivePlayers, playerId]);

  // 내가 이미 투표했는지(서버가 voteCounts만 주면 알 수 없고, votesByVoterId가 없으면 UI로만 처리)
  // 여기서는 단순히 투표 후 UI 닫는 방식으로 충분.
  const showVotePanel = (phase === "VOTING" || voteMode) && joined;

  return (
    <main className="min-h-screen bg-white p-4">
      <button className="text-xs underline text-gray-500" onClick={resetAll} disabled={busy}>
        전체 초기화(점수/닉네임/게임상태 전부 삭제)
      </button>

      <div className="mx-auto max-w-md space-y-4">
        <header className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold">라이어 게임</h1>
            <div className="text-xs text-gray-500">버전 {publicState?.version ?? 0}</div>
          </div>

          <div className="mt-2 text-sm text-gray-700">
            진행 상태: <span className="font-semibold">{phaseKo}</span>
          </div>
          <div className="mt-1 text-sm text-gray-700">
            참여 인원: <span className="font-semibold">{joinedCount}</span>명 (생존 {aliveCount}명)
          </div>
          <div className="mt-1 text-sm text-gray-700">
            내 역할: <span className="font-semibold">{meRoleKo}</span>
          </div>
        </header>

        {!joined ? (
          <section className="rounded-xl border bg-white p-4">
            <div className="text-sm font-semibold">닉네임 입력</div>
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
              <div className="text-sm font-semibold">참여자 목록</div>
              <div className="mt-2 space-y-2">
                {(publicState?.players ?? []).map(p => (
                  <div key={p.playerId} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div className="text-sm">
                      {p.nickname}
                      {p.isHost ? <span className="ml-1 text-xs text-blue-600">(방장)</span> : null}
                      {!p.isAlive ? <span className="ml-2 text-xs text-gray-500">(관전자)</span> : null}
                      {p.playerId === playerId ? <span className="ml-2 text-xs text-gray-500">(나)</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 방장 메뉴 */}
            {isHost ? (
              <section className="rounded-xl border bg-white p-4">
                <div className="text-sm font-semibold">방장 메뉴</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    className="rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    onClick={startGame}
                    disabled={busy || joinedCount < 3 || phase !== "PREP"}
                  >
                    게임 시작
                  </button>

                  <button
                    className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50"
                    onClick={resetRound}
                    disabled={busy}
                  >
                    게임 초기화(이번 판)
                  </button>
                </div>

                <div className="mt-2 text-xs text-gray-500">
                  “게임 초기화(이번 판)”은 점수는 유지하고, 현재 판의 진행상태만 준비 단계로 되돌려.
                </div>
              </section>
            ) : null}

            {/* 라운드 정보 */}
            <section className="rounded-xl border bg-white p-4">
              <div className="text-sm font-semibold">현재 라운드</div>
              <div className="mt-2 text-sm text-gray-700">
                숫자 범위: <span className="font-semibold">{publicState?.round.min ?? 0}</span> ~{" "}
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
                  질문 바꾸기
                </button>
              </div>
            </section>

            {/* 답변 입력 */}
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

            {/* 토론/재논의 */}
            {phase === "DISCUSS" || phase === "TIE_DISCUSS" ? (
              <section className="rounded-xl border bg-white p-4 space-y-3">
                <TimerCard
                  title={phase === "DISCUSS" ? "토론 시간" : "동점 재논의 시간"}
                  endsAt={
                    phase === "DISCUSS"
                      ? publicState?.round.discussEndsAt ?? null
                      : publicState?.round.tieDiscussEndsAt ?? null
                  }
                />

                <button
                  className="w-full rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  onClick={openVotingUi}
                  disabled={busy || !isAliveMe}
                >
                  투표하기
                </button>

                <div className="text-xs text-gray-500">
                  “투표하기”를 누르고, 대상 1명을 선택한 뒤 “투표”를 눌러.
                </div>
              </section>
            ) : null}

            {/* 투표 패널 (phase=VOTING일 때 또는 토론에서 버튼 눌러 voteMode=true일 때) */}
            {showVotePanel ? (
              <section className="rounded-xl border bg-white p-4">
                <div className="text-sm font-semibold">투표</div>
                <div className="mt-1 text-xs text-gray-500">
                  {phase === "VOTING"
                    ? "지금 투표 단계야. 1명을 선택하고 투표를 눌러."
                    : "아직 공식 투표 단계가 아닐 수 있어. (서버가 VOTING으로 바뀌면 투표 가능)"}
                </div>

                <div className="mt-3 space-y-2">
                  {voteTargets.map(p => {
                    const selected = p.playerId === selectedVoteTargetId;
                    return (
                      <button
                        key={p.playerId}
                        type="button"
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm font-semibold ${
                          selected ? "border-black bg-gray-100" : ""
                        }`}
                        onClick={() => setSelectedVoteTargetId(p.playerId)}
                        disabled={!isAliveMe || busy}
                      >
                        {p.nickname}
                      </button>
                    );
                  })}
                  {voteTargets.length === 0 ? (
                    <div className="text-sm text-gray-500">투표할 대상이 없어.</div>
                  ) : null}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50"
                    onClick={() => {
                      setVoteMode(false);
                      setSelectedVoteTargetId("");
                    }}
                    disabled={busy}
                  >
                    닫기
                  </button>

                  <button
                    className="rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    onClick={submitVote}
                    disabled={busy || !canVoteNow || !selectedVoteTargetId}
                  >
                    투표
                  </button>
                </div>

                {!canVoteNow ? (
                  <div className="mt-2 text-xs text-red-600">
                    {phase !== "VOTING" ? "아직 투표 단계가 아니야." : "관전자 상태라 투표할 수 없어."}
                  </div>
                ) : null}
              </section>
            ) : null}

            {/* 답변 공개/결과 */}
            {phase === "REVEAL" || phase === "RESULT" ? (
              <RevealCard
                players={publicState?.players ?? []}
                answers={publicState?.round.answersByPlayerId ?? {}}
              />
            ) : null}

            {/* 게임 종료 */}
            {phase === "GAME_OVER" ? (
              <section className="rounded-xl border bg-white p-4">
                <div className="text-lg font-bold">게임이 끝났어</div>
                <div className="mt-2 text-sm text-gray-700">
                  우승자:{" "}
                  <span className="font-semibold">
                    {publicState?.players.find(p => p.playerId === publicState?.championPlayerId)?.nickname ?? "?"}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-500">방장이 “게임 초기화(이번 판)”을 누르면 다시 시작할 수 있어.</div>
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
    <div>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-2 text-2xl font-bold">{sec}초</div>
    </div>
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
      if (!res.ok) setErr("제출에 실패했어. (상태가 바뀌었을 수 있어)");
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
          {submittedCount}/{aliveCount} · {sec}초
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
