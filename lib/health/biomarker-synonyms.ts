/**
 * Biomarker synonym-to-canonical-name mapping.
 *
 * This is the SINGLE SOURCE OF TRUTH for biomarker name normalization.
 * All synonyms are stored lowercase for case-insensitive matching.
 *
 * Covers: Lipids, Metabolic, Electrolytes, Liver, CBC, Thyroid,
 * Vitamins/Minerals, Cardiovascular, and Body measurements.
 */

export interface BiomarkerMapping {
  /** Standardized display name */
  canonical: string;
  /** Category grouping (e.g., "Lipid Panel", "Metabolic") */
  category: string;
  /** All known alternate names (lowercase, trimmed) */
  synonyms: string[];
  /** Standard unit of measurement */
  unit: string;
  /** Optional LOINC code for interoperability */
  loincCode?: string;
}

// ---------------------------------------------------------------------------
// Lipid Panel
// ---------------------------------------------------------------------------

const LIPID_PANEL: BiomarkerMapping[] = [
  {
    canonical: "Total Cholesterol",
    category: "Lipid Panel",
    synonyms: [
      "total cholesterol",
      "cholesterol total",
      "cholesterol",
      "tc",
      "total chol",
      "chol",
      "cholesterol, total",
      "serum cholesterol",
    ],
    unit: "mg/dL",
    loincCode: "2093-3",
  },
  {
    canonical: "LDL Cholesterol",
    category: "Lipid Panel",
    synonyms: [
      "ldl cholesterol",
      "ldl",
      "ldl-c",
      "low density lipoprotein",
      "ldl chol",
      "ldl cholesterol direct",
      "ldl direct",
      "ldl-cholesterol",
      "low density lipoprotein cholesterol",
    ],
    unit: "mg/dL",
    loincCode: "2089-1",
  },
  {
    canonical: "HDL Cholesterol",
    category: "Lipid Panel",
    synonyms: [
      "hdl cholesterol",
      "hdl",
      "hdl-c",
      "high density lipoprotein",
      "hdl chol",
      "hdl-cholesterol",
      "high density lipoprotein cholesterol",
    ],
    unit: "mg/dL",
    loincCode: "2085-9",
  },
  {
    canonical: "Triglycerides",
    category: "Lipid Panel",
    synonyms: [
      "triglycerides",
      "triglyceride",
      "trigs",
      "trig",
      "tg",
      "serum triglycerides",
    ],
    unit: "mg/dL",
    loincCode: "2571-8",
  },
  {
    canonical: "Cholesterol/HDL Ratio",
    category: "Lipid Panel",
    synonyms: [
      "cholesterol/hdl ratio",
      "chol/hdl ratio",
      "cholesterol hdl ratio",
      "tc/hdl ratio",
      "total cholesterol/hdl",
      "chol hdl ratio",
      "tc/hdl",
      "cholesterol ratio",
    ],
    unit: "ratio",
    loincCode: "9830-1",
  },
  {
    canonical: "VLDL Cholesterol",
    category: "Lipid Panel",
    synonyms: [
      "vldl cholesterol",
      "vldl",
      "vldl-c",
      "very low density lipoprotein",
      "vldl chol",
    ],
    unit: "mg/dL",
    loincCode: "13458-5",
  },
];

// ---------------------------------------------------------------------------
// Metabolic Panel
// ---------------------------------------------------------------------------

const METABOLIC: BiomarkerMapping[] = [
  {
    canonical: "Glucose (Fasting)",
    category: "Metabolic",
    synonyms: [
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
      "glu",
      "glucose, fasting",
      "fasting plasma glucose",
      "fpg",
    ],
    unit: "mg/dL",
    loincCode: "1558-6",
  },
  {
    canonical: "Hemoglobin A1C",
    category: "Metabolic",
    synonyms: [
      "a1c",
      "hba1c",
      "hemoglobin a1c",
      "glycated hemoglobin",
      "glycosylated hemoglobin",
      "hb a1c",
      "ha1c",
      "hemoglobin a1c %",
      "glycohemoglobin",
      "hgb a1c",
    ],
    unit: "%",
    loincCode: "4548-4",
  },
  {
    canonical: "BUN",
    category: "Metabolic",
    synonyms: [
      "bun",
      "blood urea nitrogen",
      "urea nitrogen",
      "urea",
      "serum urea nitrogen",
    ],
    unit: "mg/dL",
    loincCode: "3094-0",
  },
  {
    canonical: "Creatinine",
    category: "Metabolic",
    synonyms: [
      "creatinine",
      "creat",
      "serum creatinine",
      "cr",
      "creatinine serum",
      "blood creatinine",
    ],
    unit: "mg/dL",
    loincCode: "2160-0",
  },
  {
    canonical: "eGFR",
    category: "Metabolic",
    synonyms: [
      "egfr",
      "estimated gfr",
      "estimated glomerular filtration rate",
      "glomerular filtration rate",
      "gfr",
      "egfr non-african american",
      "egfr african american",
    ],
    unit: "mL/min/1.73m2",
    loincCode: "48642-3",
  },
  {
    canonical: "Uric Acid",
    category: "Metabolic",
    synonyms: [
      "uric acid",
      "urate",
      "serum uric acid",
    ],
    unit: "mg/dL",
    loincCode: "3084-1",
  },
];

// ---------------------------------------------------------------------------
// Electrolytes
// ---------------------------------------------------------------------------

const ELECTROLYTES: BiomarkerMapping[] = [
  {
    canonical: "Sodium",
    category: "Electrolytes",
    synonyms: [
      "sodium",
      "na",
      "na+",
      "serum sodium",
      "blood sodium",
    ],
    unit: "mEq/L",
    loincCode: "2951-2",
  },
  {
    canonical: "Potassium",
    category: "Electrolytes",
    synonyms: [
      "potassium",
      "k",
      "k+",
      "serum potassium",
      "blood potassium",
    ],
    unit: "mEq/L",
    loincCode: "2823-3",
  },
  {
    canonical: "Chloride",
    category: "Electrolytes",
    synonyms: [
      "chloride",
      "cl",
      "cl-",
      "serum chloride",
    ],
    unit: "mEq/L",
    loincCode: "2075-0",
  },
  {
    canonical: "CO2/Bicarbonate",
    category: "Electrolytes",
    synonyms: [
      "co2",
      "bicarbonate",
      "hco3",
      "carbon dioxide",
      "total co2",
      "co2 total",
      "serum bicarbonate",
      "bicarb",
    ],
    unit: "mEq/L",
    loincCode: "2028-9",
  },
  {
    canonical: "Calcium",
    category: "Electrolytes",
    synonyms: [
      "calcium",
      "ca",
      "ca2+",
      "serum calcium",
      "total calcium",
      "blood calcium",
    ],
    unit: "mg/dL",
    loincCode: "17861-6",
  },
  {
    canonical: "Magnesium",
    category: "Electrolytes",
    synonyms: [
      "magnesium",
      "mg",
      "serum magnesium",
      "mag",
      "blood magnesium",
    ],
    unit: "mg/dL",
    loincCode: "19123-9",
  },
  {
    canonical: "Phosphorus",
    category: "Electrolytes",
    synonyms: [
      "phosphorus",
      "phos",
      "phosphate",
      "serum phosphorus",
      "inorganic phosphorus",
    ],
    unit: "mg/dL",
    loincCode: "2777-1",
  },
];

// ---------------------------------------------------------------------------
// Liver Function
// ---------------------------------------------------------------------------

const LIVER: BiomarkerMapping[] = [
  {
    canonical: "ALT",
    category: "Liver",
    synonyms: [
      "alt",
      "alanine aminotransferase",
      "sgpt",
      "alanine transaminase",
      "serum alt",
      "alt/sgpt",
    ],
    unit: "U/L",
    loincCode: "1742-6",
  },
  {
    canonical: "AST",
    category: "Liver",
    synonyms: [
      "ast",
      "aspartate aminotransferase",
      "sgot",
      "aspartate transaminase",
      "serum ast",
      "ast/sgot",
    ],
    unit: "U/L",
    loincCode: "1920-8",
  },
  {
    canonical: "Alkaline Phosphatase",
    category: "Liver",
    synonyms: [
      "alkaline phosphatase",
      "alp",
      "alk phos",
      "alkp",
      "alk phosphatase",
      "serum alkaline phosphatase",
    ],
    unit: "U/L",
    loincCode: "6768-6",
  },
  {
    canonical: "Bilirubin Total",
    category: "Liver",
    synonyms: [
      "bilirubin total",
      "bilirubin",
      "total bilirubin",
      "tbili",
      "t. bilirubin",
      "t bilirubin",
      "serum bilirubin",
    ],
    unit: "mg/dL",
    loincCode: "1975-2",
  },
  {
    canonical: "Bilirubin Direct",
    category: "Liver",
    synonyms: [
      "bilirubin direct",
      "direct bilirubin",
      "dbili",
      "d. bilirubin",
      "conjugated bilirubin",
    ],
    unit: "mg/dL",
    loincCode: "1968-7",
  },
  {
    canonical: "Albumin",
    category: "Liver",
    synonyms: [
      "albumin",
      "alb",
      "serum albumin",
      "blood albumin",
    ],
    unit: "g/dL",
    loincCode: "1751-7",
  },
  {
    canonical: "Total Protein",
    category: "Liver",
    synonyms: [
      "total protein",
      "tp",
      "serum protein",
      "protein total",
      "serum total protein",
    ],
    unit: "g/dL",
    loincCode: "2885-2",
  },
  {
    canonical: "GGT",
    category: "Liver",
    synonyms: [
      "ggt",
      "gamma-glutamyl transferase",
      "gamma glutamyl transferase",
      "gamma-gt",
      "ggtp",
      "gamma glutamyl transpeptidase",
    ],
    unit: "U/L",
    loincCode: "2324-2",
  },
];

// ---------------------------------------------------------------------------
// Complete Blood Count (CBC)
// ---------------------------------------------------------------------------

const CBC: BiomarkerMapping[] = [
  {
    canonical: "White Blood Cell Count",
    category: "CBC",
    synonyms: [
      "white blood cell count",
      "wbc",
      "white blood cells",
      "white cell count",
      "leukocytes",
      "leukocyte count",
      "wbc count",
      "total wbc",
    ],
    unit: "/mcL",
    loincCode: "6690-2",
  },
  {
    canonical: "Red Blood Cell Count",
    category: "CBC",
    synonyms: [
      "red blood cell count",
      "rbc",
      "red blood cells",
      "red cell count",
      "erythrocytes",
      "erythrocyte count",
      "rbc count",
    ],
    unit: "M/mcL",
    loincCode: "789-8",
  },
  {
    canonical: "Hemoglobin",
    category: "CBC",
    synonyms: [
      "hemoglobin",
      "hgb",
      "hb",
      "blood hemoglobin",
    ],
    unit: "g/dL",
    loincCode: "718-7",
  },
  {
    canonical: "Hematocrit",
    category: "CBC",
    synonyms: [
      "hematocrit",
      "hct",
      "packed cell volume",
      "pcv",
    ],
    unit: "%",
    loincCode: "4544-3",
  },
  {
    canonical: "Platelet Count",
    category: "CBC",
    synonyms: [
      "platelet count",
      "platelets",
      "plt",
      "thrombocytes",
      "thrombocyte count",
      "platelet",
    ],
    unit: "/mcL",
    loincCode: "777-3",
  },
  {
    canonical: "MCV",
    category: "CBC",
    synonyms: [
      "mcv",
      "mean corpuscular volume",
      "mean cell volume",
    ],
    unit: "fL",
    loincCode: "787-2",
  },
  {
    canonical: "MCH",
    category: "CBC",
    synonyms: [
      "mch",
      "mean corpuscular hemoglobin",
      "mean cell hemoglobin",
    ],
    unit: "pg",
    loincCode: "785-6",
  },
  {
    canonical: "MCHC",
    category: "CBC",
    synonyms: [
      "mchc",
      "mean corpuscular hemoglobin concentration",
      "mean cell hemoglobin concentration",
    ],
    unit: "g/dL",
    loincCode: "786-4",
  },
  {
    canonical: "RDW",
    category: "CBC",
    synonyms: [
      "rdw",
      "red cell distribution width",
      "rdw-cv",
      "red blood cell distribution width",
    ],
    unit: "%",
    loincCode: "788-0",
  },
];

// ---------------------------------------------------------------------------
// Thyroid
// ---------------------------------------------------------------------------

const THYROID: BiomarkerMapping[] = [
  {
    canonical: "TSH",
    category: "Thyroid",
    synonyms: [
      "tsh",
      "thyroid stimulating hormone",
      "thyrotropin",
      "thyroid-stimulating hormone",
      "serum tsh",
    ],
    unit: "mIU/L",
    loincCode: "3016-3",
  },
  {
    canonical: "Free T3",
    category: "Thyroid",
    synonyms: [
      "free t3",
      "ft3",
      "free triiodothyronine",
      "triiodothyronine free",
      "t3 free",
    ],
    unit: "pg/mL",
    loincCode: "3051-0",
  },
  {
    canonical: "Free T4",
    category: "Thyroid",
    synonyms: [
      "free t4",
      "ft4",
      "free thyroxine",
      "thyroxine free",
      "t4 free",
    ],
    unit: "ng/dL",
    loincCode: "3024-7",
  },
];

// ---------------------------------------------------------------------------
// Vitamins & Minerals
// ---------------------------------------------------------------------------

const VITAMINS: BiomarkerMapping[] = [
  {
    canonical: "Vitamin D",
    category: "Vitamins",
    synonyms: [
      "vitamin d",
      "vit d",
      "25-hydroxyvitamin d",
      "25-oh vitamin d",
      "25(oh)d",
      "calcidiol",
      "vitamin d 25-hydroxy",
      "vitamin d3",
      "25-hydroxy vitamin d",
    ],
    unit: "ng/mL",
    loincCode: "1989-3",
  },
  {
    canonical: "Vitamin B12",
    category: "Vitamins",
    synonyms: [
      "vitamin b12",
      "vit b12",
      "b12",
      "cobalamin",
      "cyanocobalamin",
    ],
    unit: "pg/mL",
    loincCode: "2132-9",
  },
  {
    canonical: "Folate",
    category: "Vitamins",
    synonyms: [
      "folate",
      "folic acid",
      "vitamin b9",
      "serum folate",
      "blood folate",
    ],
    unit: "ng/mL",
    loincCode: "2284-8",
  },
  {
    canonical: "Iron",
    category: "Vitamins",
    synonyms: [
      "iron",
      "serum iron",
      "fe",
      "blood iron",
    ],
    unit: "mcg/dL",
    loincCode: "2498-4",
  },
  {
    canonical: "Ferritin",
    category: "Vitamins",
    synonyms: [
      "ferritin",
      "serum ferritin",
      "blood ferritin",
    ],
    unit: "ng/mL",
    loincCode: "2276-4",
  },
  {
    canonical: "TIBC",
    category: "Vitamins",
    synonyms: [
      "tibc",
      "total iron binding capacity",
      "iron binding capacity",
      "total iron-binding capacity",
    ],
    unit: "mcg/dL",
    loincCode: "2500-7",
  },
];

// ---------------------------------------------------------------------------
// Cardiovascular
// ---------------------------------------------------------------------------

const CARDIOVASCULAR: BiomarkerMapping[] = [
  {
    canonical: "Blood Pressure Systolic",
    category: "Cardiovascular",
    synonyms: [
      "blood pressure systolic",
      "systolic blood pressure",
      "systolic bp",
      "systolic",
      "sbp",
      "bp systolic",
    ],
    unit: "mmHg",
    loincCode: "8480-6",
  },
  {
    canonical: "Blood Pressure Diastolic",
    category: "Cardiovascular",
    synonyms: [
      "blood pressure diastolic",
      "diastolic blood pressure",
      "diastolic bp",
      "diastolic",
      "dbp",
      "bp diastolic",
    ],
    unit: "mmHg",
    loincCode: "8462-4",
  },
  {
    canonical: "Resting Heart Rate",
    category: "Cardiovascular",
    synonyms: [
      "resting heart rate",
      "heart rate",
      "pulse",
      "rhr",
      "hr",
      "pulse rate",
    ],
    unit: "bpm",
    loincCode: "8867-4",
  },
];

// ---------------------------------------------------------------------------
// Body Measurements
// ---------------------------------------------------------------------------

const BODY: BiomarkerMapping[] = [
  {
    canonical: "BMI",
    category: "Body",
    synonyms: [
      "bmi",
      "body mass index",
    ],
    unit: "kg/m2",
    loincCode: "39156-5",
  },
  {
    canonical: "Weight",
    category: "Body",
    synonyms: [
      "weight",
      "body weight",
      "wt",
    ],
    unit: "lbs",
    loincCode: "29463-7",
  },
  {
    canonical: "Height",
    category: "Body",
    synonyms: [
      "height",
      "body height",
      "stature",
      "ht",
    ],
    unit: "in",
    loincCode: "8302-2",
  },
  {
    canonical: "Waist-to-Height Ratio",
    category: "Body",
    synonyms: [
      "waist-to-height ratio",
      "waist to height ratio",
      "whtr",
      "waist height ratio",
    ],
    unit: "ratio",
  },
];

// ---------------------------------------------------------------------------
// Exported composite list — SINGLE SOURCE OF TRUTH
// ---------------------------------------------------------------------------

export const BIOMARKER_MAPPINGS: BiomarkerMapping[] = [
  ...LIPID_PANEL,
  ...METABOLIC,
  ...ELECTROLYTES,
  ...LIVER,
  ...CBC,
  ...THYROID,
  ...VITAMINS,
  ...CARDIOVASCULAR,
  ...BODY,
];

/**
 * Pre-built lookup: lowercase synonym -> BiomarkerMapping.
 * Used by the normalization function for O(1) lookups.
 */
export const SYNONYM_INDEX: Map<string, BiomarkerMapping> = (() => {
  const map = new Map<string, BiomarkerMapping>();
  for (const mapping of BIOMARKER_MAPPINGS) {
    for (const synonym of mapping.synonyms) {
      map.set(synonym.toLowerCase(), mapping);
    }
  }
  return map;
})();
