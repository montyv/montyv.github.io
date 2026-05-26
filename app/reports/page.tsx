import type { Metadata } from "next";
import Link from "next/link";
import fs from "node:fs";
import path from "node:path";
import contentData from "./reports.content.json";
import overridesData from "./reports.overrides.json";
import { catalogEntrySlug, loadCanonicalCatalogIndex, loadCanonicalRawCatalogEntries, normalizeCatalogItemKey, type CuratedIndex, type CuratedItem } from "../lib/catalog-data";
import { buildCollectionPageJsonLd, buildPageMetadata } from "../lib/seo";

const reportsDescription = "Technical reports and related downloadable documents by Velimir V. Vesselinov.";

export const metadata: Metadata = buildPageMetadata({
  title: "Reports",
  titleText: "Reports | Velimir V. Vesselinov (monty)",
  description: reportsDescription,
  pathname: "/reports",
  keywords: ["Velimir V. Vesselinov reports", "technical reports", "research reports"],
});

const HIGHLIGHT_CLASS = "inline-block rounded bg-slate-100 px-1 font-semibold text-slate-900";

const readGeneratedIndex = (fileName: string, title: string): CuratedIndex => {
  try {
    const abs = path.join(process.cwd(), "app", "reports", fileName);
    const raw = fs.readFileSync(abs, "utf8");
    return JSON.parse(raw) as CuratedIndex;
  } catch {
    return {
      schemaVersion: 1,
      generatedAt: "missing",
      source: `app/reports/${fileName}`,
      title,
      items: [],
      footerHtml: null,
    };
  }
};

const legacyIndex = readGeneratedIndex("reports.legacy.generated.json", "Reports");
const contentIndex = contentData as CuratedIndex;
const canonicalIndex = loadCanonicalCatalogIndex({
  title: "Reports",
  dataFileName: "monty reports.json",
  pdfFolderKey: "reports",
});
const canonicalEntries = loadCanonicalRawCatalogEntries("monty reports.json");
const pdfIndex = readGeneratedIndex("reports.pdf.generated.json", "Reports");
const overridesIndex = overridesData as CuratedIndex;
const canonicalDetailHrefById = new Map(canonicalEntries.map((entry, index) => [`reports-data-${index + 1}`, `/reports/${catalogEntrySlug(entry)}`]));

const footerHtml = (index: CuratedIndex): string | null => {
  if (Array.isArray(index.footerHtmlLines) && index.footerHtmlLines.length) return index.footerHtmlLines.join("\n");
  return index.footerHtml ?? null;
};

const itemPrimaryHref = (item: CuratedItem): string | null => {
  const first = item.pdfLinks?.[0];
  return first?.localHref ?? first?.originalHref ?? null;
};

const itemKey = (item: CuratedItem): string => {
  return itemPrimaryHref(item) ?? normalizeCatalogItemKey(item);
};

const mergeItems = (lists: CuratedItem[][]): CuratedItem[] => {
  const seen = new Set<string>();
  const out: CuratedItem[] = [];

  for (const items of lists) {
    for (const item of items) {
      const key = itemKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }

  return out;
};

const mergedItems = mergeItems([canonicalIndex.items ?? [], overridesIndex.items ?? [], legacyIndex.items ?? [], pdfIndex.items ?? []]);
const footer = footerHtml(contentIndex) ?? footerHtml(canonicalIndex) ?? footerHtml(overridesIndex) ?? footerHtml(legacyIndex);

const itemDisplayText = (item: CuratedItem): string => {
  return String(item.text ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+PDF\.?$/i, "")
    .trim();
};

const itemDisplayHref = (item: CuratedItem): string | null => {
  const first = item.pdfLinks?.[0];
  return first?.localHref ?? first?.originalHref ?? null;
};

const reportsJsonLd = buildCollectionPageJsonLd({
  name: "Reports",
  description: reportsDescription,
  pathname: "/reports",
  itemType: "Report",
  items: mergedItems.map((item) => ({
    name: itemDisplayText(item),
    url: itemDisplayHref(item),
    itemType: "Report",
  })),
});

const renderHighlightedText = (text: string) => {
  const parts = text.split(/(Vesselinov,\s*V\.V\.,|Vesselinov)/gi);
  return parts.map((part, idx) => {
    if (/^Vesselinov,\s*V\.V\.,$/i.test(part) || /^Vesselinov$/i.test(part)) {
      return (
        <span key={`h-${idx}`} className={HIGHLIGHT_CLASS}>
          {part}
        </span>
      );
    }
    return <span key={`t-${idx}`}>{part}</span>;
  });
};

export default function ReportsPage() {
  return (
    <main className="py-10">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reportsJsonLd) }}
      />
      <header className="flex items-baseline justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-slate-300">{mergedItems.length} entries.</p>
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

      <div className="mt-8 space-y-4">
        {mergedItems.map((item) => (
          <div key={itemKey(item)} className="rounded-lg border border-slate-800 p-4">
            <div className="text-sm leading-relaxed text-slate-200">
              {renderHighlightedText(itemDisplayText(item))}
              {itemDisplayHref(item) ? (
                <>
                  {" "}
                  <a href={itemDisplayHref(item) ?? undefined} target="_blank" rel="noreferrer">
                    PDF
                  </a>
                </>
              ) : null}
            </div>
            {item.id && canonicalDetailHrefById.get(item.id) ? (
              <div className="mt-2 text-sm">
                <Link className="hover:underline" href={canonicalDetailHrefById.get(item.id) ?? "/reports"}>
                  Details
                </Link>
              </div>
            ) : null}
            {item.missingLocalPdf ? (
              <div className="mt-2 text-xs text-slate-400">PDF missing locally (link kept as-is)</div>
            ) : null}
          </div>
        ))}
      </div>

      {footer ? (
        <div
          className="mt-8 text-sm text-slate-300"
          dangerouslySetInnerHTML={{ __html: footer }}
        />
      ) : null}
    </main>
  );
}
