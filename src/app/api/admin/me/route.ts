import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";

export async function GET() {
  const sess = await getAdminSession();
  if (!sess) return NextResponse.json({ isAdmin: false });
  return NextResponse.json({
    isAdmin: true,
    adminId: sess.adminId,
    username: sess.username,
    expiresAt: sess.expiresAt.toISOString(),
  });
}
