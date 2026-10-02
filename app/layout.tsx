import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme";
import PWARegister from "@/components/PWARegister";

// Inter with optical sizing: a sturdier cut for small UI text, a tighter
// display cut for headings.
const sans = Inter({ subsets: ["latin"], axes: ["opsz"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

// Zen mode's Japanese-style faces, subset to Latin (~73 KB total) from the
// OFL originals in google/fonts. Not preloaded: the browser only fetches
// them once Zen mode puts them on screen.
const zenSans = localFont({
  src: [
    { path: "./fonts/zen/ZenKakuGothicNew-Regular.woff2", weight: "400" },
    { path: "./fonts/zen/ZenKakuGothicNew-Medium.woff2", weight: "500" },
    { path: "./fonts/zen/ZenKakuGothicNew-Bold.woff2", weight: "700" },
  ],
  variable: "--font-zen-sans",
  preload: false,
});
const zenSerif = localFont({
  src: [
    { path: "./fonts/zen/ShipporiMincho-Medium.woff2", weight: "500" },
    { path: "./fonts/zen/ShipporiMincho-Bold.woff2", weight: "700" },
  ],
  variable: "--font-zen-serif",
  preload: false,
});
const zenMono = localFont({
  src: "./fonts/zen/MPLUS1Code-Variable.woff2",
  weight: "100 700",
  variable: "--font-zen-mono",
  preload: false,
});

// Set the theme class before first paint to avoid a flash.
const noFlash = `try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark');}else{document.documentElement.classList.add('dark');}}catch(e){document.documentElement.classList.add('dark');}try{if(JSON.parse(localStorage.getItem('kuya-json:preferences')||'{}').zenMode){document.documentElement.classList.add('zen');}}catch(e){}`;

export const metadata: Metadata = {
  title: "Kuya Json — format, repair, anonymize",
  description:
    "Kuya Json — a privacy-first JSON toolkit. Format, validate, repair, anonymize, diff, query and convert JSON — all in your browser. No data ever leaves your machine.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Kuya Json", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
    { media: "(prefers-color-scheme: light)", color: "#edf0f4" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${zenSans.variable} ${zenSerif.variable} ${zenMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <PWARegister />
      </body>
    </html>
  );
}
