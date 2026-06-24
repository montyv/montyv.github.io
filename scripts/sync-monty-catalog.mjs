import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();

const CANONICAL_DATA_DIR = path.join(repoRoot, "app", "data");
const PUBLICATIONS_FILE = path.join(CANONICAL_DATA_DIR, "monty-publications.json");
const PRESENTATIONS_FILE = path.join(CANONICAL_DATA_DIR, "monty-presentations.json");
const PAPERS_DIR = path.join(repoRoot, "public", "papers");
const PRESENTATIONS_DIR = path.join(repoRoot, "public", "presentations");
const SCHOLAR_URL = "https://scholar.google.com/citations?hl=en&user=sIFHVvwAAAAJ&view_op=list_works&sortby=pubdate";

const parseArgs = (argv) => {
  const args = {
    syncScholar: false,
    scholarHtml: "",
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--sync-scholar") {
      args.syncScholar = true;
    } else if (arg === "--scholar-html" && argv[index + 1]) {
      args.scholarHtml = argv[index + 1];
      index += 1;
    }
  }

  return args;
};

const normalizeWhitespace = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const normalizeTitle = (value) => {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/&amp;|&/g, " and ")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const normalizePdfKey = (value) => {
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

const yearFromValue = (value) => {
  if (value == null) return null;
  const match = String(value).match(/(?:19|20)\d{2}/);
  return match ? Number(match[0]) : null;
};

const sortEntries = (entries) => {
  return [...entries].sort((left, right) => {
    const leftYear = yearFromValue(left.year ?? left.date) ?? 0;
    const rightYear = yearFromValue(right.year ?? right.date) ?? 0;
    if (leftYear !== rightYear) return rightYear - leftYear;

    const leftTitle = normalizeWhitespace(left.title ?? left.source ?? "");
    const rightTitle = normalizeWhitespace(right.title ?? right.source ?? "");
    return leftTitle.localeCompare(rightTitle);
  });
};

const stripHtml = (html) => {
  return String(html ?? "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|div|h\d|tr|td)>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&amp;|&mdash;|&ndash;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const similarTitle = (left, right) => {
  const normalizedLeft = normalizeTitle(left);
  const normalizedRight = normalizeTitle(right);
  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) return 0.92;

  const leftTokens = new Set(normalizedLeft.split(" ").filter((token) => token.length > 3));
  const rightTokens = new Set(normalizedRight.split(" ").filter((token) => token.length > 3));
  if (!leftTokens.size || !rightTokens.size) return 0;

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap += 1;
  }

  return overlap / Math.min(leftTokens.size, rightTokens.size);
};

const titleLike = (entry) => normalizeWhitespace(entry.title ?? entry.source ?? "");

const sanitizeDoi = (doi) => {
  let value = String(doi ?? "").replace(/[.,);\]]+$/g, "");
  try {
    value = decodeURIComponent(value);
  } catch {
    // Keep the raw DOI when it is not URI-encoded.
  }
  return value.trim();
};

const fetchText = async (url, headers = {}) => {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "montyv.github.io/0.1 (+https://montyv.github.io)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      ...headers,
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.text();
};

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "montyv.github.io/0.1 (+https://montyv.github.io)",
      Accept: "application/json",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.json();
};

const searchCrossrefByMeta = async ({ title, authors, year }) => {
  if (!title) return null;

  const params = new URLSearchParams();
  params.set("rows", "5");
  params.set("query.bibliographic", [title, authors || ""].filter(Boolean).join(" "));

  if (year) {
    params.set("filter", `from-pub-date:${year}-01-01,until-pub-date:${year}-12-31`);
  }

  const json = await fetchJson(`https://api.crossref.org/works?${params.toString()}`);
  const items = json?.message?.items ?? [];
  if (!Array.isArray(items) || !items.length) return null;

  let bestItem = null;
  let bestScore = 0;

  for (const item of items) {
    const itemTitle = Array.isArray(item.title) ? item.title[0] ?? "" : item.title ?? "";
    const score = similarTitle(title, itemTitle);
    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  if (!bestItem?.DOI) return null;

  const itemTitle = Array.isArray(bestItem.title) ? bestItem.title[0] ?? title : bestItem.title ?? title;
  const itemYear =
    bestItem?.["published-print"]?.["date-parts"]?.[0]?.[0] ??
    bestItem?.["published-online"]?.["date-parts"]?.[0]?.[0] ??
    bestItem?.created?.["date-parts"]?.[0]?.[0] ??
    year ??
    null;
  const source = Array.isArray(bestItem?.["container-title"]) ? bestItem["container-title"][0] ?? null : bestItem?.["container-title"] ?? null;
  const canonicalAuthors = Array.isArray(bestItem?.author)
    ? bestItem.author.map((author) => [author.given, author.family].filter(Boolean).join(" ")).filter(Boolean).join(", ")
    : null;

  return {
    doi: sanitizeDoi(bestItem.DOI),
    score: bestScore,
    title: itemTitle,
    authors: canonicalAuthors,
    year: itemYear ? Number(itemYear) : null,
    source,
  };
};

const fetchScholarPublications = async ({ syncScholar, scholarHtml }) => {
  let html = "";

  if (scholarHtml) {
    const abs = path.isAbsolute(scholarHtml) ? scholarHtml : path.join(repoRoot, scholarHtml);
    html = await fs.readFile(abs, "utf8");
  } else if (syncScholar) {
    html = await fetchText(SCHOLAR_URL);
  } else {
    return [];
  }

  const rows = Array.from(html.matchAll(/<tr class="gsc_a_tr">([\s\S]*?)<\/tr>/gi));
  const items = [];
  const seen = new Set();

  for (const rowMatch of rows) {
    const row = rowMatch[1];
    const titleMatch = row.match(/<a[^>]*class="gsc_a_at"[^>]*>([\s\S]*?)<\/a>/i);
    const title = titleMatch ? stripHtml(titleMatch[1]) : "";
    if (!title) continue;

    const yearMatch =
      row.match(/<span[^>]*class="gsc_a_h gsc_a_hc gs_ibl"[^>]*>(\d{4})<\/span>/i) ??
      row.match(/<span[^>]*class="gsc_a_y"[^>]*>\s*<span[^>]*>(\d{4})<\/span>\s*<\/span>/i);
    const metaMatch = row.match(/<div class="gs_gray">([\s\S]*?)<\/div>\s*<div class="gs_gray">([\s\S]*?)<\/div>/i);
    const authors = metaMatch ? stripHtml(metaMatch[1]) : "";

    const key = normalizeTitle(title);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    items.push({
      title: normalizeWhitespace(title),
      authors: normalizeWhitespace(authors),
      year: yearMatch ? Number(yearMatch[1]) : null,
    });
  }

  return items;
};

const readJsonArray = async (filePath) => {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected an array in ${filePath}`);
  }
  return parsed;
};

const writeJsonArray = async (filePath, entries) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(sortEntries(entries), null, 2) + "\n", "utf8");
};

const isExistingPublication = (existingEntries, candidate) => {
  const candidateTitle = normalizeTitle(candidate.title);
  const candidateYear = yearFromValue(candidate.year);

  return existingEntries.some((entry) => {
    const entryTitleValue = titleLike(entry);
    const titleScore = similarTitle(entryTitleValue, candidateTitle);
    const entryYear = yearFromValue(entry.year ?? entry.date);
    if (titleScore >= 0.94) return true;
    if (titleScore >= 0.8 && entryYear && candidateYear && Math.abs(entryYear - candidateYear) <= 1) return true;
    return false;
  });
};

const syncPublications = async ({ syncScholar, scholarHtml }) => {
  const existingEntries = await readJsonArray(PUBLICATIONS_FILE);
  const scholarEntries = await fetchScholarPublications({ syncScholar, scholarHtml });
  let appended = 0;

  for (const scholarEntry of scholarEntries) {
    if (isExistingPublication(existingEntries, scholarEntry)) continue;

    let crossref = null;
    try {
      crossref = await searchCrossrefByMeta({
        title: scholarEntry.title,
        authors: scholarEntry.authors,
        year: scholarEntry.year,
      });
      if (!crossref || crossref.score < 0.6) {
        crossref = await searchCrossrefByMeta({
          title: scholarEntry.title,
          authors: "",
          year: scholarEntry.year,
        });
      }
    } catch {
      crossref = null;
    }

    existingEntries.push({
      authors: crossref?.authors || scholarEntry.authors || null,
      title: crossref?.score >= 0.85 ? crossref.title : scholarEntry.title,
      source: crossref?.source || null,
      doi: crossref?.doi || null,
      year: crossref?.year || scholarEntry.year || null,
      url: crossref?.doi ? `https://doi.org/${crossref.doi}` : null,
    });
    appended += 1;
  }

  if (appended > 0) {
    await writeJsonArray(PUBLICATIONS_FILE, existingEntries);
  }

  return {
    total: existingEntries.length,
    appended,
  };
};

const listPdfFiles = async (folderPath) => {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".pdf")
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
};

const guessPresentationFromFilename = (fileName) => {
  const base = fileName.replace(/\.pdf$/i, "").replace(/[_]+/g, " ");
  const yearMatch = base.match(/(?:19|20)\d{2}/);
  const year = yearMatch ? Number(yearMatch[0]) : null;

  let authors = null;
  let title = base;

  if (yearMatch) {
    const splitIndex = base.indexOf(yearMatch[0]);
    const authorSegment = normalizeWhitespace(base.slice(0, splitIndex));
    const titleSegment = normalizeWhitespace(base.slice(splitIndex + yearMatch[0].length));

    if (authorSegment && authorSegment.split(" ").length <= 12) {
      authors = authorSegment;
    }
    if (titleSegment) {
      title = titleSegment;
    }
  }

  title = normalizeWhitespace(title.replace(/\bLA-UR[-\s]?\d+(?:-\d+)?\b/gi, ""));
  if (!title) title = normalizeWhitespace(base);

  return {
    authors,
    title,
    source: null,
    year,
    url: `https://montyv.github.io/presentations/${encodeURIComponent(fileName)}`,
  };
};

const isExistingPresentation = (existingEntries, fileName, candidate) => {
  const candidatePdfKey = normalizePdfKey(fileName);
  const candidateTitle = normalizeTitle(candidate.title || candidate.source || "");
  const candidateYear = yearFromValue(candidate.year);

  return existingEntries.some((entry) => {
    const entryPdfKey = normalizePdfKey(extractPdfFileNameFromHref(entry.url));
    if (candidatePdfKey && entryPdfKey && candidatePdfKey === entryPdfKey) return true;

    const entryTitleValue = titleLike(entry);
    const titleScore = similarTitle(entryTitleValue, candidateTitle);
    const entryYear = yearFromValue(entry.year ?? entry.date);
    if (titleScore >= 0.94) return true;
    if (titleScore >= 0.8 && entryYear && candidateYear && Math.abs(entryYear - candidateYear) <= 1) return true;
    return false;
  });
};

const syncPresentations = async () => {
  const existingEntries = await readJsonArray(PRESENTATIONS_FILE);
  const pdfFiles = await listPdfFiles(PRESENTATIONS_DIR);
  let appended = 0;

  for (const fileName of pdfFiles) {
    const candidate = guessPresentationFromFilename(fileName);
    if (isExistingPresentation(existingEntries, fileName, candidate)) continue;

    existingEntries.push(candidate);
    appended += 1;
  }

  if (appended > 0) {
    await writeJsonArray(PRESENTATIONS_FILE, existingEntries);
  }

  return {
    total: existingEntries.length,
    appended,
  };
};

const main = async () => {
  const args = parseArgs(process.argv);
  const publicationResult = await syncPublications(args);
  const presentationResult = await syncPresentations();

  console.log(
    JSON.stringify(
      {
        publications: publicationResult,
        presentations: presentationResult,
      },
      null,
      2,
    ),
  );
};

await main();
