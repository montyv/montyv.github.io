import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  buildPageMetadata,
  canonicalUrl,
  METADATA_DESCRIPTION_MAX_LENGTH,
  SOCIAL_DESCRIPTION_MAX_LENGTH,
  truncateMetadataText,
} from "../../lib/seo";
import {
  catalogEntryIsbn,
  catalogEntryLink,
  catalogEntrySlug,
  catalogEntryTitle,
  catalogEntryYearValue,
  loadCanonicalRawCatalogEntries,
  type RawCatalogEntry,
} from "../../lib/catalog-data";

const DATA_FILE = "monty-publications.json";
const PAGE_PATH = "/publications";

const entries = (): RawCatalogEntry[] => loadCanonicalRawCatalogEntries(DATA_FILE);

const findEntry = (slug: string): RawCatalogEntry | undefined => {
  return entries().find((entry) => catalogEntrySlug(entry) === slug);
};

const entryAbstract = (entry: RawCatalogEntry): string | null => {
  const abstract = String(entry.abstract ?? "").replace(/\s+/g, " ").trim();
  return abstract || null;
};

const entryDescription = (entry: RawCatalogEntry): string => {
  const abstract = entryAbstract(entry);
  if (abstract) return abstract;

  const isbn = catalogEntryIsbn(entry);
  const identifier = isbn ? `ISBN ${isbn}` : entry.doi ? `DOI ${entry.doi}` : null;
  const parts = [entry.authors, entry.source, catalogEntryYearValue(entry) ? String(catalogEntryYearValue(entry)) : null, identifier]
    .filter(Boolean)
    .map((value) => String(value).trim());
  return parts.length ? parts.join(". ") : "Publication details.";
};

export function generateStaticParams() {
  return entries().map((entry) => ({ slug: catalogEntrySlug(entry) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entry = findEntry(slug);
  if (!entry) {
    return buildPageMetadata({
      title: "Publication",
      titleText: "Publication | Velimir V. Vesselinov (monty)",
      description: "Publication details.",
      pathname: `${PAGE_PATH}/${slug}`,
      imagePath: `${PAGE_PATH}/opengraph-image`,
      imageAlt: "Publications by Velimir V. Vesselinov",
      index: false,
    });
  }

  const title = catalogEntryTitle(entry) || "Publication";
  const fullDescription = entryDescription(entry);
  const description = truncateMetadataText(fullDescription, METADATA_DESCRIPTION_MAX_LENGTH);
  const socialDescription = truncateMetadataText(fullDescription, SOCIAL_DESCRIPTION_MAX_LENGTH);
  return buildPageMetadata({
    title,
    titleText: `${title} | Velimir V. Vesselinov (monty)`,
    description,
    socialDescription,
    pathname: `${PAGE_PATH}/${slug}`,
    imagePath: `${PAGE_PATH}/${slug}/opengraph-image`,
    imageAlt: `${title} publication Open Graph card`,
    openGraphType: "article",
  });
}

export default async function PublicationDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = findEntry(slug);
  if (!entry) notFound();

  const title = catalogEntryTitle(entry) || "Publication";
  const link = catalogEntryLink(entry);
  const isbn = catalogEntryIsbn(entry);
  const year = catalogEntryYearValue(entry);
  const abstract = entryAbstract(entry);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    headline: title,
    name: title,
    ...(abstract ? { description: abstract } : {}),
    url: canonicalUrl(`${PAGE_PATH}/${slug}`),
    author: entry.authors
      ? entry.authors.split(/\s*,\s*/).filter(Boolean).map((name) => ({ "@type": "Person", name }))
      : undefined,
    isPartOf: {
      "@type": "CollectionPage",
      name: "Publications",
      url: canonicalUrl(PAGE_PATH),
    },
    ...(entry.source ? { publisher: { "@type": "Organization", name: entry.source } } : {}),
    ...(year ? { datePublished: String(year) } : {}),
    ...(isbn ? { isbn } : entry.doi ? { identifier: entry.doi } : {}),
    ...(link?.href ? { sameAs: link.href } : {}),
  };

  return (
    <main className="py-10">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="space-y-3">
        <p className="text-sm text-slate-300">
          <Link className="hover:underline" href="/publications">
            Publications
          </Link>
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {entry.authors ? <p className="text-slate-200">{entry.authors}</p> : null}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-300">
          {entry.source ? <span>{entry.source}</span> : null}
          {year ? <span>{year}</span> : null}
          {isbn ? <span>ISBN: {isbn}</span> : entry.doi ? <span>DOI: {entry.doi}</span> : null}
        </div>
      </header>

      <section className="mt-8 rounded-lg border border-slate-800 p-5 text-sm text-slate-200">
        <div className="space-y-3">
          {abstract ? (
            <>
              <h2 className="text-base font-semibold tracking-tight text-slate-100">Summary</h2>
              <p>{abstract}</p>
            </>
          ) : (
            <p>{entryDescription(entry)}</p>
          )}
          {link?.href ? (
            <p>
              <a href={link.href} target="_blank" rel="noreferrer" className="hover:underline">
                Open {link.label}
              </a>
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
