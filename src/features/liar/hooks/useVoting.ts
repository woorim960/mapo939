// 투표 관련 상태 관리 훅

import { useEffect, useState } from "react";
import { remainingMs } from "../utils";
import type { Phase, PublicState, MeState } from "../types";

export function useVoting(publicState: PublicState | null, joined: boolean, me: MeState | null, playerId: string) {
  const [voteMode, setVoteMode] = useState<boolean>(false);
  const [selectedVoteTargetId, setSelectedVoteTargetId] = useState<string>("");
  const [myVotedTargetId, setMyVotedTargetId] = useState<string>("");
  const [goVoteClicked, setGoVoteClicked] = useState<boolean>(false);

  // ✅ 서버에서 가져온 투표 정보로 초기화 (새로고침 후에도 동작)
  useEffect(() => {
    if (me?.votedTargetId) {
      setMyVotedTargetId(me.votedTargetId);
    } else if (me?.votedTargetId === null || me?.votedTargetId === undefined) {
      // 명시적으로 null이거나 undefined면 투표 안 함
      setMyVotedTargetId("");
    }
  }, [me?.votedTargetId]);

  // phase 변화에 따른 투표 UI 초기화
  useEffect(() => {
    if (!publicState) return;
    const ph = publicState.phase;

    // VOTING phase가 아닐 때는 voteMode를 강제로 false로 설정
    if (ph !== "VOTING") {
      setVoteMode(false);
    }

    if (ph === "PREP" || ph === "LOBBY" || ph === "ANSWERING" || ph === "REVEAL" || ph === "RESULT" || ph === "GAME_OVER") {
      setMyVotedTargetId("");
      setSelectedVoteTargetId("");
      setGoVoteClicked(false);
      return;
    }

    if (ph === "TIE_DISCUSS" || ph === "DISCUSS") {
      setMyVotedTargetId("");
      setSelectedVoteTargetId("");
      setGoVoteClicked(false);
    }
  }, [publicState?.phase]);

  // 라운드 변경 시 투표 상태 초기화
  useEffect(() => {
    setMyVotedTargetId("");
    setSelectedVoteTargetId("");
    setVoteMode(false);
    setGoVoteClicked(false);
  }, [publicState?.round.index]);

  // DISCUSS/TIE_DISCUSS 타이머 끝나면 voteMode 자동 오픈
  useEffect(() => {
    if (!joined || !publicState) return;

    const ph = publicState.phase;
    
    // VOTING phase가 아니면 voteMode는 항상 false
    if (ph !== "VOTING") {
      setVoteMode(false);
      return;
    }

    // VOTING phase에서는 voteMode를 true로 설정하지 않음 (서버 상태를 따름)
    // 이 effect는 DISCUSS/TIE_DISCUSS 타이머를 위한 것이므로 VOTING에서는 불필요
  }, [joined, publicState?.phase]);

  return {
    voteMode,
    setVoteMode,
    selectedVoteTargetId,
    setSelectedVoteTargetId,
    myVotedTargetId,
    setMyVotedTargetId,
    goVoteClicked,
    setGoVoteClicked,
  };
}
