import { NextRequest } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

function extensionFromType(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/jpeg") return "jpg";
  if (type === "image/webp") return "webp";
  return "png";
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "invalid_file" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return Response.json({ error: "invalid_file_type" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: "file_too_large" }, { status: 400 });
    }

    const ext = extensionFromType(file.type);
    const filename = `${Date.now()}-${randomUUID()}.${ext}`;
    const publicDir = join(process.cwd(), "public", "uploads", "avatars");
    await mkdir(publicDir, { recursive: true });
    const target = join(publicDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(target, buffer);

    return Response.json({ url: `/uploads/avatars/${filename}` });
  } catch {
    return Response.json({ error: "upload_failed" }, { status: 500 });
  }
}
