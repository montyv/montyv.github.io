"use client";

import { useEffect, useMemo, useState } from "react";

type ObfuscatedEmailLinkProps = {
  localPart: string;
  domain: string;
  className?: string;
};

const obfuscateForDisplay = (localPart: string, domain: string) => {
  const safeDomain = domain.replaceAll(".", " [dot] ");
  return `${localPart} [at] ${safeDomain}`;
};

export const ObfuscatedEmailLink = ({ localPart, domain, className }: ObfuscatedEmailLinkProps) => {
  const email = useMemo(() => `${localPart}@${domain}`, [domain, localPart]);
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    setHref(`mailto:${email}`);
  }, [email]);

  return (
    <a className={className} href={href ?? undefined} suppressHydrationWarning>
      {href ? email : obfuscateForDisplay(localPart, domain)}
    </a>
  );
};
