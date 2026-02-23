import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const homeSectionsTsPath = path.join(repoRoot, "app", "home", "home.sections.ts");
const sectionsDir = path.join(repoRoot, "app", "home", "sections");
const sectionsIndexPath = path.join(sectionsDir, "sections.json");

const normalizeIframeSizes = (html) => {
  let next = html;

  // Standardize the classic YouTube embed size to a smaller 16:9.
  next = next.replaceAll('width="560" height="315"', 'width="420" height="236"');

  // Add width/height for iframe tags that don't specify them.
  next = next.replaceAll(/<iframe\b(?![^>]*\bwidth=)(?![^>]*\bheight=)([^>]*)>/gi, '<iframe width="420" height="236"$1>');

  return next;
};

const evalHomeContentIndex = (tsSource) => {
  const rewritten = tsSource.replace("export const homeContentIndex =", "const homeContentIndex =");
  const wrapped = `(function(){\n${rewritten}\n; return homeContentIndex;\n})()`;
  return vm.runInNewContext(wrapped, {}, { timeout: 1000 });
};

const sectionToHtml = (section) => {
  if (typeof section?.html === "string") return section.html;
  if (Array.isArray(section?.htmlLines)) return section.htmlLines.join("\n");
  return "";
};

const ensureVideosHaveUlWrapper = (html) => {
  const trimmed = html.trimStart();
  if (trimmed.startsWith("<li")) {
    return `<ul>\n${html}`;
  }
  return html;
};

const main = async () => {
  const tsSource = await fs.readFile(homeSectionsTsPath, "utf8");
  const homeContentIndex = evalHomeContentIndex(tsSource);

  if (!homeContentIndex || !Array.isArray(homeContentIndex.sections)) {
    throw new Error("homeContentIndex.sections missing or invalid");
  }

  await fs.mkdir(sectionsDir, { recursive: true });

  const index = [];
  for (const section of homeContentIndex.sections) {
    const id = String(section.id || "").trim();
    const title = String(section.title || "").trim();
    if (!id || !title) continue;

    let html = sectionToHtml(section);
    if (id === "videos") {
      html = ensureVideosHaveUlWrapper(html);
    }
    html = normalizeIframeSizes(html);

    const file = `${id}.html`;
    const targetPath = path.join(sectionsDir, file);

    // Always end files with a newline for nicer diffs.
    await fs.writeFile(targetPath, `${html.trim()}\n`, "utf8");

    index.push({ id, title, file });
  }

  await fs.writeFile(sectionsIndexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");

  // eslint-disable-next-line no-console
  console.log(`[home] wrote ${index.length} HTML section files to ${path.relative(repoRoot, sectionsDir)}`);
  // eslint-disable-next-line no-console
  console.log(`[home] wrote index ${path.relative(repoRoot, sectionsIndexPath)}`);
};

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
