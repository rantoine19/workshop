"use client";

import { useEffect, useState, useCallback } from "react";

interface RiskFlagData {
  id: string;
  biomarker_name: string;
  value: number;
  reference_low: number | null;
  reference_high: number | null;
  flag: "green" | "yellow" | "red";
  trend: string;
}

interface RiskSummary {
  total: number;
  green: number;
  yellow: number;
  red: number;
}

interface RiskDashboardProps {
  reportId: string;
}

const FLAG_LABELS: Record<string, string> = {
  green: "Normal",
  yellow: "Borderline",
  red: "Needs Attention",
};

const FLAG_ICONS: Record<string, string> = {
  green: "\u2705",
  yellow: "\u26a0\ufe0f",
  red: "\ud83d\udea8",
};

export default function RiskDashboard({ reportId }: RiskDashboardProps) {
  const [riskFlags, setRiskFlags] = useState<RiskFlagData[]>([]);
  const [summary, setSummary] = useState<RiskSummary | null>(null);
  const [disclaimer, setDisclaimer] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchRiskFlags = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/risk-flags?report_id=${reportId}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to load risk flags");
      }

      const data = await response.json();
      setRiskFlags(data.risk_flags);
      setSummary(data.summary);
      setDisclaimer(data.disclaimer);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load risk flags"
      );
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchRiskFlags();
  }, [fetchRiskFlags]);

  if (loading) {
    return (
      <div className="risk-dashboard risk-dashboard--loading">
        <div
          className="risk-dashboard__spinner"
          aria-label="Loading risk flags"
          role="status"
        />
        <p>Analyzing your results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="risk-dashboard risk-dashboard--error">
        <p className="risk-dashboard__error">{error}</p>
        <button onClick={fetchRiskFlags} className="risk-dashboard__retry">
          Try Again
        </button>
      </div>
    );
  }

  if (riskFlags.length === 0) {
    return (
      <div className="risk-dashboard risk-dashboard--empty">
        <p>No risk flags available for this report.</p>
      </div>
    );
  }

  // Sort: red first, then yellow, then green
  const sortedFlags = [...riskFlags].sort((a, b) => {
    const order = { red: 0, yellow: 1, green: 2 };
    return order[a.flag] - order[b.flag];
  });

  /** What this biomarker measures — plain language explanation */
  function getDescription(name: string): string {
    const desc: Record<string, string> = {
      "Total Cholesterol": "A waxy substance in your blood. Your body needs it to build cells, but too much can clog arteries.",
      "LDL Cholesterol": "Often called 'bad' cholesterol. High levels can build up in your arteries and increase heart disease risk.",
      "HDL Cholesterol": "The 'good' cholesterol. It helps remove other forms of cholesterol from your bloodstream.",
      "Triglycerides": "A type of fat in your blood. High levels can raise your risk for heart disease.",
      "Glucose (Fasting)": "Your blood sugar level after not eating. High levels may indicate diabetes or pre-diabetes.",
      "A1C": "Shows your average blood sugar over the past 2-3 months. Used to diagnose and monitor diabetes.",
      "Hemoglobin A1C": "Shows your average blood sugar over the past 2-3 months. Used to diagnose and monitor diabetes.",
      "Blood Pressure Systolic": "The pressure in your arteries when your heart beats. High levels strain your heart and blood vessels.",
      "Blood Pressure Diastolic": "The pressure in your arteries between heartbeats. High levels increase risk of heart disease and stroke.",
      "Resting Heart Rate": "How many times your heart beats per minute at rest. A lower rate usually means better heart fitness.",
      "Hemoglobin": "A protein in red blood cells that carries oxygen. Low levels may mean anemia.",
      "Hematocrit": "The percentage of your blood that is red blood cells. Helps detect anemia or dehydration.",
      "White Blood Cell Count": "Your immune system's defenders. High or low counts can signal infection or immune issues.",
      "Platelet Count": "Cells that help your blood clot. Too few can cause bleeding; too many can cause clots.",
      "Creatinine": "A waste product filtered by your kidneys. High levels may mean your kidneys aren't working well.",
      "BUN": "Blood urea nitrogen — another measure of kidney function. High levels can indicate kidney problems.",
      "Sodium": "An electrolyte that helps control fluid balance and nerve function.",
      "Potassium": "An electrolyte critical for heart rhythm and muscle function.",
      "Calcium": "Important for bones, heart, muscles, and nerves.",
      "TSH": "Thyroid-stimulating hormone. Controls your metabolism. Abnormal levels indicate thyroid issues.",
      "ALT": "A liver enzyme. High levels can indicate liver damage or disease.",
      "AST": "A liver enzyme. Elevated levels may suggest liver, heart, or muscle problems.",
      "Vitamin D": "Essential for bone health and immune function. Many people are deficient.",
      "Vitamin B12": "Important for nerve function and making red blood cells. Low levels cause fatigue.",
      "Iron": "Needed to carry oxygen in your blood. Low iron causes anemia and fatigue.",
      "Uric Acid": "A waste product. High levels can cause gout and kidney stones.",
    };
    return desc[name] || "A health marker measured in your lab work.";
  }

  /** What the specific value means for this person */
  function getValueMeaning(flag: RiskFlagData): string {
    const val = Number(flag.value);
    const goalText = getGoalText(flag);

    if (flag.flag === "green") {
      return `Your result of ${val} is in the healthy range${goalText ? ` (goal: ${goalText})` : ""}. Great job — keep doing what you're doing!`;
    }
    if (flag.flag === "yellow") {
      return `Your result of ${val} is borderline${goalText ? ` — the healthy range is ${goalText}` : ""}. This is worth mentioning to your doctor at your next visit.`;
    }
    return `Your result of ${val} is outside the healthy range${goalText ? ` (goal: ${goalText})` : ""}. Talk to your doctor about this — they can help you make a plan.`;
  }

  function getGoalText(flag: RiskFlagData): string {
    if (flag.reference_low != null && flag.reference_high != null) {
      return `${flag.reference_low}-${flag.reference_high}`;
    }
    if (flag.reference_high != null) {
      return `below ${flag.reference_high}`;
    }
    if (flag.reference_low != null) {
      return `above ${flag.reference_low}`;
    }
    return "";
  }

  return (
    <div className="risk-dashboard">
      {disclaimer && (
        <div className="risk-dashboard__disclaimer" role="alert">
          {disclaimer}
        </div>
      )}

      {summary && (
        <div className="risk-dashboard__summary">
          <h2>Risk Overview</h2>
          <div className="risk-dashboard__counts">
            <div className="risk-dashboard__count risk-dashboard__count--green">
              <span className="risk-dashboard__count-number">
                {summary.green}
              </span>
              <span className="risk-dashboard__count-label">Normal</span>
            </div>
            <div className="risk-dashboard__count risk-dashboard__count--yellow">
              <span className="risk-dashboard__count-number">
                {summary.yellow}
              </span>
              <span className="risk-dashboard__count-label">Borderline</span>
            </div>
            <div className="risk-dashboard__count risk-dashboard__count--red">
              <span className="risk-dashboard__count-number">
                {summary.red}
              </span>
              <span className="risk-dashboard__count-label">
                Needs Attention
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="risk-dashboard__flags">
        <h2>Your Results</h2>
        <div className="risk-card-grid">
          {sortedFlags.map((flag) => {
            const isExpanded = expandedId === flag.id;
            return (
              <button
                key={flag.id}
                className={`risk-card risk-card--${flag.flag}${isExpanded ? " risk-card--expanded" : ""}`}
                onClick={() => setExpandedId(isExpanded ? null : flag.id)}
                aria-expanded={isExpanded}
              >
                <div className="risk-card__header">
                  <div className="risk-card__title-row">
                    <span className="risk-card__name">{flag.biomarker_name}</span>
                    <span className={`risk-card__badge risk-card__badge--${flag.flag}`}>
                      {FLAG_LABELS[flag.flag]}
                    </span>
                  </div>
                  <div className="risk-card__value-row">
                    <span className={`risk-card__value risk-card__value--${flag.flag}`}>
                      {Number(flag.value).toLocaleString()}
                    </span>
                    {getGoalText(flag) && (
                      <span className="risk-card__goal">
                        Goal: {getGoalText(flag)}
                      </span>
                    )}
                  </div>
                </div>
                <p className="risk-card__description">
                  {getDescription(flag.biomarker_name)}
                </p>
                {isExpanded && (
                  <div className="risk-card__details">
                    <p className="risk-card__meaning">
                      {getValueMeaning(flag)}
                    </p>
                  </div>
                )}
                <span className="risk-card__expand-hint">
                  {isExpanded ? "Show less" : "What does this mean?"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
