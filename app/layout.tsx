/**
 * @project  ComposePermit — github.com/uvindev/compose-permit
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @company  ASI Research Labs — asiresearch.io
 * @built    2026
 * @license  MIT
 */

import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import { Signature } from "@/components/signature";
import "./globals.css";

const title = "ComposePermit — Docker Compose security diff reviewer";
const description =
  "Compare Docker Compose files locally and review changes to privileged mode, mounts, sockets, capabilities, namespaces, ports, and host file access.";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL("https://github.com/uvindev/compose-permit"),
  authors: [{ name: "Uvin Vindula", url: "https://iamuvin.com" }],
  creator: "Uvin Vindula (IAMUVIN)",
  publisher: "ASI Research Labs",
  keywords: [
    "Docker Compose security",
    "Docker Compose diff",
    "DevSecOps",
    "IaC security",
    "compose.yaml",
  ],
  openGraph: { title, description, type: "website" },
  robots: { index: true, follow: true },
  other: { developer: "Uvin Vindula — iamuvin.com" },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ComposePermit",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web browser",
  description,
  license: "https://opensource.org/license/mit",
  creator: {
    "@type": "Person",
    name: "Uvin Vindula",
    alternateName: "IAMUVIN",
    url: "https://iamuvin.com",
  },
  codeRepository: "https://github.com/uvindev/compose-permit",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  return (
    <html lang="en">
      <head>
        <link rel="me" href="https://iamuvin.com" />
        <link rel="author" type="text/plain" href="/humans.txt" />
        {/* Static product metadata only. User-supplied Compose text never reaches this script. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {plausibleDomain ? (
          <Script
            defer
            data-domain={plausibleDomain}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        ) : null}
      </head>
      <body>
        <Signature />
        {children}
      </body>
    </html>
  );
}
