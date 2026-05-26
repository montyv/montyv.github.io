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
  logoAlt?: string;
  tags?: string[];
  details?: string[];
  highlights?: string[];
  media?: SoftwareMedia[];
  links?: SoftwareLink[];
  featured?: boolean;
};

export type SoftwareMedia = {
  src: string;
  alt: string;
  caption?: string;
};

export type SoftwareLink = {
  label: string;
  href: string;
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

const toStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;

  const normalized = value
    .map((item) => toStringValue(item))
    .filter((item): item is string => Boolean(item));

  return normalized.length ? normalized : undefined;
};

const toLinksArray = (value: unknown): SoftwareLink[] | undefined => {
  if (!Array.isArray(value)) return undefined;

  const normalized = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const label = toStringValue(record.label);
      const href = toStringValue(record.href);
      if (!label || !href) return null;
      return { label, href };
    })
    .filter((item): item is SoftwareLink => Boolean(item));

  return normalized.length ? normalized : undefined;
};

const toMediaArray = (value: unknown): SoftwareMedia[] | undefined => {
  if (!Array.isArray(value)) return undefined;

  const normalized = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const src = toStringValue(record.src);
      const alt = toStringValue(record.alt);
      if (!src || !alt) return null;
      const caption = toStringValue(record.caption);
      const media: SoftwareMedia = caption ? { src, alt, caption } : { src, alt };
      return media;
    })
    .filter((item): item is SoftwareMedia => Boolean(item));

  return normalized.length ? normalized : undefined;
};

const normalizeEntry = (item: unknown): SoftwareEntry | null => {
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;

  const slug = toStringValue(record.slug);
  const name = toStringValue(record.name);
  const summary = toStringValue(record.summary);
  if (!slug || !name || !summary) return null;

  const tags = toStringArray(record.tags);

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
    logoAlt: toStringValue(record.logoAlt),
    tags,
    details: toStringArray(record.details),
    highlights: toStringArray(record.highlights),
    media: toMediaArray(record.media),
    links: toLinksArray(record.links),
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
