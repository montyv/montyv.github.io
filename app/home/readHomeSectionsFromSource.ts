import "server-only";

import fs from "node:fs";
import path from "node:path";

export type LegacyHomeSection = Readonly<{
  id: string;
  title: string;
  html?: string;
  htmlLines?: readonly string[];
}>;

export type LegacyHomeIndex = Readonly<{
  schemaVersion?: number;
  generatedAt: string;
  source: string;
  title: string;
  sections: readonly LegacyHomeSection[];
}>;

export const readHomeIndexFromSource = (): LegacyHomeIndex | null => {
  try {
    const sectionsDir = path.join(process.cwd(), "app", "home", "sections");
    const sectionsIndexPath = path.join(sectionsDir, "sections.json");
    const rawIndex = fs.readFileSync(sectionsIndexPath, "utf8");
    const parsed = JSON.parse(rawIndex);
    const index = Array.isArray(parsed) ? parsed : [];

    const sections = index
      .map((entry) => {
        const id = String(entry?.id ?? "").trim();
        const title = String(entry?.title ?? "").trim();
        const file = String(entry?.file ?? "").trim();
        if (!id || !title || !file) return null;

        const htmlPath = path.join(sectionsDir, file);
        const html = fs.readFileSync(htmlPath, "utf8");

        return { id, title, html };
      })
      .filter((s): s is { id: string; title: string; html: string } => s !== null)
      .map((s) => ({ id: s.id, title: s.title, html: s.html } as LegacyHomeSection));

    return {
      schemaVersion: 1,
      generatedAt: "dev-source",
      source: "app/home/sections",
      title: "Home",
      sections,
    };
  } catch {
    return null;
  }
};
