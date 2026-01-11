import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import type { GameState } from "./types";

declare global {
  // eslint-disable-next-line no-var
  var __liarPrisma: PrismaClient | undefined;
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url || url.trim().length === 0) {
    throw new Error("DATABASE_URL missing (check .env.local and restart dev server)");
  }
  return url;
}

export function prisma(): PrismaClient {
  if (global.__liarPrisma) return global.__liarPrisma;

  const url = getDatabaseUrl();

  // ✅ Prisma 7 + adapter-neon 최신 방식
  const adapter = new PrismaNeon({
    connectionString: url,
  });

  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error"] : [],
  });

  global.__liarPrisma = client;
  return client;
}

/* ---------------- Game helpers ---------------- */

function createInitialGameState(): GameState {
  const now = Date.now();
  return {
    phase: "LOBBY",
    version: 0,
    createdAt: now,
    hostPlayerId: null,
    players: [],
    usedQuestionIds: [],
    round: {
      index: 0,
      questionId: null,
      min: 0,
      max: 0,
      rolesByPlayerId: {},
      answersByPlayerId: {},
      votesByVoterId: {},
      questionChangeByPlayerId: {},
      answeringEndsAt: null,
      discussEndsAt: null,
      tieDiscussEndsAt: null,
    },
    lastEliminatedPlayerId: null,
    lastEliminatedWasTroll: false,
    championPlayerId: null,
  };
}

export async function getOrCreateGame(roomId: string): Promise<{ state: GameState; dbVersion: number; roomName: string | null; roomCreatedAt: number | null }> {
  const p = prisma();

  // 먼저 방을 찾기 시도 (최대 3번 재시도)
  let row = await p.liarGame.findUnique({ where: { id: roomId }, select: { name: true, version: true, stateJson: true, createdAt: true } });
  
  // 방을 찾지 못했을 때, 짧은 대기 후 다시 시도 (트랜잭션 커밋 대기)
  if (!row) {
    for (let retry = 0; retry < 3; retry += 1) {
      await new Promise(resolve => setTimeout(resolve, 100 * (retry + 1))); // 100ms, 200ms, 300ms
      row = await p.liarGame.findUnique({ where: { id: roomId }, select: { name: true, version: true, stateJson: true, createdAt: true } });
      if (row) break;
    }
  }
  
  if (row) {
    const state = row.stateJson as unknown as GameState;
    return { 
      state: { ...state, version: row.version }, 
      dbVersion: row.version,
      roomName: row.name ?? null,
      roomCreatedAt: row.createdAt ? row.createdAt.getTime() : null
    };
  }

  // 방이 정말 없을 때만 새로 생성 (하지만 이는 매우 드문 경우)
  // 실제로는 방이 이미 존재해야 하므로, 한 번 더 확인
  await new Promise(resolve => setTimeout(resolve, 200));
  const finalCheck = await p.liarGame.findUnique({ where: { id: roomId }, select: { name: true, version: true, stateJson: true, createdAt: true } });
  if (finalCheck) {
    const state = finalCheck.stateJson as unknown as GameState;
    return { 
      state: { ...state, version: finalCheck.version }, 
      dbVersion: finalCheck.version,
      roomName: finalCheck.name ?? null,
      roomCreatedAt: finalCheck.createdAt ? finalCheck.createdAt.getTime() : null
    };
  }

  // 정말 방이 없을 때만 새로 생성 (이 경우는 거의 발생하지 않아야 함)
  // ⚠️ 주의: 이 경우 name을 null로 생성하지만, 실제로는 방이 이미 존재해야 함
  // 방이 이미 존재하는데 찾지 못한 경우이므로, 다시 한 번 확인
  console.warn("[getOrCreateGame] Room not found, attempting to create (this should be rare):", roomId);
  
  const initial = createInitialGameState();

  try {
    await p.liarGame.create({
      data: { 
        id: roomId, 
        name: null, // ⚠️ 새로 생성하는 경우이므로 name은 null
        version: 0, 
        stateJson: initial as unknown as object 
      },
    });
    console.warn("[getOrCreateGame] Created new room with null name (this should not happen if room already exists):", roomId);
  } catch (err) {
    // 생성 실패 시 다시 조회 (다른 요청에서 이미 생성했을 수 있음)
    const again = await p.liarGame.findUnique({ where: { id: roomId }, select: { name: true, version: true, stateJson: true, createdAt: true } });
    if (!again) {
      console.error("[getOrCreateGame] Failed to create or load LiarGame:", err);
      throw new Error("Failed to create or load LiarGame");
    }
    const state = again.stateJson as unknown as GameState;
    return { 
      state: { ...state, version: again.version }, 
      dbVersion: again.version,
      roomName: again.name ?? null,
      roomCreatedAt: again.createdAt ? again.createdAt.getTime() : null
    };
  }

  // 생성 후 실제 저장된 데이터 반환 (트랜잭션 일관성 보장)
  const created = await p.liarGame.findUnique({ where: { id: roomId }, select: { name: true, version: true, stateJson: true, createdAt: true } });
  if (created) {
    const state = created.stateJson as unknown as GameState;
    return { 
      state: { ...state, version: created.version }, 
      dbVersion: created.version,
      roomName: created.name ?? null,
      roomCreatedAt: created.createdAt ? created.createdAt.getTime() : null
    };
  }

  return { state: initial, dbVersion: 0, roomName: null, roomCreatedAt: null };
}

export async function getGame(roomId: string): Promise<{ state: GameState; dbVersion: number } | null> {
  const p = prisma();
  const row = await p.liarGame.findUnique({ where: { id: roomId } });
  if (!row) return null;
  const state = row.stateJson as unknown as GameState;
  return { state: { ...state, version: row.version }, dbVersion: row.version };
}

export async function createRoom(name?: string): Promise<string> {
  const p = prisma();
  const { randomUUID } = await import("crypto");
  const roomId = randomUUID();
  const initial = createInitialGameState();

  // name이 제공되면 trim하고, 빈 문자열이면 null로 저장
  const roomName = name && typeof name === "string" && name.trim().length > 0 
    ? name.trim() 
    : null;

  console.log("[createRoom] Input:", { name, roomName, roomId });

  try {
    // ✅ 트랜잭션을 사용하여 원자적으로 방 생성 및 버전 증가
    // 운영 환경에서 트랜잭션 커밋 타이밍 문제를 방지하기 위해 트랜잭션 사용
    const result = await p.$transaction(async (tx) => {
      // 방 생성
      const created = await tx.liarGame.create({
        data: {
          id: roomId,
          name: roomName,
          version: 0,
          stateJson: initial as unknown as object,
        },
      });
      
      console.log("[createRoom] Room created in transaction:", { id: created.id, name: created.name, expected: roomName });
      
      // 방 이름이 설정된 경우 게임 상태 버전을 증가
      if (roomName) {
        const state = created.stateJson as unknown as GameState;
        const nextState = {
          ...state,
          version: 1, // 0에서 1로 증가
        };
        
        // 같은 트랜잭션 내에서 업데이트
        await tx.liarGame.update({
          where: { id: roomId },
          data: {
            version: 1,
            stateJson: nextState as unknown as object,
          },
        });
        
        console.log("[createRoom] Version incremented in transaction");
      }
      
      return created;
    });
    
    console.log("[createRoom] Transaction completed:", { id: result.id, name: result.name });
    
    // ✅ 트랜잭션 완료 후 한 번 더 확인 (운영 환경에서 읽기 일관성 보장)
    await new Promise(resolve => setTimeout(resolve, 100));
    const verified = await p.liarGame.findUnique({
      where: { id: roomId },
      select: { id: true, name: true },
    });
    
    if (verified) {
      console.log("[createRoom] Verified after transaction:", { id: verified.id, name: verified.name });
      if (roomName && verified.name !== roomName) {
        console.error("[createRoom] CRITICAL: Room name mismatch after transaction!", { 
          roomId, 
          expected: roomName, 
          actual: verified.name 
        });
      }
    } else {
      console.error("[createRoom] CRITICAL: Room not found after transaction!", roomId);
    }
    
    return roomId;
  } catch (err) {
    console.error("[createRoom] Failed to create room in DB:", err);
    if (err instanceof Error) {
      console.error("[createRoom] Error details:", err.message, err.stack);
    }
    throw err;
  }
}

export type RoomInfo = {
  id: string;
  name: string | null;
  phase: string;
  playerCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export async function listRooms(): Promise<RoomInfo[]> {
  const p = prisma();
  const rooms = await p.liarGame.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50, // 최대 50개만 조회
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      stateJson: true,
    },
  });

  const roomInfos: RoomInfo[] = [];
  const emptyRoomIds: string[] = [];
  const inactiveRoomIds: string[] = [];
  const now = Date.now();
  const ONE_HOUR_MS = 60 * 60 * 1000; // 1시간
  const GRACE_PERIOD_MS = 60 * 1000; // 1분 - 방 생성 직후 삭제 방지

  for (const room of rooms) {
    const state = room.stateJson as unknown as GameState;
    const playerCount = (state.players ?? []).length;
    const phase = state.phase ?? "LOBBY";
    const updatedAtMs = room.updatedAt.getTime();
    const createdAtMs = room.createdAt.getTime();
    const timeSinceUpdate = now - updatedAtMs;
    const timeSinceCreation = now - createdAtMs;

    if (playerCount === 0) {
      // 빈 방이지만, 생성된 지 30초 이내면 삭제하지 않음 (플레이어 참가 대기 시간)
      if (timeSinceCreation >= GRACE_PERIOD_MS) {
        // 빈 방은 삭제 대상으로 표시
        emptyRoomIds.push(String(room.id));
      } else {
        // 최근 생성된 빈 방은 목록에 포함 (플레이어가 곧 참가할 수 있음)
        const roomInfo: RoomInfo = {
          id: String(room.id),
          name: room.name ?? null,
          phase,
          playerCount,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
        };
        roomInfos.push(roomInfo);
      }
    } else {
      // 멤버는 있지만 게임이 진행 중이 아니고 1시간 이상 지난 방 삭제
      const isInactive = (phase === "LOBBY" || phase === "PREP" || phase === "GAME_OVER") && timeSinceUpdate >= ONE_HOUR_MS;
      
      if (isInactive) {
        inactiveRoomIds.push(String(room.id));
      } else {
        const roomInfo: RoomInfo = {
          id: String(room.id),
          name: room.name ?? null, // 명시적으로 null 처리
          phase,
          playerCount,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
        };
        console.log("Room in list:", { id: roomInfo.id, name: roomInfo.name, playerCount });
        roomInfos.push(roomInfo);
      }
    }
  }

  // 빈 방 삭제 (비동기로 처리, 에러는 무시)
  if (emptyRoomIds.length > 0) {
    p.liarGame.deleteMany({
      where: { id: { in: emptyRoomIds } },
    }).catch((err) => {
      console.error("Failed to delete empty rooms:", err);
    });
  }

  // 비활성 방 삭제 (멤버 정보도 함께 삭제 - CASCADE)
  if (inactiveRoomIds.length > 0) {
    // 먼저 플레이어 정보 삭제 (명시적으로)
    p.liarPlayer.deleteMany({
      where: { gameId: { in: inactiveRoomIds } },
    }).then(() => {
      // 플레이어 삭제 후 방 삭제
      return p.liarGame.deleteMany({
        where: { id: { in: inactiveRoomIds } },
      });
    }).catch((err) => {
      console.error("Failed to delete inactive rooms:", err);
    });
  }

  return roomInfos;
}

export async function deleteRoom(roomId: string): Promise<boolean> {
  const p = prisma();
  try {
    // 먼저 방이 존재하는지 확인 (getOrCreateGame 사용하지 않음 - 새 방 생성 방지)
    const existingRoom = await p.liarGame.findUnique({
      where: { id: roomId },
      select: { id: true, version: true, stateJson: true },
    });

    if (!existingRoom) {
      // 방이 이미 없으면 성공으로 처리
      console.log("[deleteRoom] Room already deleted:", roomId);
      return true;
    }

    // 게임 상태에 roomDeleted 플래그 설정 (모든 플레이어에게 알림)
    const state = existingRoom.stateJson as unknown as GameState;
    const nextState = {
      ...state,
      roomDeleted: true,
      version: (existingRoom.version ?? 0) + 1,
    };
    
    // CAS 업데이트로 플래그 설정 (재시도 로직 개선)
    let flagSet = false;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const currentRoom = await p.liarGame.findUnique({
        where: { id: roomId },
        select: { id: true, version: true, stateJson: true },
      });
      if (!currentRoom) {
        // 재시도 중 방이 이미 삭제되었으면 성공
        return true;
      }
      const currentState = currentRoom.stateJson as unknown as GameState;
      const flagState = {
        ...currentState,
        roomDeleted: true,
        version: (currentRoom.version ?? 0) + 1,
      };
      const res = await updateGameCAS(roomId, currentRoom.version, flagState);
      if (res.ok) {
        flagSet = true;
        break;
      }
    }
    
    // 플래그 설정 후 잠시 대기 (플레이어들이 감지할 시간 제공)
    if (flagSet) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // ✅ 트랜잭션으로 원자적으로 플레이어 정보와 방 삭제
    await p.$transaction(async (tx) => {
      // 플레이어 정보 삭제
      await tx.liarPlayer.deleteMany({
        where: { gameId: roomId },
      });
      
      // 방 삭제
      await tx.liarGame.delete({ 
        where: { id: roomId } 
      });
    });
    
    // 삭제 확인 (재시도로 확실히 삭제되었는지 확인)
    for (let retry = 0; retry < 3; retry += 1) {
      const deleted = await p.liarGame.findUnique({
        where: { id: roomId },
        select: { id: true },
      });
      if (!deleted) {
        console.log("[deleteRoom] Room deleted successfully:", roomId);
        return true;
      }
      // 아직 삭제되지 않았으면 다시 시도
      await new Promise(resolve => setTimeout(resolve, 100 * (retry + 1)));
      try {
        await p.liarPlayer.deleteMany({
          where: { gameId: roomId },
        });
        await p.liarGame.delete({ 
          where: { id: roomId } 
        });
      } catch (err) {
        console.error("[deleteRoom] Retry delete failed:", err);
      }
    }
    
    // 최종 확인
    const finalCheck = await p.liarGame.findUnique({
      where: { id: roomId },
      select: { id: true },
    });
    
    if (finalCheck) {
      console.error("[deleteRoom] Room still exists after deletion attempt:", roomId);
      return false;
    }
    
    console.log("[deleteRoom] Room deleted successfully:", roomId);
    return true;
  } catch (err) {
    console.error("[deleteRoom] Failed to delete room:", err);
    // 에러가 발생해도 방이 이미 삭제되었을 수 있으므로 확인
    const check = await p.liarGame.findUnique({
      where: { id: roomId },
      select: { id: true },
    });
    return !check; // 방이 없으면 성공
  }
}

export async function updateGameCAS(
  roomId: string,
  expectedVersion: number,
  nextState: GameState
): Promise<{ ok: true; newVersion: number } | { ok: false }> {
  const p = prisma();

  const result = await p.liarGame.updateMany({
    where: { id: roomId, version: expectedVersion },
    data: { version: expectedVersion + 1, stateJson: nextState as unknown as object },
  });

  if (result.count !== 1) return { ok: false };
  return { ok: true, newVersion: expectedVersion + 1 };
}
