import Link from "next/link";

import { homeContentIndex as homeContentIndexData } from "./home/home.sections";
import { ObfuscatedEmailLink } from "./components/ObfuscatedEmailLink";

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

const homeIndex = homeContentIndexData as LegacyHomeIndex;

const sectionHtml = (section: LegacyHomeSection): string => {
  if (Array.isArray(section.htmlLines) && section.htmlLines.length) {
    return section.htmlLines.join("\n");
  }
  return section.html ?? "";
};

const sectionsForCards = homeIndex.sections ?? [];

export default function HomePage() {
  return (
    <main className="py-10">
      <section className="grid gap-8 md:grid-cols-[1.15fr_0.85fr] md:items-start">
        <div className="space-y-5">
          <header className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Velimir ("monty") Vesselinov </h1>
            <p className="text-slate-300">
							Innovating the Future with Science-Informed AI/ML
            </p>
          </header>

          <nav className="grid gap-3 sm:grid-cols-2">
            <Link className="rounded-lg border border-slate-800 p-4 hover:bg-slate-900/40" href="/publications">
              <div className="font-medium">Publications</div>
            </Link>
            <Link className="rounded-lg border border-slate-800 p-4 hover:bg-slate-900/40" href="/presentations">
              <div className="font-medium">Presentations</div>
            </Link>
            <Link className="rounded-lg border border-slate-800 p-4 hover:bg-slate-900/40" href="/reports">
              <div className="font-medium">Reports</div>
            </Link>
            <a className="rounded-lg border border-slate-800 p-4 hover:bg-slate-900/40" href="/legacy/index.html">
              <div className="font-medium">Legacy homepage</div>
            </a>
          </nav>

          <section className="rounded-lg border border-slate-800 p-5">
            <div className="mt-3 grid gap-3 text-sm text-slate-200">
              <div>Co-Founder, CTO, and CSO of EnviTrace LLC</div>
              <div>Developer of AI/ML methods and tools</div>
              <div>Santa Fe, New Mexico, USA</div>
              <div>
                Cell: <a href="tel:+15054734150">+1 (505) 473-4150</a>
              </div>
              <div>
                Email: <ObfuscatedEmailLink localPart="velimir.vesselinov" domain="gmail.com" />,{" "}
                <ObfuscatedEmailLink localPart="monty" domain="envitrace.com" />
              </div>
              <div>
                Web: <a href="https://monty.gitlab.io" target="_blank" rel="noreferrer">monty.gitlab.io</a>,{" "}
                <a href="https://envitrace.com" target="_blank" rel="noreferrer">envitrace.com</a>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <a href="https://www.linkedin.com/in/montyvesselinov" target="_blank" rel="noreferrer">LinkedIn</a>
                <a href="https://github.com/montyvesselinov" target="_blank" rel="noreferrer">GitHub</a>
                <a href="https://gitlab.com/monty" target="_blank" rel="noreferrer">GitLab</a>
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

        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/20">
            <img
              src="/images/monty20210529-body.jpg"
              alt="Velimir V. Vesselinov"
              className="h-[420px] w-full object-cover object-top"
            />
          </div>
        </div>
      </section>

      {sectionsForCards.length ? (
        <section className="mt-10">
          <div className="grid gap-3">
            {sectionsForCards.map((section) => (
              <details key={section.id} data-home-section={section.id} className="rounded-lg border border-slate-800 p-5">
                <summary
                  className="cursor-pointer select-none text-base font-semibold text-slate-100"
                >
                  {section.title}
                </summary>
                <div className="legacy-content mt-4">
                  <div dangerouslySetInnerHTML={{ __html: sectionHtml(section) }} />
                </div>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
