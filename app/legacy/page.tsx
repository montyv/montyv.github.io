import Link from "next/link";

export default function LegacyPage() {
  return (
    <main className="py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Legacy homepage</h1>
        <p className="text-sm text-slate-300">
          This is an archived entry point for older links. The site is now maintained via the modern pages
          below.
        </p>
      </header>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link className="rounded-lg border border-slate-800 p-4 hover:bg-slate-900/40" href="/">
          <div className="font-medium">Home</div>
        </Link>
        <Link className="rounded-lg border border-slate-800 p-4 hover:bg-slate-900/40" href="/publications">
          <div className="font-medium">Publications</div>
        </Link>
        <Link className="rounded-lg border border-slate-800 p-4 hover:bg-slate-900/40" href="/presentations">
          <div className="font-medium">Presentations</div>
        </Link>
        <Link className="rounded-lg border border-slate-800 p-4 hover:bg-slate-900/40" href="/reports">
          <div className="font-medium">Reports</div>
        </Link>
      </div>

      <p className="mt-8 text-sm text-slate-300">
        If you were looking for the original legacy site, it may still be available at{" "}
        <a className="underline" href="https://monty.gitlab.io" target="_blank" rel="noreferrer">
          monty.gitlab.io
        </a>
        .
      </p>
    </main>
  );
}
