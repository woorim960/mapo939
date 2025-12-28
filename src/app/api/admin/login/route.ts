export const runtime = "nodejs";
console.log("LOGIN_ROUTE_LOADED");

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateSessionToken, hashToken } from "@/lib/auth";

export async function POST(req: Request) {
  console.log("LOGIN_ROUTE_HIT");

  try {
    const body = await req.json().catch(() => ({} as any));
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json({ error: "missing_credentials" }, { status: 400 });
    }

    const admin = await prisma.admin.findUnique({ where: { username } });
    if (!admin || !admin.isActive) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    const token = generateSessionToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

    await prisma.adminSession.create({
      data: { adminId: admin.id, tokenHash, expiresAt },
    });

    const res = NextResponse.json({ ok: true });

    res.cookies.set({
      name: "admin_session",
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 20 * 60,
    });

    return res;
  } catch (err) {
    console.error("LOGIN_ERROR:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
