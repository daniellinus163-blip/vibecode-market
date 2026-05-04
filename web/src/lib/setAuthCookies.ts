import type { NextResponse } from "next/server";

/** Matches Express auth cookie options + oauth/sync route. */
export function setAuthCookiesOnResponse(
  res: NextResponse,
  opts: { appToken: string; sbAccessToken?: string; rememberMe: boolean },
) {
  const isProd = process.env.NODE_ENV === "production";
  const maxAgeSec = opts.rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;
  res.cookies.set("access_token", opts.appToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: maxAgeSec,
    path: "/",
  });
  if (opts.sbAccessToken) {
    res.cookies.set("sb_access_token", opts.sbAccessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      maxAge: maxAgeSec,
      path: "/",
    });
  }
}
