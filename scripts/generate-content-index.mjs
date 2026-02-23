import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";

const parseFlagValues = new Set(["1", "true", "yes", "on"]);
const shouldParsePdfs =
  process.argv.includes("--parse-pdfs") ||
  parseFlagValues.has(String(process.env.PARSE_PDFS ?? "").toLowerCase()) ||
  parseFlagValues.has(String(process.env.npm_config_parse_pdfs ?? "").toLowerCase());

let pdfParsePromise = null;
const getPdfParse = async () => {
  if (!pdfParsePromise) {
    pdfParsePromise = import("pdf-parse").then((m) => m.default ?? m);
  }
  return pdfParsePromise;
};

const repoRoot = process.cwd();

// Unified schema for curated (editable) and PDF-extracted lists.
// Both emit the same fields so UI pages can merge them.
const INDEX_SCHEMA_VERSION = 1;

const topics = [
  { key: "publications", title: "Publications", pdfFolderKey: "papers" },
  { key: "presentations", title: "Presentations", pdfFolderKey: "presentations" },
  { key: "reports", title: "Reports", pdfFolderKey: "reports" },
];

const legacySourcePath = path.join(repoRoot, "legacy", "index.html");

const normalizeString = (value) => {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.replace(/\0/g, "").trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === "untitled") return null;
  return trimmed;
};

const sanitizePdfTitle = (title) => {
  const t = normalizeString(title);
  if (!t) return null;

  // Common artifacts from slide exports.
  let cleanedTitle = t;
  cleanedTitle = cleanedTitle.replace(/^microsoft\s+powerpoint\s*-\s*/i, "");
  cleanedTitle = cleanedTitle.replace(/\.(pptx?|pdf)$/i, "");
  cleanedTitle = cleanedTitle.replace(/\s+/g, " ").trim();
  if (!cleanedTitle) return null;

  // Common artifacts from some slide exports / PDF-to-text quirks.
  if (/\b\d{1,3}px\b/i.test(t)) return null;
  if (/`{2,}|%{2,}|_{2,}|~{2,}/.test(t)) return null;

  // If title is mostly non-letters, treat as unusable.
  const letters = (t.match(/[A-Za-z]/g) ?? []).length;
  if (letters < 4) return null;

  const isShoutingTitle = (s) => {
    const letterChars = (s.match(/[A-Za-z]/g) ?? []).length;
    if (letterChars < 8) return false;

    const lowerChars = (s.match(/[a-z]/g) ?? []).length;
    if (lowerChars > 0) return false;

    const upperChars = (s.match(/[A-Z]/g) ?? []).length;
    return upperChars / letterChars >= 0.9;
  };

  const titleCaseWord = (word, { isFirst, isLast }) => {
    if (!word) return word;

    // Preserve acronyms / IDs / roman numerals.
    if (/\d/.test(word)) return word;
    if (/^[IVXLCDM]{2,7}$/.test(word)) return word;
    if (/^LA-UR-\d+/i.test(word)) return word.toUpperCase();

    const ACRONYMS = new Set([
      "LA",
      "LANL",
      "NNSA",
      "DOE",
      "US",
      "USA",
      "U.S",
      "EPA",
      "USGS",
      "RLWTF",
      "RCRA",
      "CERCLA",
      "NMED",
      "NPDES",
      "QA",
      "QC",
    ]);

    // Keep only *known* acronyms, otherwise treat as a normal word.
    if (/^[A-Z]{2,10}$/.test(word) && ACRONYMS.has(word)) return word;

    const lower = word.toLowerCase();
    const stop = new Set(["a", "an", "and", "as", "at", "by", "for", "from", "in", "of", "on", "or", "the", "to", "with"]);
    if (!isFirst && !isLast && stop.has(lower)) return lower;

    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  const prettifyShoutingTitle = (s) => {
    // Convert to a conservative Title Case while preserving punctuation and acronyms.
    const parts = s.split(/(\s+)/);
    const words = parts.filter((p) => /\S/.test(p));
    let wordIndex = 0;
    const lastWordIndex = words.length - 1;

    return parts
      .map((part) => {
        if (!/\S/.test(part)) return part;

        // Split on hyphen and slash but keep delimiters.
        const sub = part.split(/([\/-])/);
        const mapped = sub.map((seg) => {
          if (seg === "-" || seg === "/") return seg;
          const stripped = seg.replace(/^[\("'\[]+|[\)"'\].,;:!?]+$/g, "");
          if (!stripped || /[a-z]/.test(seg)) return seg; // already has lowercase; keep
          const cased = titleCaseWord(stripped, { isFirst: wordIndex === 0, isLast: wordIndex === lastWordIndex });
          // Re-apply original leading/trailing punctuation.
          const leading = seg.match(/^[\("'\[]+/)?.[0] ?? "";
          const trailing = seg.match(/[\)"'\].,;:!?]+$/)?.[0] ?? "";
          return `${leading}${cased}${trailing}`;
        });

        wordIndex += 1;
        return mapped.join("");
      })
      .join("");
  };

  if (isShoutingTitle(cleanedTitle)) {
    return prettifyShoutingTitle(cleanedTitle);
  }

  return cleanedTitle;
};

const sanitizeAuthors = (authors) => {
  const a = normalizeString(authors);
  if (!a) return null;

  // Strip email addresses commonly embedded in parentheses.
  let cleaned = a.replace(/\([^)]*@[A-Za-z0-9_.-]+[^)]*\)/g, "");

  // Normalize whitespace but keep punctuation like ',' and '&'.
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Tidy spacing around commas.
  cleaned = cleaned.replace(/\s+,/g, ",").replace(/,\s+/g, ", ");

  // Drop obvious timestamp/title strings misidentified as authors.
  if (/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(cleaned) || /\bAM\b|\bPM\b/.test(cleaned)) return null;
  if (/\b\d{1,3}px\b/i.test(cleaned)) return null;
  if (/`{2,}|%{2,}|_{2,}|~{2,}/.test(cleaned)) return null;

  // Must contain at least one letter and one delimiter/space.
  if (!/[A-Za-z]/.test(cleaned)) return null;
  if (cleaned.split(" ").length < 2) return null;

  return cleaned;
};

const titleFromFilename = (fileName) => {
  const withoutExt = fileName.replace(/\.[^.]+$/i, "");
  return withoutExt.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
};

const yearFromFilename = (fileName) => {
  if (!fileName || typeof fileName !== "string") return null;

  // Match a standalone 4-digit year (1900-2099) that is not part of a longer number.
  const match = fileName.match(/(?:^|[^0-9])((?:19|20)\d{2})(?:[^0-9]|$)/);
  if (!match) return null;

  const year = Number(match[1]);
  if (!Number.isFinite(year)) return null;
  return year;
};

const guessAuthorsFromText = (text) => {
  if (!text || typeof text !== "string") return null;

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 30);

  const looksLikeBoilerplate = (line) => {
    const l = line.toLowerCase();
    if (l.includes("los alamos national laboratory")) return true;
    if (l.includes("affirmative action") || l.includes("equal opportunity")) return true;
    if (l.includes("department of energy")) return true;
    if (l.includes("contract") && l.includes("eng")) return true;
    if (l.includes("approved for public release")) return true;
    if (l.includes("distribution is unlimited")) return true;
    if (l.includes("nonexclusive") && l.includes("royalty")) return true;
    if (l.includes("academic freedom") && l.includes("researcher")) return true;
    return false;
  };

  // Common LA-UR cover pages have an "Author(s):" label; prefer the first plausible name line after it.
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^author\(s\):?$/i.test(lines[i])) continue;
    for (let j = i + 1; j < Math.min(lines.length, i + 6); j += 1) {
      const candidate = lines[j].replace(/\s+/g, " ").trim();
      if (!candidate || looksLikeBoilerplate(candidate)) continue;
      const cleaned = sanitizeAuthors(candidate);
      if (cleaned) return cleaned;
    }
  }

  for (const line of lines) {
    const clean = line.replace(/\s+/g, " ").trim();
    if (clean.length < 6 || clean.length > 140) continue;
    if (looksLikeBoilerplate(clean)) continue;

    const looksLikeAuthors =
      /,/.test(clean) || /\band\b/i.test(clean) || /\bet\s+al\b/i.test(clean);

    const hasLetters = /[A-Za-z]/.test(clean);
    const hasAtLeastTwoWords = clean.split(" ").length >= 2;

    if (looksLikeAuthors && hasLetters && hasAtLeastTwoWords) {
      return clean;
    }
  }

  return null;
};

const tryParsePdf = async (filePath, { maxPages = 1 } = {}) => {
  const pdf = await getPdfParse();
  const buffer = await fs.readFile(filePath);
  const data = await pdf(buffer, { max: maxPages });

  const rawTitle =
    normalizeString(data?.info?.Title) ??
    normalizeString(data?.metadata?.get?.("dc:title"));
  const rawAuthor =
    normalizeString(data?.info?.Author) ??
    normalizeString(data?.metadata?.get?.("dc:creator"));

  const title = sanitizePdfTitle(rawTitle);

  const authorFromMeta = sanitizeAuthors(rawAuthor);
  const authorFromText = sanitizeAuthors(guessAuthorsFromText(data?.text));
  const guessedAuthors = authorFromMeta ?? authorFromText;

  return {
    title,
    authors: guessedAuthors,
  };
};

const readJsonIfExists = async (absPath) => {
  try {
    const raw = await fs.readFile(absPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const itemHtml = (item) => {
  if (!item) return "";
  if (Array.isArray(item.htmlLines) && item.htmlLines.length) return item.htmlLines.join("\n");
  return item.html ?? "";
};

const pdfKeysFromIndex = (index) => {
  const keys = new Set();
  const items = index?.items ?? [];
  for (const item of items) {
    for (const link of item?.pdfLinks ?? []) {
      const candidates = [link?.localFileName, link?.fileName, link?.originalHref, link?.localHref];
      for (const c of candidates) {
        const k = normalizePdfKey(c);
        if (k) keys.add(k);
      }
    }

    // Defensive: if pdfLinks are missing, try to extract PDF hrefs from html/htmlLines.
    const html = itemHtml(item);
    if (html) {
      const matches = html.match(/href\s*=\s*\"([^\"]+\.pdf[^\"]*)\"/gi) ?? [];
      for (const m of matches) {
        const href = m.replace(/^href\s*=\s*\"/i, "").replace(/\"$/i, "");
        const k = normalizePdfKey(href);
        if (k) keys.add(k);
      }
    }
  }
  return keys;
};

const listFiles = async (publicDir, exts) => {
  const entries = await fs.readdir(publicDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => exts.includes(path.extname(name).toLowerCase()));
};

const listPdfFiles = async (folderKey) => {
  const publicDir = path.join(repoRoot, "public", folderKey);
  return listFiles(publicDir, [".pdf"]);
};

const normalizeWhitespace = (value) => (value ?? "").replace(/\s+/g, " ").trim();

const normalizeHtmlForJson = (html) => {
  if (!html || typeof html !== "string") return "";
  return html
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
};

const findLegacySectionLi = ($, sectionTitle) => {
  const headers = $(".collapsible-header").toArray();
  for (const node of headers) {
    const title = normalizeWhitespace($(node).text());
    if (title === sectionTitle) {
      const li = $(node).closest("li");
      if (li && li.length) return li;
    }
  }
  return null;
};

const generateLegacyIndexFromLegacyHtml = async ({ title, pdfFolderKey }) => {
  let legacyHtml;
  try {
    legacyHtml = await fs.readFile(legacySourcePath, "utf8");
  } catch {
    return {
      schemaVersion: INDEX_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: path.relative(repoRoot, legacySourcePath),
      title,
      items: [],
      footerHtml: null,
    };
  }

  const $ = cheerio.load(legacyHtml);
  const sectionLi = findLegacySectionLi($, title);
  if (!sectionLi) {
    return {
      schemaVersion: INDEX_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: path.relative(repoRoot, legacySourcePath),
      title,
      items: [],
      footerHtml: null,
    };
  }

  const body = sectionLi.children(".collapsible-body").first();
  const container = body.find(".left-align").first().length ? body.find(".left-align").first() : body;
  const ul = container.find("ul").first();

  const existingPdfKeyMap = await buildExistingPdfKeyMap(pdfFolderKey);

  const items = [];
  const liNodes = ul.find("> li").toArray();
  for (let i = 0; i < liNodes.length; i += 1) {
    const liNode = liNodes[i];
    const $li = $(liNode);

    const wrapper = cheerio.load(`<li id="root">${$li.html() ?? ""}</li>`);
    const root = wrapper("#root");

    const pdfLinks = [];
    const anchors = root.find("a[href]").toArray();
    for (const a of anchors) {
      const href = wrapper(a).attr("href");
      const fileName = extractPdfFileNameFromHref(href);
      if (!fileName) continue;

      const localFileName = await findExistingLocalPdf(existingPdfKeyMap, fileName);
      const localHref = localFileName ? `/${pdfFolderKey}/${encodeURIComponent(localFileName)}` : null;
      const localExists = Boolean(localFileName);

      pdfLinks.push({
        fileName,
        localFileName,
        originalHref: href,
        localHref,
        localExists,
      });

      if (localHref && href && href !== localHref) {
        wrapper(a).attr("href", localHref);
      }
    }

    const html = normalizeHtmlForJson(root.html() ?? "");
    const text = normalizeWhitespace(root.text());
    const missingLocalPdf = pdfLinks.length > 0 && !pdfLinks.some((l) => l.localExists);

    items.push({
      id: `${pdfFolderKey}-${i + 1}`,
      text,
      html,
      pdfLinks,
      missingLocalPdf,
    });
  }

  const footerNodes = ul.length ? ul.nextAll().toArray() : [];
  const footerHtmlRaw = footerNodes.map((n) => $.html(n)).join(" ");
  const footerHtml = normalizeHtmlForJson(footerHtmlRaw) || null;

  return {
    schemaVersion: INDEX_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    source: path.relative(repoRoot, legacySourcePath),
    title,
    items,
    footerHtml,
  };
};

const extractPdfFileNameFromHref = (href) => {
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

const normalizePdfKey = (value) => {
  if (!value || typeof value !== "string") return null;

  // If this looks like a URL/href, extract the PDF filename portion first.
  const maybeFromHref = extractPdfFileNameFromHref(value);
  const raw = maybeFromHref ?? value;

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // ignore
  }

  // Normalize common Unicode oddities and whitespace.
  const normalized = decoded
    .normalize("NFKC")
    .replace(/\u00a0/g, " ") // NBSP -> space
    .replace(/[\u2010-\u2015\u2212]/g, "-") // dash variants -> hyphen
    .replace(/[\\/]/g, "/");

  const base = normalized.includes("/") ? normalized.split("/").pop() : normalized;
  const collapsed = (base ?? "").replace(/\s+/g, " ").trim();
  if (!collapsed) return null;
  return collapsed.toLowerCase();
};

const candidateFileNames = (fileName) => {
  const seen = new Set();
  const out = [];
  const push = (s) => {
    if (!s || seen.has(s)) return;
    seen.add(s);
    out.push(s);
  };

  push(fileName);
  push(fileName.replace(/%3A/gi, ":"));
  push(fileName.replace(/:/g, "_"));
  push(fileName.replace(/%3A/gi, "_").replace(/:/g, "_"));

  // Legacy links sometimes drop the ':' entirely; the on-disk file uses '_' as a Windows-safe substitute.
  // Example: "... injection Application ..." vs "... injection_ Application ...".
  if (/\binjection\s+application\b/i.test(fileName)) {
    push(fileName.replace(/\binjection\s+application\b/i, "injection_ Application"));
  }

  return out;
};

const buildExistingPdfKeyMap = async (folderKey) => {
  const map = new Map();
  let fileNames = [];
  try {
    fileNames = await listPdfFiles(folderKey);
  } catch {
    return map;
  }

  for (const fileName of fileNames) {
    const key = normalizePdfKey(fileName);
    if (key && !map.has(key)) map.set(key, fileName);
  }

  return map;
};

const findExistingLocalPdf = async (existingPdfKeyMap, fileName) => {
  if (!fileName) return null;

  for (const candidate of candidateFileNames(fileName)) {
    const key = normalizePdfKey(candidate);
    const match = key ? existingPdfKeyMap.get(key) : null;
    if (match) return match;
  }

  return null;
};

// NOTE: Curated editable JSON is intentionally NOT used for publications/presentations/reports.
// These sections continue to be generated from legacy/index.html + overrides + PDF extraction.

const escapeHtml = (value) => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const renderPdfHtml = ({ title, authors, year, href }) => {
  const safeTitle = escapeHtml(title);
  const safeAuthors = authors ? escapeHtml(authors) : null;
  const safeHref = escapeHtml(href);

  const parts = [];
  if (safeAuthors) parts.push(`${safeAuthors}.`);
  parts.push(safeTitle + (year ? ` (${year})` : ""));
  parts.push(`<a href=\"${safeHref}\" target=\"_blank\" rel=\"noreferrer\">PDF</a>`);
  return parts.join(" ");
};

const generatePdfExtractedIndex = async ({ title, pdfFolderKey, referencedPdfKeys }) => {
  let fileNames;
  try {
    fileNames = await listPdfFiles(pdfFolderKey);
  } catch {
    return {
      schemaVersion: INDEX_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: path.join("public", pdfFolderKey),
      title,
      items: [],
      footerHtml: null,
    };
  }

  const linked = referencedPdfKeys ?? new Set();

  const unlinkedFiles = fileNames.filter((name) => {
    const key = normalizePdfKey(name);
    return key ? !linked.has(key) : true;
  });

  const items = [];
  for (const fileName of unlinkedFiles) {
    const filePath = path.join(repoRoot, "public", pdfFolderKey, fileName);
    const href = `/${pdfFolderKey}/${encodeURIComponent(fileName)}`;
    const year = pdfFolderKey === "presentations" ? yearFromFilename(fileName) : null;

    let meta = { title: null, authors: null };
    if (shouldParsePdfs) {
      try {
        const maxPages = pdfFolderKey === "reports" ? 3 : 1;
        meta = await tryParsePdf(filePath, { maxPages });
      } catch {
        // ignore parse errors; fall back to filename-based title
        meta = { title: null, authors: null };
      }
    }

    const resolvedTitle = meta.title ?? titleFromFilename(fileName);
    const html = renderPdfHtml({
      title: resolvedTitle,
      authors: meta.authors,
      year,
      href,
    });

    const text = normalizeWhitespace(`${meta.authors ? `${meta.authors}. ` : ""}${resolvedTitle}${year ? ` (${year})` : ""}`);

    items.push({
      id: `${pdfFolderKey}-pdf-${fileName}`,
      text,
      html,
      pdfLinks: [
        {
          fileName,
          localFileName: fileName,
          originalHref: href,
          localHref: href,
          localExists: true,
        },
      ],
      missingLocalPdf: false,
    });
  }

  items.sort((a, b) => {
    const at = (a.text ?? "").toLowerCase();
    const bt = (b.text ?? "").toLowerCase();
    if (at < bt) return -1;
    if (at > bt) return 1;
    return a.id.localeCompare(b.id);
  });

  return {
    schemaVersion: INDEX_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    source: path.join("public", pdfFolderKey),
    title,
    items,
    footerHtml: null,
  };
};

const writeIndexFile = async (outFile, index) => {
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  const tmpFile = `${outFile}.tmp-${process.pid}`;
  await fs.writeFile(tmpFile, JSON.stringify(index, null, 2) + "\n", "utf8");
  await fs.rename(tmpFile, outFile);
};

const slugFromTitle = (title) => {
  const t = normalizeWhitespace(String(title ?? "")).toLowerCase();
  return t
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const main = async () => {
  for (const topic of topics) {
    const outDir = path.join(repoRoot, "app", topic.key);
    const legacyOutFile = path.join(outDir, `${topic.key}.legacy.generated.json`);
    const pdfOutFile = path.join(outDir, `${topic.key}.pdf.generated.json`);

    const curatedContentFile = path.join(outDir, `${topic.key}.content.json`);
    const overridesFile = path.join(outDir, `${topic.key}.overrides.json`);

    // Remove deprecated outputs from older generator versions (kept here to reduce confusion).
    const deprecated = [
      path.join(outDir, `${topic.key}.generated.json`),
      path.join(outDir, `${topic.key}.curated.generated.json`),
      path.join(outDir, `${topic.key}.section.generated.json`),
    ];
    await Promise.all(
      deprecated.map(async (p) => {
        try {
          await fs.rm(p, { force: true });
        } catch {
          // ignore
        }
      }),
    );

    const legacyIndex = await generateLegacyIndexFromLegacyHtml({ title: topic.title, pdfFolderKey: topic.pdfFolderKey });
    await writeIndexFile(legacyOutFile, legacyIndex);
    console.log(`Generated legacy ${topic.title} entries (${legacyIndex.items.length}) -> ${path.relative(repoRoot, legacyOutFile)}`);

    const curatedIndex = (await readJsonIfExists(curatedContentFile)) ?? { items: [] };
    const overridesIndex = (await readJsonIfExists(overridesFile)) ?? { items: [] };

    const referencedPdfKeys = new Set([
      ...pdfKeysFromIndex(legacyIndex),
      ...pdfKeysFromIndex(curatedIndex),
      ...pdfKeysFromIndex(overridesIndex),
    ]);

    const pdfIndex = await generatePdfExtractedIndex({
      title: topic.title,
      pdfFolderKey: topic.pdfFolderKey,
      referencedPdfKeys,
    });
    await writeIndexFile(pdfOutFile, pdfIndex);
    console.log(
      `Generated PDF-extracted ${topic.title} entries (${pdfIndex.items.length}) -> ${path.relative(repoRoot, pdfOutFile)}${shouldParsePdfs ? "" : " (filename-only; set PARSE_PDFS=1 or --parse-pdfs for metadata)"}`,
    );
  }
};

await main();
