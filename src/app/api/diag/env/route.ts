import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const v = process.env.DATABASE_URL ?? "";
  return NextResponse.json({
    hasDatabaseUrl: v.length > 0,
    length: v.length,
  });
}
