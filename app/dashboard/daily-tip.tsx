"use client";

import Link from "next/link";

/**
 * Daily health tips organized by biomarker category.
 * Tips are specific, actionable, and evidence-based.
 */
const TIPS_BY_CATEGORY: Record<string, string[]> = {
  cholesterol: [
    "Replace butter with olive oil this week — it can lower LDL by up to 10%.",
    "Eating 2 servings of fatty fish per week can improve your cholesterol profile.",
    "A handful of almonds daily may reduce LDL cholesterol by 5-10%.",
    "Oats contain beta-glucan fiber that binds cholesterol in the gut — try oatmeal for breakfast.",
    "Avocados are rich in monounsaturated fats that help raise HDL and lower LDL.",
  ],
  glucose: [
    "Walking 30 minutes after meals can lower blood sugar by up to 30%.",
    "Cinnamon may improve insulin sensitivity — try adding it to your morning coffee.",
    "Eating protein before carbs at meals can reduce post-meal glucose spikes by 30-40%.",
    "Getting 7-8 hours of sleep helps regulate blood sugar — even one bad night raises it.",
    "Apple cider vinegar before meals may improve insulin sensitivity by up to 34%.",
  ],
  blood_pressure: [
    "Try deep breathing for 5 minutes — it can lower blood pressure by 5-10 points.",
    "Reducing sodium to under 2,300mg/day can lower blood pressure by 5-6 mmHg.",
    "Potassium-rich foods like bananas and sweet potatoes help counterbalance sodium.",
    "Regular walking for 30 minutes can lower systolic blood pressure by 4-9 mmHg.",
    "Dark chocolate (70%+) in small amounts may lower blood pressure by 2-3 points.",
  ],
  liver: [
    "Your liver regenerates — cutting back on alcohol for 2 weeks can start improving enzyme levels.",
    "Coffee (2-3 cups/day) is associated with lower liver enzyme levels and reduced liver disease risk.",
    "Milk thistle is one of the most studied supplements for liver health — ask your doctor about it.",
    "Excess sugar is converted to fat in the liver — reducing added sugars helps liver function.",
  ],
  kidney: [
    "Staying hydrated helps your kidneys filter waste — aim for 8 glasses of water daily.",
    "Limiting processed foods reduces sodium and phosphorus load on your kidneys.",
    "Berries are kidney-friendly fruits packed with antioxidants and low in potassium.",
  ],
  thyroid: [
    "Brazil nuts contain selenium, which supports thyroid hormone production — just 2 per day.",
    "Iodized salt provides iodine essential for thyroid function — check your salt label.",
    "Stress management helps thyroid function — cortisol can interfere with thyroid hormones.",
  ],
  iron: [
    "Vitamin C dramatically increases iron absorption — pair iron-rich foods with citrus.",
    "Cooking in a cast-iron skillet can increase the iron content of your food.",
    "Tea and coffee can block iron absorption — wait 1 hour after meals before drinking them.",
  ],
  general: [
    "Drink a glass of water first thing in the morning to kickstart your metabolism.",
    "Eating the rainbow — colorful fruits and vegetables — provides diverse antioxidants.",
    "Just 10 minutes of sunlight daily helps your body produce vitamin D naturally.",
    "Fiber feeds your gut microbiome — aim for 25-30g per day from whole foods.",
    "Stress reduction is medicine — even 5 minutes of meditation daily makes a measurable difference.",
    "Laughing for 15 minutes burns about 40 calories and releases endorphins.",
    "Standing up every 30 minutes reduces metabolic risk even if you exercise regularly.",
    "Eating dinner 3 hours before bed improves digestion and sleep quality.",
    "Cold showers for 30 seconds can boost your immune system and improve circulation.",
    "Chewing food slowly (20-30 times) aids digestion and helps you eat less.",
  ],
};

/**
 * Map biomarker names to tip categories using keyword matching.
 */
function getCategoriesFromBiomarkers(
  concerns: Array<{ name: string; flag: string }>
): string[] {
  const categories = new Set<string>();

  for (const c of concerns) {
    const lower = c.name.toLowerCase();
    if (
      lower.includes("cholesterol") ||
      lower.includes("ldl") ||
      lower.includes("hdl") ||
      lower.includes("triglyceride")
    ) {
      categories.add("cholesterol");
    }
    if (lower.includes("glucose") || lower.includes("a1c") || lower.includes("hba1c")) {
      categories.add("glucose");
    }
    if (
      lower.includes("blood pressure") ||
      lower.includes("systolic") ||
      lower.includes("diastolic")
    ) {
      categories.add("blood_pressure");
    }
    if (lower.includes("alt") || lower.includes("ast") || lower.includes("liver") || lower.includes("bilirubin")) {
      categories.add("liver");
    }
    if (lower.includes("creatinine") || lower.includes("bun") || lower.includes("gfr")) {
      categories.add("kidney");
    }
    if (lower.includes("tsh") || lower.includes("t3") || lower.includes("t4") || lower.includes("thyroid")) {
      categories.add("thyroid");
    }
    if (lower.includes("iron") || lower.includes("ferritin") || lower.includes("hemoglobin")) {
      categories.add("iron");
    }
  }

  return Array.from(categories);
}

/**
 * Select a daily tip based on the day of year and flagged biomarkers.
 * Changes daily but is personalized to the user's health concerns.
 */
function selectDailyTip(
  concerns: Array<{ name: string; flag: string }>
): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  // Build pool: flagged-category tips first, then general
  const categories = getCategoriesFromBiomarkers(concerns);
  const pool: string[] = [];

  for (const cat of categories) {
    if (TIPS_BY_CATEGORY[cat]) {
      pool.push(...TIPS_BY_CATEGORY[cat]);
    }
  }
  pool.push(...TIPS_BY_CATEGORY.general);

  return pool[dayOfYear % pool.length];
}

interface DailyTipProps {
  concerns: Array<{ name: string; flag: string }>;
}

export function DailyTip({ concerns }: DailyTipProps) {
  const tip = selectDailyTip(concerns);

  return (
    <div className="db-card db-daily-tip">
      <div className="db-daily-tip__header">
        <span className="db-daily-tip__icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6" />
            <path d="M10 22h4" />
            <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
          </svg>
        </span>
        <span className="db-card__title">Daily Health Tip</span>
      </div>
      <p className="db-daily-tip__text">&ldquo;{tip}&rdquo;</p>
      <Link href="/chat" className="db-card__link">
        More Tips &rarr;
      </Link>
    </div>
  );
}
