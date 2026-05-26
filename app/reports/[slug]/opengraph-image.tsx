import { ImageResponse } from "next/og";

import {
  catalogEntrySlug,
  catalogEntryTitle,
  catalogEntryYearValue,
  loadCanonicalRawCatalogEntries,
  type RawCatalogEntry,
} from "../../lib/catalog-data";
import { CATALOG_OG_CONTENT_TYPE, CATALOG_OG_SIZE, buildCatalogOgCard } from "../../lib/catalog-og";

const DATA_FILE = "monty reports.json";

const entries = (): RawCatalogEntry[] => loadCanonicalRawCatalogEntries(DATA_FILE);

const findEntry = (slug: string): RawCatalogEntry | undefined => {
  return entries().find((entry) => catalogEntrySlug(entry) === slug);
};

const entryAbstract = (entry: RawCatalogEntry): string | null => {
  const abstract = String(entry.abstract ?? "").replace(/\s+/g, " ").trim();
  return abstract || null;
};

const entryDescription = (entry: RawCatalogEntry): string => {
  return entryAbstract(entry) ?? (
    [entry.source, catalogEntryYearValue(entry) ? String(catalogEntryYearValue(entry)) : null]
      .filter(Boolean)
      .map((value) => String(value).trim())
      .join(". ") || "Report details."
  );
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

  const title = entry ? catalogEntryTitle(entry) || "Report" : "Report";
  const detail = entry ? [entry.source, catalogEntryYearValue(entry) ? String(catalogEntryYearValue(entry)) : null].filter(Boolean).join(" • ") : "Technical report";
  const description = entry ? entryDescription(entry) : "Report details.";
  const tags = entry
    ? ["Report", catalogEntryYearValue(entry) ? String(catalogEntryYearValue(entry)) : null, entry.source ?? null].filter(Boolean) as string[]
    : ["Report"];

  return new ImageResponse(
    buildCatalogOgCard({
      eyebrow: "Velimir V. Vesselinov",
      title,
      detail: detail || undefined,
      description,
      tags,
      footer: entry ? `montyv.github.io/reports/${slug}` : "montyv.github.io/reports",
      accentColor: "#a78bfa",
      label: "Report",
    }),
    {
      ...size,
    },
  );
}
