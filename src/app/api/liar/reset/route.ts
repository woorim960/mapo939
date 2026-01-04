import { NextResponse } from "next/server";
import { prisma } from "@/lib/liar/db";

export const runtime = "nodejs";

type Body = { playerId?: string }; // 이제 권한 체크 안 해서 optional로 둬도 됨

export async function POST(req: Request): Promise<Response> {
  // body는 받아도 되고 안 받아도 됨 (로그용)
  void ((await req.json().catch(() => null)) as Body | null);

  const p = prisma();

  try {
    await p.$transaction(async tx => {
      // ✅ 플레이어/점수/닉네임 전부 삭제
      await tx.liarPlayer.deleteMany({});
      // ✅ 게임 상태 1-row도 삭제 (완전 초기화)
      await tx.liarGame.deleteMany({});
    });
  } catch {
    return NextResponse.json({ ok: false, error: "reset_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
