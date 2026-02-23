import fs from "node:fs";
import path from "node:path";

type HomeSectionSpec = Readonly<{
  id: string;
  title: string;
  file: string;
}>;

type HomeSection = Readonly<{
  id: string;
  title: string;
  htmlLines: readonly string[];
  sourceFile: string;
}>;

type HomeContentIndex = Readonly<{
  schemaVersion: number;
  generatedAt: string;
  source: string;
  title: string;
  sections: readonly HomeSection[];
}>;

const repoRoot = process.cwd();
const sectionsDir = path.join(repoRoot, "app", "home", "sections");
const sectionsJsonPath = path.join(sectionsDir, "sections.json");

const readSectionsSpec = (): readonly HomeSectionSpec[] => {
  try {
    const raw = fs.readFileSync(sectionsJsonPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HomeSectionSpec[]) : [];
  } catch {
    return [];
  }
};

const readHtmlLines = (fileName: string): readonly string[] => {
  try {
    const raw = fs.readFileSync(path.join(sectionsDir, fileName), "utf8");
    // Preserve original line structure for stable diffs.
    const lines = raw.split(/\r?\n/);
    // Trim trailing empty lines.
    while (lines.length && !lines[lines.length - 1]?.trim()) lines.pop();
    return lines;
  } catch {
    return [];
  }
};

const sections: readonly HomeSection[] = readSectionsSpec().map((spec) => ({
  id: String(spec.id ?? ""),
  title: String(spec.title ?? ""),
  htmlLines: readHtmlLines(String(spec.file ?? "")),
  sourceFile: String(spec.file ?? ""),
}));

export const homeContentIndex: HomeContentIndex = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: "app/home/sections",
  title: "Home",
  sections,
};