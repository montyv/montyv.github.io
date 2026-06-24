import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const dataDir = process.env.MONTY_CATALOG_DATA_DIR
  ? path.resolve(process.env.MONTY_CATALOG_DATA_DIR)
  : path.resolve(repoRoot, "app", "data");

const args = new Set(process.argv.slice(2));
const write = args.has("--write");
const pruneInvalid = args.has("--prune-invalid");
const topicArg = [...args].find((arg) => arg.startsWith("--topic="));
const limitArg = [...args].find((arg) => arg.startsWith("--limit="));
const topicFilter = topicArg ? topicArg.split("=")[1] : null;
const limit = limitArg ? Number(limitArg.split("=")[1]) : Number.POSITIVE_INFINITY;

const topics = [
  {
    id: "publications",
    fileName: "monty-publications.json",
    folderKey: "papers",
    maxPages: 8,
    markers: [/\babstract\b/gi, /\bexecutive summary\b/gi, /\bsummary\b/gi, /\bintroduction\b/gi],
  },
  {
    id: "presentations",
    fileName: "monty-presentations.json",
    folderKey: "presentations",
    maxPages: 8,
    markers: [/\babstract\b/gi, /\bexecutive summary\b/gi, /\bsummary\b/gi, /\bintroduction\b/gi],
  },
].filter((topic) => !topicFilter || topic.id === topicFilter);

if (!topics.length) {
  throw new Error(`No matching topic for ${topicFilter}`);
}

const normalizeWhitespace = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const normalizePdfKey = (value) => {
  if (!value) return null;

  let decoded = String(value);
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // Keep raw value.
  }

  const normalized = decoded
    .normalize("NFKC")
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.replace(/\.pdf$/i, "")
    .replace(/&amp;|&/gi, " and ")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[^a-z0-9]+/gi, " ")
    .toLowerCase()
    .trim();

  return normalized || null;
};

const buildPdfLookup = (folderKey) => {
  const dir = path.join(repoRoot, "public", folderKey);
  const entries = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".pdf") continue;
    const absPath = path.join(dir, entry.name);
    const fileKey = normalizePdfKey(entry.name);
    if (!fileKey) continue;
    entries.push({
      absPath,
      fileName: entry.name,
      key: fileKey,
    });
  }

  return entries;
};

const resolveEntryPdf = (entry, pdfEntries) => {
  const candidateKeys = [entry?.url, entry?.title]
    .map((value) => normalizePdfKey(value))
    .filter(Boolean);

  for (const candidateKey of candidateKeys) {
    const exact = pdfEntries.find((item) => item.key === candidateKey);
    if (exact) return exact;

    const contained = pdfEntries.find((item) => item.key.includes(candidateKey) || candidateKey.includes(item.key));
    if (contained) return contained;
  }

  return null;
};

let pdfParsePromise;
const getPdfParse = async () => {
  if (!pdfParsePromise) {
    pdfParsePromise = import("pdf-parse").then((mod) => mod.default ?? mod);
  }
  return pdfParsePromise;
};

const readPdfText = async (absPath, maxPages) => {
  const pdfParse = await getPdfParse();
  const buffer = await fs.promises.readFile(absPath);
  const data = await pdfParse(buffer, { max: maxPages });
  return String(data?.text ?? "");
};

const normalizePdfText = (value) => {
  return String(value ?? "")
    .replace(/\r/g, "\n")
    .replace(/(\w)-\s*\n\s*(\w)/g, "$1$2")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
};

const isLikelyHeading = (line) => {
  if (!line) return false;
  if (/^(abstract|summary|executive summary|introduction)$/i.test(line)) return true;
  if (/^\d+(?:\.\d+)*\s+[A-Z]/.test(line)) return true;
  const letters = (line.match(/[A-Za-z]/g) ?? []).length;
  const uppers = (line.match(/[A-Z]/g) ?? []).length;
  return letters >= 8 && uppers / letters > 0.75;
};

const isLikelyBoilerplate = (line) => {
  return /^(contents|references|acknowledg(e)?ments?|supplementary material|table of contents)$/i.test(line)
    || /copyright|all rights reserved|approved for public release|distribution is unlimited/i.test(line)
    || /los alamos national laboratory|envitrace llc|researchgate|www\.|http/i.test(line)
    || /doi[:\s]|arxiv/i.test(line)
    || /^[\d\s.()/:;,-]+$/.test(line);
};

const cleanChunk = (chunk) => {
  const lines = String(chunk ?? "")
    .split("\n")
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)
    .filter((line) => !isLikelyBoilerplate(line))
    .map((line) => line
      .replace(/^[:;.,\-–—\s]+/, "")
      .replace(/\b(\d{1,3})\s+(?=[a-zA-Z])/g, "")
      .replace(/\b\d{1,3}(?=[A-Z][a-z])/g, "")
      .replace(/(?<=[a-z])\d{1,3}(?=[A-Z])/g, " ")
      .replace(/\b[a-z]\s*[-‐]\s*/gi, "")
      .replace(/\b[A-Za-z]*\d+[A-Za-z]+\b/g, "")
      .replace(/\s*©.*$/i, "")
      .replace(/electronic supplementary material.*$/i, "")
      .replace(/the online version of this article.*$/i, "")
      .replace(/\b\w+conference\b.*$/i, "")
      .replace(/\b[A-Z]{2,}\d+[–-]?\d*\b/g, "")
      .trim());

  return normalizeWhitespace(lines.join(" "));
};

const hasExtractionArtifacts = (summary, topicId) => {
  const text = normalizeWhitespace(summary);
  if (!text) return true;
  if (text.length < 90) return true;
  if (/^[:;.,\-–—]/.test(text)) return true;
  if (/●||||⬤/.test(text)) return true;
  if (/@|https?:\/\/|www\./i.test(text)) return true;
  if (/\.\.\./.test(text)) return true;
  if (!/[.!?]$/.test(text)) return true;
  if (/\b\d{1,3}\s+[A-Za-z]\b/.test(text)) return true;
  if (/\b\d{1,3}[A-Z][a-z]+\b/.test(text)) return true;
  if (/\b\d{4}[^.?!]*\b\d{4}\b/.test(text)) return true;
  if (/copyright|all rights reserved|supplementary material|proceedings /i.test(text)) return true;
  if (/event for |learning objectives|submitter |presenters |mccormick place/i.test(text)) return true;
  if (/(^|\s)(contents|references)(\s|$)/i.test(text)) return true;
  if (topicId === "presentations" && !/[.!?]/.test(text)) return true;
  if (topicId === "presentations" && /questions that have driven us|machine learning for geosciences|tool for community-based geothermal/i.test(text)) return true;
  return false;
};

const pickSectionChunk = (text, markers) => {
  for (const marker of markers) {
    const matches = [...text.matchAll(marker)];
    for (let index = matches.length - 1; index >= 0; index -= 1) {
      const match = matches[index];
      const after = text.slice(match.index + match[0].length).trim();
      if (!after || /^\.{4,}|^\d+$/.test(after)) continue;

      const lines = after.split("\n");
      const out = [];

      for (const line of lines) {
        if (!line) continue;
        if (!out.length && /^[:.\-–—\s]+$/.test(line)) continue;
        if (isLikelyBoilerplate(line)) continue;
        if (out.length >= 2 && isLikelyHeading(line)) break;
        out.push(line.replace(/^[-*•]\s*/, ""));
        if (out.join(" ").length >= 1200) break;
      }

      const chunk = cleanChunk(out.join(" "));
      if (chunk.length >= 120) return chunk;
    }
  }

  return "";
};

const fallbackChunk = (text, title, topicId) => {
  const titleNorm = normalizeWhitespace(title).toLowerCase();
  const lines = text.split("\n");
  const candidates = [];

  for (const line of lines) {
    const clean = normalizeWhitespace(line.replace(/^[-*•]\s*/, ""));
    if (!clean) continue;
    if (clean.length < 24) continue;
    if (/https?:\/\/|www\./i.test(clean)) continue;
    if (/@/.test(clean)) continue;
    if (/^(copyright|doi|arxiv|researchgate|scientific reports|los alamos national laboratory|envitrace llc)$/i.test(clean)) continue;
    if (titleNorm && (clean.toLowerCase() === titleNorm || clean.toLowerCase().includes(titleNorm))) continue;
    if (isLikelyBoilerplate(clean)) continue;
    candidates.push(clean);
    if (candidates.join(" ").length >= 1200) break;
  }

  if (topicId === "presentations") {
    const preferred = candidates.filter((line) => /\b(goal|goals|objective|objectives|question|questions|challenge|challenges|problem|problems|approach|framework|tool|tools|method|methods|model|models|analysis|decision|prospectivity|geothermal|machine learning|artificial intelligence|community)\b/i.test(line));
    if (preferred.length) return cleanChunk(preferred.slice(0, 3).join(" "));
  }

  return cleanChunk(candidates.slice(0, 3).join(" "));
};

const toSummary = (chunk, topicId) => {
  const text = cleanChunk(chunk)
    .replace(/^(abstract|summary|executive summary|introduction)\s*[:.-]?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return null;

  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const picked = [];

  for (const sentence of sentences) {
    const next = [...picked, sentence].join(" ");
    if (next.length > 520 && picked.length) break;
    picked.push(sentence);
    if (picked.length >= 3 || next.length >= 360) break;
  }

  const summary = normalizeWhitespace((picked.length ? picked.join(" ") : text).slice(0, 520));
  if (summary.length < 80) return null;
  if (hasExtractionArtifacts(summary, topicId)) return null;
  return summary;
};

const extractSummary = (rawText, topic, title) => {
  const text = normalizePdfText(rawText);
  if (!text) return null;

  const section = pickSectionChunk(text, topic.markers);
  const summaryFromSection = toSummary(section, topic.id);
  if (summaryFromSection) return summaryFromSection;

  if (topic.id === "presentations") return null;

  return toSummary(fallbackChunk(text, title, topic.id), topic.id);
};

for (const topic of topics) {
  const dataFile = path.join(dataDir, topic.fileName);
  const pdfEntries = buildPdfLookup(topic.folderKey);
  const items = JSON.parse(await fs.promises.readFile(dataFile, "utf8"));
  let updated = 0;
  let missingPdf = 0;
  let failedExtract = 0;
  let parseFailed = 0;
  let pruned = 0;
  let processed = 0;
  const samples = [];

  for (const entry of items) {
    if (pruneInvalid && entry.abstract && hasExtractionArtifacts(entry.abstract, topic.id)) {
      delete entry.abstract;
      pruned += 1;
    }

    if (processed >= limit) break;

    const pdfEntry = resolveEntryPdf(entry, pdfEntries);
    if (!pdfEntry) {
      missingPdf += 1;
      continue;
    }

    processed += 1;
    let rawText = "";
    try {
      rawText = await readPdfText(pdfEntry.absPath, topic.maxPages);
    } catch {
      parseFailed += 1;
      continue;
    }
    const summary = extractSummary(rawText, topic, entry.title);
    if (!summary) {
      failedExtract += 1;
      continue;
    }

    if (entry.abstract !== summary) {
      entry.abstract = summary;
      updated += 1;
      if (samples.length < 3) {
        samples.push({ title: entry.title, abstract: summary });
      }
    }
  }

  if (write) {
    await fs.promises.writeFile(dataFile, `${JSON.stringify(items, null, 2)}\n`, "utf8");
  }

  console.log(`[${topic.id}] processed=${processed} updated=${updated} pruned=${pruned} missingPdf=${missingPdf} parseFailed=${parseFailed} failedExtract=${failedExtract} mode=${write ? "write" : "dry-run"}`);
  for (const sample of samples) {
    console.log(`[${topic.id}] sample: ${sample.title} -> ${sample.abstract}`);
  }
}
