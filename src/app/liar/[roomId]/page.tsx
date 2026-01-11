"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLiarGame } from "@/features/liar/hooks/useLiarGame";
import { useVoting } from "@/features/liar/hooks/useVoting";
import { useGameActions } from "@/features/liar/hooks/useGameActions";
import { GameHeader } from "@/features/liar/components/GameHeader";
import { PlayerList } from "@/features/liar/components/PlayerList";
import { JoinForm } from "@/features/liar/components/JoinForm";
import { SpectatorLocked } from "@/features/liar/components/SpectatorLocked";
import { HostMenu } from "@/features/liar/components/HostMenu";
import { RoundInfo } from "@/features/liar/components/RoundInfo";
import { AnswerBox } from "@/features/liar/components/AnswerBox";
import { RevealCard } from "@/features/liar/components/RevealCard";
import { DiscussPanel } from "@/features/liar/components/DiscussPanel";
import { GoToVotingButton } from "@/features/liar/components/GoToVotingButton";
import { VotingPanel } from "@/features/liar/components/VotingPanel";
import { ResultPanel } from "@/features/liar/components/ResultPanel";
import { GameOverPanel } from "@/features/liar/components/GameOverPanel";
import { FinalChampionOverlay } from "@/features/liar/components/FinalChampionOverlay";
import { HowToModal } from "@/features/liar/components/HowToModal";
import { MenuButton } from "@/features/liar/components/MenuButton";
import { Toast } from "@/shared/components/Toast";
import { phaseLabel, roleLabel, canJoinNow, defaultRoleCounts, getPhaseTheme } from "@/features/liar/utils";
import { remainingMs } from "@/shared/utils/date";
import { setLS, removeLS } from "@/shared/utils/storage";
import { updateRoomName, leaveRoom, extendGracePeriod } from "@/features/liar/api";
import type { Phase } from "@/features/liar/types";

export default function LiarPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  if (!roomId) {
    router.push("/liar");
    return null;
  }

  const game = useLiarGame(roomId);
  const voting = useVoting(game.publicState, game.joined, game.me, game.playerId);
  const actions = useGameActions({
    playerId: game.playerId,
    roomId,
    publicVersionRef: game.publicVersionRef,
    setPublicState: game.setPublicState,
    setJoined: game.setJoined,
    setSpectatorLocked: game.setSpectatorLocked,
    setNickname: game.setNickname,
    setMe: game.setMe,
    setVoteMode: voting.setVoteMode,
    setSelectedVoteTargetId: voting.setSelectedVoteTargetId,
    setMyVotedTargetId: voting.setMyVotedTargetId,
    setGoVoteClicked: voting.setGoVoteClicked,
  });

  const [joinErr, setJoinErr] = useState<string>("");
  const [showHowTo, setShowHowTo] = useState(false);
  const [showFinalCelebrate, setShowFinalCelebrate] = useState(false);
  const [celebrateTick, setCelebrateTick] = useState(0);
  
  // 방 이름은 publicState에서 가져오기
  const roomName = game.publicState?.roomName ?? null;

  // phase를 명확하게 관리 (publicState가 없으면 LOBBY)
  const phase: Phase = useMemo(() => {
    if (!game.publicState) return "LOBBY";
    return game.publicState.phase;
  }, [game.publicState?.phase]);

  const phaseKo = phaseLabel(phase);
  const meRoleKo = roleLabel(game.me?.role ?? null);

  const joinedCount = game.publicState?.players.length ?? 0;
  const aliveCount = game.publicState?.players.filter((p) => p.isAlive).length ?? 0;

  const isHost = useMemo(() => {
    if (!game.publicState || !game.playerId) return false;
    return Boolean(game.publicState.players.find((p) => p.playerId === game.playerId)?.isHost);
  }, [game.publicState, game.playerId]);

  const isAliveMe = useMemo(() => {
    if (!game.publicState || !game.playerId) return false;
    return Boolean(game.publicState.players.find((p) => p.playerId === game.playerId)?.isAlive);
  }, [game.publicState, game.playerId]);

  const alivePlayers = useMemo(() => {
    return (game.publicState?.players ?? []).filter((p) => p.isAlive);
  }, [game.publicState?.players]);

  const mySubmittedValue = useMemo(() => {
    if (!game.publicState || !game.playerId) return null;
    const v = game.publicState.round.answersByPlayerId?.[game.playerId];
    return typeof v === "number" ? v : null;
  }, [game.publicState, game.playerId]);

  const iAlreadySubmitted = mySubmittedValue !== null;

  const canVoteNow = useMemo(() => {
    return game.joined && isAliveMe && phase === "VOTING";
  }, [game.joined, isAliveMe, phase]);

  const voteTargets = useMemo(() => {
    return alivePlayers.filter((p) => p.playerId !== game.playerId);
  }, [alivePlayers, game.playerId]);

  const roundWinners = useMemo(() => {
    const ids = game.publicState?.winnerPlayerIds;
    if (Array.isArray(ids) && ids.length > 0) return ids;
    if (game.publicState?.championPlayerId) return [game.publicState.championPlayerId];
    return [];
  }, [game.publicState?.winnerPlayerIds, game.publicState?.championPlayerId]);

  const finalChampionIds = useMemo(() => {
    return game.publicState?.finalChampionPlayerIds ?? [];
  }, [game.publicState?.finalChampionPlayerIds]);

  const finalChampionNames = useMemo(() => {
    if (!game.publicState || finalChampionIds.length === 0) return [];
    const map = new Map(game.publicState.players.map((p) => [p.playerId, p.nickname] as const));
    return finalChampionIds.map((id) => map.get(id) ?? id);
  }, [game.publicState, finalChampionIds]);

  const eliminatedName = useMemo(() => {
    if (!game.publicState?.lastEliminatedPlayerId) return null;
    return game.publicState.players.find((p) => p.playerId === game.publicState!.lastEliminatedPlayerId)?.nickname ?? null;
  }, [game.publicState]);

  // 동점 플레이어들의 이름 계산
  const tiedPlayerNames = useMemo(() => {
    if (!game.publicState || phase !== "RESULT") return null;
    
    // 동점인지 확인 (RESULT 단계에서 lastEliminatedPlayerId가 null이고 투표가 완료된 경우)
    if (!game.publicState.lastEliminatedPlayerId) {
      const voteCounts = game.publicState.round.voteCounts ?? {};
      const entries = Object.entries(voteCounts);
      if (entries.length > 0) {
        const maxCount = Math.max(...entries.map(([, count]) => count));
        const topPlayerIds = entries
          .filter(([, count]) => count === maxCount)
          .map(([playerId]) => playerId);
        
        // 가장 많은 표를 받은 플레이어가 2명 이상이면 동점
        if (topPlayerIds.length >= 2) {
          const playerMap = new Map(game.publicState.players.map((p) => [p.playerId, p.nickname] as const));
          return topPlayerIds.map((id) => playerMap.get(id) ?? id);
        }
      }
    }
    
    return null;
  }, [game.publicState, phase]);

  const winnerNames = useMemo(() => {
    const ids = game.publicState?.winnerPlayerIds ?? [];
    if (!game.publicState || ids.length === 0) return [];
    const map = new Map(game.publicState.players.map((p) => [p.playerId, p.nickname] as const));
    return ids.map((id) => map.get(id) ?? id);
  }, [game.publicState]);

  const championName = useMemo(() => {
    if (!game.publicState?.championPlayerId) return null;
    return game.publicState.players.find((p) => p.playerId === game.publicState!.championPlayerId)?.nickname ?? null;
  }, [game.publicState]);

  const deadTrollId = game.publicState?.lastEliminatedWasTroll ? game.publicState?.lastEliminatedPlayerId : null;

  // 방 삭제 감지 및 처리
  useEffect(() => {
    if (!game.publicState?.roomDeleted) return;
    
    // 방이 삭제되었음을 감지
    removeLS("liar_player_id");
    removeLS("liar_nickname");
    removeLS("liar_version");
    
    // 방 목록 페이지로 이동 (쿼리 파라미터로 메시지 전달)
    router.push("/liar?roomDeleted=true");
  }, [game.publicState?.roomDeleted, router]);

  // GAME_OVER 축하 오버레이 자동 노출
  useEffect(() => {
    if (!game.publicState) return;

    if (game.publicState.phase === "GAME_OVER" && (game.publicState.finalChampionPlayerIds ?? []).length > 0) {
      setShowFinalCelebrate(true);
      return;
    }

    if (game.publicState.phase === "LOBBY" || game.publicState.phase === "PREP") {
      setShowFinalCelebrate(false);
    }
  }, [game.publicState?.phase, game.publicState?.finalChampionPlayerIds]);

  // 새로고침/세션 꼬임으로 spectatorLocked일 때, 새게임 되면 토스트
  useEffect(() => {
    if (!game.spectatorLocked) return;
    if (!game.publicState) return;
    if (canJoinNow(game.publicState.phase)) {
      actions.setToast("새 게임이 시작됐어요. 지금부터 참가할 수 있어요!");
    }
  }, [game.spectatorLocked, game.publicState?.phase, actions]);

  // GAME_OVER 오버레이 카운트다운
  useEffect(() => {
    if (!showFinalCelebrate) return;
    const t = window.setInterval(() => setCelebrateTick((v) => v + 1), 250);
    return () => window.clearInterval(t);
  }, [showFinalCelebrate]);

  const autoRestartAt = game.publicState?.autoRestartAt ?? null;
  const restartInSec = useMemo(() => {
    if (!autoRestartAt) return null;
    return Math.ceil(remainingMs(autoRestartAt) / 1000);
  }, [autoRestartAt, celebrateTick]);

  async function handleJoin() {
    setJoinErr("");
    const nn = game.nickname.trim();
    
    // 클라이언트 측 입력값 검증
    if (!nn) {
      setJoinErr("닉네임을 입력해주세요");
      return;
    }

    if (nn.length > 20) {
      setJoinErr("닉네임은 20자 이하여야 합니다");
      return;
    }

    if (/^\s+$/.test(nn)) {
      setJoinErr("닉네임은 공백만으로 구성될 수 없습니다");
      return;
    }

    if (!game.playerId) {
      setJoinErr("세션 준비 중입니다. 잠시만 기다려주세요.");
      return;
    }

    if (game.publicState && !canJoinNow(game.publicState.phase)) {
      setJoinErr("지금은 관전만 가능해요. 새 게임에서 참가할 수 있어요.");
      return;
    }

    const err = await actions.handleJoin(nn);
    if (err !== null) {
      // room_not_found 에러인 경우 방 목록으로 이동
      if (err.includes("방을 찾을 수 없습니다") || err.includes("room_not_found")) {
        actions.setToast("방이 존재하지 않거나 삭제되었습니다.");
        setTimeout(() => {
          router.push("/liar");
        }, 1500);
        return;
      }
      setJoinErr(err);
      return;
    }

    setLS("liar_nickname", nn);
  }

  async function handleSubmitVote() {
    if (!voting.selectedVoteTargetId) return;
    await actions.handleSubmitVote(voting.selectedVoteTargetId, voting.setMyVotedTargetId);
  }


  // 방 제목 수정
  async function handleUpdateRoomName(name: string) {
    if (!game.playerId) throw new Error("Player ID not found");
    await updateRoomName(roomId, game.playerId, name);
    // 게임 상태를 새로고침하여 방 이름이 반영되도록 함
    await actions.refreshGameState?.();
    actions.setToast("방 이름이 수정되었습니다.");
  }

  // 방 나가기
  const handleLeaveRoom = useCallback(async () => {
    if (!game.playerId) return;
    try {
      await leaveRoom(roomId, game.playerId);
      removeLS("liar_player_id");
      removeLS("liar_nickname");
      removeLS("liar_version");
      router.push("/liar");
    } catch (err) {
      actions.setToast("방 나가기에 실패했습니다.");
    }
  }, [roomId, game.playerId, router, actions]);

  // 시간 연장
  async function handleExtendTime() {
    if (!game.playerId) return;
    try {
      await extendGracePeriod(roomId, game.playerId);
      actions.setToast("시간이 1분 연장되었습니다.");
      // 상태 새로고침
      await actions.refreshGameState?.();
    } catch (err) {
      actions.setToast("시간 연장에 실패했습니다.");
    }
  }

  // 자동 내보내기 (1분 지나면)
  useEffect(() => {
    if (!game.publicState?.roomCreatedAt || game.joined) return;

    const GRACE_PERIOD_MS = 60 * 1000; // 1분
    const checkAndLeave = () => {
      if (game.joined) return; // 이미 참가했으면 취소
      
      const now = Date.now();
      const elapsed = now - game.publicState!.roomCreatedAt!;
      const remaining = GRACE_PERIOD_MS - elapsed;

      if (remaining <= 0) {
        // 시간이 지났으면 내보내기
        actions.setToast("방 생성 후 1분이 지나 자동으로 방에서 나갑니다.");
        handleLeaveRoom();
        return;
      }

      // 남은 시간 후에 다시 확인
      setTimeout(checkAndLeave, Math.min(remaining, 1000));
    };

    checkAndLeave();
  }, [game.publicState?.roomCreatedAt, game.joined, actions, handleLeaveRoom]);

  const questionText = game.me?.question ?? null;
  const phaseTheme = getPhaseTheme(phase);

  const canShowGoVoteButton = game.joined && isHost && (phase === "REVEAL" || phase === "DISCUSS" || phase === "TIE_DISCUSS" || phase === "VOTING" || phase === "RESULT");
  const showVotePanel = game.joined && phase === "VOTING";

  return (
    <main className={`min-h-screen bg-gradient-to-br ${phaseTheme.bgGradient} transition-all duration-500 p-4`}>
      {/* 최종 우승 축하 오버레이 */}
      {showFinalCelebrate && (
        <FinalChampionOverlay names={finalChampionNames} restartInSec={restartInSec} />
      )}

      {/* 게임 방법 모달 */}
      <HowToModal open={showHowTo} onClose={() => setShowHowTo(false)} />

      {/* 토스트는 fixed로 별도 처리 */}
      {actions.toast && <Toast message={actions.toast} onClose={() => actions.setToast("")} />}

      <div className="mx-auto max-w-md space-y-4">

          <GameHeader
            publicState={game.publicState}
            phaseKo={phaseKo}
            joined={game.joined}
            spectatorLocked={game.spectatorLocked}
            meRoleKo={meRoleKo}
            isAliveMe={isAliveMe}
            onResetAll={actions.handleResetAll}
            onShowHowTo={() => setShowHowTo(true)}
            busy={actions.busy}
            roomName={roomName}
            isHost={isHost}
            onUpdateRoomName={handleUpdateRoomName}
            onLeaveRoom={handleLeaveRoom}
          />

          {/* 관전 잠금 안내 */}
          {!game.joined && game.spectatorLocked && (
            <SpectatorLocked publicState={game.publicState} busy={actions.busy} joinErr={joinErr} onJoin={handleJoin} />
          )}

          {/* 참가 전(일반) */}
          {!game.joined && !game.spectatorLocked && (
            <JoinForm
              nickname={game.nickname}
              joinErr={joinErr}
              busy={actions.busy}
              publicState={game.publicState}
              onChangeNickname={game.setNickname}
              onJoin={handleJoin}
              onExtendTime={handleExtendTime}
            />
          )}

          {/* 참여자 목록 */}
          <PlayerList
            players={game.publicState?.players ?? []}
            currentPlayerId={game.playerId}
            roundWinners={roundWinners}
            finalChampionIds={finalChampionIds}
            deadTrollId={deadTrollId}
          />

          {/* 방장 메뉴 */}
          {game.joined && isHost && (
            <HostMenu
              joined={game.joined}
              isHost={isHost}
              phase={phase}
              joinedCount={joinedCount}
              busy={actions.busy}
              defaultRoleCounts={defaultRoleCounts}
              onStartGame={actions.handleStartGame}
              onResetRound={actions.handleResetRound}
            />
          )}

          {/* 라운드 정보 */}
          {game.publicState && (
            <RoundInfo
              min={game.publicState.round.min ?? 0}
              max={game.publicState.round.max ?? 0}
              question={questionText}
              joined={game.joined}
            />
          )}

          {/* 답변 입력 */}
          {game.joined && phase === "ANSWERING" && game.publicState && (
            <AnswerBox
              playerId={game.playerId}
              roomId={roomId}
              min={game.publicState.round.min}
              max={game.publicState.round.max}
              submittedCount={Object.keys(game.publicState.round.answersByPlayerId ?? {}).length}
              aliveCount={aliveCount}
              endsAt={game.publicState.round.answeringEndsAt}
              alreadySubmitted={iAlreadySubmitted}
              submittedValue={mySubmittedValue}
              onToast={actions.setToast}
            />
          )}

          {/* 답변 공개 */}
          {phase === "REVEAL" && game.publicState && (
            <RevealCard
              players={game.publicState.players}
              answers={game.publicState.round.answersByPlayerId ?? {}}
            />
          )}

          {/* 투표하러 가기(방장만) */}
          {canShowGoVoteButton && (
            <GoToVotingButton
              joined={game.joined}
              isHost={isHost}
              phase={phase}
              busy={actions.busy}
              goVoteClicked={voting.goVoteClicked}
              myVotedTargetId={voting.myVotedTargetId}
              onGoToVoting={actions.handleGoToVoting}
            />
          )}

          {/* 토론/재논의 */}
          {(phase === "DISCUSS" || phase === "TIE_DISCUSS") && game.publicState && (
            <DiscussPanel
              phase={phase}
              discussEndsAt={game.publicState.round.discussEndsAt}
              tieDiscussEndsAt={game.publicState.round.tieDiscussEndsAt}
              lastEliminatedPlayerId={game.publicState.lastEliminatedPlayerId}
              eliminatedName={eliminatedName}
            />
          )}

          {/* 투표 패널 */}
          {showVotePanel && game.publicState && (
            <VotingPanel
              publicState={game.publicState}
              phaseKo={phaseKo}
              joined={game.joined}
              isAliveMe={isAliveMe}
              voteTargets={voteTargets}
              selectedVoteTargetId={voting.selectedVoteTargetId}
              myVotedTargetId={voting.myVotedTargetId}
              canVoteNow={canVoteNow}
              busy={actions.busy}
              onSelectTarget={voting.setSelectedVoteTargetId}
              onSubmitVote={handleSubmitVote}
            />
          )}

          {/* 결과 단계 */}
          {phase === "RESULT" && game.publicState && (
            <ResultPanel
              eliminatedName={eliminatedName}
              tiedPlayerNames={tiedPlayerNames}
              lastEliminatedWasTroll={game.publicState.lastEliminatedWasTroll}
              lastEliminatedRole={game.publicState.lastEliminatedRole ?? null}
              joined={game.joined}
              isAliveMe={isAliveMe}
              busy={actions.busy}
              onFinalize={actions.handleFinalizeResult}
            />
          )}

          {/* GAME_OVER 안내 */}
          {phase === "GAME_OVER" && (
            <GameOverPanel winnerNames={winnerNames} championName={championName} />
          )}
      </div>

      {/* 플로팅 메뉴 버튼 */}
      <MenuButton
        items={[
          {
            id: "attendance",
            name: "출석부",
            emoji: "📋",
            path: "/",
          },
          {
            id: "rooms",
            name: "방 목록",
            emoji: "🏠",
            path: "/liar",
          },
        ]}
        buttonEmoji="🎮"
        buttonGradient="from-purple-500 to-pink-500"
      />
    </main>
  );
}
