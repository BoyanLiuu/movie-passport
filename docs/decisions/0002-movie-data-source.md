# 0002 — Movie data: TMDB, fetched at build time

- **Status:** accepted (M4, 2026-11-11)
- **Decision:** use **TMDB** for film metadata and posters. A build-time script fetches the **top 10
  films per country** into a static JSON file that is **not committed**. The app stays strictly
  non-commercial.

## Options considered (terms checked 2026-11-11)

| Source        | Has production country?                                        | Posters | Terms                                                   | Verdict                                 |
| ------------- | -------------------------------------------------------------- | ------- | ------------------------------------------------------- | --------------------------------------- |
| TMDB API      | Yes: `origin_country` and `production_countries` (ISO alpha-2) | Yes     | Free for non-commercial use with attribution; see below | **Chosen**                              |
| Wikidata      | Yes: country of origin, plus narrative and filming locations   | No      | CC0                                                     | Later, for "set in" / "filmed in" modes |
| IMDb datasets | **No** production-country field                                | No      | Personal and non-commercial use only                    | Rejected: can't answer "which country"  |

## TMDB terms we must follow

From the API terms of use and developer FAQ:

- **Non-commercial only.** "Your project is considered commercial if the primary purpose is to create
  revenue for the benefit of the owner." Movie Passport has no ads, fees or paid tiers.
- **Attribution:** the TMDB logo (an approved version, unmodified, less prominent than ours) and the
  notice _"This product uses the TMDB API but is not endorsed or certified by TMDB."_ in an About or
  Credits section.
- **No caching longer than 6 months**, and delete cached content if the licence ends.
- **No redistribution** of TMDB content or datasets, and no use for training AI.
- **Watch providers** (if we add "where to watch"): "you must attribute the source of the data as
  JustWatch."

## How we comply

| Rule              | Implementation                                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secret token      | `TMDB_READ_TOKEN` in `.env.local` (gitignored, mode 600); read only by `scripts/fetch-catalogue.mjs`; no `NEXT_PUBLIC_` prefix, so it can't reach the browser |
| No redistribution | `public/data/catalogue.json` is gitignored; the deploy builds it fresh                                                                                        |
| ≤ 6 months cache  | The file records `generatedAt`; refresh monthly (the fetch takes ~20 s)                                                                                       |
| Attribution       | About dialog with the TMDB logo and notice; each film links to its TMDB page                                                                                  |
| Images            | Posters load from TMDB's image CDN at `w185`/`w342`; we don't re-host them. Generated art is the fallback                                                     |

## What "country" means

TMDB gives each film an **origin** (where it is _from_) and **production countries** (everyone who
made or funded it). Real examples: _Amélie_ is from FR, made with FR + DE; _Gravity_ is from US + GB.

1. A film is listed under **every production country**: Amélie appears in France and Germany.
2. A country's panel separates **"From {country}"** from **"Co-produced with {country}"**. "From" means the
   film's **main country**: its _first_ origin country that the map can show. Refined on real data: TMDB lists
   several origin countries for 510 of 1,050 films (Terminator 2 is `US, FR`), which made "any origin" put
   152 films under France; "main country" gives 49, and Terminator 2 becomes a French co-production.
3. **Top 10 per country** means the 10 most-voted films _from_ that country (TMDB `with_origin_country`,
   `sort_by=vote_count.desc`, at least 10 votes). Co-productions are extra, not counted in the 10.
4. The **poster is pinned once**, in the film's main country. In a country view, only films from it get
   posters; co-productions are in the list (their posters live in their own main countries).

## Measured coverage (top 10, ≥ 10 votes)

175 map countries: 90 have a full 10, 59 have 1–9, 26 have none (the empty state suggests neighbours).
About 1,100 films in total. "Most voted" favours international hits (France: _The Intouchables_,
_Lucy_, _Léon_); mixing in rating or decade spread is a later refinement.

## Follow-ups

- **Small places** TMDB lists but our 1:110m map has no shape for (76 of 251): done in M4 as discs
  (72 places, including historical states); renamed codes alias to today's country. Uninhabited
  territories without a Natural Earth point (Bouvet, Heard and McDonald…) are left out.
- Larger catalogue (top 50) once the UI has filters and paging.
