// Generated placeholder poster art. One SVG per film, derived deterministically from its id, so
// the same film always gets the same poster. Real posters wait for M4's licence review.
//
// The SVG is used both as an <img> (HTML markers) and as a three.js texture (sprite spike), so it
// only uses system fonts: SVG loaded as an image cannot fetch web fonts.

import type { Movie } from "@/data/movies";

export const POSTER_WIDTH = 200;
export const POSTER_HEIGHT = 300;

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};
export const escapeXml = (text: string) => text.replace(/[&<>"']/g, (ch) => XML_ESCAPES[ch]);

/** FNV-1a: a small, stable string hash for picking colours and motifs. */
export const hashString = (text: string) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

/** Greedy word wrap by character count; a word longer than the limit gets its own line. */
export const wrapTitle = (title: string, maxChars: number) => {
  const lines: string[] = [];
  let line = "";
  for (const word of title.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
};

export type PosterPalette = { top: string; bottom: string; accent: string; motif: number };

export const posterPalette = (id: string): PosterPalette => {
  const hash = hashString(id);
  const hue = hash % 360;
  const shift = 30 + ((hash >>> 9) % 60);
  return {
    top: `hsl(${hue} 55% 18%)`,
    bottom: `hsl(${(hue + shift) % 360} 60% 42%)`,
    accent: `hsl(${(hue + 180) % 360} 85% 70%)`,
    motif: (hash >>> 17) % 4,
  };
};

const motifSvg = ({ accent, motif }: PosterPalette) => {
  switch (motif) {
    case 0: // low sun
      return `<circle cx="100" cy="190" r="58" fill="${accent}" opacity="0.85"/>`;
    case 1: // diagonal bands
      return `<g opacity="0.55" fill="${accent}"><path d="M-20 260 L220 120 L220 150 L-20 290 Z"/><path d="M-20 215 L220 75 L220 92 L-20 232 Z"/></g>`;
    case 2: // rings
      return `<g fill="none" stroke="${accent}" stroke-width="3" opacity="0.7"><circle cx="100" cy="185" r="28"/><circle cx="100" cy="185" r="48"/><circle cx="100" cy="185" r="68"/></g>`;
    default: // horizon and peaks
      return `<g opacity="0.8"><path d="M0 230 L55 165 L90 205 L135 140 L200 225 L200 300 L0 300 Z" fill="${accent}"/></g>`;
  }
};

export const posterSvg = (movie: Pick<Movie, "id" | "title" | "year" | "director">) => {
  const palette = posterPalette(movie.id);
  const fontSize = movie.title.length > 22 ? 22 : movie.title.length > 12 ? 26 : 32;
  const lines = wrapTitle(movie.title, Math.floor(160 / (fontSize * 0.55))).slice(0, 4);
  const title = lines
    .map(
      (line, i) =>
        `<text x="100" y="${52 + i * fontSize * 1.1}" text-anchor="middle">${escapeXml(line)}</text>`,
    )
    .join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${POSTER_WIDTH} ${POSTER_HEIGHT}" width="${POSTER_WIDTH}" height="${POSTER_HEIGHT}">`,
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${palette.top}"/><stop offset="1" stop-color="${palette.bottom}"/></linearGradient></defs>`,
    `<rect width="200" height="300" fill="url(#g)"/>`,
    motifSvg(palette),
    `<g font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" fill="#ffffff">${title}</g>`,
    `<g font-family="Helvetica, Arial, sans-serif" fill="#ffffff" text-anchor="middle">`,
    `<text x="100" y="268" font-size="13" opacity="0.9">${escapeXml(`${movie.year} · ${movie.director}`)}</text>`,
    `<text x="100" y="287" font-size="8" letter-spacing="2" opacity="0.6">PLACEHOLDER ART</text>`,
    `</g>`,
    `<rect x="4" y="4" width="192" height="292" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2"/>`,
    `</svg>`,
  ].join("");
};

export const posterDataUrl = (movie: Pick<Movie, "id" | "title" | "year" | "director">) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(posterSvg(movie))}`;
