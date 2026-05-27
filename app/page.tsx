import type { Metadata } from "next";
import Link from "next/link";

import { homeContentIndex as homeContentIndexData } from "./home/home.sections.generated";
import { readHomeIndexFromSource } from "./home/readHomeSectionsFromSource";
import { ObfuscatedEmailLink } from "./components/ObfuscatedEmailLink";
import { DEFAULT_OG_IMAGE, PERSON_NAME, PERSON_SAME_AS, SITE_NAME, buildPageMetadata, canonicalUrl, assetUrl } from "./lib/seo";

type LegacyHomeSection = Readonly<{
  id: string;
  title: string;
  html?: string;
  htmlLines?: readonly string[];
}>;

type LegacyHomeIndex = Readonly<{
  schemaVersion?: number;
  generatedAt: string;
  source: string;
  title: string;
  sections: readonly LegacyHomeSection[];
}>;

const homeDescription = "Velimir V. Vesselinov's research profile, software catalog, publications, presentations, reports, and science-informed AI/ML projects.";

export const metadata: Metadata = buildPageMetadata({
  title: { absolute: SITE_NAME },
  titleText: SITE_NAME,
  description: homeDescription,
  pathname: "/",
  keywords: ["Velimir V. Vesselinov", "monty", "AI/ML", "geoscience", "software", "publications", "presentations"],
});

const sectionHtml = (section: LegacyHomeSection): string => {
  if (Array.isArray(section.htmlLines) && section.htmlLines.length) {
    return section.htmlLines.join("\n").replace(/\r\n/g, "\n").trim();
  }
  return (section.html ?? "").replace(/\r\n/g, "\n").trim();
};

export default function HomePage() {
  const homeIndex =
    process.env.NODE_ENV === "development"
      ? readHomeIndexFromSource() ?? (homeContentIndexData as LegacyHomeIndex)
      : (homeContentIndexData as LegacyHomeIndex);

  const sectionsForCards = homeIndex.sections ?? [];
  const homeJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        "@id": canonicalUrl("/#profile"),
        url: canonicalUrl("/"),
        name: SITE_NAME,
        description: homeDescription,
        mainEntity: {
          "@id": canonicalUrl("/#person"),
        },
      },
      {
        "@type": "Person",
        "@id": canonicalUrl("/#person"),
        name: PERSON_NAME,
        alternateName: "monty",
        url: canonicalUrl("/"),
        image: assetUrl(DEFAULT_OG_IMAGE),
        description: homeDescription,
        sameAs: PERSON_SAME_AS,
      },
      {
        "@type": "WebSite",
        "@id": canonicalUrl("/#website"),
        url: canonicalUrl("/"),
        name: SITE_NAME,
        description: homeDescription,
      },
    ],
  };

  return (
    <main className="py-8 md:py-10">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      <section className="grid gap-6 lg:grid-cols-[1.18fr_0.82fr] lg:items-stretch">
        <div className="page-panel flex flex-col gap-6">
          <header className="space-y-4">
            <div className="hero-kicker">Research Profile</div>
            <div className="space-y-3">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-slate-50 md:text-5xl">
                Velimir ("monty") Vesselinov
              </h1>
              <p className="max-w-2xl text-lg text-cyan-100/90 md:text-xl">
                Science-informed AI/ML, geoscience modeling, uncertainty quantification, and open scientific software.
              </p>
              <p className="max-w-3xl text-sm leading-relaxed text-slate-300 md:text-base">
                Research profile for Velimir V. Vesselinov featuring publications, presentations, reports,
                software, and linked scientific work across geoscience, uncertainty quantification, and
                AI/ML-enabled decision support.
              </p>
            </div>
          </header>

          <div className="flex flex-wrap gap-2">
            <span className="metric-chip">40+ years in science and engineering</span>
            <span className="metric-chip">130+ research publications</span>
            <span className="metric-chip">Open-source scientific software</span>
          </div>

          <nav className="grid gap-3 md:grid-cols-2">
            {[
              {
                href: "/software",
                title: "Software",
                description: "SmartTensors, MADS, WELLS, and other scientific tools.",
              },
              {
                href: "/publications",
                title: "Publications",
                description: "Peer-reviewed articles, papers, and scholarly output.",
              },
              {
                href: "/presentations",
                title: "Presentations",
                description: "Talks, invited lectures, slide decks, and conference materials.",
              },
              {
                href: "/reports",
                title: "Reports",
                description: "Technical reports and downloadable research documents.",
              },
            ].map((item) => (
              <Link key={item.href} className="nav-card" href={item.href}>
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Explore</div>
                <div className="mt-2 font-[family-name:var(--display-font)] text-2xl text-slate-50">
                  {item.title}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.description}</p>
              </Link>
            ))}
          </nav>

          <section className="page-panel p-5">
            <div className="grid gap-3 text-sm text-slate-200">
              <p>
                Email:{" "}
                <ObfuscatedEmailLink
                  localPart="velimir.vesselinov"
                  domain="gmail.com"
                />
                ,{" "}
                <ObfuscatedEmailLink localPart="monty" domain="envitrace.com" />
              </p>
              <p>
                Web:{" "}
                <a
                  href="https://montyv.github.io"
                  target="_blank"
                  rel="noreferrer"
                >
                  montyv.github.io
                </a>
                ,{" "}
                <a
                  href="https://envitrace.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  envitrace.com
                </a>
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <a
                  href="https://scholar.google.com/citations?user=sIFHVvwAAAAJ&hl"
                  target="_blank"
                  rel="noreferrer"
                >
                  Google Scholar
                </a>
                <a
                  href="https://orcid.org/0000-0002-6222-0530"
                  target="_blank"
                  rel="noreferrer"
                >
                  ORCID
                </a>
                <a
                  href="https://www.linkedin.com/in/montyvesselinov"
                  target="_blank"
                  rel="noreferrer"
                >
                  LinkedIn
                </a>
                <a
                  href="https://github.com/montyvesselinov"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub
                </a>
                <a
                  href="https://gitlab.com/monty"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitLab
                </a>
                <a
                  href="https://www.youtube.com/watch?v=xPOkeLMJywE&list=PLpVcrIWNlP22LfyIu5MSZ7WHp7q0MNjsj"
                  target="_blank"
                  rel="noreferrer"
                >
                  YouTube
                </a>
              </div>
            </div>
          </section>
        </div>

        <div className="page-panel flex flex-col gap-5">
          <div className="overflow-hidden rounded-[1.6rem] border border-cyan-200/10 bg-slate-900/20">
            <img
              src="/images/monty20210529-body.jpg"
              alt="Velimir V. Vesselinov"
              className="h-[420px] w-full object-cover object-top md:h-[520px]"
            />
          </div>
          <div className="rounded-[1.4rem] border border-slate-700/40 bg-slate-900/35 p-5">
            <div className="text-xs uppercase tracking-[0.24em] text-amber-300">Focus Areas</div>
            <div className="mt-3 grid gap-3 text-sm text-slate-300">
              <p>Machine learning and artificial intelligence for earth and environmental systems.</p>
              <p>Model diagnostics, uncertainty quantification, inverse analysis, and decision support.</p>
              <p>Scientific software development spanning hydrology, geoscience, and high-performance computing.</p>
            </div>
          </div>
        </div>
      </section>

      {sectionsForCards.length ? (
        <section className="mt-8 md:mt-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="hero-kicker">Archive</div>
              <h2 className="mt-3 text-3xl text-slate-50">Browse Sections</h2>
            </div>
            <p className="max-w-xl text-right text-sm text-slate-400">
              Expand the sections below to explore background, research directions, projects, software, workshops, and archival materials.
            </p>
          </div>
          <div className="grid gap-4">
            {sectionsForCards.map((section, index) => (
              <details
                key={section.id}
                data-home-section={section.id}
                className="section-disclosure"
              >
                <summary className="section-summary">
                  <div className="section-summary-row">
                    <div className="flex items-center gap-4">
                      <span className="section-index">{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Section</div>
                        <div className="font-[family-name:var(--display-font)] text-2xl text-slate-50">
                          {section.title}
                        </div>
                      </div>
                    </div>
                    <span className="section-toggle">Open</span>
                  </div>
                </summary>
                <div className="legacy-content border-t border-slate-800/70 px-5 pb-5 pt-4 md:px-6 md:pb-6" suppressHydrationWarning>
                  <div
                    suppressHydrationWarning
                    dangerouslySetInnerHTML={{ __html: sectionHtml(section) }}
                  />
                </div>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
