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

export async function getOrCreateGame(roomId: string): Promise<{ state: GameState; dbVersion: number }> {
  const p = prisma();

  const row = await p.liarGame.findUnique({ where: { id: roomId } });
  if (row) {
    const state = row.stateJson as unknown as GameState;
    return { state: { ...state, version: row.version }, dbVersion: row.version };
  }

  const initial = createInitialGameState();

  try {
    await p.liarGame.create({
      data: { 
        id: roomId, 
        name: null,
        version: 0, 
        stateJson: initial as unknown as object 
      },
    });
  } catch (err) {
    const again = await p.liarGame.findUnique({ where: { id: roomId } });
    if (!again) {
      console.error("Failed to create or load LiarGame:", err);
      throw new Error("Failed to create or load LiarGame");
    }
    const state = again.stateJson as unknown as GameState;
    return { state: { ...state, version: again.version }, dbVersion: again.version };
  }

  return { state: initial, dbVersion: 0 };
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

  try {
    const created = await p.liarGame.create({
      data: {
        id: roomId,
        name: roomName,
        version: 0,
        stateJson: initial as unknown as object,
      },
    });
    console.log("Room created:", { id: created.id, name: created.name });
    
    // 방 이름이 설정된 경우 게임 상태 버전을 증가시켜서 클라이언트가 즉시 반영하도록 함
    if (roomName) {
      try {
        const { state, dbVersion } = await getOrCreateGame(roomId);
        const nextState = {
          ...state,
          version: (state.version ?? 0) + 1,
        };
        await updateGameCAS(roomId, dbVersion, nextState);
      } catch (err) {
        // 버전 증가 실패는 무시 (다음 polling에서 반영됨)
        console.error("Failed to increment version after room creation:", err);
      }
    }
    
    return roomId;
  } catch (err) {
    console.error("Failed to create room in DB:", err);
    if (err instanceof Error) {
      console.error("Error details:", err.message);
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

  for (const room of rooms) {
    const state = room.stateJson as unknown as GameState;
    const playerCount = (state.players ?? []).length;
    const phase = state.phase ?? "LOBBY";
    const updatedAtMs = room.updatedAt.getTime();
    const timeSinceUpdate = now - updatedAtMs;

    if (playerCount === 0) {
      // 빈 방은 삭제 대상으로 표시
      emptyRoomIds.push(String(room.id));
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
    // 먼저 게임 상태에 roomDeleted 플래그 설정 (모든 플레이어에게 알림)
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { state, dbVersion } = await getOrCreateGame(roomId);
      
      // roomDeleted 플래그 설정 및 버전 증가
      const nextState = {
        ...state,
        roomDeleted: true,
        version: (state.version ?? 0) + 1,
      };
      
      const res = await updateGameCAS(roomId, dbVersion, nextState);
      if (res.ok) {
        // 플래그 설정 성공 후 잠시 대기 (플레이어들이 감지할 시간 제공)
        await new Promise(resolve => setTimeout(resolve, 500));
        break;
      }
    }
    
    // 플레이어 정보 삭제
    await p.liarPlayer.deleteMany({
      where: { gameId: roomId },
    });
    
    // 방 삭제
    await p.liarGame.delete({ where: { id: roomId } });
    return true;
  } catch (err) {
    console.error("Failed to delete room:", err);
    return false;
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
