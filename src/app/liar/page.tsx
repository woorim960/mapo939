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
  // ✅ 점수 표시용 (API에서 내려주면 표시, 없으면 0)
  score?: number;
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

  // ✅ (선택) 서버가 내려주면 GAME_OVER에서 “승리자 전원” 표시 가능
  winnerPlayerIds?: string[];
  finalChampionPlayerIds?: string[]; // ✅ 최종 우승자
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
      return "알 수 없음";
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
      return "미공개";
  }
}

/** ✅ API 에러코드를 짧고 쉽게 */
function msgFromErrorCode(code?: string): string {
  switch (code) {
    case "invalid_input":
      return "입력 오류";
    case "only_host":
      return "방장만 가능";
    case "not_enough_players":
      return "인원이 부족해요";
    case "nickname_taken":
      return "닉네임 사용 중";
    case "not_in_game":
      return "참가자 아님";
    case "not_alive":
      return "사망자는 불가";
    case "not_voting":
      return "투표 단계 아님";
    case "already_voted":
      return "이미 투표함";
    case "invalid_target":
      return "대상 없음";
    case "target_not_alive":
      return "대상은 사망자";
    case "cannot_vote_self":
      return "자기 투표 불가";
    case "not_result_phase":
      return "결과 단계 아님";
    case "concurrent_update":
      return "동시 처리 중";
    case "not_allowed_phase":
      return "지금은 불가";
    default:
      return "요청 실패";
  }
}

function parseNonNegativeInt(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  if (!Number.isInteger(n)) return null;
  if (n < 0) return null;
  return n;
}

export default function LiarPage() {
  const [playerId, setPlayerId] = useState<string>("");
  const [nickname, setNickname] = useState<string>("");
  const [joined, setJoined] = useState<boolean>(false);

  const [publicState, setPublicState] = useState<PublicState | null>(null);
  const [me, setMe] = useState<MeState | null>(null);

  const [joinErr, setJoinErr] = useState<string>("");
  const [toast, setToast] = useState<string>("");

  const [busy, setBusy] = useState<boolean>(false);

  // ✅ 투표 UI 상태
  const [voteMode, setVoteMode] = useState<boolean>(false);
  const [selectedVoteTargetId, setSelectedVoteTargetId] = useState<string>("");

  // ✅ 내가 투표한 대상 (프론트 잠금용)
  const [myVotedTargetId, setMyVotedTargetId] = useState<string>("");

  // ✅ "투표하러 가기" 버튼 중복 클릭 방지
  const [goVoteClicked, setGoVoteClicked] = useState<boolean>(false);

  // ✅ 방장 역할 수 커스텀 입력(프론트) — 0 이상 정수, 합 <= 인원수만 검증
  const [roleLiarInput, setRoleLiarInput] = useState<string>("");
  const [roleTrollInput, setRoleTrollInput] = useState<string>("");
  const [roleAudienceInput, setRoleAudienceInput] = useState<string>("");
  const [roleConfigErr, setRoleConfigErr] = useState<string>("");
  const [resetClicked, setResetClicked] = useState(false);

  // ✅ 사용자가 직접 건드렸는지(자동 기본값 덮어쓰기 방지)
  const [roleTouched, setRoleTouched] = useState<boolean>(false);

  // ✅ 게임 방법
  const [showHowTo, setShowHowTo] = useState(false);


  /** ✅ 서버 start와 동일한 기본 배치 */
  function defaultRoleCounts(n: number): { liar: number; troll: number; audience: number } {
    if (n < 3) return { liar: 0, troll: 0, audience: n };

    const liar = Math.max(1, Math.floor((n + 1) / 4));

    let troll = 0;
    if (n === 3) {
      troll = 0;
    } else {
      const r = n % 4;
      if (r === 0 || r === 1) troll = liar;
      else if (r === 2) troll = liar + 1;
      else troll = Math.max(0, liar - 1); // r === 3
    }

    const audience = n - liar - troll;
    return { liar, troll, audience };
  }

  // 최신 version을 stale closure 없이 쓰기 위한 ref
  const publicVersionRef = useRef<number>(0);
  useEffect(() => {
    publicVersionRef.current = publicState?.version ?? publicVersionRef.current;
  }, [publicState?.version]);

  const phase: Phase = publicState?.phase ?? "LOBBY";
  const phaseKo = phaseLabel(phase);
  const meRoleKo = roleLabel(me?.role ?? null);

  const joinedCount = publicState?.players.length ?? 0;
  const aliveCount = publicState?.players.filter(p => p.isAlive).length ?? 0;

  useEffect(() => {
    // ✅ PREP에서만 자동 채움
    if (phase !== "PREP") return;

    // ✅ 이미 사용자가 만졌으면 자동 덮어쓰기 금지
    if (roleTouched) return;

    const n = joinedCount; // 또는 aliveCount
    const base = defaultRoleCounts(n);

    setRoleLiarInput(String(base.liar));
    setRoleTrollInput(String(base.troll));
    setRoleAudienceInput(String(base.audience));
  }, [phase, joinedCount, roleTouched]);

  useEffect(() => {
  if (!publicState) return;

  const ph = publicState.phase;

  // ✅ PREP로 돌아가면: 완전 초기화
  if (ph === "PREP") {
    setMyVotedTargetId("");
    setSelectedVoteTargetId("");
    setVoteMode(false);
    setGoVoteClicked(false);
    return;
  }

  // ✅ 동점 재논의 진입: 재투표 준비
  if (ph === "TIE_DISCUSS") {
    setMyVotedTargetId("");
    setSelectedVoteTargetId("");
    setVoteMode(false);
    setGoVoteClicked(false);
    return;
  }

  // ✅ 핵심: 게임이 안 끝나서 DISCUSS로 복귀하는 경우에도 재투표 가능해야 함
  if (ph === "DISCUSS") {
    setMyVotedTargetId("");
    setSelectedVoteTargetId("");
    setVoteMode(false);
    setGoVoteClicked(false);
    return;
  }

  // ✅ REVEAL / RESULT / LOBBY 등으로 이동하면
  // "이동 중…" 상태(goVoteClicked)만 풀어주기 (원하면 여기서 더 초기화해도 됨)
  if (ph === "REVEAL" || ph === "RESULT" || ph === "LOBBY") {
    setGoVoteClicked(false);
  }

  // ✅ VOTING일 때는 goVoteClicked 유지해서 "방장이 눌렀다" 표시 가능
}, [publicState?.phase]);



  const isHost = useMemo(() => {
    if (!publicState || !playerId) return false;
    return Boolean(publicState.players.find(p => p.playerId === playerId)?.isHost);
  }, [publicState, playerId]);

  const isAliveMe = useMemo(() => {
    if (!publicState || !playerId) return false;
    return Boolean(publicState.players.find(p => p.playerId === playerId)?.isAlive);
  }, [publicState, playerId]);

  const alivePlayers = useMemo(() => {
    return (publicState?.players ?? []).filter(p => p.isAlive);
  }, [publicState?.players]);

  // ✅ 내가 이미 답변 제출했는지
  const mySubmittedValue = useMemo(() => {
    if (!publicState || !playerId) return null;
    const v = publicState.round.answersByPlayerId?.[playerId];
    return typeof v === "number" ? v : null;
  }, [publicState, playerId]);
  const iAlreadySubmitted = mySubmittedValue !== null;

  // ✅ 투표권: 생존자 누구나 + phase=VOTING일 때만
  const canVoteNow = useMemo(() => {
    return joined && isAliveMe && phase === "VOTING";
  }, [joined, isAliveMe, phase]);

  // ✅ 투표 대상: 생존자 중 자기 제외
  const voteTargets = useMemo(() => {
    return alivePlayers.filter(p => p.playerId !== playerId);
  }, [alivePlayers, playerId]);

  // ✅ 투표 패널 표시 조건
  const showVotePanel = joined && (phase === "VOTING" || voteMode);

  // ✅ 점수표: 점수 내림차순 정렬
  const sortedPlayers = useMemo(() => {
    const ps = [...(publicState?.players ?? [])];
    ps.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return ps;
  }, [publicState?.players]);

  const eliminatedName = useMemo(() => {
    if (!publicState?.lastEliminatedPlayerId) return null;
    return publicState.players.find(p => p.playerId === publicState.lastEliminatedPlayerId)?.nickname ?? null;
  }, [publicState]);

  const championName = useMemo(() => {
    if (!publicState?.championPlayerId) return null;
    return publicState.players.find(p => p.playerId === publicState.championPlayerId)?.nickname ?? null;
  }, [publicState]);

  const winnerNames = useMemo(() => {
    const ids = publicState?.winnerPlayerIds ?? [];
    if (!publicState || ids.length === 0) return [];
    const map = new Map(publicState.players.map(p => [p.playerId, p.nickname] as const));
    return ids.map(id => map.get(id) ?? id);
  }, [publicState]);

  // ✅ phase/round 변화에 따른 투표 UI 초기화 규칙
  useEffect(() => {
    // 새 라운드면 전부 초기화
    setMyVotedTargetId("");
    setSelectedVoteTargetId("");
    setVoteMode(false);
    setGoVoteClicked(false);

    // 역할 입력은 라운드 바뀌면 그냥 유지(원하면 초기화로 바꿔도 됨)
  }, [publicState?.round.index]);

  // ✅ “투표하러 가기”는 방장만 노출 (요구사항)
  const canShowGoVoteButton = useMemo(() => {
    if (!joined) return false;
    if (!isHost) return false;
    // 방장은 생존 여부와 무관하게? → 원래는 생존자만. 요구는 “방장만 가능”이었고
    // 투표 시작은 진행 제어이므로 방장 생존 여부와 무관하게 열어두는게 운영상 편함.
    // 원하면 isAliveMe도 추가.
    return phase === "REVEAL" || phase === "DISCUSS" || phase === "TIE_DISCUSS" || phase === "VOTING";
  }, [joined, isHost, phase]);

  async function resetAll(): Promise<void> {
    setBusy(true);
    try {
      const res = await fetch("/api/liar/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });

      if (!res.ok) {
        setToast("전체 초기화 실패");
        return;
      }

      removeLS("liar_player_id");
      removeLS("liar_nickname");
      removeLS("liar_version");

      location.reload();
    } finally {
      setBusy(false);
    }
  }

  // localStorage load + resume
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

  // ✅ DISCUSS(첫 토론) / TIE_DISCUSS(재논의) 타이머 종료되면 “투표 UI”만 자동 오픈
  // 실제 투표 단계 전환은: (1) state.ts auto advance (DISCUSS 종료 시 VOTING) + (2) 방장 vote-start
  useEffect(() => {
    if (!joined) return;
    if (!publicState) return;

    const isDiscussLike = publicState.phase === "DISCUSS" || publicState.phase === "TIE_DISCUSS";
    if (!isDiscussLike) return;

    const endsAt =
      publicState.phase === "DISCUSS" ? publicState.round.discussEndsAt : publicState.round.tieDiscussEndsAt;

    if (!endsAt) return;

    const ms = remainingMs(endsAt);
    if (ms <= 0) {
      setVoteMode(true);
      return;
    }

    const t = window.setTimeout(() => setVoteMode(true), ms);
    return () => window.clearTimeout(t);
  }, [
    joined,
    isAliveMe,
    publicState?.phase,
    publicState?.round.discussEndsAt,
    publicState?.round.tieDiscussEndsAt,
  ]);

  async function join(): Promise<void> {
    setJoinErr("");
    const nn = nickname.trim();
    if (!nn) {
      setJoinErr("닉네임 필요");
      return;
    }
    if (!playerId) {
      setJoinErr("세션 준비 중");
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
        setJoinErr(msgFromErrorCode(j?.error));
      }
    } catch {
      setJoinErr("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  /** ✅ 방장 역할 수 입력 검증 + payload 생성
   * - 빈칸이면 "미지정" → 서버 기본 알고리즘 사용
   * - 값이 들어왔으면: 0 이상 정수 + 합 <= 전체 인원(또는 생존 인원) 검증
   */
  function buildRoleOverridePayload(): { liarCount?: number; trollCount?: number; audienceCount?: number } | null {
    setRoleConfigErr("");

    const liarN = parseNonNegativeInt(roleLiarInput);
    const trollN = parseNonNegativeInt(roleTrollInput);
    const audN = parseNonNegativeInt(roleAudienceInput);

    const allEmpty = liarN === null && trollN === null && audN === null;
    if (allEmpty) return {}; // 미지정 → 서버 기본값

    // 부분 입력 허용? (요구는 "자유롭게 입력", 대신 합 검증) → 빈칸은 0 취급하면 제일 직관적
    // 하지만 "입력된 게 없다면 기본"이므로, 하나라도 입력하면 빈칸은 0으로 간주
    const liar = liarN ?? 0;
    const troll = trollN ?? 0;
    const aud = audN ?? 0;

    const sum = liar + troll + aud;

    // ✅ “모든 인원수 이하” = joinedCount 기준(요구사항 문구대로)
    // (만약 “생존 인원수 기준”이 더 맞으면 aliveCount로 바꾸면 됨)
    const limit = joinedCount;

    if (liar === 0) {
      setRoleConfigErr(`라이어는 1명 이상이어야 해요`);
      return null;
    }

    if (aud === 0) {
      setRoleConfigErr(`관객은 1명 이상이어야 해요`);
      return null;
    }

    if (sum > limit) {
      setRoleConfigErr(`역할 합(${sum})이 인원수(${limit})를 넘어요`);
      return null;
    }

    if (sum < limit) {
      setRoleConfigErr(`역할 합(${sum})이 인원수(${limit})보다 적어요`);
      return null;
    }

    if (liar >= aud) {
      setRoleConfigErr(`관객은 라이어보다 많아야 해요`);
      return null;
    }

    // 0 이상 정수는 parse에서 보장됨
    return { liarCount: liar, trollCount: troll, audienceCount: aud };
  }

  async function startGame(): Promise<void> {
    if (!isHost) return;

    const rolePayload = buildRoleOverridePayload();
    if (rolePayload === null) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/liar/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ✅ start API가 이 필드를 받도록 서버 start 코드도 반영 필요
        body: JSON.stringify({ playerId, ...rolePayload }),
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        setToast(msgFromErrorCode(j?.error));
        return;
      }

      removeLS("liar_version");
      publicVersionRef.current = 0;
      setToast("게임 시작");
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

      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        setToast(msgFromErrorCode(j?.error));
        return;
      }

      removeLS("liar_version");
      publicVersionRef.current = 0;
      setToast("요청 완료");
    } finally {
      setBusy(false);
    }
  }

  async function resetRound(): Promise<void> {
    if (!isHost) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/liar/restart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        setToast(msgFromErrorCode(j?.error));
        return;
      }

      removeLS("liar_version");
      publicVersionRef.current = 0;
      setPublicState(null);
      setMe(null);

      // UI 초기화
      setVoteMode(false);
      setSelectedVoteTargetId("");
      setMyVotedTargetId("");
      setGoVoteClicked(false);
      setToast("이번 판 초기화");
    } finally {
      setBusy(false);
    }
  }

  // ✅ "투표하러 가기" — 방장만 가능
  async function goToVoting(): Promise<void> {
    if (!isHost) return;

    setGoVoteClicked(true);
    setVoteMode(true);

    // 투표 기능 초기화(재논의 → 재투표 대비)
    setSelectedVoteTargetId("");
    setMyVotedTargetId("");

    try {
      const res = await fetch(`/api/liar/vote-start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        setToast(msgFromErrorCode(j?.error));
        setGoVoteClicked(false);
        return;
      }

      removeLS("liar_version");
      publicVersionRef.current = 0;
      setToast("투표로 이동");
    } catch {
      setToast("네트워크 오류");
      setGoVoteClicked(false);
    }
  }

  async function submitVote(): Promise<void> {
    if (!selectedVoteTargetId) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/liar/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, targetPlayerId: selectedVoteTargetId }),
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string; phase?: string } | null;
        setToast(msgFromErrorCode(j?.error));
        return;
      }

      // ✅ 내 투표 기록(프론트 잠금)
      setMyVotedTargetId(selectedVoteTargetId);
      setVoteMode(true);

      removeLS("liar_version");
      publicVersionRef.current = 0;
      setToast("투표 완료");
    } finally {
      setBusy(false);
      await finalizeResult();
    }
  }

  async function finalizeResult(): Promise<void> {
    if (!isAliveMe) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/liar/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        setToast(msgFromErrorCode(j?.error) || "결과 확정 실패");
        return;
      }

      removeLS("liar_version");
      publicVersionRef.current = 0;
      setToast("결과 확정");
    } finally {
      setBusy(false);
    }
  }

  const questionText = me?.question ?? null;

  const roundWinners = useMemo(() => {
    const ids = publicState?.winnerPlayerIds;
    if (Array.isArray(ids) && ids.length > 0) return ids; // ✅ 승자 전원

    // ✅ fallback: 기존 로직(1명)
    if (publicState?.championPlayerId) return [publicState.championPlayerId];

    return [];
  }, [publicState?.winnerPlayerIds, publicState?.championPlayerId]);

  const finalChampionSet = useMemo(() => {
    // 1) 서버가 배열을 내려주는 경우
    const ids = (publicState as any)?.finalChampionPlayerIds as string[] | undefined;
    if (Array.isArray(ids) && ids.length > 0) return new Set(ids);

    // 2) (만약 서버가 단일만 내려준다면) fallback 단일 id 지원
    const single = (publicState as any)?.finalChampionPlayerId as string | null | undefined;
    if (single) return new Set([single]);

    return new Set<string>();
  }, [
    (publicState as any)?.finalChampionPlayerIds,
    (publicState as any)?.finalChampionPlayerId,
  ]);

  const deadTrollId =
    publicState?.lastEliminatedWasTroll
      ? publicState?.lastEliminatedPlayerId
      : null;


  return (
    <main className="min-h-screen bg-gray-100 p-4">
      {/* 게임 방법 모달 */}
      <HowToModal open={showHowTo} onClose={() => setShowHowTo(false)} /> 

      <div className="mx-auto max-w-md space-y-3">
        {/* 간단 토스트 */}
        {toast ? (
          <div className="rounded-xl border bg-white px-3 py-2 text-xs text-gray-700">
            {toast}
            <button className="ml-2 underline text-gray-600" onClick={() => setToast("")}>
              닫기
            </button>
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="text-xs underline text-gray-600 disabled:opacity-50"
              onClick={resetAll}
              disabled={busy}
              title="닉네임/점수/게임상태까지 모두 삭제"
            >
              전체 초기화
            </button>

            <button
              type="button"
              className="text-xs underline text-gray-600 hover:text-gray-800"
              onClick={() => setShowHowTo(true)}
              title="게임 방법 보기"
            >
              게임 방법
            </button>
          </div>

          <div className="text-[11px] text-gray-500">버전 {publicState?.version ?? 0}</div>
        </div>


        {/* 상단 상태 카드 */}
        <header className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold">라이어 게임</h1>
            <div className="text-xs text-gray-500">{phaseKo}</div>
          </div>

          <div className="mt-2 text-sm text-gray-700">
            참여 <span className="font-semibold">{joinedCount}</span>명 · 생존{" "}
            <span className="font-semibold">{aliveCount}</span>명
          </div>

          <div className="mt-1 text-sm text-gray-700">
            내 역할 <span className="font-semibold">{meRoleKo}</span>
            {!isAliveMe && joined ? <span className="ml-2 text-xs text-gray-500">(사망)</span> : null}
          </div>
        </header>

        {/* 참가 전 */}
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
              className="mt-3 w-full rounded-lg bg-black px-3 py-2 text-sm font-semibold !text-white disabled:opacity-50"
              onClick={join}
              disabled={busy}
            >
              참가하기
            </button>
          </section>
        ) : (
          <>
            {/* 참여자 목록 + 점수 */}
            <section className="rounded-xl border bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">참여자</div>
                <div className="text-xs text-gray-500">점수</div>
              </div>

              <div className="mt-2 space-y-2">
                {sortedPlayers.map(p => {
                  const score = p.score ?? 0;
                  const isMe = p.playerId === playerId;
                  const isFinalChampion = finalChampionSet.has(p.playerId);

                  return (
                    <div
                      key={p.playerId}
                      className={[
                        "flex items-center justify-between rounded-lg border px-3 py-2",
                        // ✅ 최종 우승자 라인 강조 (여러명이면 여러명 전부)
                        isFinalChampion
                          ? "bg-purple-50 border-purple-300 ring-2 ring-purple-200"
                          : isMe
                            ? "bg-gray-50"
                            : "bg-white",
                      ].join(" ")}
                    >
                      <div className="text-sm">
                        <span className={["font-semibold", isFinalChampion ? "text-purple-800" : ""].join(" ")}>
                          {p.nickname}
                        </span>

                        {isMe ? <span className="ml-2 text-xs text-gray-500">(나)</span> : null}
                        {p.isHost ? <span className="ml-2 text-xs text-blue-600">(방장)</span> : null}
                        {!p.isAlive ? <span className="ml-2 text-xs text-gray-500">(사망)</span> : null}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* ✅ 최종 우승 태그 */}
                        {isFinalChampion ? (
                          <span className="rounded-full bg-purple-200 px-2 py-0.5 text-[11px] font-semibold text-purple-900">
                            최종 우승
                          </span>
                        ) : null}

                        {/* ✅ 라운드 승자 전원 WIN */}
                        {roundWinners.includes(p.playerId) ? (
                          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-semibold text-yellow-800">
                            WIN
                          </span>
                        ) : null}

                        {/* ✅ 트롤이 죽었을 때만 표시 */}
                          {deadTrollId === p.playerId ? (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800">
                              트롤
                            </span>
                          ) : null}

                        {/* ✅ 점수 뱃지도 최종 우승자면 강조 */}
                        <span
                          className={[
                            "rounded-full px-2 py-0.5 text-[11px] font-semibold !text-white",
                            isFinalChampion ? "bg-purple-800" : "bg-gray-900",
                          ].join(" ")}
                        >
                          {score}점
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 방장 메뉴 */}
            {isHost ? (
              <section className="rounded-xl border bg-white p-4 space-y-3">
                <div className="text-sm font-semibold">방장 메뉴</div>

                {/* ✅ 역할 수 커스텀 입력 폼 */}
                <div className="rounded-xl border bg-gray-50 p-3">
                  <div className="text-xs font-semibold text-gray-700">역할 수</div>

                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <label className="text-xs text-gray-600">
                      라이어
                      <input
                        className="mt-1 w-full rounded-lg border px-2 py-1 text-sm outline-none"
                        value={roleLiarInput}
                        onChange={e => {
                          setRoleTouched(true);
                          setRoleLiarInput(e.target.value);
                        }}
                        inputMode="numeric"
                        placeholder="0"
                        disabled={busy || phase !== "PREP"}
                      />
                    </label>

                    <label className="text-xs text-gray-600">
                      트롤
                      <input
                        className="mt-1 w-full rounded-lg border px-2 py-1 text-sm outline-none"
                        value={roleTrollInput}
                        onChange={e => {
                          setRoleTouched(true);
                          setRoleTrollInput(e.target.value);
                        }}
                        inputMode="numeric"
                        placeholder="0"
                        disabled={busy || phase !== "PREP"}
                      />
                    </label>

                    <label className="text-xs text-gray-600">
                      관객
                      <input
                        className="mt-1 w-full rounded-lg border px-2 py-1 text-sm outline-none"
                        value={roleAudienceInput}
                        onChange={e => {
                          setRoleTouched(true);
                          setRoleAudienceInput(e.target.value);
                        }}
                        inputMode="numeric"
                        placeholder="0"
                        disabled={busy || phase !== "PREP"}
                      />
                    </label>
                  </div>

                  <div className="mt-2 text-[11px] text-gray-500">
                    0 이상 정수 · 역할 합 = 인원수({joinedCount})
                  </div>

                  {/* ✅ 원하면 “기본값으로 되돌리기” 버튼 하나 추가 */}
                  <button
                    type="button"
                    className={`
                      mt-2 w-full rounded-lg border px-3 py-2 text-sm font-semibold
                      transition-all duration-200
                      ${resetClicked ? "bg-gray-200 scale-[0.97]" : "bg-white hover:bg-gray-50"}
                      disabled:opacity-50
                    `}
                    onClick={() => {
                      const base = defaultRoleCounts(joinedCount);

                      setResetClicked(true);          // ✅ 눌림 효과 ON
                      setRoleTouched(false);          // 자동 관리로 복귀
                      setRoleLiarInput(String(base.liar));
                      setRoleTrollInput(String(base.troll));
                      setRoleAudienceInput(String(base.audience));

                      // ✅ 300ms 후 효과 해제
                      setTimeout(() => setResetClicked(false), 300);
                    }}
                    disabled={busy || phase !== "PREP"}
                  >
                    {resetClicked ? "기본값 적용" : "기본값으로 되돌리기"}
                  </button>


                  {roleConfigErr ? <div className="mt-2 text-xs text-red-600">{roleConfigErr}</div> : null}
                </div>


                <div className="grid grid-cols-2 gap-2">
                  <button
                    className="rounded-lg bg-black px-3 py-2 text-sm font-semibold !text-white disabled:opacity-50"
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
                    이번 판 초기화
                  </button>
                </div>

                <div className="text-xs text-gray-500">이번 판 초기화는 점수는 유지됩니다.</div>
              </section>
            ) : null}

            {/* 라운드 정보 */}
            <section className="rounded-xl border bg-white p-4">
              <div className="text-sm font-semibold">현재 라운드</div>

              <div className="mt-2 text-sm text-gray-700">
                숫자 범위 <span className="font-semibold">{publicState?.round.min ?? 0}</span> ~{" "}
                <span className="font-semibold">{publicState?.round.max ?? 0}</span>
              </div>

              {questionText ? (
                <div className="mt-2 rounded-lg border bg-gray-50 p-3 text-sm">
                  <div className="text-xs text-gray-500">질문</div>
                  <div className="mt-1 font-semibold text-gray-900">{questionText}</div>
                </div>
              ) : (
                <div className="mt-2 text-sm text-gray-500">질문 비공개</div>
              )}

              {/* <div className="mt-3 flex items-center justify-between gap-2">
                <div className="text-xs text-gray-500">
                  질문 변경 동의 {publicState?.round.questionChangeCount ?? 0}/{aliveCount}
                </div>

                <button
                  className="shrink-0 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50"
                  onClick={requestQuestionChange}
                  disabled={busy || phase !== "PREP" || aliveCount < 3}
                >
                  질문 바꾸기
                </button>
              </div> */}
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
                alreadySubmitted={iAlreadySubmitted}
                submittedValue={mySubmittedValue}
                onToast={setToast}
              />
            ) : null}

            {/* 답변 공개 */}
            {phase === "REVEAL" ? (
              <RevealCard players={publicState?.players ?? []} answers={publicState?.round.answersByPlayerId ?? {}} />
            ) : null}

            {/* ✅ 투표하러 가기: 방장만 */}
            {canShowGoVoteButton ? (
              <section className="rounded-xl border bg-white p-4">
                <button
                  className="w-full rounded-lg bg-black px-3 py-2 text-sm font-semibold !text-white disabled:opacity-50"
                  onClick={goToVoting}
                  disabled={busy || goVoteClicked}
                  title="투표 단계로 전환"
                >
                  {goVoteClicked ? "이동 중…" : "투표하러 가기"}
                </button>

                <div className="mt-2 text-xs text-gray-500">
                  방장만 가능합니다.
                </div>
              </section>
            ) : null}

            {/* 토론/재논의(본문에도 유지) */}
            {phase === "DISCUSS" || phase === "TIE_DISCUSS" ? (
              <section className="rounded-xl border bg-white p-4 space-y-2">
                <TimerCard
                  title={phase === "DISCUSS" ? "토론 시간" : "동점 재논의 시간"}
                  endsAt={phase === "DISCUSS" ? publicState?.round.discussEndsAt ?? null : publicState?.round.tieDiscussEndsAt ?? null}
                />
                <div className="text-xs text-gray-500">
                  동점이면 재논의 후 다시 투표로 이동해야 합니다.
                </div>
              </section>
            ) : null}

            {/* 투표 패널 */}
            {showVotePanel ? (
              <section className="rounded-xl border bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">투표</div>
                  <div className="text-xs text-gray-500">{phaseKo}</div>
                </div>

                <div className="mt-1 text-xs text-gray-500">
                  {phase === "VOTING" ? "대상 선택 후 투표" : "투표 단계가 아닐 수 있어요"}
                </div>

                <div className="mt-3 space-y-2">
                  {voteTargets.map(p => {
                    const selected = p.playerId === selectedVoteTargetId;
                    const count = publicState?.round.voteCounts?.[p.playerId] ?? 0;

                    return (
                      <button
                        key={p.playerId}
                        type="button"
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm font-semibold ${
                          selected ? "border-black bg-gray-100" : ""
                        }`}
                        onClick={() => setSelectedVoteTargetId(p.playerId)}
                        disabled={!isAliveMe || busy || !!myVotedTargetId}
                      >
                        <div className="flex items-center justify-between">
                          <span>{p.nickname}</span>
                          <span className="text-xs text-gray-500">표 {count}</span>
                        </div>
                      </button>
                    );
                  })}

                  {voteTargets.length === 0 ? <div className="text-sm text-gray-500">대상이 없습니다</div> : null}
                </div>

                <div className="mt-3 grid gap-2">
                  <button
                    className="rounded-lg bg-black px-3 py-2 text-sm font-semibold !text-white disabled:opacity-50"
                    onClick={submitVote}
                    disabled={busy || !canVoteNow || !selectedVoteTargetId || !!myVotedTargetId}
                  >
                    {myVotedTargetId ? "투표 완료" : "투표"}
                  </button>
                </div>

                {myVotedTargetId ? (
                  <div className="mt-2 text-xs text-gray-600">내 투표 완료</div>
                ) : null}

                {!canVoteNow ? (
                  <div className="mt-2 text-xs text-red-600">
                    {phase !== "VOTING" ? "투표 단계 아님" : "사망자는 불가"}
                  </div>
                ) : null}
              </section>
            ) : null}

            {/* 결과 단계 */}
            {phase === "RESULT" ? (
              <section className="rounded-xl border bg-white p-4 space-y-3">
                <div className="text-sm font-semibold">결과</div>

                <div className="text-sm text-gray-700">
                  탈락 <span className="font-semibold">{eliminatedName ?? "미정"}</span>
                  {publicState?.lastEliminatedPlayerId ? (
                    <span className="ml-2 text-xs text-gray-500">
                      ({publicState.lastEliminatedWasTroll ? "트롤" : "관객/라이어"})
                    </span>
                  ) : null}
                </div>

                <button
                  className="w-full rounded-lg bg-black px-3 py-2 text-sm font-semibold !text-white disabled:opacity-50"
                  onClick={finalizeResult}
                  disabled={busy || !isAliveMe}
                >
                  결과 확정
                </button>
              </section>
            ) : null}

            {/* 게임 종료 */}
            {phase === "GAME_OVER" ? (
              <section className="rounded-xl border bg-white p-4 space-y-2">
                <div className="text-lg font-bold">게임 종료</div>

                {/* ✅ 서버가 winnerPlayerIds 내려주면 “승리자 전원” 표시 */}
                {winnerNames.length > 0 ? (
                  <div className="text-sm text-gray-700">
                    승리: <span className="font-semibold">{winnerNames.join(", ")}</span>
                  </div>
                ) : (
                  <div className="text-sm text-gray-700">
                    우승자: <span className="font-semibold">{championName ?? "미정"}</span>
                  </div>
                )}

                <div className="text-xs text-gray-500">점수 반영은 서버에서 처리됩니다.</div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}

/** 상단에 크게 보이는 타이머 */
function TimerPill({ title, endsAt, hint }: { title: string; endsAt: number | null; hint: string }) {
  const [, setTick] = useState<number>(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick(v => v + 1), 250);
    return () => window.clearInterval(t);
  }, []);
  const sec = Math.ceil(remainingMs(endsAt) / 1000);
  const danger = sec <= 10;

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-xs text-gray-500">{title} · {hint}</div>
        <div className={`text-3xl font-extrabold ${danger ? "text-red-600" : "text-gray-900"}`}>{sec}초</div>
      </div>
      <div className="text-xs text-gray-500">남은 시간</div>
    </div>
  );
}

function TimerCard({ title, endsAt }: { title: string; endsAt: number | null }) {
  const [, setTick] = useState<number>(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick(v => v + 1), 250);
    return () => window.clearInterval(t);
  }, []);
  const sec = Math.ceil(remainingMs(endsAt) / 1000);
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
  alreadySubmitted,
  submittedValue,
  onToast,
}: {
  playerId: string;
  min: number;
  max: number;
  submittedCount: number;
  aliveCount: number;
  endsAt: number | null;
  alreadySubmitted: boolean;
  submittedValue: number | null;
  onToast: (msg: string) => void;
}) {
  const [value, setValue] = useState<string>("");
  const [err, setErr] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  const [, setTick] = useState<number>(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick(v => v + 1), 250);
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
      const res = await fetch(`/api/liar/submit-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, value: n }),
      });

      if (res.status === 409) {
        setErr("이미 제출");
        return;
      }

      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        setErr(msgFromErrorCode(j?.error));
        return;
      }

      setValue("");
      onToast("제출 완료");
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
        className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none disabled:bg-gray-100"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={`${min} ~ ${max} 정수`}
        inputMode="numeric"
        disabled={busy || alreadySubmitted}
      />

      {alreadySubmitted ? (
        <div className="mt-2 text-sm text-gray-600">
          이미 제출{typeof submittedValue === "number" ? ` (내 답 ${submittedValue})` : ""}
        </div>
      ) : null}

      {err ? <div className="mt-2 text-sm text-red-600">{err}</div> : null}

      <button
        className="mt-3 w-full rounded-lg bg-black px-3 py-2 text-sm font-semibold !text-white disabled:opacity-50"
        onClick={submit}
        disabled={busy || alreadySubmitted}
      >
        제출
      </button>

      <div className="mt-2 text-xs text-gray-500">제출 후 수정 불가</div>
    </section>
  );
}

function HowToModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onMouseDown={onClose} // 바깥 클릭 닫기
      role="dialog"
      aria-modal="true"
      aria-label="게임 방법"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
        onMouseDown={e => e.stopPropagation()} // 내부 클릭은 닫기 방지
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-bold">🕵️‍♂️ 라이어 게임 방법</div>
          <button className="text-xs underline text-gray-600" onClick={onClose}>
            닫기
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto px-4 py-4 space-y-4">
          {/* ✅ 최상단 한 줄 카피 */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-900 bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-3 text-center">
            {/* 은은한 움직이는 라인 */}
            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="relative z-10 text-sm font-extrabold tracking-wide text-white">
              잡거나, 숨거나, 일부러 죽거나
            </div>
          </div>

          {/* ✅ 최상단: 게임 목표(캐주얼) */}
          <section className="rounded-xl border bg-gray-50 p-3">
            <div className="text-xs font-semibold text-gray-700 mb-2">🎯 게임 목표</div>

            <div className="space-y-3">
              <div className="rounded-lg border bg-white p-3">
                <div className="text-sm font-semibold">관객</div>
                <div className="mt-1 text-sm text-gray-700">→ 수상한 답변을 골라 라이어를 잡아내세요</div>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="text-sm font-semibold">라이어</div>
                <div className="mt-1 text-sm text-gray-700">→ 들키지 말고 버티세요</div>
                <div className="mt-1 text-sm text-gray-700">→ 라이어 중 한 명이라도 살아남으면 승리!</div>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="text-sm font-semibold">트롤</div>
                <div className="mt-1 text-sm text-gray-700">→ 인생은 혼자, 열심히 눈에 띄세요</div>
                <div className="mt-1 text-sm text-gray-700">→ 투표로 죽으면 보너스 점수 획득!</div>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="text-sm font-semibold">최종 목표</div>
                <div className="mt-1 text-sm text-gray-700">누가 먼저 300점을 찍느냐가 진짜 승자</div>
              </div>
            </div>
          </section>

          {/* 기존 섹션들 유지 */}
          <section className="rounded-xl border bg-gray-50 p-3">
            <div className="text-xs font-semibold text-gray-700 mb-2">🎭 역할 세부 설명</div>

            <div className="space-y-3">
              <div className="rounded-lg border bg-white p-3">
                <div className="text-sm font-semibold">👥 관객</div>
                <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-1">
                  <li>질문을 알고 있음</li>
                  <li>라이어를 찾아내는 것이 목표</li>
                  <li>
                    <span className="font-semibold">라이어가 모두 죽으면 관객 승리</span>(+100점)
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="text-sm font-semibold">🕵️ 라이어</div>
                <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-1">
                  <li>질문을 모른 채 정해진 범위 안에서 답변</li>
                  <li>관객인 척 연기하며 살아남아야 함</li>
                  <li>
                    <span className="font-semibold">라이어 수 = 관객 수</span>가 되면 라이어 승리(+100점)
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="text-sm font-semibold">🤡 트롤</div>
                <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-1">
                  <li>질문을 알고 있음</li>
                  <li>투표로 죽는 것이 목표</li>
                  <li>
                    <span className="font-semibold">죽으면 본인만 보너스 점수</span> 획득(+100점)
                  </li>
                  <li>트롤은 게임 승패에 포함되지 않음</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="rounded-xl border p-3">
            <div className="text-xs font-semibold text-gray-700 mb-2">▶️ 게임 진행</div>
            <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1">
              <li>질문 공개</li>
              <li>답변 입력</li>
              <li>토론</li>
              <li>투표 → 1명 탈락</li>
            </ol>
            <div className="mt-2 text-xs text-gray-500">동점이면 재논의 후 재투표</div>
          </section>

          <section className="rounded-xl border p-3">
            <div className="text-xs font-semibold text-gray-700 mb-2">🏆 점수 & 종료</div>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
              <li>관객 승리 → 관객 +100</li>
              <li>라이어 승리 → 라이어 +100 (트롤 제외)</li>
              <li>트롤이 죽으면 → 트롤 본인 +100 (게임은 계속)</li>
            </ul>

            <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
              <div className="font-semibold">🎯 최종 승리 조건</div>
              <div className="mt-1 text-gray-700">가장 먼저 300점을 달성해야한다</div>
            </div>
          </section>
        </div>

        <div className="border-t px-4 py-3">
          <button
            className="w-full rounded-lg bg-black px-3 py-2 text-sm font-semibold !text-white"
            onClick={onClose}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

