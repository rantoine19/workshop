"use client";

interface ImprovementTipsProps {
  tips: string[];
}

export function ImprovementTips({ tips }: ImprovementTipsProps) {
  if (tips.length === 0) {
    return null;
  }

  return (
    <div className="db-card db-improvement-tips">
      <h3 className="db-card__title">How to Improve</h3>
      <ul className="db-improvement-tips__list">
        {tips.map((tip, i) => (
          <li key={i} className="db-improvement-tips__item">
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}
