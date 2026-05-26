import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const dataDir = process.env.MONTY_CATALOG_DATA_DIR
  ? path.resolve(process.env.MONTY_CATALOG_DATA_DIR)
  : path.resolve(repoRoot, "..", "EnviTraceJS", "data");

const args = new Set(process.argv.slice(2));
const write = args.has("--write");
const topicArg = [...args].find((arg) => arg.startsWith("--topic="));
const limitArg = [...args].find((arg) => arg.startsWith("--limit="));
const topicFilter = topicArg ? topicArg.split("=")[1] : null;
const limit = limitArg ? Number(limitArg.split("=")[1]) : Number.POSITIVE_INFINITY;

const topics = [
  {
    id: "publications",
    fileName: "monty publications.json",
    folderKey: "papers",
    maxPages: 8,
    markers: [/\babstract\b/gi, /\bexecutive summary\b/gi, /\bsummary\b/gi, /\bintroduction\b/gi],
  },
  {
    id: "presentations",
    fileName: "monty presentations.json",
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
        if (out.length >= 2 && isLikelyHeading(line)) break;
        out.push(line.replace(/^[-*•]\s*/, ""));
        if (out.join(" ").length >= 1200) break;
      }

      const chunk = out.join(" ").replace(/\s+/g, " ").trim();
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
    candidates.push(clean);
    if (candidates.join(" ").length >= 1200) break;
  }

  if (topicId === "presentations") {
    const preferred = candidates.filter((line) => /\b(goal|goals|objective|objectives|question|questions|challenge|challenges|problem|problems|approach|framework|tool|tools|method|methods|model|models|analysis|decision|prospectivity|geothermal|machine learning|artificial intelligence|community)\b/i.test(line));
    if (preferred.length) return preferred.slice(0, 3).join(" ").trim();
  }

  return candidates.slice(0, 3).join(" ").trim();
};

const toSummary = (chunk) => {
  const text = normalizeWhitespace(chunk)
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
  return summary.length >= 80 ? summary : null;
};

const extractSummary = (rawText, topic, title) => {
  const text = normalizePdfText(rawText);
  if (!text) return null;

  const section = pickSectionChunk(text, topic.markers);
  const summaryFromSection = toSummary(section);
  if (summaryFromSection) return summaryFromSection;

  return toSummary(fallbackChunk(text, title, topic.id));
};

for (const topic of topics) {
  const dataFile = path.join(dataDir, topic.fileName);
  const pdfEntries = buildPdfLookup(topic.folderKey);
  const items = JSON.parse(await fs.promises.readFile(dataFile, "utf8"));
  let updated = 0;
  let missingPdf = 0;
  let failedExtract = 0;
  let parseFailed = 0;
  let processed = 0;
  const samples = [];

  for (const entry of items) {
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

  console.log(`[${topic.id}] processed=${processed} updated=${updated} missingPdf=${missingPdf} parseFailed=${parseFailed} failedExtract=${failedExtract} mode=${write ? "write" : "dry-run"}`);
  for (const sample of samples) {
    console.log(`[${topic.id}] sample: ${sample.title} -> ${sample.abstract}`);
  }
}