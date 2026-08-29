"use client";

import { useId, useMemo, useRef, useState } from "react";
import { toSearchName, toSortName } from "@/data/normalize";

/** Enough to pick from without turning the list into a second search problem. */
const MAX_SUGGESTIONS = 7;

type Suggestion = { name: string; searchName: string; bareName: string };

function rank(suggestion: Suggestion, needle: string): number {
  if (suggestion.searchName.startsWith(needle)) return 0;
  if (suggestion.bareName.startsWith(needle)) return 1;
  if (suggestion.searchName.includes(needle)) return 2;
  return 3;
}

export function GuessInput({
  names,
  disabled,
  pending,
  onGuess,
}: {
  names: string[];
  disabled: boolean;
  pending: boolean;
  onGuess: (name: string) => void;
}) {
  const [value, setValue] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const entries = useMemo<Suggestion[]>(
    () =>
      names.map((name) => ({
        name,
        searchName: toSearchName(name),
        bareName: toSearchName(toSortName(name)),
      })),
    [names],
  );

  const suggestions = useMemo(() => {
    const needle = toSearchName(value);
    if (needle === "") return [];
    return entries
      .map((entry) => ({ entry, score: rank(entry, needle) }))
      .filter(({ score }) => score < 3)
      .sort((a, b) => a.score - b.score || a.entry.name.localeCompare(b.entry.name, "ca"))
      .slice(0, MAX_SUGGESTIONS)
      .map(({ entry }) => entry.name);
  }, [entries, value]);

  const visible = open && suggestions.length > 0;

  function commit(name: string) {
    onGuess(name);
    setValue("");
    setOpen(false);
    setHighlighted(0);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!visible) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setHighlighted((current) => {
        const next = current + step;
        return (next + suggestions.length) % suggestions.length;
      });
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (disabled || pending) return;
    // Enter accepts the highlighted suggestion, so a partial spelling still works.
    const name = visible ? suggestions[highlighted] : value;
    if (name.trim() !== "") commit(name);
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={value}
            disabled={disabled}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={visible}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={visible ? `${listId}-${highlighted}` : undefined}
            aria-label="Nom del municipi"
            placeholder="Escriu un municipi…"
            onChange={(event) => {
              setValue(event.target.value);
              setHighlighted(0);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              // Let a click on a suggestion land before the list unmounts.
              window.setTimeout(() => setOpen(false), 120);
            }}
            onKeyDown={handleKeyDown}
            className="w-full rounded-sm border border-rule bg-paper-raised px-3.5 py-3 font-display text-lg outline-none placeholder:font-sans placeholder:text-base placeholder:text-ink-faint focus:border-oxblood disabled:opacity-50"
          />
          {visible && (
            <ul
              id={listId}
              role="listbox"
              className="engraved absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-sm border border-rule bg-paper-raised"
            >
              {suggestions.map((name, index) => (
                <li
                  key={name}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === highlighted}
                  onMouseEnter={() => setHighlighted(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    commit(name);
                  }}
                  className={`cursor-pointer px-3.5 py-2 font-display text-base ${
                    index === highlighted ? "bg-oxblood text-paper-raised" : ""
                  }`}
                >
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="submit"
          disabled={disabled || pending}
          className="engraved shrink-0 rounded-sm bg-oxblood px-5 py-3 font-sans text-sm font-semibold uppercase tracking-widest text-paper transition-transform active:translate-y-px disabled:opacity-50"
        >
          {pending ? "…" : "Prova"}
        </button>
      </div>
    </form>
  );
}
