"use client";

import Link from "next/link";

interface ConcernDetail {
  name: string;
  value: string | number | null;
  flag: string;
}

interface TopConcernsProps {
  concerns: ConcernDetail[];
}

export function TopConcerns({ concerns }: TopConcernsProps) {
  if (concerns.length === 0) {
    return (
      <div className="db-card">
        <h3 className="db-card__title">Top Concerns</h3>
        <p className="db-card__empty">All biomarkers normal</p>
      </div>
    );
  }

  return (
    <div className="db-card">
      <h3 className="db-card__title">Top Concerns</h3>
      <ul className="db-concerns__list">
        {concerns.map((c) => (
          <li key={c.name} className="db-concerns__item">
            <span
              className={`db-concerns__dot db-concerns__dot--${c.flag}`}
              aria-label={c.flag === "red" ? "Needs attention" : "Borderline"}
            />
            <span className="db-concerns__name">{c.name}</span>
            {c.value != null && (
              <span className="db-concerns__value">{c.value}</span>
            )}
          </li>
        ))}
      </ul>
      <Link href="/chat" className="db-card__link">
        Chat about these &rarr;
      </Link>
    </div>
  );
}
