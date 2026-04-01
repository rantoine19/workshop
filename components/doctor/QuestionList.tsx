"use client";

import QuestionCard from "./QuestionCard";

interface Question {
  id?: string;
  question: string;
  category: "clarifying" | "follow_up" | "lifestyle" | "medication";
  priority: "high" | "medium" | "low";
}

interface QuestionListProps {
  questions: Question[];
}

const CATEGORY_ORDER = ["clarifying", "follow_up", "lifestyle", "medication"] as const;

const CATEGORY_TITLES: Record<string, string> = {
  clarifying: "Clarifying Questions",
  follow_up: "Follow-up Questions",
  lifestyle: "Lifestyle Questions",
  medication: "Medication Questions",
};

export default function QuestionList({ questions }: QuestionListProps) {
  // Group questions by category
  const grouped = CATEGORY_ORDER.reduce(
    (acc, category) => {
      const matching = questions.filter((q) => q.category === category);
      if (matching.length > 0) {
        acc[category] = matching;
      }
      return acc;
    },
    {} as Record<string, Question[]>
  );

  const categories = Object.keys(grouped);

  if (categories.length === 0) {
    return (
      <div className="question-list question-list--empty">
        <p>No questions were generated for this report.</p>
      </div>
    );
  }

  return (
    <div className="question-list">
      {CATEGORY_ORDER.filter((cat) => grouped[cat]).map((category) => (
        <div key={category} className="question-list__group">
          <h3 className="question-list__group-title">
            {CATEGORY_TITLES[category]}
          </h3>
          <div className="question-list__cards">
            {grouped[category].map((q, index) => (
              <QuestionCard
                key={q.id || `${category}-${index}`}
                question={q.question}
                category={q.category}
                priority={q.priority}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
