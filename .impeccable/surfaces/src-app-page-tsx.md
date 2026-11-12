---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/components/globe/MovieGlobe.tsx"]
---

# Surface brief: Movie Passport globe explorer (the app's one route)

Scope: the whole single-route app: globe, search, country panel, film card, film details sheet, About dialog,
loading/empty/error states. Mode: Experience (the work leads from the first viewport). Code-led build.

Audience and job: film lovers (desktop first) browsing world cinema by country, and portfolio reviewers.
Constraints: the 3D globe stays the centre; TMDB and JustWatch attribution where the terms require it; no
streaming-service look; uncluttered.

## Direction contract

THESIS: Cinema is light pulled out of a dark room, so the globe is a mezzotint plate: everything starts
velvet black and only what has films is burnished to silver. Refuses the category default of a navy space
globe with glowing atmosphere, neon accents and floating poster cards.

OWN-WORLD: Rocked velvet black ground with fine burr grain; burnished silver as the only light; pewter for
the half-lit; warm plate brown for half-scraped states. Engraved roman capitals (Cinzel), widely tracked, for
names and captions; a screen roman (Spectral) for reading. Silver hairline frames, burnished-plate primary
buttons, square corners, no glass, no glow.

STORY: Visitors see silver countries and posters surfacing from black, understand that light means films,
pick a country or a print, and go deeper (country, film, details) to something they can watch.

FIRST VIEWPORT: The globe large and centred; only countries with films burnished; posters stand as small
framed prints over their countries; the mark top-left; search top-centre; an engraved caption centred on
the lower margin naming what to do; a vertical plate gauge (World, Country, Film, Details) on the left edge.

FORM: Mezzotint velvet night (catalog world), the user's kept direction from the bolder round, chosen
over the round-4 roll; seed:134d767401eba8ce. Raises carried: depth as navigation (the plate gauge), one
next-step cue per view, plate numbers (ISO codes) as addresses, preview on hover, light follows attention.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Tagline wording is not binding (PRODUCT.md); the engraved caption copy may refine it.
