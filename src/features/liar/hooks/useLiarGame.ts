// 라이어 게임 상태 관리 훅

import { useEffect, useRef, useState } from "react";
import { fetchGameState, fetchMe } from "../api";
import { getLS, setLS, removeLS } from "../utils";
import { uuid } from "@/shared/utils/uuid";
import { setLS as setLSShared, removeLS as removeLSShared } from "@/shared/utils/storage";
import { ApiError } from "@/shared/utils/error";
import type { PublicState, MeState } from "../types";

export function useLiarGame(roomId: string) {
  const [playerId, setPlayerId] = useState<string>("");
  const [nickname, setNickname] = useState<string>("");
  const [joined, setJoined] = useState<boolean>(false);
  const [spectatorLocked, setSpectatorLocked] = useState<boolean>(false);
  const [publicState, setPublicState] = useState<PublicState | null>(null);
  const [me, setMe] = useState<MeState | null>(null);
  const publicVersionRef = useRef<number>(0);

  // ✅ 게임 상태에 따라 joined 상태를 결정하는 공통 함수
  const updateJoinedStateFromPublicState = (
    state: PublicState,
    pid: string,
    savedNick: string | null
  ) => {
    const playerInState = state.players?.find((p) => p.playerId === pid);

    if (playerInState) {
      // ✅ 게임 상태에 player가 있으면 즉시 joined = true
      setJoined(true);
      setSpectatorLocked(false);
    } else {
      // ✅ 게임 상태에 player가 없으면 spectatorLocked 상태 확인
      const isGameInProgress = state.phase !== "LOBBY" && state.phase !== "PREP" && state.phase !== "GAME_OVER";

      if (savedNick && isGameInProgress) {
        setJoined(false);
        setSpectatorLocked(true);
        setMe(null);
      } else {
        // LOBBY/PREP/GAME_OVER 상태면 아직 참가 전
        setJoined(false);
        setSpectatorLocked(false);
        setMe(null);
      }
    }
  };

  // localStorage에서 playerId 로드 + 즉시 게임 상태 확인
  useEffect(() => {
    const pid = getLS("liar_player_id") ?? uuid();
    setLS("liar_player_id", pid);
    setPlayerId(pid);

    const savedNick = getLS("liar_nickname");
    if (savedNick) {
      setNickname(savedNick);
    } else {
      setNickname("");
      setJoined(false);
      setSpectatorLocked(false);
    }

    // ✅ 닉네임 유무와 관계없이 즉시 게임 상태를 확인 (참가자 목록 표시를 위해)
    if (roomId) {
      (async () => {
        try {
          const state = await fetchGameState(roomId, 0);
          if (state) {
            setPublicState(state);
            setLSShared("liar_version", String(state.version));
            publicVersionRef.current = state.version;
            // 닉네임이 있을 때만 joined 상태 업데이트
            if (savedNick) {
              updateJoinedStateFromPublicState(state, pid, savedNick);
            }
          }
        } catch {
          // 초기 로드 실패는 무시 (폴링에서 다시 시도)
        }
      })();
    }
  }, [roomId]);

  // public state polling + players 확인
  useEffect(() => {
    if (!playerId || !roomId) return;

    let timer: number | null = null;
    let stopped = false;

    const loop = async () => {
      if (stopped) return;

      const fromRef = publicVersionRef.current || 0;
      const fromLS = Number(getLS("liar_version") ?? "0") || 0;
      const currentV = Math.max(fromRef, fromLS);

      try {
        const state = await fetchGameState(roomId, currentV);
        if (state) {
          // roomDeleted 플래그가 있으면 처리
          if (state.roomDeleted) {
            setPublicState(state);
            return; // roomDeleted 처리는 상위 컴포넌트에서
          }
          
          setPublicState(state);
          setLSShared("liar_version", String(state.version));
          publicVersionRef.current = state.version;

          const savedNick = getLS("liar_nickname");
          updateJoinedStateFromPublicState(state, playerId, savedNick);
        }
      } catch (err) {
        // 방이 삭제된 경우 404 에러나 ApiError가 발생할 수 있음
        const isRoomNotFound = 
          (err instanceof Error && (err.message.includes("404") || err.message.includes("room_not_found"))) ||
          (err instanceof ApiError && (err.status === 404 || err.code === "room_not_found"));
        
        if (isRoomNotFound) {
          // 방이 삭제되었음을 표시하기 위해 roomDeleted 플래그 설정
          setPublicState((prev) => prev ? { ...prev, roomDeleted: true } : {
            version: 0,
            phase: "LOBBY",
            hostPlayerId: null,
            players: [],
            roomName: null,
            roomDeleted: true,
            round: {
              index: 0,
              questionId: null,
              min: 0,
              max: 0,
              answersByPlayerId: {},
              voteCounts: {},
              questionChangeCount: 0,
              answeringEndsAt: null,
              discussEndsAt: null,
              tieDiscussEndsAt: null,
            },
            lastEliminatedPlayerId: null,
            lastEliminatedWasTroll: false,
            lastEliminatedRole: null,
            championPlayerId: null,
            winnerPlayerIds: [],
            finalChampionPlayerIds: [],
            autoRestartAt: null,
          });
        }
        // ignore other polling errors
      }

      timer = window.setTimeout(loop, 1000);
    };

    // ✅ 첫 실행은 즉시, 이후 1초마다
    void loop();
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [playerId, roomId]);

  // me polling (joined일 때만)
  useEffect(() => {
    if (!joined || !playerId) return;

    let timer: number | null = null;
    let stopped = false;

    const loop = async () => {
      if (stopped) return;

      try {
        const data = await fetchMe(playerId, roomId);
        setMe(data);
      } catch {
        // ✅ fetchMe 실패 시 publicState 확인
        // 게임 상태에 player가 없을 때만 joined = false로 설정
        if (publicState) {
          const playerInState = publicState.players?.find((p) => p.playerId === playerId);
          if (!playerInState) {
            // 게임 상태에 없으면 참가자에서 제외됨
            setMe(null);
            setJoined(false);
            setSpectatorLocked(true);
          }
          // 게임 상태에 있으면 fetchMe 실패해도 joined 유지
        } else {
          // publicState가 없으면 일단 joined 유지
        }
      }

      timer = window.setTimeout(loop, 1500);
    };

    void loop();
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [joined, playerId, roomId, publicState]);

  useEffect(() => {
    if (publicState) {
      publicVersionRef.current = publicState.version;
    }
  }, [publicState?.version]);

  return {
    playerId,
    nickname,
    setNickname,
    joined,
    setJoined,
    spectatorLocked,
    setSpectatorLocked,
    publicState,
    setPublicState,
    me,
    setMe,
    publicVersionRef,
  };
}
