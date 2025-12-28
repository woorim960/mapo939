import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { requireAdminSession } from "@/lib/admin-session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  const input = Buffer.from(await file.arrayBuffer());

  // ✅ webp 리사이즈 (원형은 프론트 미리보기만, 실제 파일은 정사각)
  const webp = await sharp(input)
    .resize(512, 512, { fit: "cover" })
    .webp({ quality: 82 })
    .toBuffer();

  const key = `members/${Date.now()}-${Math.random().toString(16).slice(2)}.webp`;

  const blob = await put(key, webp, {
    access: "public",
    contentType: "image/webp",
  });

  return NextResponse.json({ url: blob.url });
}
