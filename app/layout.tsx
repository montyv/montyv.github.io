import type { Metadata } from "next";
import "./globals.css";
import { DEFAULT_OG_IMAGE, PERSON_NAME, SITE_NAME, SITE_URL, assetUrl, canonicalUrl } from "./lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: "Research, codes, projects, publications, presentations, and more.",
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
    description: "Research, codes, projects, publications, presentations, and more.",
    url: canonicalUrl("/"),
    siteName: SITE_NAME,
    locale: "en_US",
    type: "website",
    images: [assetUrl(DEFAULT_OG_IMAGE)],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: "Research, codes, projects, publications, presentations, and more.",
    images: [assetUrl(DEFAULT_OG_IMAGE)],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-6xl px-4">
          {children}
        </div>
      </body>
    </html>
  );
}
