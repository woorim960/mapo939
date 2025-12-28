import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";

export async function requireAdminOr401() {
  const admin = await requireAdminSession();
  if (!admin) {
    return { admin: null, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { admin, response: null };
}
