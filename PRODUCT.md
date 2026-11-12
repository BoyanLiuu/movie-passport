# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, weighted equally:

- **Film lovers curious about world cinema**, browsing by country to find something to watch — at home,
  mostly on a desktop browser. Phones must work well, but desktop gets priority.
- **People evaluating it as a portfolio piece** (recruiters, peers) for its design and engineering.

## Product Purpose

Movie Passport is an interactive 3D globe for discovering films by country. You spin the Earth, pick a
country (or a poster, or search), see the films it made, and open any film's full details, down to where
it can be watched. Success: a visitor lands, understands the idea within seconds, and leaves having found
a film from somewhere they had not looked before.

## Positioning

The globe is the index. Every film has a place: it is pinned in its main country, listed under every
country that co-produced it, and countries with no shape on a world map (Hong Kong, Malta) or that no
longer exist (the Soviet Union, Yugoslavia) still have their own place. Film sites list countries as
metadata; here the country is the way in.

## Operating Context

- A single-route web app (Next.js) whose state lives in the URL: `?country=FR`, `?film=194`,
  `?film=194&details`, so links can be shared and browser Back/Forward move between views.
- Ways in: dragging and clicking the globe, clicking a poster, keyboard search (`/`).
- Views: the whole globe; a country (its films, "From" vs "Co-produced"); a film card; the film details
  sheet (cast, trailer, where to watch, facts, similar films).
- Data is fetched from TMDB at build time and refreshed monthly; it is never committed.

## Capabilities and Constraints

- 3D globe (react-globe.gl / three.js) with Natural Earth 1:110m country shapes, plus small discs for 72
  places the map has no shape for; posters placed by the main country, spaced, at most 60 on screen.
- About 1,171 films (top 10 per country by TMDB vote count, plus co-productions); per-film details files.
- **TMDB terms are binding:** non-commercial only; the TMDB logo and the notice "This product uses the TMDB
  API but is not endorsed or certified by TMDB" in an About/Credits section; no caching beyond six months;
  no redistribution of TMDB data. Where-to-watch data must be credited to JustWatch.
- Without a TMDB catalogue the app shows a 20-film sample with generated placeholder posters.
- Performance: the globe alone runs about 23 fps with the CPU slowed 4×; a frame-time budget is open work.
- Undecided: the tagline ("Travel the world through films.") is current but not binding.

## Brand Commitments

- Name: **Movie Passport**.
- The **3D globe stays at the centre** of the experience (confirmed by the owner).
- Source attribution (TMDB, JustWatch, Natural Earth) stays visible where the terms require it.

## Evidence on Hand

- Real film metadata, posters, backdrops, cast photos and trailers from TMDB (loaded from TMDB's CDN and
  YouTube at runtime; the data files are local build output, not in the repo).
- No users, testimonials, usage numbers or press exist; do not invent them.

## Product Principles

1. **The country is the way in.** Every view should make the place of a film legible.
2. **Honest geography.** Main country vs co-producers, historical states labelled as historical, no
   silent merging of places.
3. **End at a film you can watch.** Exploration should lead to a concrete next step (details, where to
   watch), not just browsing.
4. **Credit the sources.** Attribution is part of the product, not fine print to hide.
5. **No account, no tracking.** Nothing third-party loads until the viewer asks (the trailer loads on
   play).

## Accessibility & Inclusion

Established in code and to be kept: a keyboard route to every country and film (search), visible focus,
screen-reader announcements of selection changes, reduced-motion support (no auto-rotation, instant camera
moves, no slide animations), and touch support on phones.
