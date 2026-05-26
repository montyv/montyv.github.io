import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  METADATA_DESCRIPTION_MAX_LENGTH,
  SOCIAL_DESCRIPTION_MAX_LENGTH,
  buildPageMetadata,
  canonicalUrl,
  truncateMetadataText,
} from "../../lib/seo";
import { getSoftwareBySlug, loadSoftwareEntries } from "../../lib/software-data";

type SoftwareDetailPageProps = {
  params: Promise<{ slug: string }>;
};

const SOFTWARE_OG_IMAGE = "/images/monty-software-og-card.svg";

const buildSoftwareDescription = (name: string, summary: string, category?: string): string => {
  const details = [summary, category ? `Category: ${category}.` : null].filter(Boolean).join(" ").trim();
  return `${name}. ${details}`;
};

export const generateStaticParams = async () => {
  return loadSoftwareEntries().map((entry) => ({ slug: entry.slug }));
};

export async function generateMetadata({ params }: SoftwareDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const software = getSoftwareBySlug(slug);

  if (!software) {
    return buildPageMetadata({
      title: "Software Not Found",
      titleText: "Software Not Found | Velimir V. Vesselinov (monty)",
      description: "The requested software entry could not be found.",
      pathname: "/software",
      index: false,
      imagePath: SOFTWARE_OG_IMAGE,
      imageAlt: "Software catalog by Velimir V. Vesselinov",
    });
  }

  const rawDescription = buildSoftwareDescription(software.name, software.summary, software.category);
  const description = truncateMetadataText(rawDescription, METADATA_DESCRIPTION_MAX_LENGTH);
  const socialDescription = truncateMetadataText(rawDescription, SOCIAL_DESCRIPTION_MAX_LENGTH);

  return buildPageMetadata({
    title: software.name,
    titleText: `${software.name} | Software | Velimir V. Vesselinov (monty)`,
    description,
    socialDescription,
    pathname: `/software/${software.slug}`,
    imagePath: SOFTWARE_OG_IMAGE,
    imageAlt: `${software.name} software entry by Velimir V. Vesselinov`,
    openGraphType: "article",
    keywords: [software.name, software.category ?? "software", ...(software.tags ?? [])],
  });
}

export default async function SoftwareDetailPage({ params }: SoftwareDetailPageProps) {
  const { slug } = await params;
  const software = getSoftwareBySlug(slug);

  if (!software) {
    notFound();
  }

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: software.name,
    description: software.description ?? software.summary,
    applicationCategory: software.category,
    softwareVersion: software.year ? String(software.year) : undefined,
    operatingSystem: "Cross-platform",
    url: canonicalUrl(`/software/${software.slug}`),
    image: software.logo ? canonicalUrl(software.logo) : undefined,
    sameAs: [software.website, software.repository, software.docs].filter(Boolean),
    keywords: software.tags?.join(", "),
    creator: {
      "@type": "Person",
      name: "Velimir V. Vesselinov",
      url: canonicalUrl("/"),
    },
  };

  const externalLinks = [
    software.website ? { label: "Website", href: software.website } : null,
    software.repository ? { label: "Repository", href: software.repository } : null,
    software.docs ? { label: "Documentation", href: software.docs } : null,
  ].filter((link): link is { label: string; href: string } => Boolean(link));

  return (
    <main className="py-10">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />

      <nav className="mb-5 text-sm text-slate-300">
        <Link className="hover:underline" href="/software">
          Software
        </Link>
        <span className="px-2">/</span>
        <span>{software.name}</span>
      </nav>

      <article className="rounded-lg border border-slate-800 p-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{software.name}</h1>
          {(software.category || software.year || software.status) && (
            <p className="text-sm text-slate-300">
              {[software.category, software.year ? String(software.year) : null, software.status]
                .filter(Boolean)
                .join(" • ")}
            </p>
          )}
        </header>

        <p className="mt-4 leading-relaxed text-slate-200">{software.description ?? software.summary}</p>

        {software.tags?.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {software.tags.map((tag) => (
              <span key={`${software.slug}-${tag}`} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300">
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {externalLinks.length ? (
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            {externalLinks.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="hover:underline">
                {link.label}
              </a>
            ))}
          </div>
        ) : null}
      </article>
    </main>
  );
}
