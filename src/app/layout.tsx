import type { Metadata, Viewport } from "next";
import { Cinzel, Spectral } from "next/font/google";
import "./globals.css";

// Engraved roman capitals for names and captions; a screen roman for reading. Both self-hosted
// by next/font at build time (no request to Google from the browser). Only the cuts in use:
// Cinzel 400 and 500 (actions, the mark); Spectral 400 upright and italic, with latin-ext for
// names such as Kieślowski.
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "500"],
});
const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin", "latin-ext"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Movie Passport",
  description:
    "Travel the world through films: an interactive 3D globe for exploring movies country by country.",
};

export const viewport: Viewport = {
  themeColor: "#0b0b0b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${cinzel.variable} ${spectral.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden font-serif">{children}</body>
    </html>
  );
}
