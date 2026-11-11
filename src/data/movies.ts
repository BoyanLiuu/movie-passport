// The film model shared by the mock catalogue (below) and the TMDB catalogue
// (src/lib/data/tmdbCatalogue.ts, built by scripts/fetch-catalogue.mjs).
//
// The mock is 20 well-known films hand-entered for M2–M3, with generated poster art. The app uses it
// when there is no TMDB catalogue (no token yet) and in the browser tests, which need fixed data.

export type Movie = {
  id: string;
  title: string;
  /** Title in the original language, when it differs. */
  originalTitle?: string;
  year: number;
  /** Director(s), comma-separated. */
  director: string;
  /** Countries the film is from (TMDB origin_country), main country first. */
  origin: string[];
  /**
   * The film's main country: its first origin country that the map can show. The poster is pinned
   * here and the film is listed as "From" it; every other producing country lists it as a
   * co-production.
   */
  home: string;
  /** Every production country, origin included, as ISO 3166-1 alpha-2 codes. */
  countries: string[];
  /** Where the poster is pinned on the globe. */
  place: string;
  lat: number;
  lng: number;
  /** Higher ranks stay visible when zoomed out and posters are capped (TMDB: vote count). */
  rank: number;
  /** TMDB poster path, e.g. "/abc.jpg"; absent or null means generated art. */
  poster?: string | null;
  genres?: string[];
  runtime?: number | null;
  /** TMDB average rating out of 10. */
  rating?: number | null;
  /** TMDB id, for "View on TMDB" links. */
  tmdbId?: number;
};

type MockMovie = Omit<Movie, "origin" | "home"> & { origin?: string[] };

const MOCK: MockMovie[] = [
  {
    id: "parasite",
    title: "Parasite",
    originalTitle: "기생충",
    year: 2019,
    director: "Bong Joon-ho",
    countries: ["KR"],
    place: "Seoul",
    lat: 37.57,
    lng: 126.98,
    rank: 10,
  },
  {
    id: "spirited-away",
    title: "Spirited Away",
    originalTitle: "千と千尋の神隠し",
    year: 2001,
    director: "Hayao Miyazaki",
    countries: ["JP"],
    place: "Tokyo",
    lat: 35.68,
    lng: 139.69,
    rank: 10,
  },
  {
    id: "the-godfather",
    title: "The Godfather",
    year: 1972,
    director: "Francis Ford Coppola",
    countries: ["US"],
    place: "New York",
    lat: 40.71,
    lng: -74.01,
    rank: 10,
  },
  {
    id: "amelie",
    title: "Amélie",
    originalTitle: "Le Fabuleux Destin d'Amélie Poulain",
    year: 2001,
    director: "Jean-Pierre Jeunet",
    countries: ["FR", "DE"],
    place: "Paris",
    lat: 48.86,
    lng: 2.35,
    rank: 9,
  },
  {
    id: "city-of-god",
    title: "City of God",
    originalTitle: "Cidade de Deus",
    year: 2002,
    director: "Fernando Meirelles",
    countries: ["BR"],
    place: "Rio de Janeiro",
    lat: -22.91,
    lng: -43.17,
    rank: 9,
  },
  {
    id: "pans-labyrinth",
    title: "Pan's Labyrinth",
    originalTitle: "El laberinto del fauno",
    year: 2006,
    director: "Guillermo del Toro",
    countries: ["MX", "ES"],
    place: "Madrid",
    lat: 40.42,
    lng: -3.7,
    rank: 8,
  },
  {
    id: "a-separation",
    title: "A Separation",
    originalTitle: "جدایی نادر از سیمین",
    year: 2011,
    director: "Asghar Farhadi",
    countries: ["IR"],
    place: "Tehran",
    lat: 35.69,
    lng: 51.39,
    rank: 8,
  },
  {
    id: "bicycle-thieves",
    title: "Bicycle Thieves",
    originalTitle: "Ladri di biciclette",
    year: 1948,
    director: "Vittorio De Sica",
    countries: ["IT"],
    place: "Rome",
    lat: 41.9,
    lng: 12.5,
    rank: 8,
  },
  {
    id: "roma",
    title: "Roma",
    year: 2018,
    director: "Alfonso Cuarón",
    countries: ["MX"],
    place: "Mexico City",
    lat: 19.43,
    lng: -99.13,
    rank: 7,
  },
  {
    id: "the-seventh-seal",
    title: "The Seventh Seal",
    originalTitle: "Det sjunde inseglet",
    year: 1957,
    director: "Ingmar Bergman",
    countries: ["SE"],
    place: "Stockholm",
    lat: 59.33,
    lng: 18.07,
    rank: 7,
  },
  {
    id: "crouching-tiger",
    title: "Crouching Tiger, Hidden Dragon",
    originalTitle: "臥虎藏龍",
    year: 2000,
    director: "Ang Lee",
    countries: ["TW", "CN", "US"],
    place: "Beijing",
    lat: 39.9,
    lng: 116.4,
    rank: 7,
  },
  {
    id: "fellowship-of-the-ring",
    title: "The Fellowship of the Ring",
    year: 2001,
    director: "Peter Jackson",
    countries: ["NZ", "US"],
    place: "Wellington",
    lat: -41.29,
    lng: 174.78,
    rank: 7,
  },
  {
    id: "pather-panchali",
    title: "Pather Panchali",
    originalTitle: "পথের পাঁচালী",
    year: 1955,
    director: "Satyajit Ray",
    countries: ["IN"],
    place: "Kolkata",
    lat: 22.57,
    lng: 88.36,
    rank: 6,
  },
  {
    id: "rrr",
    title: "RRR",
    year: 2022,
    director: "S. S. Rajamouli",
    countries: ["IN"],
    place: "Hyderabad",
    lat: 17.39,
    lng: 78.49,
    rank: 6,
  },
  {
    id: "wild-tales",
    title: "Wild Tales",
    originalTitle: "Relatos salvajes",
    year: 2014,
    director: "Damián Szifron",
    countries: ["AR", "ES"],
    place: "Buenos Aires",
    lat: -34.6,
    lng: -58.38,
    rank: 6,
  },
  {
    id: "tsotsi",
    title: "Tsotsi",
    year: 2005,
    director: "Gavin Hood",
    countries: ["ZA", "GB"],
    place: "Johannesburg",
    lat: -26.2,
    lng: 28.05,
    rank: 5,
  },
  {
    // Set in Mali, produced in France and Mauritania: "where" and "from" differ.
    id: "timbuktu",
    title: "Timbuktu",
    year: 2014,
    director: "Abderrahmane Sissako",
    countries: ["FR", "MR"],
    place: "Timbuktu",
    lat: 16.77,
    lng: -3.01,
    rank: 5,
  },
  {
    id: "run-lola-run",
    title: "Run Lola Run",
    originalTitle: "Lola rennt",
    year: 1998,
    director: "Tom Tykwer",
    countries: ["DE"],
    place: "Berlin",
    lat: 52.52,
    lng: 13.4,
    rank: 5,
  },
  {
    id: "cairo-station",
    title: "Cairo Station",
    originalTitle: "باب الحديد",
    year: 1958,
    director: "Youssef Chahine",
    countries: ["EG"],
    place: "Cairo",
    lat: 30.04,
    lng: 31.24,
    rank: 4,
  },
  {
    id: "leviathan",
    title: "Leviathan",
    originalTitle: "Левиафан",
    year: 2014,
    director: "Andrey Zvyagintsev",
    countries: ["RU"],
    place: "Teriberka",
    lat: 69.17,
    lng: 35.14,
    rank: 4,
  },
];

/** Each mock film is "from" its first production country. */
export const MOCK_MOVIES: Movie[] = MOCK.map((m) => {
  const origin = m.origin ?? [m.countries[0]];
  return { ...m, origin, home: origin[0] };
});
