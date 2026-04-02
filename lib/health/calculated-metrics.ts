/**
 * Calculated health metrics derived from raw biomarker values.
 *
 * These are computed server-side when component biomarkers are present
 * in the parsed report (e.g., BMI from weight + height).
 */

import type { RiskFlag } from "./reference-ranges";

export interface CalculatedMetric {
  name: string;
  value: number;
  unit: string;
  flag: RiskFlag;
}

/**
 * Calculate BMI from weight (kg) and height (cm).
 * Classification per WHO guidelines:
 *   <18.5 underweight (yellow), 18.5-24.9 normal (green),
 *   25-29.9 overweight (yellow), >=30 obese (red)
 */
export function calculateBMI(
  weightKg: number,
  heightCm: number
): CalculatedMetric {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const rounded = Math.round(bmi * 10) / 10;

  let flag: RiskFlag;
  if (rounded < 18.5) {
    flag = "yellow";
  } else if (rounded <= 24.9) {
    flag = "green";
  } else if (rounded <= 29.9) {
    flag = "yellow";
  } else {
    flag = "red";
  }

  return { name: "BMI", value: rounded, unit: "kg/m2", flag };
}

/**
 * Calculate Total Cholesterol / HDL ratio.
 * Classification per AHA guidelines:
 *   <5.0 desirable (green), 5.0-5.9 borderline (yellow), >=6.0 high risk (red)
 */
export function calculateCholesterolHDLRatio(
  totalCholesterol: number,
  hdl: number
): CalculatedMetric {
  if (hdl === 0) {
    return {
      name: "Cholesterol/HDL Ratio",
      value: 0,
      unit: "ratio",
      flag: "red",
    };
  }

  const ratio = totalCholesterol / hdl;
  const rounded = Math.round(ratio * 10) / 10;

  let flag: RiskFlag;
  if (rounded < 5.0) {
    flag = "green";
  } else if (rounded <= 5.9) {
    flag = "yellow";
  } else {
    flag = "red";
  }

  return {
    name: "Cholesterol/HDL Ratio",
    value: rounded,
    unit: "ratio",
    flag,
  };
}

/**
 * Calculate Waist-to-Height Ratio.
 * Classification per WHO guidelines:
 *   <0.5 low risk (green), 0.5-0.6 moderate (yellow), >0.6 high risk (red)
 */
export function calculateWaistHeightRatio(
  waistCm: number,
  heightCm: number
): CalculatedMetric {
  if (heightCm === 0) {
    return {
      name: "Waist-to-Height Ratio",
      value: 0,
      unit: "ratio",
      flag: "red",
    };
  }

  const ratio = waistCm / heightCm;
  const rounded = Math.round(ratio * 100) / 100;

  let flag: RiskFlag;
  if (rounded < 0.5) {
    flag = "green";
  } else if (rounded <= 0.6) {
    flag = "yellow";
  } else {
    flag = "red";
  }

  return {
    name: "Waist-to-Height Ratio",
    value: rounded,
    unit: "ratio",
    flag,
  };
}
