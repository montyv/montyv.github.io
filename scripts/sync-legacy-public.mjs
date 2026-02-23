import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";

const repoRoot = process.cwd();

const legacySourcePath = path.join(repoRoot, "legacy", "index.html");
const legacyPublicDir = path.join(repoRoot, "public", "legacy");
const legacyPublicPath = path.join(legacyPublicDir, "index.html");

const isAbsoluteOrSpecialHref = (href) => {
  if (!href || typeof href !== "string") return true;
  const h = href.trim();
  return (
    h.startsWith("http://") ||
    h.startsWith("https://") ||
    h.startsWith("//") ||
    h.startsWith("#") ||
    h.startsWith("mailto:") ||
    h.startsWith("javascript:") ||
    h.startsWith("data:")
  );
};

const ensureLeadingSlash = (href) => {
  if (!href || typeof href !== "string") return href;
  const h = href.trim();
  if (!h) return h;
  if (h.startsWith("/")) return h;
  if (h.startsWith("./")) return `/${h.slice(2)}`;
  return `/${h}`;
};

const rewriteAssetHref = (href) => {
  if (!href || typeof href !== "string") return href;
  if (isAbsoluteOrSpecialHref(href)) return href;

  // Legacy page was originally at site root; when served from /legacy/index.html
  // relative URLs would otherwise resolve under /legacy/*.
  return ensureLeadingSlash(href);
};

const main = async () => {
  let legacyHtml;
  try {
    legacyHtml = await fs.readFile(legacySourcePath, "utf8");
  } catch {
    console.warn(`Legacy source missing; skipping ${path.relative(repoRoot, legacySourcePath)}`);
    return;
  }

  const $ = cheerio.load(legacyHtml);

  // Rewrite common attributes that reference site-root assets.
  const rewriteAttr = (selector, attr) => {
    $(selector)
      .toArray()
      .forEach((node) => {
        const $node = $(node);
        const value = $node.attr(attr);
        const rewritten = rewriteAssetHref(value);
        if (rewritten && rewritten !== value) {
          $node.attr(attr, rewritten);
        }
      });
  };

  rewriteAttr("a[href]", "href");
  rewriteAttr("link[href]", "href");
  rewriteAttr("script[src]", "src");
  rewriteAttr("img[src]", "src");
  rewriteAttr("source[src]", "src");
  rewriteAttr("iframe[src]", "src");

  await fs.mkdir(legacyPublicDir, { recursive: true });
  await fs.writeFile(legacyPublicPath, $.html(), "utf8");

  console.log(`Synced legacy page -> ${path.relative(repoRoot, legacyPublicPath)}`);
};

await main();
