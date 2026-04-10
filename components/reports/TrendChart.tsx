"use client";

import { useState, useMemo } from "react";
import TrendArrow from "./TrendArrow";

interface TrendDataPoint {
  date: string;
  value: number;
  flag: string;
  reportName: string;
}

export interface TrendChartProps {
  biomarkerName: string;
  dataPoints: TrendDataPoint[];
  referenceRange?: {
    greenLow?: number | null;
    greenHigh?: number | null;
    yellowLow?: number | null;
    yellowHigh?: number | null;
  };
  unit?: string;
  trend?: "improving" | "worsening" | "stable";
}

/** Format date as "Mar 15" */
function formatAxisDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Chart layout constants */
const PADDING = { top: 20, right: 20, bottom: 32, left: 48 };
const CHART_HEIGHT = 180;
const SVG_WIDTH = 400; // viewBox width, responsive via CSS
const PLOT_WIDTH = SVG_WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom;

export default function TrendChart({
  biomarkerName,
  dataPoints,
  referenceRange,
  unit,
  trend,
}: TrendChartProps) {
  const [activePoint, setActivePoint] = useState<number | null>(null);

  // Calculate Y domain from data + reference ranges
  const { yMin, yMax, xScale, yScale } = useMemo(() => {
    const values = dataPoints.map((d) => d.value);
    let lo = Math.min(...values);
    let hi = Math.max(...values);

    // Expand domain to include reference range bands
    if (referenceRange) {
      if (referenceRange.greenLow != null) lo = Math.min(lo, referenceRange.greenLow);
      if (referenceRange.greenHigh != null) hi = Math.max(hi, referenceRange.greenHigh);
      if (referenceRange.yellowLow != null) lo = Math.min(lo, referenceRange.yellowLow);
      if (referenceRange.yellowHigh != null) hi = Math.max(hi, referenceRange.yellowHigh);
    }

    // Add 10% padding to Y domain
    const range = hi - lo || 1;
    lo = lo - range * 0.1;
    hi = hi + range * 0.1;

    const xS = (i: number) =>
      dataPoints.length === 1
        ? PLOT_WIDTH / 2
        : (i / (dataPoints.length - 1)) * PLOT_WIDTH;

    const yS = (v: number) =>
      PLOT_HEIGHT - ((v - lo) / (hi - lo)) * PLOT_HEIGHT;

    return { yMin: lo, yMax: hi, xScale: xS, yScale: yS };
  }, [dataPoints, referenceRange]);

  if (dataPoints.length < 2) {
    return (
      <div className="trend-chart trend-chart--empty">
        <h3 className="trend-chart__title">{biomarkerName}</h3>
        <p className="trend-chart__empty-msg">
          Upload more reports to see trends
        </p>
      </div>
    );
  }

  // Build line path
  const linePath = dataPoints
    .map((d, i) => {
      const x = PADDING.left + xScale(i);
      const y = PADDING.top + yScale(d.value);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  // Reference range band helpers
  const bandRect = (low: number | null | undefined, high: number | null | undefined) => {
    const bandLow = low != null ? Math.max(low, yMin) : yMin;
    const bandHigh = high != null ? Math.min(high, yMax) : yMax;
    if (bandLow >= bandHigh) return null;
    const y1 = PADDING.top + yScale(bandHigh);
    const y2 = PADDING.top + yScale(bandLow);
    return {
      x: PADDING.left,
      y: y1,
      width: PLOT_WIDTH,
      height: y2 - y1,
    };
  };

  const greenBand = bandRect(referenceRange?.greenLow, referenceRange?.greenHigh);
  const yellowBand = bandRect(referenceRange?.yellowLow, referenceRange?.yellowHigh);

  // Y-axis ticks (4-5 ticks)
  const yRange = yMax - yMin;
  const tickStep = yRange / 4;
  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + i * tickStep);

  const flagColor = (flag: string) => {
    switch (flag) {
      case "green": return "var(--color-green, #16a34a)";
      case "yellow": return "var(--color-yellow, #f59e0b)";
      case "red": return "var(--color-red, #dc2626)";
      default: return "var(--color-green, #16a34a)";
    }
  };

  return (
    <div className="trend-chart">
      <div className="trend-chart__header">
        <h3 className="trend-chart__title">{biomarkerName}</h3>
        {trend && <TrendArrow trend={trend} size={16} />}
        {unit && <span className="trend-chart__unit">({unit})</span>}
      </div>

      <div className="trend-chart__container">
        <svg
          className="trend-chart__svg"
          viewBox={`0 0 ${SVG_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Trend chart for ${biomarkerName} showing ${dataPoints.length} data points`}
        >
          {/* Reference range bands */}
          {yellowBand && (
            <rect
              className="trend-chart__band trend-chart__band--yellow"
              {...yellowBand}
            />
          )}
          {greenBand && (
            <rect
              className="trend-chart__band trend-chart__band--green"
              {...greenBand}
            />
          )}

          {/* Y-axis gridlines and labels */}
          {yTicks.map((tick, i) => {
            const y = PADDING.top + yScale(tick);
            const label =
              Math.abs(tick) >= 1000
                ? tick.toFixed(0)
                : tick < 1
                  ? tick.toFixed(2)
                  : tick.toFixed(1);
            return (
              <g key={i}>
                <line
                  className="trend-chart__gridline"
                  x1={PADDING.left}
                  y1={y}
                  x2={PADDING.left + PLOT_WIDTH}
                  y2={y}
                />
                <text className="trend-chart__axis-label" x={PADDING.left - 6} y={y + 3} textAnchor="end">
                  {label}
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {dataPoints.map((d, i) => {
            // Only show first, last, and middle labels for space
            if (dataPoints.length > 4 && i > 0 && i < dataPoints.length - 1) {
              const mid = Math.floor(dataPoints.length / 2);
              if (i !== mid) return null;
            }
            const x = PADDING.left + xScale(i);
            return (
              <text
                key={i}
                className="trend-chart__axis-label"
                x={x}
                y={CHART_HEIGHT - 4}
                textAnchor="middle"
              >
                {formatAxisDate(d.date)}
              </text>
            );
          })}

          {/* Data line */}
          <path className="trend-chart__line" d={linePath} />

          {/* Data points (clickable) */}
          {dataPoints.map((d, i) => {
            const cx = PADDING.left + xScale(i);
            const cy = PADDING.top + yScale(d.value);
            return (
              <circle
                key={i}
                className={`trend-chart__point trend-chart__point--${d.flag}`}
                cx={cx}
                cy={cy}
                r={activePoint === i ? 6 : 4}
                fill={flagColor(d.flag)}
                onMouseEnter={() => setActivePoint(i)}
                onMouseLeave={() => setActivePoint(null)}
                onClick={() => setActivePoint(activePoint === i ? null : i)}
                role="button"
                tabIndex={0}
                aria-label={`${d.value} ${unit || ""} on ${formatAxisDate(d.date)}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setActivePoint(activePoint === i ? null : i);
                  }
                }}
              />
            );
          })}

          {/* Tooltip */}
          {activePoint !== null && dataPoints[activePoint] && (() => {
            const d = dataPoints[activePoint];
            const cx = PADDING.left + xScale(activePoint);
            const cy = PADDING.top + yScale(d.value);
            const tooltipX = cx > SVG_WIDTH / 2 ? cx - 120 : cx + 10;
            const tooltipY = cy < 50 ? cy + 15 : cy - 45;
            return (
              <g className="trend-chart__tooltip">
                <rect
                  x={tooltipX}
                  y={tooltipY}
                  width={110}
                  height={38}
                  rx={4}
                />
                <text x={tooltipX + 6} y={tooltipY + 15}>
                  {d.value} {unit || ""}
                </text>
                <text x={tooltipX + 6} y={tooltipY + 29} className="trend-chart__tooltip-date">
                  {formatAxisDate(d.date)}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}
