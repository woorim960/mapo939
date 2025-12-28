import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { requireAdminSession } from "@/lib/admin-session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const url = (body?.url ?? "").trim();
  if (!url) return NextResponse.json({ error: "missing_url" }, { status: 400 });

  await del(url);
  return NextResponse.json({ ok: true });
}
