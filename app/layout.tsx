import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Velimir V. Vesselinov (monty)",
  description: "Research, codes, projects, publications, presentations, and more.",
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
