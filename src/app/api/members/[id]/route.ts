import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-session";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const body = await req.json().catch(() => null);

  const data: any = {};
  if (typeof body?.name === "string") data.name = body.name.trim();
  if (typeof body?.phone === "string") data.phone = body.phone.trim();
  if (typeof body?.photoUrl === "string") data.photoUrl = body.photoUrl.trim();

  if (typeof body?.birthDate === "string" && body.birthDate) {
    const dt = new Date(`${body.birthDate}T00:00:00.000Z`);
    if (Number.isNaN(dt.getTime())) {
      return NextResponse.json({ error: "invalid_birthDate" }, { status: 400 });
    }
    data.birthDate = dt;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "no_changes" }, { status: 400 });
  }

  await prisma.member.update({
    where: { id },
    data,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  await prisma.member.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
