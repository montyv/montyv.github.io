import fs from "node:fs";
import path from "node:path";

export type SoftwareEntry = {
  slug: string;
  name: string;
  summary: string;
  description?: string;
  category?: string;
  status?: string;
  year?: number;
  website?: string;
  repository?: string;
  docs?: string;
  logo?: string;
  tags?: string[];
  featured?: boolean;
};

const DATA_FILE = path.join(process.cwd(), "app", "data", "monty software.json");

const toStringValue = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const toNumberValue = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const normalizeEntry = (item: unknown): SoftwareEntry | null => {
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;

  const slug = toStringValue(record.slug);
  const name = toStringValue(record.name);
  const summary = toStringValue(record.summary);
  if (!slug || !name || !summary) return null;

  const tags = Array.isArray(record.tags)
    ? record.tags.map((tag) => toStringValue(tag)).filter((tag): tag is string => Boolean(tag))
    : undefined;

  return {
    slug,
    name,
    summary,
    description: toStringValue(record.description),
    category: toStringValue(record.category),
    status: toStringValue(record.status),
    year: toNumberValue(record.year),
    website: toStringValue(record.website),
    repository: toStringValue(record.repository),
    docs: toStringValue(record.docs),
    logo: toStringValue(record.logo),
    tags,
    featured: Boolean(record.featured),
  };
};

export const loadSoftwareEntries = (): SoftwareEntry[] => {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => normalizeEntry(item))
      .filter((entry): entry is SoftwareEntry => Boolean(entry))
      .sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  } catch {
    return [];
  }
};

export const getSoftwareBySlug = (slug: string): SoftwareEntry | undefined => {
  return loadSoftwareEntries().find((entry) => entry.slug === slug);
};
