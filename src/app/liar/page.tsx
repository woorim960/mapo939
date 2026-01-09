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

  winnerPlayerIds?: string[];
  finalChampionPlayerIds?: string[];

  // ✅ 서버가 내려주는 자동 새게임 시작 시각
  autoRestartAt?: number | null;
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
  } catch {}
}
function removeLS(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {}
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

function canJoinNow(phase: Phase): boolean {
  return phase === "LOBBY" || phase === "PREP";
}

export default function LiarPage() {
  const [playerId, setPlayerId] = useState<string>("");
  const [nickname, setNickname] = useState<string>("");
  const [joined, setJoined] = useState<boolean>(false);

  // ✅ 새로고침 등으로 참가자 아님 → 관전 잠금 모드
  const [spectatorLocked, setSpectatorLocked] = useState<boolean>(false);

  const [publicState, setPublicState] = useState<PublicState | null>(null);
  const [me, setMe] = useState<MeState | null>(null);

  const [joinErr, setJoinErr] = useState<string>("");
  const [toast, setToast] = useState<string>("");

  const [busy, setBusy] = useState<boolean>(false);

  // ✅ 투표 UI 상태
  const [voteMode, setVoteMode] = useState<boolean>(false);
  const [selectedVoteTargetId, setSelectedVoteTargetId] = useState<string>("");
  const [myVotedTargetId, setMyVotedTargetId] = useState<string>("");
  const [goVoteClicked, setGoVoteClicked] = useState<boolean>(false);

  // ✅ 방장 역할 수 커스텀 입력
  const [roleLiarInput, setRoleLiarInput] = useState<string>("");
  const [roleTrollInput, setRoleTrollInput] = useState<string>("");
  const [roleAudienceInput, setRoleAudienceInput] = useState<string>("");
  const [roleConfigErr, setRoleConfigErr] = useState<string>("");
  const [resetClicked, setResetClicked] = useState(false);
  const [roleTouched, setRoleTouched] = useState<boolean>(false);

  const [showHowTo, setShowHowTo] = useState(false);

  // ✅ 최종 우승 축하 오버레이
  const [showFinalCelebrate, setShowFinalCelebrate] = useState(false);

  /** 서버와 동일한 기본 배치 */
  function defaultRoleCounts(n: number): { liar: number; troll: number; audience: number } {
    if (n < 3) return { liar: 0, troll: 0, audience: n };

    const liar = Math.max(1, Math.floor((n + 1) / 4));

    let troll = 0;
    if (n === 3) troll = 0;
    else {
      const r = n % 4;
      if (r === 0 || r === 1) troll = liar;
      else if (r === 2) troll = liar + 1;
      else troll = Math.max(0, liar - 1);
    }

    const audience = n - liar - troll;
    return { liar, troll, audience };
  }

  // 최신 version ref
  const publicVersionRef = useRef<number>(0);
  useEffect(() => {
    publicVersionRef.current = publicState?.version ?? publicVersionRef.current;
  }, [publicState?.version]);

  const phase: Phase = publicState?.phase ?? "LOBBY";
  const phaseKo = phaseLabel(phase);
  const meRoleKo = roleLabel(me?.role ?? null);

  const joinedCount = publicState?.players.length ?? 0;
  const aliveCount = publicState?.players.filter(p => p.isAlive).length ?? 0;

  // ✅ PREP에서만 자동 역할 기본값 채우기
  useEffect(() => {
    if (phase !== "PREP") return;
    if (roleTouched) return;

    const n = joinedCount;
    const base = defaultRoleCounts(n);
    setRoleLiarInput(String(base.liar));
    setRoleTrollInput(String(base.troll));
    setRoleAudienceInput(String(base.audience));
  }, [phase, joinedCount, roleTouched]);

  // ✅ phase 변화에 따른 투표 UI 초기화
  useEffect(() => {
    if (!publicState) return;
    const ph = publicState.phase;

    if (ph === "PREP" || ph === "TIE_DISCUSS" || ph === "DISCUSS") {
      setMyVotedTargetId("");
      setSelectedVoteTargetId("");
      setVoteMode(false);
      setGoVoteClicked(false);
      return;
    }

    if (ph === "REVEAL" || ph === "RESULT" || ph === "LOBBY") {
      setGoVoteClicked(false);
    }
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

  const mySubmittedValue = useMemo(() => {
    if (!publicState || !playerId) return null;
    const v = publicState.round.answersByPlayerId?.[playerId];
    return typeof v === "number" ? v : null;
  }, [publicState, playerId]);
  const iAlreadySubmitted = mySubmittedValue !== null;

  // ✅ 투표권: 참가 + 생존 + 투표단계
  const canVoteNow = useMemo(() => {
    return joined && isAliveMe && phase === "VOTING";
  }, [joined, isAliveMe, phase]);

  const voteTargets = useMemo(() => {
    return alivePlayers.filter(p => p.playerId !== playerId);
  }, [alivePlayers, playerId]);

  const showVotePanel = joined && (phase === "VOTING" || voteMode);

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

  useEffect(() => {
    setMyVotedTargetId("");
    setSelectedVoteTargetId("");
    setVoteMode(false);
    setGoVoteClicked(false);
  }, [publicState?.round.index]);

  const canShowGoVoteButton = useMemo(() => {
    if (!joined) return false;
    if (!isHost) return false;
    return phase === "REVEAL" || phase === "DISCUSS" || phase === "TIE_DISCUSS" || phase === "VOTING";
  }, [joined, isHost, phase]);

  // ✅ GAME_OVER 축하 오버레이 자동 노출 / 자동 닫힘
  const finalChampionIds = useMemo(() => {
    return publicState?.finalChampionPlayerIds ?? [];
  }, [publicState?.finalChampionPlayerIds]);

  const finalChampionNames = useMemo(() => {
    if (!publicState || finalChampionIds.length === 0) return [];
    const map = new Map(publicState.players.map(p => [p.playerId, p.nickname] as const));
    return finalChampionIds.map(id => map.get(id) ?? id);
  }, [publicState, finalChampionIds]);

  useEffect(() => {
    if (!publicState) return;

    // GAME_OVER + 최종우승자 있으면 바로 오버레이
    if (publicState.phase === "GAME_OVER" && (publicState.finalChampionPlayerIds ?? []).length > 0) {
      setShowFinalCelebrate(true);
      return;
    }

    // 새 게임으로 돌아오면 오버레이 종료
    if (publicState.phase === "LOBBY" || publicState.phase === "PREP") {
      setShowFinalCelebrate(false);
    }
  }, [publicState?.phase, publicState?.finalChampionPlayerIds]);

  // ✅ 새로고침/세션 꼬임으로 spectatorLocked일 때,
  // 새게임(LOBBY/PREP) 되면 "참가 가능" 안내를 토스트로 한 번 띄우기
  useEffect(() => {
    if (!spectatorLocked) return;
    if (!publicState) return;
    if (canJoinNow(publicState.phase)) {
      setToast("새 게임이 시작됐어요. 지금부터 참가할 수 있어요!");
    }
  }, [spectatorLocked, publicState?.phase]);

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

  // ✅ localStorage load + resume
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
          setSpectatorLocked(false);
        }
        return;
      }

      // 닉네임이 LS에 있다면 "참여 재개" 시도
      try {
        const res = await fetch(`/api/liar/me`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId: pid }),
        });

        if (!res.ok) {
          // ✅ 참여자가 아니면 관전 잠금 모드로 전환
          if (!cancelled) {
            setNickname(savedNick);
            setJoined(false);
            setMe(null);
            setSpectatorLocked(true);
          }
          return;
        }

        const data = (await res.json()) as MeState;

        if (!cancelled) {
          setNickname(savedNick);
          setMe(data);
          setJoined(true);
          setSpectatorLocked(false);
        }
      } catch {
        // 네트워크 오류면 일단 닉네임 유지 + 관전 잠금(안전)
        if (!cancelled) {
          setNickname(savedNick);
          setJoined(false);
          setSpectatorLocked(true);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ public state polling: joined가 아니어도(관전) 계속 돌리기
  useEffect(() => {
    if (!playerId) return;

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
  }, [playerId]);

  // ✅ poll my role/question (joined일 때만)
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
          // ✅ 중간에 참가자에서 빠지면 관전 잠금으로 전환
          setMe(null);
          setJoined(false);
          setSpectatorLocked(true);
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

  // DISCUSS/TIE_DISCUSS 타이머 끝나면 voteMode만 자동 오픈
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
  }, [joined, publicState?.phase, publicState?.round.discussEndsAt, publicState?.round.tieDiscussEndsAt]);

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

    // ✅ 진행 중이면 참가 막기(요구: 새게임이 진행되면 참여 가능)
    if (publicState && !canJoinNow(publicState.phase)) {
      setJoinErr("지금은 관전만 가능해요. 새 게임에서 참가할 수 있어요.");
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
        setSpectatorLocked(false);

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

  function buildRoleOverridePayload():
    | { liarCount?: number; trollCount?: number; audienceCount?: number }
    | null {
    setRoleConfigErr("");

    const liarN = parseNonNegativeInt(roleLiarInput);
    const trollN = parseNonNegativeInt(roleTrollInput);
    const audN = parseNonNegativeInt(roleAudienceInput);

    const allEmpty = liarN === null && trollN === null && audN === null;
    if (allEmpty) return {};

    const liar = liarN ?? 0;
    const troll = trollN ?? 0;
    const aud = audN ?? 0;

    const sum = liar + troll + aud;
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

      setVoteMode(false);
      setSelectedVoteTargetId("");
      setMyVotedTargetId("");
      setGoVoteClicked(false);

      setToast("이번 판 초기화");
    } finally {
      setBusy(false);
    }
  }

  async function goToVoting(): Promise<void> {
    if (!isHost) return;

    setGoVoteClicked(true);
    setVoteMode(true);
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
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        setToast(msgFromErrorCode(j?.error));
        return;
      }

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
    if (Array.isArray(ids) && ids.length > 0) return ids;
    if (publicState?.championPlayerId) return [publicState.championPlayerId];
    return [];
  }, [publicState?.winnerPlayerIds, publicState?.championPlayerId]);

  const finalChampionSet = useMemo(() => new Set(finalChampionIds), [finalChampionIds]);

  const deadTrollId =
    publicState?.lastEliminatedWasTroll ? publicState?.lastEliminatedPlayerId : null;

  // ✅ GAME_OVER 오버레이 카운트다운
  const [celebrateTick, setCelebrateTick] = useState(0);
  useEffect(() => {
    if (!showFinalCelebrate) return;
    const t = window.setInterval(() => setCelebrateTick(v => v + 1), 250);
    return () => window.clearInterval(t);
  }, [showFinalCelebrate]);

  const autoRestartAt = publicState?.autoRestartAt ?? null;
  const restartInSec = useMemo(() => {
    if (!autoRestartAt) return null;
    return Math.ceil(remainingMs(autoRestartAt) / 1000);
  }, [autoRestartAt, celebrateTick]);

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      {/* ✅ 최종 우승 축하 오버레이 */}
      {showFinalCelebrate ? (
        <FinalChampionOverlay
          names={finalChampionNames}
          restartInSec={restartInSec}
        />
      ) : null}

      {/* 게임 방법 모달 */}
      <HowToModal open={showHowTo} onClose={() => setShowHowTo(false)} />

      <div className="mx-auto max-w-md space-y-3">
        {/* 토스트 */}
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
            내 상태{" "}
            <span className="font-semibold">
              {joined ? `참가 (${meRoleKo})` : spectatorLocked ? "관전(참여 불가)" : "미참가"}
            </span>
            {joined && !isAliveMe ? <span className="ml-2 text-xs text-gray-500">(사망)</span> : null}
          </div>
        </header>

        {/* ✅ 관전 잠금 안내 */}
        {!joined && spectatorLocked ? (
          <section className="rounded-xl border bg-white p-4">
            <div className="text-sm font-semibold">현재는 관전만 가능해요</div>
            <div className="mt-2 text-sm text-gray-700">
              새로고침 등으로 인해 <span className="font-semibold">현재 게임 참가자에서 제외</span>됐어요.
            </div>
            <div className="mt-2 text-xs text-gray-500">
              게임 진행 중에는 참가할 수 없고, <span className="font-semibold">새 게임(대기/준비)</span>가 되면 참가할 수 있어요.
            </div>

            <button
              className="mt-3 w-full rounded-lg bg-black px-3 py-2 text-sm font-semibold !text-white disabled:opacity-50"
              onClick={join}
              disabled={busy || !publicState || !canJoinNow(publicState.phase)}
              title={!publicState ? "상태 불러오는 중" : canJoinNow(publicState.phase) ? "참가 가능" : "새 게임에서 참가 가능"}
            >
              {publicState && canJoinNow(publicState.phase) ? "다시 참가하기" : "새 게임 대기 중…"}
            </button>

            {joinErr ? <div className="mt-2 text-sm text-red-600">{joinErr}</div> : null}
          </section>
        ) : null}

        {/* 참가 전(일반) */}
        {!joined && !spectatorLocked ? (
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
              disabled={busy || (publicState ? !canJoinNow(publicState.phase) : false)}
              title={publicState && !canJoinNow(publicState.phase) ? "진행 중에는 참가 불가" : "참가하기"}
            >
              참가하기
            </button>

            {publicState && !canJoinNow(publicState.phase) ? (
              <div className="mt-2 text-xs text-gray-500">
                지금은 게임이 진행 중이라 참가할 수 없어요. 새 게임에서 참가할 수 있어요.
              </div>
            ) : null}
          </section>
        ) : null}

        {/* 참여자 목록 + 점수 (관전이어도 보여줌) */}
        <section className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">참여자</div>
            <div className="text-xs text-gray-500">점수</div>
          </div>

          <div className="mt-2 space-y-2">
            {(sortedPlayers ?? []).map(p => {
              const score = p.score ?? 0;
              const isMe = p.playerId === playerId;
              const isFinalChampion = finalChampionSet.has(p.playerId);

              return (
                <div
                  key={p.playerId}
                  className={[
                    "flex items-center justify-between rounded-lg border px-3 py-2",
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
                    {isFinalChampion ? (
                      <span className="rounded-full bg-purple-200 px-2 py-0.5 text-[11px] font-semibold text-purple-900">
                        최종 우승
                      </span>
                    ) : null}

                    {roundWinners.includes(p.playerId) ? (
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-semibold text-yellow-800">
                        WIN
                      </span>
                    ) : null}

                    {deadTrollId === p.playerId ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800">
                        트롤
                      </span>
                    ) : null}

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
            {sortedPlayers.length === 0 ? (
              <div className="text-sm text-gray-500">참여자가 없습니다</div>
            ) : null}
          </div>
        </section>

        {/* 방장 메뉴 (joined일 때만) */}
        {joined && isHost ? (
          <section className="rounded-xl border bg-white p-4 space-y-3">
            <div className="text-sm font-semibold">방장 메뉴</div>

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

                  setResetClicked(true);
                  setRoleTouched(false);
                  setRoleLiarInput(String(base.liar));
                  setRoleTrollInput(String(base.troll));
                  setRoleAudienceInput(String(base.audience));

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

            <div className="text-xs text-gray-500">
              이번 판 초기화는 점수는 유지됩니다. (단, 누군가 300점을 달성한 상태면 서버가 자동 새게임에서 점수를 초기화합니다.)
            </div>
          </section>
        ) : null}

        {/* 라운드 정보 */}
        <section className="rounded-xl border bg-white p-4">
          <div className="text-sm font-semibold">현재 라운드</div>

          <div className="mt-2 text-sm text-gray-700">
            숫자 범위 <span className="font-semibold">{publicState?.round.min ?? 0}</span> ~{" "}
            <span className="font-semibold">{publicState?.round.max ?? 0}</span>
          </div>

          {joined ? (
            questionText ? (
              <div className="mt-2 rounded-lg border bg-gray-50 p-3 text-sm">
                <div className="text-xs text-gray-500">질문</div>
                <div className="mt-1 font-semibold text-gray-900">{questionText}</div>
              </div>
            ) : (
              <div className="mt-2 text-sm text-gray-500">질문 비공개</div>
            )
          ) : (
            <div className="mt-2 text-sm text-gray-500">참가자만 질문을 확인할 수 있어요.</div>
          )}
        </section>

        {/* 답변 입력 */}
        {joined && phase === "ANSWERING" ? (
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

        {/* 투표하러 가기(방장만) */}
        {joined && canShowGoVoteButton ? (
          <section className="rounded-xl border bg-white p-4">
            <button
              className="w-full rounded-lg bg-black px-3 py-2 text-sm font-semibold !text-white disabled:opacity-50"
              onClick={goToVoting}
              disabled={busy || goVoteClicked}
              title="투표 단계로 전환"
            >
              {goVoteClicked ? "이동 중…" : "투표하러 가기"}
            </button>
            <div className="mt-2 text-xs text-gray-500">방장만 가능합니다.</div>
          </section>
        ) : null}

        {/* 토론/재논의 */}
        {phase === "DISCUSS" || phase === "TIE_DISCUSS" ? (
          <section className="rounded-xl border bg-white p-4 space-y-2">
            <TimerCard
              title={phase === "DISCUSS" ? "토론 시간" : "동점 재논의 시간"}
              endsAt={phase === "DISCUSS" ? publicState?.round.discussEndsAt ?? null : publicState?.round.tieDiscussEndsAt ?? null}
            />
            <div className="text-xs text-gray-500">동점이면 재논의 후 다시 투표로 이동해야 합니다.</div>
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

            {!joined ? (
              <div className="mt-3 rounded-lg border bg-gray-50 p-3 text-sm text-gray-700">
                관전 중에는 투표할 수 없어요.
              </div>
            ) : null}

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
                    disabled={!joined || !isAliveMe || busy || !!myVotedTargetId}
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

            {myVotedTargetId ? <div className="mt-2 text-xs text-gray-600">내 투표 완료</div> : null}

            {!canVoteNow && joined ? (
              <div className="mt-2 text-xs text-red-600">{phase !== "VOTING" ? "투표 단계 아님" : "사망자는 불가"}</div>
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
              disabled={busy || !joined || !isAliveMe}
            >
              결과 확정
            </button>

            {!joined ? (
              <div className="text-xs text-gray-500">관전 중에는 결과 확정을 누를 수 없어요.</div>
            ) : null}
          </section>
        ) : null}

        {/* GAME_OVER 안내(오버레이는 따로 뜸) */}
        {phase === "GAME_OVER" ? (
          <section className="rounded-xl border bg-white p-4 space-y-2">
            <div className="text-lg font-bold">게임 종료</div>

            {winnerNames.length > 0 ? (
              <div className="text-sm text-gray-700">
                승리: <span className="font-semibold">{winnerNames.join(", ")}</span>
              </div>
            ) : (
              <div className="text-sm text-gray-700">
                우승자: <span className="font-semibold">{championName ?? "미정"}</span>
              </div>
            )}

            <div className="text-xs text-gray-500">
              최종 우승자가 있으면 잠시 후 자동으로 새 게임이 시작됩니다.
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

/* ✅ 화려한 최종 우승 오버레이 */
function FinalChampionOverlay({ names, restartInSec }: { names: string[]; restartInSec: number | null }) {
  const title =
    names.length === 0
      ? "최종 우승!"
      : names.length === 1
        ? `🎉 최종 우승자는 ${names[0]} 입니다!`
        : `🎉 최종 우승자는 ${names.join(", ")} 입니다!`;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 px-4">
      {/* 배경 반짝이 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Sparkles />
      </div>

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-purple-700 via-fuchsia-600 to-amber-500 p-1 shadow-2xl">
        <div className="rounded-[22px] bg-black/20 backdrop-blur-md p-6 text-center">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-xs font-semibold text-white/90">
            🏆 FINAL CHAMPION
          </div>

          <div className="text-2xl font-extrabold tracking-tight text-white drop-shadow">
            {title}
          </div>

          <div className="mt-3 text-sm text-white/90">
            {restartInSec === null ? (
              "새 게임을 준비 중…"
            ) : (
              <>
                <span className="font-semibold">{restartInSec}초</span> 후 새 게임이 시작됩니다
              </>
            )}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <Badge text="✨ 축하해요" />
            <Badge text="🔥 300 달성" />
            <Badge text="🎊 새 게임 시작" />
          </div>

          <div className="mt-6 text-xs text-white/80">
            점수는 자동으로 초기화되고, 새 게임으로 이어집니다.
          </div>

          {/* 카드 내부 광원 효과 */}
          <div className="pointer-events-none absolute -inset-16 opacity-30 blur-3xl">
            <div className="h-40 w-40 animate-pulse rounded-full bg-white/50" />
          </div>
        </div>

        {/* 아래 움직이는 라인 */}
        <div className="absolute inset-x-0 bottom-0 h-1 animate-pulse bg-white/30" />
      </div>
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-white/15 px-2 py-2 text-[11px] font-semibold text-white/90">
      {text}
    </div>
  );
}

function Sparkles() {
  const items = Array.from({ length: 18 }).map((_, i) => i);
  return (
    <>
      {items.map(i => (
        <span
          key={i}
          className="absolute h-1.5 w-1.5 animate-[sparkle_1.8s_ease-in-out_infinite] rounded-full bg-white/80"
          style={{
            left: `${(i * 37) % 100}%`,
            top: `${(i * 53) % 100}%`,
            animationDelay: `${(i % 9) * 0.12}s`,
            opacity: 0.7,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes sparkle {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
          50% { transform: translateY(-10px) scale(1.6); opacity: 1; }
        }
      `}</style>
    </>
  );
}

/** 타이머 카드 */
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
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="게임 방법"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-bold">🕵️‍♂️ 라이어 게임 방법</div>
          <button className="text-xs underline text-gray-600" onClick={onClose}>
            닫기
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto px-4 py-4 space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-gray-900 bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-3 text-center">
            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="relative z-10 text-sm font-extrabold tracking-wide text-white">
              잡거나, 숨거나, 일부러 죽거나
            </div>
          </div>

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
