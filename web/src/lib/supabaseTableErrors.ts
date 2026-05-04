/** PostgREST / Supabase errors when a relation is not in the DB (or schema cache). */
export function isMissingTableError(msg?: string | null): boolean {
  const m = String(msg ?? "").toLowerCase();
  return (
    m.includes("could not find the table") ||
    m.includes("schema cache") ||
    (m.includes("relation") && m.includes("does not exist"))
  );
}
