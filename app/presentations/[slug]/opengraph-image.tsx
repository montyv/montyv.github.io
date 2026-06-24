import { ImageResponse } from "next/og";

import {
  catalogEntryIsbn,
  catalogEntrySlug,
  catalogEntryTitle,
  catalogEntryYearValue,
  loadCanonicalRawCatalogEntries,
  type RawCatalogEntry,
} from "../../lib/catalog-data";
import { CATALOG_OG_CONTENT_TYPE, CATALOG_OG_SIZE, buildCatalogOgCard } from "../../lib/catalog-og";

const DATA_FILE = "monty-presentations.json";

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
  return parts.length ? parts.join(". ") : "Presentation details.";
};

export const dynamic = "force-static";
export const size = CATALOG_OG_SIZE;
export const contentType = CATALOG_OG_CONTENT_TYPE;

export const generateStaticParams = async () => {
  return entries().map((entry) => ({ slug: catalogEntrySlug(entry) }));
};

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = findEntry(slug);

  const title = entry ? catalogEntryTitle(entry) || "Presentation" : "Presentation";
  const detail = entry ? [entry.source, catalogEntryYearValue(entry) ? String(catalogEntryYearValue(entry)) : null].filter(Boolean).join(" • ") : "Talk or slide deck";
  const description = entry ? entryDescription(entry) : "Presentation details.";
  const tags = entry
    ? ["Presentation", catalogEntryYearValue(entry) ? String(catalogEntryYearValue(entry)) : null, entry.source ?? null].filter(Boolean) as string[]
    : ["Presentation"];

  return new ImageResponse(
    buildCatalogOgCard({
      eyebrow: "Velimir V. Vesselinov",
      title,
      detail: detail || undefined,
      byline: entry?.authors ?? undefined,
      description,
      tags,
      footer: entry ? `montyv.github.io/presentations/${slug}` : "montyv.github.io/presentations",
      accentColor: "#f59e0b",
      label: "Presentation",
    }),
    {
      ...size,
    },
  );
}
