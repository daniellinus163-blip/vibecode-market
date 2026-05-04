/** Runtime lookup so JWT_SECRET is not inlined empty at build (Vercel). */
export function jwtSecret(): string | undefined {
  const v = process.env["JWT_SECRET"];
  return typeof v === "string" ? v.trim() : undefined;
}
