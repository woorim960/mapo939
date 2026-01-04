import { NextResponse } from "next/server";
import { prisma } from "@/lib/liar/db";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    const p = prisma();
    const playerCount = await p.liarPlayer.count();
    const gameCount = await p.liarGame.count();
    return NextResponse.json({ ok: true, playerCount, gameCount });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
