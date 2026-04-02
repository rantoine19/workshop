/**
 * Server-side reference ranges for biomarker risk flagging.
 *
 * Sources: AHA, ADA, ACC/AHA, WHO, and standard clinical laboratory ranges.
 * These ranges are used to deterministically flag biomarker values instead
 * of relying on Claude's judgment (fixes #87).
 */

export type RiskFlag = "green" | "yellow" | "red";

export interface RangeThreshold {
  low: number | null;
  high: number | null;
}

export interface ReferenceRange {
  /** Canonical display name */
  name: string;
  /** Lowercase aliases for fuzzy matching */
  aliases: string[];
  /** Expected unit of measurement */
  unit: string;
  /** Risk thresholds — value is green/yellow/red based on direction logic */
  ranges: {
    green: RangeThreshold;
    yellow: RangeThreshold;
    red: RangeThreshold;
  };
  /**
   * How to interpret values:
   * - "lower-is-better": lower values are healthier (e.g., LDL cholesterol)
   * - "higher-is-better": higher values are healthier (e.g., HDL cholesterol)
   * - "range": a specific band is normal; too high or too low is bad
   */
  direction: "lower-is-better" | "higher-is-better" | "range";
  /** Gender-specific range; undefined means applies to all */
  gender?: "male" | "female";
  /** Guideline source */
  source: string;
}

// ---------------------------------------------------------------------------
// Cardiovascular & metabolic biomarkers (from user-provided chart)
// ---------------------------------------------------------------------------

const CARDIOVASCULAR_RANGES: ReferenceRange[] = [
  {
    name: "Blood Pressure Systolic",
    aliases: [
      "blood pressure systolic",
      "systolic blood pressure",
      "systolic bp",
      "systolic",
      "sbp",
      "bp systolic",
    ],
    unit: "mmHg",
    ranges: {
      green: { low: null, high: 119 },
      yellow: { low: 120, high: 139 },
      red: { low: 140, high: null },
    },
    direction: "lower-is-better",
    source: "AHA",
  },
  {
    name: "Blood Pressure Diastolic",
    aliases: [
      "blood pressure diastolic",
      "diastolic blood pressure",
      "diastolic bp",
      "diastolic",
      "dbp",
      "bp diastolic",
    ],
    unit: "mmHg",
    ranges: {
      green: { low: null, high: 79 },
      yellow: { low: 80, high: 89 },
      red: { low: 90, high: null },
    },
    direction: "lower-is-better",
    source: "AHA",
  },
  {
    name: "Total Cholesterol",
    aliases: [
      "total cholesterol",
      "cholesterol total",
      "cholesterol",
      "tc",
      "total chol",
    ],
    unit: "mg/dL",
    ranges: {
      green: { low: null, high: 199 },
      yellow: { low: 200, high: 239 },
      red: { low: 240, high: null },
    },
    direction: "lower-is-better",
    source: "ACC/AHA",
  },
  {
    name: "Triglycerides",
    aliases: [
      "triglycerides",
      "triglyceride",
      "trigs",
      "trig",
      "tg",
    ],
    unit: "mg/dL",
    ranges: {
      green: { low: null, high: 149 },
      yellow: { low: 150, high: 199 },
      red: { low: 200, high: null },
    },
    direction: "lower-is-better",
    source: "ACC/AHA",
  },
  // HDL — male
  {
    name: "HDL Cholesterol",
    aliases: [
      "hdl cholesterol",
      "hdl",
      "hdl-c",
      "high density lipoprotein",
      "hdl chol",
    ],
    unit: "mg/dL",
    ranges: {
      green: { low: 61, high: null },
      yellow: { low: 40, high: 60 },
      red: { low: null, high: 39 },
    },
    direction: "higher-is-better",
    gender: "male",
    source: "AHA",
  },
  // HDL — female
  {
    name: "HDL Cholesterol",
    aliases: [
      "hdl cholesterol",
      "hdl",
      "hdl-c",
      "high density lipoprotein",
      "hdl chol",
    ],
    unit: "mg/dL",
    ranges: {
      green: { low: 61, high: null },
      yellow: { low: 50, high: 60 },
      red: { low: null, high: 49 },
    },
    direction: "higher-is-better",
    gender: "female",
    source: "AHA",
  },
  {
    name: "LDL Cholesterol",
    aliases: [
      "ldl cholesterol",
      "ldl",
      "ldl-c",
      "low density lipoprotein",
      "ldl chol",
    ],
    unit: "mg/dL",
    ranges: {
      green: { low: null, high: 99 },
      yellow: { low: 100, high: 129 },
      red: { low: 130, high: null },
    },
    direction: "lower-is-better",
    source: "ACC/AHA",
  },
  {
    name: "Cholesterol/HDL Ratio",
    aliases: [
      "cholesterol/hdl ratio",
      "chol/hdl ratio",
      "cholesterol hdl ratio",
      "tc/hdl ratio",
      "total cholesterol/hdl",
      "chol hdl ratio",
    ],
    unit: "ratio",
    ranges: {
      green: { low: null, high: 4.9 },
      yellow: { low: 5.0, high: 5.9 },
      red: { low: 6.0, high: null },
    },
    direction: "lower-is-better",
    source: "AHA",
  },
  {
    name: "Resting Heart Rate",
    aliases: [
      "resting heart rate",
      "heart rate",
      "pulse",
      "rhr",
      "hr",
      "pulse rate",
    ],
    unit: "bpm",
    ranges: {
      green: { low: 60, high: 100 },
      yellow: { low: 101, high: 180 },
      red: { low: 181, high: null },
    },
    direction: "range",
    source: "AHA",
  },
];

// ---------------------------------------------------------------------------
// Glucose & diabetes markers
// ---------------------------------------------------------------------------

const GLUCOSE_RANGES: ReferenceRange[] = [
  {
    name: "Glucose (Fasting)",
    aliases: [
      "glucose",
      "fasting glucose",
      "blood glucose",
      "blood sugar",
      "fbs",
      "fasting blood sugar",
      "fasting blood glucose",
      "fbg",
      "glucose fasting",
      "serum glucose",
      "plasma glucose",
    ],
    unit: "mg/dL",
    ranges: {
      green: { low: null, high: 99 },
      yellow: { low: 100, high: 125 },
      red: { low: 126, high: null },
    },
    direction: "lower-is-better",
    source: "ADA",
  },
  {
    name: "Hemoglobin A1C",
    aliases: [
      "a1c",
      "hba1c",
      "hemoglobin a1c",
      "glycated hemoglobin",
      "glycosylated hemoglobin",
      "hb a1c",
      "ha1c",
    ],
    unit: "%",
    ranges: {
      green: { low: null, high: 5.6 },
      yellow: { low: 5.7, high: 6.4 },
      red: { low: 6.5, high: null },
    },
    direction: "lower-is-better",
    source: "ADA",
  },
];

// ---------------------------------------------------------------------------
// Complete blood count (CBC)
// ---------------------------------------------------------------------------

const CBC_RANGES: ReferenceRange[] = [
  // Hemoglobin — male
  {
    name: "Hemoglobin",
    aliases: ["hemoglobin", "hgb", "hb"],
    unit: "g/dL",
    ranges: {
      green: { low: 13.5, high: 17.5 },
      yellow: { low: 12.0, high: 18.5 },
      red: { low: null, high: null },
    },
    direction: "range",
    gender: "male",
    source: "WHO",
  },
  // Hemoglobin — female
  {
    name: "Hemoglobin",
    aliases: ["hemoglobin", "hgb", "hb"],
    unit: "g/dL",
    ranges: {
      green: { low: 12.0, high: 16.0 },
      yellow: { low: 10.5, high: 17.0 },
      red: { low: null, high: null },
    },
    direction: "range",
    gender: "female",
    source: "WHO",
  },
  // Hematocrit — male
  {
    name: "Hematocrit",
    aliases: ["hematocrit", "hct", "packed cell volume", "pcv"],
    unit: "%",
    ranges: {
      green: { low: 38.3, high: 48.6 },
      yellow: { low: 35.0, high: 52.0 },
      red: { low: null, high: null },
    },
    direction: "range",
    gender: "male",
    source: "WHO",
  },
  // Hematocrit — female
  {
    name: "Hematocrit",
    aliases: ["hematocrit", "hct", "packed cell volume", "pcv"],
    unit: "%",
    ranges: {
      green: { low: 35.5, high: 44.9 },
      yellow: { low: 32.0, high: 48.0 },
      red: { low: null, high: null },
    },
    direction: "range",
    gender: "female",
    source: "WHO",
  },
  {
    name: "White Blood Cell Count",
    aliases: [
      "white blood cell count",
      "wbc",
      "white blood cells",
      "white cell count",
      "leukocytes",
      "leukocyte count",
    ],
    unit: "/mcL",
    ranges: {
      green: { low: 4500, high: 11000 },
      yellow: { low: 3500, high: 13000 },
      red: { low: null, high: null },
    },
    direction: "range",
    source: "WHO",
  },
  {
    name: "Platelet Count",
    aliases: [
      "platelet count",
      "platelets",
      "plt",
      "thrombocytes",
      "thrombocyte count",
    ],
    unit: "/mcL",
    ranges: {
      green: { low: 150000, high: 400000 },
      yellow: { low: 120000, high: 450000 },
      red: { low: null, high: null },
    },
    direction: "range",
    source: "WHO",
  },
];

// ---------------------------------------------------------------------------
// Kidney function
// ---------------------------------------------------------------------------

const KIDNEY_RANGES: ReferenceRange[] = [
  // Creatinine — male
  {
    name: "Creatinine",
    aliases: ["creatinine", "creat", "serum creatinine", "cr"],
    unit: "mg/dL",
    ranges: {
      green: { low: 0.7, high: 1.3 },
      yellow: { low: 0.5, high: 1.6 },
      red: { low: null, high: null },
    },
    direction: "range",
    gender: "male",
    source: "AHA",
  },
  // Creatinine — female
  {
    name: "Creatinine",
    aliases: ["creatinine", "creat", "serum creatinine", "cr"],
    unit: "mg/dL",
    ranges: {
      green: { low: 0.6, high: 1.1 },
      yellow: { low: 0.4, high: 1.4 },
      red: { low: null, high: null },
    },
    direction: "range",
    gender: "female",
    source: "AHA",
  },
  {
    name: "BUN",
    aliases: [
      "bun",
      "blood urea nitrogen",
      "urea nitrogen",
      "urea",
    ],
    unit: "mg/dL",
    ranges: {
      green: { low: 7, high: 20 },
      yellow: { low: 5, high: 25 },
      red: { low: null, high: null },
    },
    direction: "range",
    source: "AHA",
  },
];

// ---------------------------------------------------------------------------
// Electrolytes
// ---------------------------------------------------------------------------

const ELECTROLYTE_RANGES: ReferenceRange[] = [
  {
    name: "Sodium",
    aliases: ["sodium", "na", "na+", "serum sodium"],
    unit: "mEq/L",
    ranges: {
      green: { low: 136, high: 145 },
      yellow: { low: 130, high: 150 },
      red: { low: null, high: null },
    },
    direction: "range",
    source: "AHA",
  },
  {
    name: "Potassium",
    aliases: ["potassium", "k", "k+", "serum potassium"],
    unit: "mEq/L",
    ranges: {
      green: { low: 3.5, high: 5.0 },
      yellow: { low: 3.0, high: 5.5 },
      red: { low: null, high: null },
    },
    direction: "range",
    source: "AHA",
  },
  {
    name: "Calcium",
    aliases: ["calcium", "ca", "ca2+", "serum calcium", "total calcium"],
    unit: "mg/dL",
    ranges: {
      green: { low: 8.5, high: 10.5 },
      yellow: { low: 7.5, high: 11.5 },
      red: { low: null, high: null },
    },
    direction: "range",
    source: "AHA",
  },
];

// ---------------------------------------------------------------------------
// Thyroid
// ---------------------------------------------------------------------------

const THYROID_RANGES: ReferenceRange[] = [
  {
    name: "TSH",
    aliases: [
      "tsh",
      "thyroid stimulating hormone",
      "thyrotropin",
      "thyroid-stimulating hormone",
    ],
    unit: "mIU/L",
    ranges: {
      green: { low: 0.4, high: 4.0 },
      yellow: { low: 0.2, high: 6.0 },
      red: { low: null, high: null },
    },
    direction: "range",
    source: "AHA",
  },
];

// ---------------------------------------------------------------------------
// Liver function
// ---------------------------------------------------------------------------

const LIVER_RANGES: ReferenceRange[] = [
  {
    name: "ALT",
    aliases: [
      "alt",
      "alanine aminotransferase",
      "sgpt",
      "alanine transaminase",
    ],
    unit: "U/L",
    ranges: {
      green: { low: 7, high: 56 },
      yellow: { low: 4, high: 70 },
      red: { low: null, high: null },
    },
    direction: "range",
    source: "AHA",
  },
  {
    name: "AST",
    aliases: [
      "ast",
      "aspartate aminotransferase",
      "sgot",
      "aspartate transaminase",
    ],
    unit: "U/L",
    ranges: {
      green: { low: 10, high: 40 },
      yellow: { low: 6, high: 55 },
      red: { low: null, high: null },
    },
    direction: "range",
    source: "AHA",
  },
  {
    name: "Alkaline Phosphatase",
    aliases: [
      "alkaline phosphatase",
      "alp",
      "alk phos",
      "alkp",
    ],
    unit: "U/L",
    ranges: {
      green: { low: 44, high: 147 },
      yellow: { low: 30, high: 170 },
      red: { low: null, high: null },
    },
    direction: "range",
    source: "AHA",
  },
  {
    name: "Bilirubin Total",
    aliases: [
      "bilirubin total",
      "bilirubin",
      "total bilirubin",
      "tbili",
      "t. bilirubin",
    ],
    unit: "mg/dL",
    ranges: {
      green: { low: 0.1, high: 1.2 },
      yellow: { low: 0.0, high: 1.8 },
      red: { low: null, high: null },
    },
    direction: "range",
    source: "AHA",
  },
  {
    name: "Albumin",
    aliases: ["albumin", "alb", "serum albumin"],
    unit: "g/dL",
    ranges: {
      green: { low: 3.5, high: 5.0 },
      yellow: { low: 3.0, high: 5.5 },
      red: { low: null, high: null },
    },
    direction: "range",
    source: "AHA",
  },
];

// ---------------------------------------------------------------------------
// Vitamins & minerals
// ---------------------------------------------------------------------------

const VITAMIN_RANGES: ReferenceRange[] = [
  {
    name: "Vitamin D",
    aliases: [
      "vitamin d",
      "vit d",
      "25-hydroxyvitamin d",
      "25-oh vitamin d",
      "25(oh)d",
      "calcidiol",
    ],
    unit: "ng/mL",
    ranges: {
      green: { low: 30, high: 100 },
      yellow: { low: 20, high: 120 },
      red: { low: null, high: null },
    },
    direction: "range",
    source: "WHO",
  },
  {
    name: "Vitamin B12",
    aliases: [
      "vitamin b12",
      "vit b12",
      "b12",
      "cobalamin",
    ],
    unit: "pg/mL",
    ranges: {
      green: { low: 200, high: 900 },
      yellow: { low: 150, high: 1000 },
      red: { low: null, high: null },
    },
    direction: "range",
    source: "WHO",
  },
  // Iron — male
  {
    name: "Iron",
    aliases: ["iron", "serum iron", "fe"],
    unit: "mcg/dL",
    ranges: {
      green: { low: 65, high: 175 },
      yellow: { low: 50, high: 200 },
      red: { low: null, high: null },
    },
    direction: "range",
    gender: "male",
    source: "WHO",
  },
  // Iron — female
  {
    name: "Iron",
    aliases: ["iron", "serum iron", "fe"],
    unit: "mcg/dL",
    ranges: {
      green: { low: 50, high: 170 },
      yellow: { low: 35, high: 200 },
      red: { low: null, high: null },
    },
    direction: "range",
    gender: "female",
    source: "WHO",
  },
];

// ---------------------------------------------------------------------------
// Uric acid
// ---------------------------------------------------------------------------

const URIC_ACID_RANGES: ReferenceRange[] = [
  // Uric acid — male
  {
    name: "Uric Acid",
    aliases: ["uric acid", "urate", "serum uric acid"],
    unit: "mg/dL",
    ranges: {
      green: { low: 3.4, high: 7.0 },
      yellow: { low: 2.5, high: 8.0 },
      red: { low: null, high: null },
    },
    direction: "range",
    gender: "male",
    source: "AHA",
  },
  // Uric acid — female
  {
    name: "Uric Acid",
    aliases: ["uric acid", "urate", "serum uric acid"],
    unit: "mg/dL",
    ranges: {
      green: { low: 2.4, high: 6.0 },
      yellow: { low: 1.8, high: 7.0 },
      red: { low: null, high: null },
    },
    direction: "range",
    gender: "female",
    source: "AHA",
  },
];

// ---------------------------------------------------------------------------
// BMI (body composition, used by calculated-metrics)
// ---------------------------------------------------------------------------

const BMI_RANGES: ReferenceRange[] = [
  {
    name: "BMI",
    aliases: ["bmi", "body mass index"],
    unit: "kg/m2",
    ranges: {
      green: { low: 18.5, high: 24.9 },
      yellow: { low: 25.0, high: 29.9 },
      red: { low: 30.0, high: null },
    },
    direction: "range",
    source: "WHO",
  },
];

// ---------------------------------------------------------------------------
// Waist-to-Height Ratio
// ---------------------------------------------------------------------------

const WAIST_HEIGHT_RANGES: ReferenceRange[] = [
  {
    name: "Waist-to-Height Ratio",
    aliases: [
      "waist-to-height ratio",
      "waist to height ratio",
      "whtr",
      "waist height ratio",
    ],
    unit: "ratio",
    ranges: {
      green: { low: null, high: 0.49 },
      yellow: { low: 0.5, high: 0.6 },
      red: { low: 0.61, high: null },
    },
    direction: "lower-is-better",
    source: "WHO",
  },
];

// ---------------------------------------------------------------------------
// Exported composite array
// ---------------------------------------------------------------------------

export const REFERENCE_RANGES: ReferenceRange[] = [
  ...CARDIOVASCULAR_RANGES,
  ...GLUCOSE_RANGES,
  ...CBC_RANGES,
  ...KIDNEY_RANGES,
  ...ELECTROLYTE_RANGES,
  ...THYROID_RANGES,
  ...LIVER_RANGES,
  ...VITAMIN_RANGES,
  ...URIC_ACID_RANGES,
  ...BMI_RANGES,
  ...WAIST_HEIGHT_RANGES,
];
