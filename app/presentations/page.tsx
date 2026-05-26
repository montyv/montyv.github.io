import type { Metadata } from "next";
import Link from "next/link";
import * as cheerio from "cheerio";
import fs from "node:fs";
import path from "node:path";

import { catalogEntrySlug, loadCanonicalCatalogIndex, loadCanonicalRawCatalogEntries, normalizeCatalogItemKey, type CuratedIndex, type CuratedItem, type PdfLink } from "../lib/catalog-data";
import { buildCollectionPageJsonLd, buildPageMetadata } from "../lib/seo";
import overridesData from "./presentations.overrides.json";

const presentationsDescription = "Conference talks, invited presentations, and slides by Velimir V. Vesselinov.";
const PRESENTATIONS_OG_IMAGE = "/presentations/opengraph-image";

export const metadata: Metadata = buildPageMetadata({
  title: "Presentations",
  titleText: "Presentations | Velimir V. Vesselinov (monty)",
  description: presentationsDescription,
  pathname: "/presentations",
  imagePath: PRESENTATIONS_OG_IMAGE,
  imageAlt: "Presentations by Velimir V. Vesselinov",
  keywords: ["Velimir V. Vesselinov presentations", "conference talks", "AI/ML", "geoscience presentations"],
});

const HIGHLIGHT_CLASS = "inline-block rounded bg-slate-100 px-1 font-semibold text-slate-900";

const highlightMyNameHtml = (html: string): string => {
  if (!html) return html;

  const $ = cheerio.load(`<div id="root">${html}</div>`);
  const root = $("#root");

  const textNodes = root.find("*").addBack().contents().toArray().filter((n) => n.type === "text");

  for (const node of textNodes) {
    const text = (node as unknown as { data?: string }).data ?? "";
    const nextText = text.replace(/Vesselinov,\s*V\.V\.,|\bVesselinov\b/gi, (match) => `<span class="${HIGHLIGHT_CLASS}">${match}</span>`);
    if (nextText !== text) {
      $(node).replaceWith(nextText);
    }
  }

  return root.html() ?? html;
};

const readGeneratedIndex = (fileName: string, title: string): CuratedIndex => {
  try {
    const abs = path.join(process.cwd(), "app", "presentations", fileName);
    const raw = fs.readFileSync(abs, "utf8");
    return JSON.parse(raw) as CuratedIndex;
  } catch {
    return {
      schemaVersion: 1,
      generatedAt: "missing",
      source: `app/presentations/${fileName}`,
      title,
      items: [],
      footerHtml: null,
    };
  }
};

const legacyIndex = readGeneratedIndex("presentations.legacy.generated.json", "Presentations");
const canonicalIndex = loadCanonicalCatalogIndex({
  title: "Presentations",
  dataFileName: "monty presentations.json",
  pdfFolderKey: "presentations",
});
const canonicalEntries = loadCanonicalRawCatalogEntries("monty presentations.json");
const pdfIndex = readGeneratedIndex("presentations.pdf.generated.json", "Presentations");
const overridesIndex = overridesData as CuratedIndex;
const canonicalDetailHrefById = new Map(canonicalEntries.map((entry, index) => [`presentations-data-${index + 1}`, `/presentations/${catalogEntrySlug(entry)}`]));

const itemHtml = (item: CuratedItem): string => {
  if (Array.isArray(item.htmlLines) && item.htmlLines.length) return item.htmlLines.join("\n");
  return item.html ?? "";
};

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
const footer = footerHtml(canonicalIndex) ?? footerHtml(legacyIndex) ?? footerHtml(overridesIndex);

const presentationsJsonLd = buildCollectionPageJsonLd({
  name: "Presentations",
  description: presentationsDescription,
  pathname: "/presentations",
  items: mergedItems.map((item) => ({
    name: itemHtml(item).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
    url: itemPrimaryHref(item),
  })),
});

export default function PresentationsPage() {
  return (
    <main className="py-10">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(presentationsJsonLd) }}
      />
      <header className="flex items-baseline justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Presentations</h1>
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
            <div
              className="text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: highlightMyNameHtml(itemHtml(item)) }}
            />
            {item.id && canonicalDetailHrefById.get(item.id) ? (
              <div className="mt-2 text-sm">
                <Link className="hover:underline" href={canonicalDetailHrefById.get(item.id) ?? "/presentations"}>
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
          dangerouslySetInnerHTML={{ __html: highlightMyNameHtml(footer) }}
        />
      ) : null}
    </main>
  );
}
