"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";
import Link from "next/link";
import { getGlossaryEntry, type GlossaryEntry } from "@/lib/health/glossary";

interface GlossaryTermProps {
  /** The glossary term to look up (case-insensitive) */
  term: string;
  /** Display text — defaults to term if not provided */
  children?: React.ReactNode;
}

/**
 * Wraps a medical term with a tappable tooltip showing a plain-English
 * definition from the glossary.
 *
 * - Dotted underline indicates it is tappable
 * - Click/tap shows a popup with definition, category, related terms
 * - Click outside or X button to dismiss
 * - Accessible: aria-describedby, role="tooltip"
 */
export default function GlossaryTerm({ term, children }: GlossaryTermProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const entry: GlossaryEntry | null = getGlossaryEntry(term);

  // Close on click outside
  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    },
    []
  );

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    },
    []
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleClickOutside, handleKeyDown]);

  // If term is not in glossary, render plain text
  if (!entry) {
    return <span>{children ?? term}</span>;
  }

  return (
    <span className="glossary-term" ref={wrapperRef}>
      <button
        type="button"
        className="glossary-term__trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
      >
        {children ?? term}
      </button>

      {open && (
        <div
          className="glossary-tooltip"
          id={tooltipId}
          role="tooltip"
          ref={tooltipRef}
        >
          <div className="glossary-tooltip__header">
            <span className="glossary-tooltip__term">{entry.term}</span>
            <span className="glossary-tooltip__category">{entry.category}</span>
            <button
              type="button"
              className="glossary-tooltip__close"
              onClick={() => setOpen(false)}
              aria-label="Close definition"
            >
              &times;
            </button>
          </div>

          <p className="glossary-tooltip__definition">{entry.definition}</p>

          {entry.relatedTerms && entry.relatedTerms.length > 0 && (
            <div className="glossary-tooltip__related">
              <span className="glossary-tooltip__related-label">
                Related:
              </span>
              {entry.relatedTerms.map((rt) => (
                <Link
                  key={rt}
                  href={`/glossary?q=${encodeURIComponent(rt)}`}
                  className="glossary-tooltip__related-link"
                  onClick={() => setOpen(false)}
                >
                  {rt}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </span>
  );
}
