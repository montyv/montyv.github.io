import fs from "node:fs";
import path from "node:path";

export type PdfLink = {
  fileName: string;
  localFileName: string | null;
  originalHref: string;
  localHref: string | null;
  localExists: boolean;
};

export type CuratedItem = {
  id?: string;
  text: string;
  html?: string;
  htmlLines?: string[];
  pdfLinks: PdfLink[];
  missingLocalPdf: boolean;
  linkLabel?: string;
};

export type CuratedIndex = {
  schemaVersion?: number;
  generatedAt: string;
  source: string;
  title: string;
  items: CuratedItem[];
  footerHtml?: string | null;
  footerHtmlLines?: string[];
};

type RawCatalogEntry = {
  authors?: string | null;
  title?: string | null;
  source?: string | null;
  doi?: string | null;
  year?: number | string | null;
  date?: number | string | null;
  url?: string | null;
};

type LoadCanonicalCatalogIndexOptions = {
  title: string;
  dataFileName: string;
  pdfFolderKey: string;
};

const normalizeWhitespace = (value: string | null | undefined): string => {
  return String(value ?? "").replace(/\s+/g, " ").trim();
};

const normalizeForKey = (value: string | null | undefined): string => {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "and")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const normalizePdfKey = (value: string | null | undefined): string | null => {
  if (!value) return null;

  let decoded = String(value);
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // Keep the raw string when it is not URI-encoded.
  }

  const normalized = decoded
    .normalize("NFKC")
    .replace(/\u00a0/g, " ")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\\/]/g, "/");

  const base = normalized.includes("/") ? normalized.split("/").pop() : normalized;
  const collapsed = normalizeWhitespace(base);
  if (!collapsed) return null;
  return collapsed.toLowerCase();
};

const extractPdfFileNameFromHref = (href: string | null | undefined): string | null => {
  if (!href || typeof href !== "string") return null;

  const lower = href.toLowerCase();
  const pdfIndex = lower.lastIndexOf(".pdf");
  if (pdfIndex === -1) return null;

  const truncated = href.slice(0, pdfIndex + 4);
  const slashIndex = truncated.lastIndexOf("/");
  const rawName = slashIndex >= 0 ? truncated.slice(slashIndex + 1) : truncated;

  try {
    return decodeURIComponent(rawName);
  } catch {
    return rawName;
  }
};

const listPdfFiles = (folderKey: string): string[] => {
  const publicDir = path.join(process.cwd(), "public", folderKey);
  try {
    return fs
      .readdirSync(publicDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".pdf")
      .map((entry) => entry.name);
  } catch {
    return [];
  }
};

const buildPdfLookup = (folderKey: string): Map<string, string> => {
  const map = new Map<string, string>();
  for (const fileName of listPdfFiles(folderKey)) {
    const key = normalizePdfKey(fileName);
    if (key && !map.has(key)) {
      map.set(key, fileName);
    }
  }
  return map;
};

const normalizeYear = (value: RawCatalogEntry["year"] | RawCatalogEntry["date"]): number | null => {
  if (value == null) return null;
  const text = String(value);
  const match = text.match(/(?:19|20)\d{2}/);
  if (!match) return null;
  const year = Number(match[0]);
  return Number.isFinite(year) ? year : null;
};

const entryTitle = (entry: RawCatalogEntry): string | null => {
  const title = normalizeWhitespace(entry.title);
  if (title) return title;
  const source = normalizeWhitespace(entry.source);
  return source || null;
};

const formatPublicationText = (entry: RawCatalogEntry): string => {
  const parts: string[] = [];
  const authors = normalizeWhitespace(entry.authors);
  const title = normalizeWhitespace(entry.title);
  const source = normalizeWhitespace(entry.source);
  const doi = normalizeWhitespace(entry.doi);
  const year = normalizeYear(entry.year ?? entry.date);

  if (authors) parts.push(authors);

  if (title && source) {
    parts.push(title);
    parts.push(source);
  } else if (title) {
    parts.push(title);
  } else if (source) {
    parts.push(source);
  }

  if (doi) parts.push(doi);
  if (year) parts.push(String(year));

  return parts.join(", ");
};

const formatPresentationText = (entry: RawCatalogEntry): string => {
  const parts: string[] = [];
  const authors = normalizeWhitespace(entry.authors);
  const title = normalizeWhitespace(entry.title);
  const source = normalizeWhitespace(entry.source);
  const year = normalizeYear(entry.year ?? entry.date);

  if (authors) parts.push(authors);
  if (title) parts.push(title);
  if (source) parts.push(source);
  if (year) parts.push(String(year));

  return parts.join(", ");
};

const preferredUrl = (entry: RawCatalogEntry): { href: string; label: string } | null => {
  const directUrl = normalizeWhitespace(entry.url);
  if (directUrl) {
    return {
      href: directUrl,
      label: /\.pdf(?:$|[?#])/i.test(directUrl) ? "PDF" : "Link",
    };
  }

  const doi = normalizeWhitespace(entry.doi);
  if (!doi) return null;

  return {
    href: `https://doi.org/${doi}`,
    label: "DOI",
  };
};

const resolvePrimaryLink = (
  entry: RawCatalogEntry,
  folderKey: string,
  pdfLookup: Map<string, string>,
): { pdfLinks: PdfLink[]; missingLocalPdf: boolean; linkLabel?: string } => {
  const preferred = preferredUrl(entry);
  if (!preferred) {
    return {
      pdfLinks: [],
      missingLocalPdf: false,
    };
  }

  const extractedFileName = extractPdfFileNameFromHref(preferred.href);
  const normalizedFileKey = normalizePdfKey(extractedFileName ?? preferred.href);
  const localFileName = normalizedFileKey ? pdfLookup.get(normalizedFileKey) ?? null : null;
  const localHref = localFileName ? `/${folderKey}/${encodeURIComponent(localFileName)}` : null;
  const originalLooksLikePdf = /\.pdf(?:$|[?#])/i.test(preferred.href);

  return {
    pdfLinks: [
      {
        fileName: extractedFileName ?? preferred.href,
        localFileName,
        originalHref: preferred.href,
        localHref,
        localExists: Boolean(localFileName),
      },
    ],
    missingLocalPdf: originalLooksLikePdf && !localFileName,
    linkLabel: preferred.label,
  };
};

const renderHtml = (text: string, href: string | null, label: string | undefined): string => {
  if (!href) return text;
  const safeHref = href.replace(/"/g, "&quot;");
  const safeLabel = normalizeWhitespace(label) || "PDF";
  return `${text}. <a href="${safeHref}" target="_blank" rel="noreferrer">${safeLabel}</a>`;
};

export const normalizeCatalogItemKey = (item: Pick<CuratedItem, "text" | "html" | "htmlLines" | "pdfLinks" | "id">): string => {
  const firstHref = item.pdfLinks?.[0]?.localHref ?? item.pdfLinks?.[0]?.originalHref ?? null;
  if (firstHref) return `href:${firstHref}`;

  const html = Array.isArray(item.htmlLines) && item.htmlLines.length ? item.htmlLines.join("\n") : item.html ?? "";
  const text = normalizeForKey(item.text || html || item.id);
  return text || `id:${item.id ?? "unknown"}`;
};

const itemSortableText = (item: Pick<CuratedItem, "text" | "html" | "htmlLines">): string => {
  if (item.text) return item.text;
  if (Array.isArray(item.htmlLines) && item.htmlLines.length) return item.htmlLines.join(" ");
  return item.html ?? "";
};

export const catalogItemYear = (item: Pick<CuratedItem, "text" | "html" | "htmlLines">): number => {
  const matches = itemSortableText(item).match(/(?:19|20)\d{2}/g) ?? [];
  const years = matches
    .map((match) => Number(match))
    .filter((year) => Number.isFinite(year));

  return years.length ? Math.max(...years) : 0;
};

export const sortCatalogItems = <T extends CuratedItem>(items: T[]): T[] => {
  return [...items].sort((left, right) => {
    const yearDiff = catalogItemYear(right) - catalogItemYear(left);
    if (yearDiff !== 0) return yearDiff;

    const textDiff = normalizeWhitespace(left.text).localeCompare(normalizeWhitespace(right.text));
    if (textDiff !== 0) return textDiff;

    return normalizeCatalogItemKey(left).localeCompare(normalizeCatalogItemKey(right));
  });
};

export const loadCanonicalCatalogIndex = ({ title, dataFileName, pdfFolderKey }: LoadCanonicalCatalogIndexOptions): CuratedIndex => {
  const abs = path.join(process.cwd(), "app", "data", dataFileName);
  const pdfLookup = buildPdfLookup(pdfFolderKey);

  let entries: RawCatalogEntry[] = [];
  try {
    entries = JSON.parse(fs.readFileSync(abs, "utf8")) as RawCatalogEntry[];
  } catch {
    entries = [];
  }

  const items: CuratedItem[] = entries
    .filter((entry) => Boolean(entryTitle(entry)))
    .map((entry, index) => {
      const text = title === "Publications" ? formatPublicationText(entry) : formatPresentationText(entry);
      const { pdfLinks, missingLocalPdf, linkLabel } = resolvePrimaryLink(entry, pdfFolderKey, pdfLookup);
      const href = pdfLinks[0]?.localHref ?? pdfLinks[0]?.originalHref ?? null;

      return {
        id: `${pdfFolderKey}-data-${index + 1}`,
        text,
        htmlLines: [renderHtml(text, href, linkLabel)],
        pdfLinks,
        missingLocalPdf,
        linkLabel,
      };
    });

  return {
    schemaVersion: 1,
    generatedAt: "canonical-data",
    source: `app/data/${dataFileName}`,
    title,
    items,
  };
};