import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-5 pb-24 pt-16 text-center text-primary">
      <p className="text-xs tracking-[0.28em] text-black/55">404</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-black/65">
        That URL does not exist. Try Home or Shop — or open Settings from the gear icon.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-secondary">
          Home
        </Link>
        <Link href="/shop" className="rounded-full border border-black/15 bg-white px-5 py-2 text-sm font-semibold">
          Shop
        </Link>
        <Link href="/settings" className="rounded-full border border-black/15 bg-white px-5 py-2 text-sm font-semibold">
          Settings
        </Link>
      </div>
    </main>
  );
}
