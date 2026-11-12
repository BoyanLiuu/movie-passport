"use client";

// Keyboard-accessible search for countries and films (ARIA combobox pattern): type, move with the
// arrow keys, Enter to go, Escape to close. "/" focuses it from anywhere. The canvas itself can't
// be operated from the keyboard, so this is the keyboard route to every country.

import { Search } from "lucide-react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Movie } from "@/data/movies";
import { filmCountLabel } from "@/lib/catalogue";
import type { Country } from "@/lib/geo/countries";
import { searchCatalogue } from "@/lib/search";

type SearchBoxProps = {
  countries: Country[];
  movies: Movie[];
  filmCounts: ReadonlyMap<string, number>;
  countryNames: (codes: string[]) => string[];
  onSelectCountry: (countryId: string) => void;
  onSelectMovie: (movieId: string) => void;
};

type Option = { key: string; index: number; label: string; detail: string; select: () => void };

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

export const SearchBox = ({
  countries,
  movies,
  filmCounts,
  countryNames,
  onSelectCountry,
  onSelectMovie,
}: SearchBoxProps) => {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(
    () => searchCatalogue(query, countries, movies),
    [query, countries, movies],
  );
  const groups = useMemo(() => {
    let index = 0;
    const countryOptions: Option[] = results.countries.map((c) => ({
      key: `country-${c.id}`,
      index: index++,
      label: c.name,
      detail: `${c.continent} · ${filmCountLabel(filmCounts.get(c.id) ?? 0)}`,
      select: () => onSelectCountry(c.id),
    }));
    const movieOptions: Option[] = results.movies.map((m) => ({
      key: `film-${m.id}`,
      index: index++,
      label: m.title,
      detail: `${m.year} · ${countryNames(m.countries).join(", ")}`,
      select: () => onSelectMovie(m.id),
    }));
    return [
      { name: "Countries", options: countryOptions },
      { name: "Films", options: movieOptions },
    ].filter((g) => g.options.length > 0);
  }, [results, filmCounts, countryNames, onSelectCountry, onSelectMovie]);
  const options = groups.flatMap((g) => g.options);
  const expanded = open && query.trim().length > 0;
  const activeIndex = Math.min(active, Math.max(options.length - 1, 0));

  // "/" jumps to search, as on many sites.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || isTypingTarget(event.target))
        return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const inputId = `${id}-input`;
  const choose = (option: Option | undefined) => {
    if (!option) return;
    option.select();
    setQuery("");
    setOpen(false);
    document.getElementById(inputId)?.blur();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setOpen(true);
        setActive(options.length ? (activeIndex + 1) % options.length : 0);
        break;
      case "ArrowUp":
        event.preventDefault();
        setOpen(true);
        setActive(options.length ? (activeIndex - 1 + options.length) % options.length : 0);
        break;
      case "Enter":
        if (expanded) {
          event.preventDefault();
          choose(options[activeIndex]);
        }
        break;
      case "Escape":
        // Close the list (or clear the text) without also leaving the current country.
        if (expanded || query) {
          event.preventDefault();
          setQuery("");
          setOpen(false);
        } else {
          inputRef.current?.blur();
        }
        break;
    }
  };

  const listId = `${id}-list`;
  const optionId = (index: number) => `${id}-option-${index}`;

  return (
    <div className="pointer-events-auto relative">
      <label htmlFor={inputId} className="sr-only">
        Search countries or films
      </label>
      <div className="flex min-h-11 items-center gap-3 border border-smoke bg-velvet-raised px-4 shadow-[0_12px_28px_-12px_rgb(0_0_0/0.9)] transition-colors focus-within:border-pewter">
        <Search aria-hidden className="size-4 shrink-0 text-pewter" strokeWidth={1.5} />
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded && options.length ? optionId(activeIndex) : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder="Search countries or films"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent py-2.5 font-serif text-[15px] text-silver-bright placeholder:text-pewter/80 placeholder:italic focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        <kbd className="hidden border border-smoke px-1.5 font-serif text-[11px] text-pewter pointer-fine:inline">
          /
        </kbd>
      </div>

      <div
        id={listId}
        role="listbox"
        aria-label="Search results"
        hidden={!expanded}
        className="absolute inset-x-0 top-full mt-2 max-h-[min(24rem,60dvh)] overflow-y-auto border border-smoke bg-velvet-raised p-1.5 shadow-[0_24px_48px_-16px_rgb(0_0_0/0.95)]"
      >
        {options.length === 0 ? (
          <p className="px-3 py-2.5 font-serif text-sm text-pewter italic" role="presentation">
            No countries or films match “{query.trim()}”.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.name} role="group" aria-label={group.name}>
              <p className="engraved px-3 pt-3 pb-1.5 text-[10px] text-pewter" role="presentation">
                {group.name}
              </p>
              {group.options.map((option) => {
                const i = option.index;
                return (
                  <div
                    key={option.key}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === activeIndex}
                    // mousedown, not click: keep focus in the input until the choice is made.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      choose(option);
                    }}
                    onMouseEnter={() => setActive(i)}
                    className="cursor-pointer px-3 py-2 aria-selected:bg-silver/10"
                  >
                    <span className="block font-serif text-[15px] text-silver-bright">
                      {option.label}
                    </span>
                    <span className="block font-serif text-[13px] text-pewter">
                      {option.detail}
                    </span>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
