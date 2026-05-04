import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { jwtSecret } from "@/lib/jwtSecret";
import { createAnonSupabase, createServiceSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extensionFromType(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/jpeg") return "jpg";
  if (type === "image/jpg") return "jpg";
  if (type === "image/webp") return "webp";
  return "png";
}

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const sbTok = req.cookies.get("sb_access_token")?.value;
  if (sbTok) {
    const anon = createAnonSupabase();
    if (anon) {
      const { data, error } = await anon.auth.getUser(sbTok);
      if (!error && data.user?.id) return data.user.id;
    }
  }
  const appTok = req.cookies.get("access_token")?.value;
  const secret = jwtSecret();
  if (appTok && secret) {
    try {
      const p = jwt.verify(appTok, secret) as { sub?: string };
      if (typeof p.sub === "string") return p.sub;
    } catch {
      /* invalid token */
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) {
      return Response.json({ error: "not_signed_in", hint: "Sign in again, then retry the upload." }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "invalid_file" }, { status: 400 });
    }
    const mime = file.type || "";
    if (mime && !mime.startsWith("image/")) {
      return Response.json({ error: "invalid_file_type" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: "file_too_large" }, { status: 400 });
    }

    const ext = extensionFromType(mime || "image/png");
    const filename = `${Date.now()}-${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const service = createServiceSupabase();
    const bucket = process.env["SUPABASE_AVATAR_BUCKET"]?.trim() || "avatars";

    if (service) {
      const path = `${userId}/${filename}`;
      const { error: upErr } = await service.storage.from(bucket).upload(path, buffer, {
        contentType: mime || `image/${ext === "jpg" ? "jpeg" : ext}`,
        upsert: true,
      });
      if (upErr) {
        console.error("[avatar-upload]", upErr);
        const msg = upErr.message ?? "upload_failed";
        const bucketHint =
          /bucket|not found|404/i.test(msg) && !/row level/i.test(msg)
            ? `In Supabase: Storage → New bucket → name "${bucket}" → create, then set the bucket to Public (or add a policy for public read on avatars).`
            : undefined;
        return Response.json(
          {
            error: "upload_failed",
            detail: msg,
            hint: bucketHint,
          },
          { status: 500 },
        );
      }
      const { data: pub } = service.storage.from(bucket).getPublicUrl(path);
      return Response.json({ url: pub.publicUrl });
    }

    // Local dev without service role: write under public/
    const publicDir = join(process.cwd(), "public", "uploads", "avatars");
    await mkdir(publicDir, { recursive: true });
    const target = join(publicDir, filename);
    await writeFile(target, buffer);

    return Response.json({ url: `/uploads/avatars/${filename}` });
  } catch (e) {
    console.error("[avatar-upload]", e);
    const onVercel = Boolean(process.env["VERCEL"]);
    return Response.json(
      {
        error: "upload_failed",
        hint: onVercel
          ? "On Vercel, add SUPABASE_SERVICE_ROLE_KEY and create a public Storage bucket (default name: avatars)."
          : undefined,
      },
      { status: 500 },
    );
  }
}
