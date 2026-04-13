"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import NavHeader from "@/components/ui/NavHeader";
import {
  GLOSSARY_ENTRIES,
  getCategories,
  searchGlossary,
  getEntriesByCategory,
  type GlossaryEntry,
} from "@/lib/health/glossary";

/** Category display order */
const CATEGORY_ORDER: GlossaryEntry["category"][] = [
  "Lab Test",
  "Condition",
  "Measurement",
  "Organ",
  "Medication Term",
  "General",
];

export default function GlossaryPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const categories = useMemo(() => getCategories(), []);

  // Sort categories in defined order
  const sortedCategories = useMemo(
    () =>
      [...categories].sort(
        (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b)
      ),
    [categories]
  );

  // Filtered results
  const filteredEntries = useMemo(() => {
    if (!query.trim()) return null; // null means show all grouped
    return searchGlossary(query);
  }, [query]);

  // A-Z jump letters from all entries
  const jumpLetters = useMemo(() => {
    const letters = new Set<string>();
    for (const entry of GLOSSARY_ENTRIES) {
      letters.add(entry.term.charAt(0).toUpperCase());
    }
    return Array.from(letters).sort();
  }, []);

  const toggleCategory = (cat: string) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <>
      <NavHeader />
      <main className="glossary-page">
        <div className="glossary-page__header">
          <h1>Health Glossary</h1>
          <p className="glossary-page__subtitle">
            Plain-English definitions for medical terms. Tap any term to learn
            more.
          </p>
        </div>

        {/* Search */}
        <div className="glossary-page__search-wrapper">
          <input
            type="search"
            className="glossary-page__search"
            placeholder="Search terms..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search glossary terms"
          />
        </div>

        {/* A-Z jump links — only when not searching */}
        {!query.trim() && (
          <nav className="glossary-page__jump" aria-label="Jump to letter">
            {jumpLetters.map((letter) => (
              <a
                key={letter}
                href={`#letter-${letter}`}
                className="glossary-page__jump-link"
              >
                {letter}
              </a>
            ))}
          </nav>
        )}

        {/* Search results */}
        {filteredEntries !== null ? (
          <div className="glossary-page__results">
            {filteredEntries.length === 0 ? (
              <p className="glossary-page__no-results">
                No terms found matching &ldquo;{query}&rdquo;
              </p>
            ) : (
              <div className="glossary-page__entries">
                {filteredEntries.map((entry) => (
                  <GlossaryCard
                    key={entry.term}
                    entry={entry}
                    onRelatedClick={(t) => setQuery(t)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Grouped by category */
          <div className="glossary-page__categories">
            {sortedCategories.map((cat) => {
              const entries = getEntriesByCategory(cat);
              const isCollapsed = collapsed[cat] ?? false;

              return (
                <section
                  key={cat}
                  className="glossary-page__category"
                  id={`cat-${cat.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  <button
                    type="button"
                    className="glossary-page__category-header"
                    onClick={() => toggleCategory(cat)}
                    aria-expanded={!isCollapsed}
                  >
                    <h2>
                      {cat}{" "}
                      <span className="glossary-page__category-count">
                        ({entries.length})
                      </span>
                    </h2>
                    <span
                      className={`glossary-page__chevron ${isCollapsed ? "glossary-page__chevron--collapsed" : ""}`}
                      aria-hidden="true"
                    >
                      &#9660;
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div className="glossary-page__entries">
                      {entries
                        .sort((a, b) => a.term.localeCompare(b.term))
                        .map((entry) => (
                          <GlossaryCard
                            key={entry.term}
                            entry={entry}
                            onRelatedClick={(t) => setQuery(t)}
                          />
                        ))}
                    </div>
                  )}
                </section>
              );
            })}

            {/* A-Z anchors for jump links */}
            <section className="glossary-page__az">
              <h2>A-Z Index</h2>
              <div className="glossary-page__entries">
                {jumpLetters.map((letter) => {
                  const letterEntries = GLOSSARY_ENTRIES.filter(
                    (e) => e.term.charAt(0).toUpperCase() === letter
                  ).sort((a, b) => a.term.localeCompare(b.term));

                  return (
                    <div key={letter} id={`letter-${letter}`}>
                      <h3 className="glossary-page__letter">{letter}</h3>
                      {letterEntries.map((entry) => (
                        <GlossaryCard
                          key={entry.term}
                          entry={entry}
                          onRelatedClick={(t) => {
                            setQuery(t);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          compact
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </main>
    </>
  );
}

// ---------------------------------------------------------------------------
// GlossaryCard — individual term card
// ---------------------------------------------------------------------------

interface GlossaryCardProps {
  entry: GlossaryEntry;
  onRelatedClick: (term: string) => void;
  compact?: boolean;
}

function GlossaryCard({ entry, onRelatedClick, compact }: GlossaryCardProps) {
  return (
    <div
      className={`glossary-page__entry${compact ? " glossary-page__entry--compact" : ""}`}
    >
      <div className="glossary-page__entry-header">
        <span className="glossary-page__entry-term">{entry.term}</span>
        {!compact && (
          <span className="glossary-page__entry-category">{entry.category}</span>
        )}
      </div>

      <p className="glossary-page__entry-definition">{entry.definition}</p>

      {!compact && entry.aliases.length > 0 && (
        <p className="glossary-page__entry-aliases">
          Also known as: {entry.aliases.join(", ")}
        </p>
      )}

      {!compact && entry.relatedTerms && entry.relatedTerms.length > 0 && (
        <div className="glossary-page__entry-related">
          {entry.relatedTerms.map((rt) => (
            <button
              key={rt}
              type="button"
              className="glossary-page__related-chip"
              onClick={() => onRelatedClick(rt)}
            >
              {rt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
