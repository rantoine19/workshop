"use client";

interface RiskIndicatorProps {
  flag: "green" | "yellow" | "red";
  biomarkerName: string;
  value: number;
  unit?: string;
  size?: "sm" | "md" | "lg";
}

const FLAG_LABELS: Record<string, string> = {
  green: "Normal",
  yellow: "Borderline",
  red: "Needs Attention",
};

export default function RiskIndicator({
  flag,
  biomarkerName,
  value,
  unit,
  size = "md",
}: RiskIndicatorProps) {
  return (
    <div
      className={`risk-indicator risk-indicator--${flag} risk-indicator--${size}`}
      role="status"
      aria-label={`${biomarkerName}: ${FLAG_LABELS[flag]}`}
    >
      <div className={`risk-indicator__dot risk-indicator__dot--${flag}`} />
      <div className="risk-indicator__info">
        <span className="risk-indicator__name">{biomarkerName}</span>
        <span className="risk-indicator__value">
          {value}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <span
        className={`risk-indicator__badge risk-indicator__badge--${flag}`}
      >
        {FLAG_LABELS[flag]}
      </span>
    </div>
  );
}
