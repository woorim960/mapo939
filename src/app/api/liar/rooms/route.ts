import { NextResponse } from "next/server";
import { listRooms, createRoom, prisma } from "@/lib/liar/db";

export const runtime = "nodejs";

// 방 목록 조회
export async function GET(): Promise<Response> {
  try {
    const rooms = await listRooms();
    return NextResponse.json({ rooms });
  } catch (err) {
    console.error("Failed to list rooms:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// 방 생성
export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json().catch(() => null)) as { name?: string } | null;
    const nameInput = body?.name;
    // 빈 문자열이거나 공백만 있으면 undefined, 그 외에는 trim된 값 사용
    const name = nameInput && typeof nameInput === "string" && nameInput.trim().length > 0 
      ? nameInput.trim() 
      : undefined;

    console.log("Creating room with name:", name);
    const roomId = await createRoom(name);
    
    // 저장된 방 이름을 다시 조회하여 반환
    const createdRoom = await prisma().liarGame.findUnique({
      where: { id: roomId },
      select: { name: true },
    });
    
    console.log("Room created, stored name:", createdRoom?.name);
    return NextResponse.json({ roomId, name: createdRoom?.name ?? null });
  } catch (err) {
    console.error("Failed to create room:", err);
    if (err instanceof Error) {
      console.error("Error details:", err.message, err.stack);
      // Prisma 에러인 경우 더 자세한 정보 제공
      if (err.message.includes("Unknown") || err.message.includes("column") || err.message.includes("relation")) {
        return NextResponse.json({ 
          error: "database_schema_mismatch",
          message: "데이터베이스 마이그레이션이 필요합니다. 'npx prisma migrate dev'를 실행하세요."
        }, { status: 500 });
      }
    }
    return NextResponse.json({ 
      error: "internal_error",
      message: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
    }, { status: 500 });
  }
}
