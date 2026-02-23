import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();

const files = [
  "app/publications/publications.content.json",
  "app/publications/publications.overrides.json",
  "app/presentations/presentations.content.json",
  "app/presentations/presentations.overrides.json",
  "app/reports/reports.content.json",
  "app/reports/reports.overrides.json",
];

const asLinesFromHtml = (html) => {
  if (typeof html !== "string") return null;
  const trimmed = html.trim();
  if (!trimmed) return [];
  // Keep as a single array entry (safe/minimal). You can split later.
  return [trimmed];
};

const migrateIndex = (json, relFile) => {
  let changed = false;

  if (Array.isArray(json.items)) {
    json.items = json.items.map((item) => {
      if (!item || typeof item !== "object") return item;

      if (!Array.isArray(item.htmlLines) || item.htmlLines.length === 0) {
        const lines = asLinesFromHtml(item.html);
        if (lines) {
          item.htmlLines = lines;
          changed = true;
        }
      }

      if (Object.prototype.hasOwnProperty.call(item, "html")) {
        delete item.html;
        changed = true;
      }

      return item;
    });
  }

  if (Array.isArray(json.sections)) {
    json.sections = json.sections.map((section) => {
      if (!section || typeof section !== "object") return section;

      if (!Array.isArray(section.htmlLines) || section.htmlLines.length === 0) {
        const lines = asLinesFromHtml(section.html);
        if (lines) {
          section.htmlLines = lines;
          changed = true;
        }
      }

      if (Object.prototype.hasOwnProperty.call(section, "html")) {
        delete section.html;
        changed = true;
      }

      return section;
    });
  }

  if (!Array.isArray(json.footerHtmlLines) || json.footerHtmlLines.length === 0) {
    const lines = asLinesFromHtml(json.footerHtml);
    if (lines) {
      json.footerHtmlLines = lines;
      changed = true;
    }
  }

  if (Object.prototype.hasOwnProperty.call(json, "footerHtml")) {
    delete json.footerHtml;
    changed = true;
  }

  // Make it less confusing that these are now editable/manual.
  if (relFile.endsWith(".content.json")) {
    if (typeof json.source === "string" && json.source.toLowerCase().includes("legacy")) {
      json.source = relFile;
      changed = true;
    }

    if (typeof json.generatedAt === "string" && json.generatedAt !== "manual") {
      json.generatedAt = "manual";
      changed = true;
    }
  }

  return changed;
};

const main = async () => {
  for (const rel of files) {
    const abs = path.join(repoRoot, rel);

    try {
      const raw = await fs.readFile(abs, "utf8");
      const json = JSON.parse(raw);
      const changed = migrateIndex(json, rel);
      if (!changed) {
        console.log(`No change ${rel}`);
        continue;
      }
      await fs.writeFile(abs, JSON.stringify(json, null, 2) + "\n", "utf8");
      console.log(`Migrated ${rel}`);
    } catch (err) {
      console.warn(`Skip ${rel}: ${err?.message ?? err}`);
    }
  }
};

await main();
