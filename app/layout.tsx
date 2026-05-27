import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { DEFAULT_OG_IMAGE, PERSON_NAME, SITE_NAME, SITE_URL, assetUrl, canonicalUrl } from "./lib/seo";

const displayFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const navigationLinks = [
  { href: "/", label: "Home" },
  { href: "/software", label: "Software" },
  { href: "/publications", label: "Publications" },
  { href: "/presentations", label: "Presentations" },
  { href: "/reports", label: "Reports" },
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: "Research, software, projects, publications, presentations, and more.",
  alternates: {
    canonical: canonicalUrl("/"),
  },
  authors: [{ name: PERSON_NAME, url: canonicalUrl("/") }],
  creator: PERSON_NAME,
  publisher: PERSON_NAME,
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/images/favicon.ico",
    shortcut: "/images/favicon.ico",
  },
  openGraph: {
    title: SITE_NAME,
    description: "Research, software, projects, publications, presentations, and more.",
    url: canonicalUrl("/"),
    siteName: SITE_NAME,
    locale: "en_US",
    type: "website",
    images: [assetUrl(DEFAULT_OG_IMAGE)],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: "Research, software, projects, publications, presentations, and more.",
    images: [assetUrl(DEFAULT_OG_IMAGE)],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>
        <div className="site-shell">
          <header className="site-topbar">
            <Link href="/" className="site-wordmark">
              <div className="text-xs uppercase tracking-[0.26em] text-cyan-300/90">Monty</div>
              <div className="font-[family-name:var(--display-font)] text-lg tracking-tight text-slate-50">
                Velimir V. Vesselinov
              </div>
            </Link>
            <nav className="site-nav">
              {navigationLinks.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>

          <div className="site-frame">
            <div className="px-4 pb-8 pt-2 md:px-6 md:pb-10">
              {children}
            </div>
          </div>

          <footer className="mt-6 px-2 text-center text-xs text-slate-400">
            Research, software, publications, presentations, reports, and scientific AI/ML work.
          </footer>
        </div>
      </body>
    </html>
  );
}
