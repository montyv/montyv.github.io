import type { Metadata } from "next";
import Link from "next/link";

import { buildCollectionPageJsonLd, buildPageMetadata, canonicalUrl } from "../lib/seo";
import { loadSoftwareEntries } from "../lib/software-data";
import { SOFTWARE_OG_IMAGE_PATH } from "./software-og";

const PAGE_PATH = "/software";
const softwareDescription =
  "Software and computational tools by Velimir V. Vesselinov, including SmartTensors, MADS, WELLS, and related open-source projects.";

export const metadata: Metadata = buildPageMetadata({
  title: "Software",
  titleText: "Software | Velimir V. Vesselinov (monty)",
  description: softwareDescription,
  pathname: PAGE_PATH,
  imagePath: SOFTWARE_OG_IMAGE_PATH,
  imageAlt: "Software catalog by Velimir V. Vesselinov",
  keywords: [
    "Velimir V. Vesselinov software",
    "SmartTensors",
    "MADS",
    "WELLS",
    "open-source scientific software",
  ],
});

export default function SoftwarePage() {
  const software = loadSoftwareEntries();

  const softwareJsonLd = buildCollectionPageJsonLd({
    name: "Software",
    description: softwareDescription,
    pathname: PAGE_PATH,
    itemType: "SoftwareApplication",
    items: software.map((entry) => ({
      name: entry.name,
      url: `${PAGE_PATH}/${entry.slug}`,
      itemType: "SoftwareApplication",
    })),
  });

  return (
    <main className="py-10">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />

      <header className="flex items-baseline justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Software</h1>
          <p className="text-sm text-slate-300">{software.length} software tools.</p>
        </div>
        <nav className="flex gap-3 text-sm">
          <Link className="text-slate-200 hover:underline" href="/">
            Home
          </Link>
          <Link className="text-slate-200 hover:underline" href="/publications">
            Publications
          </Link>
        </nav>
      </header>

      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300">{softwareDescription}</p>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {software.map((entry) => (
          <article key={entry.slug} className="rounded-lg border border-slate-800 p-5">
            {entry.logo ? (
              <div className="mb-4 flex h-16 items-center">
                <img
                  src={entry.logo}
                  alt={entry.logoAlt ?? `${entry.name} logo`}
                  className="max-h-14 w-auto object-contain"
                />
              </div>
            ) : null}

            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight">
                <Link className="hover:underline" href={`${PAGE_PATH}/${entry.slug}`}>
                  {entry.name}
                </Link>
              </h2>
              {entry.status ? <span className="text-xs text-slate-300">{entry.status}</span> : null}
            </div>

            {entry.category || entry.year ? (
              <p className="mt-1 text-xs text-slate-400">
                {[entry.category, entry.year ? String(entry.year) : null].filter(Boolean).join(" • ")}
              </p>
            ) : null}

            <p className="mt-3 text-sm leading-relaxed text-slate-200">{entry.summary}</p>

            {entry.highlights?.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
                {entry.highlights.slice(0, 2).map((highlight) => (
                  <li key={`${entry.slug}-${highlight}`}>{highlight}</li>
                ))}
              </ul>
            ) : null}

            {entry.tags?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {entry.tags.slice(0, 4).map((tag) => (
                  <span key={`${entry.slug}-${tag}`} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Link className="hover:underline" href={`${PAGE_PATH}/${entry.slug}`}>
                Details
              </Link>
              {entry.website ? (
                <a href={entry.website} target="_blank" rel="noreferrer" className="hover:underline">
                  Website
                </a>
              ) : null}
              {entry.repository ? (
                <a href={entry.repository} target="_blank" rel="noreferrer" className="hover:underline">
                  Source
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      <p className="mt-8 text-xs text-slate-400">Canonical URL: {canonicalUrl(PAGE_PATH)}</p>
    </main>
  );
}
