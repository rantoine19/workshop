"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import NavHeader from "@/components/ui/NavHeader";
import {
  DAILY_TIPS,
  CATEGORY_LABELS,
  CATEGORY_EMOJIS,
  type DailyTip,
  type TipCategory,
  type EvidenceLevel,
} from "@/lib/health/daily-tips";

const CATEGORY_ORDER: TipCategory[] = Object.keys(CATEGORY_LABELS) as TipCategory[];

const EVIDENCE_OPTIONS: Array<EvidenceLevel | "any"> = [
  "any",
  "strong",
  "moderate",
  "emerging",
];

interface InteractionState {
  favorites: Set<string>;
  dismissed: Set<string>;
  completedToday: Set<string>;
}

export default function TipsPage() {
  return (
    <Suspense fallback={<div className="tips-page">Loading...</div>}>
      <TipsBrowseContent />
    </Suspense>
  );
}

function TipsBrowseContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const initialCategory = (searchParams.get("category") ?? "") as TipCategory | "";
  const initialFavoritesOnly = searchParams.get("favorites") === "1";

  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState<TipCategory | "">(
    initialCategory
  );
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(initialFavoritesOnly);
  const [evidence, setEvidence] = useState<EvidenceLevel | "any">("any");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const [state, setState] = useState<InteractionState>({
    favorites: new Set(),
    dismissed: new Set(),
    completedToday: new Set(),
  });
  const [streak, setStreak] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  // Fetch interactions on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch("/api/tips/interactions").catch(() => null);
      if (!res || !res.ok || cancelled) return;
      try {
        const json = await res.json();
        setState({
          favorites: new Set(json.favorites ?? []),
          dismissed: new Set(json.dismissed ?? []),
          completedToday: new Set(json.completedToday ?? []),
        });
        setStreak(json.streak ?? 0);
      } catch {
        /* ignore */
      }
    }
    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  // Filter the tip pool
  const filteredTips: DailyTip[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DAILY_TIPS.filter((tip) => {
      if (activeCategory && tip.category !== activeCategory) return false;
      if (favoritesOnly && !state.favorites.has(tip.id)) return false;
      if (evidence !== "any" && tip.evidenceLevel !== evidence) return false;
      if (q) {
        if (
          !tip.text.toLowerCase().includes(q) &&
          !CATEGORY_LABELS[tip.category].toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [query, activeCategory, favoritesOnly, evidence, state.favorites]);

  // Group filtered tips by category, preserving category order
  const grouped = useMemo(() => {
    const map = new Map<TipCategory, DailyTip[]>();
    for (const tip of filteredTips) {
      const arr = map.get(tip.category) ?? [];
      arr.push(tip);
      map.set(tip.category, arr);
    }
    return CATEGORY_ORDER
      .map((cat) => ({ category: cat, tips: map.get(cat) ?? [] }))
      .filter((g) => g.tips.length > 0);
  }, [filteredTips]);

  const totalShown = filteredTips.length;

  const toggleCategory = useCallback((cat: string) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  const postInteraction = async (tipId: string, action: string) => {
    try {
      await fetch("/api/tips/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tip_id: tipId, action }),
      });
    } catch {
      /* non-critical */
    }
  };

  const handleToggleFavorite = useCallback(
    async (tip: DailyTip) => {
      if (busy) return;
      setBusy(`fav-${tip.id}`);
      const wasFav = state.favorites.has(tip.id);
      setState((s) => {
        const next = new Set(s.favorites);
        if (wasFav) next.delete(tip.id);
        else next.add(tip.id);
        return { ...s, favorites: next };
      });
      await postInteraction(tip.id, wasFav ? "unfavorited" : "favorited");
      setBusy(null);
    },
    [busy, state.favorites]
  );

  const handleComplete = useCallback(
    async (tip: DailyTip) => {
      if (busy || state.completedToday.has(tip.id)) return;
      setBusy(`done-${tip.id}`);
      setState((s) => {
        const next = new Set(s.completedToday);
        next.add(tip.id);
        return { ...s, completedToday: next };
      });
      await postInteraction(tip.id, "completed");
      // Refresh streak from server
      const res = await fetch("/api/tips/interactions").catch(() => null);
      if (res?.ok) {
        try {
          const json = await res.json();
          setStreak(json.streak ?? 0);
        } catch {
          /* ignore */
        }
      }
      setBusy(null);
    },
    [busy, state.completedToday]
  );

  const handleUndismissAll = useCallback(async () => {
    if (busy) return;
    setBusy("undismiss-all");
    setState((s) => ({ ...s, dismissed: new Set() }));
    try {
      await fetch("/api/tips/interactions?action=dismissed", {
        method: "DELETE",
      });
    } catch {
      /* non-critical */
    }
    setBusy(null);
  }, [busy]);

  return (
    <div className="tips-page">
      <NavHeader backHref="/dashboard" backLabel="Dashboard" />

      <main className="tips-page__main">
        <header className="tips-page__header">
          <div className="tips-page__title-row">
            <h1 className="tips-page__title">
              <span aria-hidden="true">{CATEGORY_EMOJIS.wellness}</span> Health
              Tip Library
            </h1>
            {streak >= 2 && (
              <span className="daily-tip__streak" title={`${streak}-day tip streak`}>
                <span aria-hidden="true">🔥</span>
                {streak}-day streak
              </span>
            )}
          </div>
          <p className="tips-page__subtitle">
            {DAILY_TIPS.length} evidence-based tips to support your health
            journey. Save your favorites and mark tips you completed today.
          </p>
        </header>

        <section className="tips-page__filters">
          <input
            type="search"
            placeholder="Search tips..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="tips-page__search"
            aria-label="Search tips"
          />

          <div className="tips-page__filter-row">
            <button
              type="button"
              className={`tips-page__chip${activeCategory === "" ? " tips-page__chip--active" : ""}`}
              onClick={() => setActiveCategory("")}
            >
              All categories
            </button>
            {CATEGORY_ORDER.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`tips-page__chip${activeCategory === cat ? " tips-page__chip--active" : ""}`}
                onClick={() => setActiveCategory(cat)}
              >
                <span aria-hidden="true">{CATEGORY_EMOJIS[cat]}</span>{" "}
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          <div className="tips-page__filter-row tips-page__filter-row--toggles">
            <label className="tips-page__toggle">
              <input
                type="checkbox"
                checked={favoritesOnly}
                onChange={(e) => setFavoritesOnly(e.target.checked)}
              />
              <span>Favorites only</span>
            </label>

            <label className="tips-page__toggle">
              <span>Evidence:</span>
              <select
                value={evidence}
                onChange={(e) =>
                  setEvidence(e.target.value as EvidenceLevel | "any")
                }
                aria-label="Filter by evidence level"
              >
                {EVIDENCE_OPTIONS.map((ev) => (
                  <option key={ev} value={ev}>
                    {ev === "any"
                      ? "Any"
                      : ev.charAt(0).toUpperCase() + ev.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            {state.dismissed.size > 0 && (
              <button
                type="button"
                className="tips-page__chip"
                onClick={handleUndismissAll}
                disabled={busy === "undismiss-all"}
              >
                Reset {state.dismissed.size} dismissed
              </button>
            )}
          </div>

          <p className="tips-page__count">
            Showing {totalShown} of {DAILY_TIPS.length} tips
          </p>
        </section>

        {totalShown === 0 ? (
          <div className="tips-page__empty">
            {favoritesOnly ? (
              <>
                <p>You haven&apos;t saved any favorites yet.</p>
                <p>Tap the ❤️ button on a tip to save it for later.</p>
                <button
                  type="button"
                  className="tips-page__chip"
                  onClick={() => setFavoritesOnly(false)}
                >
                  Show all tips
                </button>
              </>
            ) : (
              <p>No tips match your filters. Try clearing the search.</p>
            )}
          </div>
        ) : (
          <div className="tips-page__groups">
            {grouped.map(({ category, tips }) => {
              const isCollapsed = !!collapsed[category];
              return (
                <section key={category} className="tips-page__group">
                  <button
                    type="button"
                    className="tips-page__group-header"
                    onClick={() => toggleCategory(category)}
                    aria-expanded={!isCollapsed}
                  >
                    <span aria-hidden="true">{CATEGORY_EMOJIS[category]}</span>
                    <span className="tips-page__group-title">
                      {CATEGORY_LABELS[category]}
                    </span>
                    <span className="tips-page__group-count">
                      {tips.length} tip{tips.length === 1 ? "" : "s"}
                    </span>
                    <span className="tips-page__group-caret" aria-hidden="true">
                      {isCollapsed ? "▶" : "▼"}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <ul className="tips-page__list">
                      {tips.map((tip) => {
                        const isFav = state.favorites.has(tip.id);
                        const isDone = state.completedToday.has(tip.id);
                        return (
                          <li
                            key={tip.id}
                            className={`tip-card${isFav ? " tip-card--favorited" : ""}`}
                          >
                            <div className="tip-card__body">
                              <span
                                className="tip-card__emoji"
                                aria-hidden="true"
                              >
                                {tip.emoji}
                              </span>
                              <div className="tip-card__content">
                                <p className="tip-card__text">{tip.text}</p>
                                <div className="tip-card__meta">
                                  <span className="tip-card__category">
                                    {CATEGORY_LABELS[tip.category]}
                                  </span>
                                  {tip.evidenceLevel && (
                                    <span
                                      className={`tip-card__evidence tip-card__evidence--${tip.evidenceLevel}`}
                                    >
                                      {tip.evidenceLevel} evidence
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="tip-card__actions">
                              {tip.actionable && (
                                <button
                                  type="button"
                                  className={`daily-tip__action-btn${isDone ? " daily-tip__action-btn--active" : ""}`}
                                  onClick={() => handleComplete(tip)}
                                  disabled={isDone || busy === `done-${tip.id}`}
                                  aria-pressed={isDone}
                                >
                                  <span aria-hidden="true">✓</span>
                                  {isDone ? "Done" : "Did this"}
                                </button>
                              )}
                              <button
                                type="button"
                                className={`daily-tip__action-btn${isFav ? " daily-tip__action-btn--active" : ""}`}
                                onClick={() => handleToggleFavorite(tip)}
                                disabled={busy === `fav-${tip.id}`}
                                aria-pressed={isFav}
                              >
                                <span aria-hidden="true">
                                  {isFav ? "❤️" : "🤍"}
                                </span>
                                {isFav ? "Saved" : "Save"}
                              </button>
                              <Link
                                href={`/chat?message=${encodeURIComponent("Tell me more about this health tip: " + tip.text)}`}
                                className="daily-tip__action-btn daily-tip__action-btn--link"
                              >
                                <span aria-hidden="true">💬</span>
                                Ask
                              </Link>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
