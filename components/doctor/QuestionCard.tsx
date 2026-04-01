"use client";

interface QuestionCardProps {
  question: string;
  category: "clarifying" | "follow_up" | "lifestyle" | "medication";
  priority: "high" | "medium" | "low";
}

const CATEGORY_LABELS: Record<string, string> = {
  clarifying: "Clarifying",
  follow_up: "Follow-up",
  lifestyle: "Lifestyle",
  medication: "Medication",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "High Priority",
  medium: "Medium Priority",
  low: "Low Priority",
};

export default function QuestionCard({
  question,
  category,
  priority,
}: QuestionCardProps) {
  return (
    <div className={`question-card question-card--${priority}`}>
      <div className="question-card__badges">
        <span className={`question-card__category question-card__category--${category}`}>
          {CATEGORY_LABELS[category] || category}
        </span>
        <span className={`question-card__priority question-card__priority--${priority}`}>
          {PRIORITY_LABELS[priority] || priority}
        </span>
      </div>
      <p className="question-card__text">{question}</p>
    </div>
  );
}
