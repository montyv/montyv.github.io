import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  METADATA_DESCRIPTION_MAX_LENGTH,
  SOCIAL_DESCRIPTION_MAX_LENGTH,
  assetUrl,
  buildPageMetadata,
  canonicalUrl,
  truncateMetadataText,
} from "../../lib/seo";
import { getSoftwareBySlug, loadSoftwareEntries } from "../../lib/software-data";
import { softwareOgImagePath } from "../software-og";

type SoftwareDetailPageProps = {
  params: Promise<{ slug: string }>;
};

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
      imagePath: softwareOgImagePath("not-found"),
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
    imagePath: softwareOgImagePath(software.slug),
    imageAlt: `${software.name} Open Graph card`,
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

  const allLinks = [
    software.website ? { label: "Website", href: software.website } : null,
    software.repository ? { label: "Repository", href: software.repository } : null,
    software.docs ? { label: "Documentation", href: software.docs } : null,
    ...(software.links ?? []),
  ].filter((link): link is { label: string; href: string } => Boolean(link));

  const externalLinks = Array.from(
    new Map(allLinks.map((link) => [link.href, link])).values(),
  );

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: software.name,
    description: software.description ?? software.summary,
    applicationCategory: software.category,
    datePublished: software.year ? `${software.year}-01-01` : undefined,
    operatingSystem: "Cross-platform",
    url: canonicalUrl(`/software/${software.slug}`),
    image: software.logo ? assetUrl(software.logo) : undefined,
    screenshot: software.media?.length ? software.media.map((item) => assetUrl(item.src)) : undefined,
    sameAs: externalLinks.map((link) => link.href),
    keywords: software.tags?.join(", "),
    featureList: software.highlights,
    creator: {
      "@type": "Person",
      name: "Velimir V. Vesselinov",
      url: canonicalUrl("/"),
    },
  };

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
        <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-start">
          <div>
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

            {software.details?.length ? (
              <div className="mt-5 space-y-3 text-sm leading-relaxed text-slate-300">
                {software.details.map((detail) => (
                  <p key={detail}>{detail}</p>
                ))}
              </div>
            ) : null}
          </div>

          {software.logo ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-5">
              <div className="flex min-h-40 items-center justify-center">
                <img
                  src={software.logo}
                  alt={software.logoAlt ?? `${software.name} logo`}
                  className="max-h-32 w-auto object-contain"
                />
              </div>
            </div>
          ) : null}
        </div>

        {software.highlights?.length ? (
          <section className="mt-6">
            <h2 className="text-lg font-semibold tracking-tight">Capabilities</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
              {software.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {software.media?.length ? (
          <section className="mt-6">
            <h2 className="text-lg font-semibold tracking-tight">Images</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {software.media.map((item) => (
                <figure key={`${item.src}-${item.alt}`} className="rounded-lg border border-slate-800 bg-slate-900/20 p-4">
                  <img src={item.src} alt={item.alt} className="h-auto w-full object-contain" />
                  {item.caption ? <figcaption className="mt-3 text-xs leading-relaxed text-slate-400">{item.caption}</figcaption> : null}
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        {software.tags?.length ? (
          <div className="mt-6 flex flex-wrap gap-2">
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
