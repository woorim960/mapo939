// 게임 액션 관리 훅

import { useState } from "react";
import {
  joinGame,
  startGame,
  restartRound,
  goToVoting,
  submitVote,
  finalizeResult,
  resetGame,
  fetchGameState,
} from "../api";
import { msgFromErrorCode } from "../utils";
import { ApiError } from "@/shared/utils/error";
import { removeLS, setLS } from "@/shared/utils/storage";

type UseGameActionsProps = {
  playerId: string;
  roomId: string;
  publicVersionRef: React.MutableRefObject<number>;
  setPublicState: (state: any) => void;
  setJoined: (joined: boolean) => void;
  setSpectatorLocked: (locked: boolean) => void;
  setNickname: (nick: string) => void;
  setMe: (me: any) => void;
  setVoteMode: (mode: boolean) => void;
  setSelectedVoteTargetId: (id: string) => void;
  setMyVotedTargetId: (id: string) => void;
  setGoVoteClicked: (clicked: boolean) => void;
};

export function useGameActions({
  playerId,
  roomId,
  publicVersionRef,
  setPublicState,
  setJoined,
  setSpectatorLocked,
  setNickname,
  setMe,
  setVoteMode,
  setSelectedVoteTargetId,
  setMyVotedTargetId,
  setGoVoteClicked,
}: UseGameActionsProps) {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  function clearVersionCache() {
    removeLS("liar_version");
    publicVersionRef.current = 0;
  }

  // API 호출 성공 후 즉시 최신 상태를 가져오는 헬퍼 함수
  async function refreshGameState() {
    try {
      clearVersionCache();
      const state = await fetchGameState(roomId, 0);
      if (state) {
        setPublicState(state);
        setLS("liar_version", String(state.version));
        publicVersionRef.current = state.version;
      }
    } catch {
      // 상태 갱신 실패는 무시 (polling에서 다시 시도)
    }
  }

  async function handleJoin(nickname: string): Promise<string | null> {
    setBusy(true);
    try {
      await joinGame(playerId, roomId, nickname);
      setMe(null);
      setJoined(true);
      setSpectatorLocked(false);
      await refreshGameState();
      return null; // 성공
    } catch (err) {
      if (err instanceof ApiError) {
        return msgFromErrorCode(err.code, err.serverMessage);
      }
      return "잠시 후 다시 시도해주세요";
    } finally {
      setBusy(false);
    }
  }

  async function handleStartGame(roleCounts?: {
    liarCount?: number;
    trollCount?: number;
    audienceCount?: number;
  }) {
    setBusy(true);
    try {
      await startGame(playerId, roomId, roleCounts);
      setToast("게임 시작");
      await refreshGameState();
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setToast(msgFromErrorCode(err.code));
      } else {
        setToast("잠시 후 다시 시도해주세요");
      }
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleResetRound() {
    setBusy(true);
    try {
      await restartRound(playerId, roomId);
      setVoteMode(false);
      setSelectedVoteTargetId("");
      setMyVotedTargetId("");
      setGoVoteClicked(false);
      setToast("이번 판 초기화");
      await refreshGameState();
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setToast(msgFromErrorCode(err.code));
      } else {
        setToast("잠시 후 다시 시도해주세요");
      }
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleGoToVoting() {
    setGoVoteClicked(true);
    setSelectedVoteTargetId("");
    setMyVotedTargetId("");

    setBusy(true);
    try {
      await goToVoting(playerId, roomId);
      setToast("투표로 이동");
      await refreshGameState();
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setToast(msgFromErrorCode(err.code));
      } else {
        setToast("잠시 후 다시 시도해주세요");
      }
      setGoVoteClicked(false);
      setVoteMode(false);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitVote(targetPlayerId: string, setMyVotedTargetId: (id: string) => void) {
    if (!targetPlayerId) return;

    setBusy(true);
    try {
      await submitVote(playerId, roomId, targetPlayerId);
      setMyVotedTargetId(targetPlayerId);
      setToast("투표 완료");
      await refreshGameState();
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setToast(msgFromErrorCode(err.code));
      } else {
        setToast("잠시 후 다시 시도해주세요");
      }
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleFinalizeResult() {
    setBusy(true);
    try {
      await finalizeResult(playerId, roomId);
      setToast("확인");
      await refreshGameState();
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setToast(msgFromErrorCode(err.code) || "잠시 후 다시 시도해주세요");
      } else {
        setToast("잠시 후 다시 시도해주세요");
      }
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleResetAll() {
    setBusy(true);
    try {
      await resetGame(playerId, roomId);
      removeLS("liar_player_id");
      removeLS("liar_nickname");
      removeLS("liar_version");
      // 방장도 방 목록 페이지로 이동 (쿼리 파라미터로 메시지 전달)
      window.location.href = "/liar?roomDeleted=true";
    } catch {
      setToast("잠시 후 다시 시도해주세요");
      setBusy(false);
    }
  }

  return {
    busy,
    toast,
    setToast,
    handleJoin,
    handleStartGame,
    handleResetRound,
    handleGoToVoting,
    handleSubmitVote,
    handleFinalizeResult,
    handleResetAll,
    refreshGameState,
  };
}
