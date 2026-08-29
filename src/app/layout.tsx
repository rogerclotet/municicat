import type { Metadata, Viewport } from "next";
import { Archivo, Fraunces, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { ServiceWorkerRegistrar } from "./_components/service-worker-registrar";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"] });

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: { default: "Municicat", template: "%s · Municicat" },
  description:
    "Endevina cada dia un municipi de Catalunya a partir del seu escut. Un municipi nou cada dia, el mateix per a tothom.",
  applicationName: "Municicat",
  appleWebApp: { capable: true, title: "Municicat", statusBarStyle: "default" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6efe3" },
    { media: "(prefers-color-scheme: dark)", color: "#17120d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ca"
      className={`${fraunces.variable} ${archivo.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="font-sans min-h-full flex flex-col">
        <div className="senyera-rule h-1.5 shrink-0" aria-hidden />
        <header className="relative z-10 shrink-0 border-b border-rule/70">
          <nav className="mx-auto flex max-w-6xl items-baseline gap-6 px-5 py-4">
            <Link
              href="/"
              className="font-display text-2xl font-semibold tracking-tight text-oxblood"
            >
              Municicat
            </Link>
            <Link
              href="/municipis"
              className="label transition-colors hover:text-oxblood"
            >
              Els 947 municipis
            </Link>
          </nav>
        </header>
        <main className="relative z-10 flex flex-1 flex-col">{children}</main>
        <footer className="relative z-10 mt-16 border-t border-rule/70 px-5 py-6">
          <p className="mx-auto max-w-6xl text-xs leading-relaxed text-ink-faint">
            Dades i imatges de{" "}
            <a className="underline decoration-rule underline-offset-2 hover:text-oxblood" href="https://www.wikidata.org">
              Wikidata
            </a>{" "}
            i{" "}
            <a className="underline decoration-rule underline-offset-2 hover:text-oxblood" href="https://commons.wikimedia.org">
              Wikimedia Commons
            </a>
            , sota llicències lliures. Cada escut, mapa i fotografia enllaça amb la seva
            pàgina d&apos;origen.
          </p>
        </footer>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
