import Link from "next/link";

export default function NotFound() {
  return (
    <main className="py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-slate-300">The page you requested does not exist.</p>
      <div className="mt-6">
        <Link className="text-sm text-slate-200 hover:underline" href="/">
          Go to Home
        </Link>
      </div>
    </main>
  );
}
