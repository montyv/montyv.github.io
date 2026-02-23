import Link from "next/link";

import contentData from "./publications.content.json";
import legacyData from "./publications.legacy.generated.json";
import pdfData from "./publications.pdf.generated.json";
import overridesData from "./publications.overrides.json";

type PdfLink = {
  fileName: string;
  localFileName: string | null;
  originalHref: string;
  localHref: string | null;
  localExists: boolean;
};

type CuratedItem = {
  id?: string;
  text: string;
  html?: string;
  htmlLines?: string[];
  pdfLinks: PdfLink[];
  missingLocalPdf: boolean;
};

type CuratedIndex = {
  schemaVersion?: number;
  generatedAt: string;
  source: string;
  title: string;
  items: CuratedItem[];
  footerHtml?: string | null;
  footerHtmlLines?: string[];
};

const legacyIndex = legacyData as CuratedIndex;
const contentIndex = contentData as CuratedIndex;
const pdfIndex = pdfData as CuratedIndex;
const overridesIndex = overridesData as CuratedIndex;

const footerHtml = (index: CuratedIndex): string | null => {
  if (Array.isArray(index.footerHtmlLines) && index.footerHtmlLines.length) return index.footerHtmlLines.join("\n");
  return index.footerHtml ?? null;
};

const itemPrimaryHref = (item: CuratedItem): string | null => {
  const first = item.pdfLinks?.[0];
  return first?.localHref ?? first?.originalHref ?? null;
};

const itemKey = (item: CuratedItem): string => {
  return itemPrimaryHref(item) ?? item.id ?? item.html ?? item.text;
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

const mergedItems = mergeItems([contentIndex.items ?? [], overridesIndex.items ?? [], legacyIndex.items ?? [], pdfIndex.items ?? []]);
const footer = footerHtml(contentIndex) ?? footerHtml(overridesIndex) ?? footerHtml(legacyIndex);

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

export default function PublicationsPage() {
  return (
    <main className="py-10">
      <header className="flex items-baseline justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Publications</h1>
          <p className="text-sm text-slate-300">
            {mergedItems.length} entries (content: {contentIndex.items.length}, overrides: {overridesIndex.items.length}, legacy: {legacyIndex.items.length}, PDF: {pdfIndex.items.length}).
          </p>
        </div>
        <nav className="flex gap-3 text-sm">
          <Link className="text-slate-200 hover:underline" href="/">
            Home
          </Link>
          <Link className="text-slate-200 hover:underline" href="/reports">
            Reports
          </Link>
        </nav>
      </header>

      <div className="mt-8 space-y-4">
        {mergedItems.map((item) => (
          <div key={itemKey(item)} className="rounded-lg border border-slate-800 p-4">
            <div className="text-sm leading-relaxed text-slate-200">
              {itemDisplayText(item)}
              {itemDisplayHref(item) ? (
                <>
                  {" "}
                  <a href={itemDisplayHref(item) ?? undefined} target="_blank" rel="noreferrer">
                    PDF
                  </a>
                </>
              ) : null}
            </div>
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
