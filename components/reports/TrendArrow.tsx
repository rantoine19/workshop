"use client";

type TrendDirection = "improving" | "worsening" | "stable";

interface TrendArrowProps {
  trend: TrendDirection;
  size?: number;
}

const TREND_CONFIG: Record<
  TrendDirection,
  { label: string; className: string; path: string }
> = {
  improving: {
    label: "Improving",
    className: "trend-arrow trend-arrow--improving",
    // Up arrow
    path: "M12 4l-6 8h4v4h4v-4h4z",
  },
  worsening: {
    label: "Needs attention",
    className: "trend-arrow trend-arrow--worsening",
    // Down arrow
    path: "M12 20l6-8h-4V8h-4v4H6z",
  },
  stable: {
    label: "Stable",
    className: "trend-arrow trend-arrow--stable",
    // Right arrow
    path: "M4 12h12l-4-4m4 4l-4 4",
  },
};

export default function TrendArrow({ trend, size = 18 }: TrendArrowProps) {
  const config = TREND_CONFIG[trend];

  if (trend === "stable") {
    // Use a line-based arrow for stable
    return (
      <span className={config.className} aria-label={config.label} role="img">
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={config.path} />
        </svg>
      </span>
    );
  }

  return (
    <span className={config.className} aria-label={config.label} role="img">
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="currentColor"
      >
        <path d={config.path} />
      </svg>
    </span>
  );
}
