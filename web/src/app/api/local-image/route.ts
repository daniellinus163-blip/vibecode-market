import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "1";
  const candidates = [
    join(process.cwd(), "public", "catalog", `${id}.png`),
    join(process.cwd(), "public", "catalog", `${id}.jpg`),
    join(process.cwd(), "public", "catalog", `${id}.jpeg`),
    join(process.cwd(), "public", "catalog", `${id}.webp`),
  ];

  for (const path of candidates) {
    try {
      const buffer = await readFile(path);
      const ct = path.endsWith(".webp")
        ? "image/webp"
        : path.endsWith(".jpg") || path.endsWith(".jpeg")
          ? "image/jpeg"
          : "image/png";
      return new Response(buffer, {
        headers: {
          "content-type": ct,
          "cache-control": "public, max-age=86400",
        },
      });
    } catch {
      /* try next candidate */
    }
  }

  return new Response("Not found", { status: 404 });
}
