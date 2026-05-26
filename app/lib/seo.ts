import type { Metadata } from "next";

export const SITE_URL = (process.env.SITE_URL || "https://montyv.github.io").replace(/\/+$/, "");
export const SITE_NAME = "Velimir V. Vesselinov (monty)";
export const PERSON_NAME = "Velimir V. Vesselinov";
export const DEFAULT_OG_IMAGE = "/images/monty20210529-body.jpg";
export const DEFAULT_OG_IMAGE_ALT = "Portrait of Velimir V. Vesselinov (monty)";
export const METADATA_DESCRIPTION_MAX_LENGTH = 160;
export const SOCIAL_DESCRIPTION_MAX_LENGTH = 220;

export const PERSON_SAME_AS = [
  "https://scholar.google.com/citations?user=sIFHVvwAAAAJ&hl",
  "https://orcid.org/0000-0002-6222-0530",
  "https://www.linkedin.com/in/montyvesselinov",
  "https://github.com/montyvesselinov",
  "https://gitlab.com/monty",
  "https://www.youtube.com/watch?v=xPOkeLMJywE&list=PLpVcrIWNlP22LfyIu5MSZ7WHp7q0MNjsj",
];

const normalizePagePath = (pathname: string): string => {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (normalized === "/") return "/";
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
};

export const canonicalUrl = (pathname: string): string => {
  return `${SITE_URL}${normalizePagePath(pathname)}`;
};

export const assetUrl = (pathname: string): string => {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${SITE_URL}${normalized}`;
};

export const toAbsoluteUrl = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return assetUrl(value);
};

export const truncateMetadataText = (value: string, maxLength: number): string => {
  const normalized = String(value).replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  if (maxLength <= 3) return normalized.slice(0, maxLength);
  return `${normalized.slice(0, maxLength - 3).replace(/[\s,;:.!?-]+$/g, "")}...`;
};

type PageMetadataOptions = {
  title: Metadata["title"];
  titleText: string;
  description: string;
  socialDescription?: string;
  pathname: string;
  imagePath?: string;
  openGraphType?: "website" | "article";
  keywords?: string[];
  index?: boolean;
};

export const buildPageMetadata = ({
  title,
  titleText,
  description,
  socialDescription,
  pathname,
  imagePath = DEFAULT_OG_IMAGE,
  openGraphType = "website",
  keywords,
  index = true,
}: PageMetadataOptions): Metadata => {
  const canonical = canonicalUrl(pathname);
  const image = { url: assetUrl(imagePath), alt: DEFAULT_OG_IMAGE_ALT };

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical,
    },
    openGraph: {
      title: titleText,
      description: socialDescription ?? description,
      url: canonical,
      siteName: SITE_NAME,
      locale: "en_US",
      type: openGraphType,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: titleText,
      description: socialDescription ?? description,
      images: [image],
    },
    robots: {
      index,
      follow: true,
    },
  };
};

type CollectionPageJsonLdItem = {
  name: string;
  url?: string | null;
  itemType?: string;
};

type CollectionPageJsonLdOptions = {
  name: string;
  description: string;
  pathname: string;
  items: CollectionPageJsonLdItem[];
  itemType?: string;
};

export const buildCollectionPageJsonLd = ({
  name,
  description,
  pathname,
  items,
  itemType = "CreativeWork",
}: CollectionPageJsonLdOptions) => {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: canonicalUrl(pathname),
    about: {
      "@type": "Person",
      name: PERSON_NAME,
      url: canonicalUrl("/"),
    },
    mainEntity: {
      "@type": "ItemList",
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => {
        const resolvedUrl = toAbsoluteUrl(item.url);
        return {
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": item.itemType || itemType,
            name: item.name,
            ...(resolvedUrl ? { url: resolvedUrl } : {}),
          },
        };
      }),
    },
  };
};