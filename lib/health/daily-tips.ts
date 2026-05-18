/**
 * Daily Health Tips Library
 *
 * 200+ evidence-based, actionable health tips across 20 categories.
 * Used by the dashboard Daily Tip card and the /tips browse page.
 *
 * Each tip is short (1-2 sentences), friendly, and actionable today.
 * Personalization filters allow targeting tips to users with specific
 * conditions, ages, gender, or activity levels.
 */

export type EvidenceLevel = "strong" | "moderate" | "emerging";

export type TipCategory =
  | "cholesterol"
  | "glucose"
  | "blood_pressure"
  | "heart"
  | "liver"
  | "kidney"
  | "thyroid"
  | "iron"
  | "vitamin_d"
  | "b12_folate"
  | "sleep"
  | "stress"
  | "nutrition"
  | "hydration"
  | "exercise"
  | "inflammation"
  | "gut"
  | "bone"
  | "immune"
  | "smoking"
  | "wellness";

export interface DailyTip {
  /** Stable unique id e.g. "chol-001" — used for interaction tracking. */
  id: string;
  /** Category bucket. */
  category: TipCategory;
  /** Emoji shown next to the tip. */
  emoji: string;
  /** Tip text — 1-2 sentences. */
  text: string;

  // ── Personalization filters ───────────────────────────────────
  /** Lowercased condition keywords — show if any user condition matches. */
  conditions?: string[];
  /** Minimum age (inclusive). */
  ageMin?: number;
  /** Maximum age (inclusive). */
  ageMax?: number;
  /** Target gender if biologically relevant. */
  gender?: "male" | "female";
  /** Activity level values that should see this tip. */
  activityLevel?: string[];

  // ── Action context ────────────────────────────────────────────
  /** Whether this tip is something the user can mark "did today". */
  actionable: boolean;
  /** Strength of evidence: strong / moderate / emerging. */
  evidenceLevel?: EvidenceLevel;
}

/**
 * Pretty labels for category chips and section headers.
 */
export const CATEGORY_LABELS: Record<TipCategory, string> = {
  cholesterol: "Cholesterol & Lipids",
  glucose: "Glucose & Blood Sugar",
  blood_pressure: "Blood Pressure",
  heart: "Heart Health",
  liver: "Liver",
  kidney: "Kidney",
  thyroid: "Thyroid",
  iron: "Iron & Anemia",
  vitamin_d: "Vitamin D",
  b12_folate: "B12 & Folate",
  sleep: "Sleep",
  stress: "Stress & Mental Health",
  nutrition: "Nutrition",
  hydration: "Hydration",
  exercise: "Exercise",
  inflammation: "Inflammation",
  gut: "Gut Health",
  bone: "Bone Health",
  immune: "Immune Support",
  smoking: "Smoking Cessation",
  wellness: "General Wellness",
};

/**
 * Category emojis used in the daily tip card and browse page.
 */
export const CATEGORY_EMOJIS: Record<TipCategory, string> = {
  cholesterol: "❤️", // red heart
  glucose: "🍬", // candy
  blood_pressure: "🩸", // drop of blood
  heart: "💗", // sparkling heart
  liver: "🫀", // anatomical heart? actually liver-ish
  kidney: "🪨", // rock (kidney stone joke)
  thyroid: "🦋", // butterfly
  iron: "🧲", // magnet
  vitamin_d: "☀️", // sun
  b12_folate: "🥬", // leafy green
  sleep: "😴", // sleepy face
  stress: "🧘", // meditation
  nutrition: "🥗", // salad
  hydration: "💧", // droplet
  exercise: "🏃", // runner
  inflammation: "🔥", // fire
  gut: "🦠", // microbe
  bone: "🦴", // bone
  immune: "🛡️", // shield
  smoking: "🚫", // prohibited
  wellness: "✨", // sparkles
};

/**
 * Mapping of biomarker name keywords to categories that should be
 * surfaced when those biomarkers are flagged.
 */
const BIOMARKER_TO_CATEGORY: Array<{
  keywords: string[];
  category: TipCategory;
}> = [
  {
    keywords: ["cholesterol", "ldl", "hdl", "triglyceride", "lipid"],
    category: "cholesterol",
  },
  { keywords: ["glucose", "a1c", "hba1c", "insulin"], category: "glucose" },
  {
    keywords: ["blood pressure", "systolic", "diastolic", "hypertension"],
    category: "blood_pressure",
  },
  { keywords: ["alt", "ast", "liver", "bilirubin", "ggt"], category: "liver" },
  { keywords: ["creatinine", "bun", "gfr", "kidney"], category: "kidney" },
  { keywords: ["tsh", "t3", "t4", "thyroid"], category: "thyroid" },
  { keywords: ["iron", "ferritin", "hemoglobin", "hematocrit"], category: "iron" },
  { keywords: ["vitamin d", "25-oh", "25(oh)"], category: "vitamin_d" },
  { keywords: ["b12", "cobalamin", "folate", "folic"], category: "b12_folate" },
  { keywords: ["crp", "esr", "inflammation"], category: "inflammation" },
  { keywords: ["calcium", "vitamin k"], category: "bone" },
];

/**
 * Returns the set of tip categories implicated by a list of flagged
 * biomarker concerns.
 */
export function getCategoriesFromBiomarkers(
  concerns: Array<{ name: string; flag: string }>
): TipCategory[] {
  const set = new Set<TipCategory>();
  for (const c of concerns) {
    const lower = (c.name || "").toLowerCase();
    for (const map of BIOMARKER_TO_CATEGORY) {
      if (map.keywords.some((kw) => lower.includes(kw))) {
        set.add(map.category);
      }
    }
  }
  return Array.from(set);
}

/**
 * Build a tip from short text + sequence number.
 * Centralizes id formatting and applies emoji + category defaults.
 */
function mk(
  prefix: string,
  category: TipCategory,
  text: string,
  extras: Partial<DailyTip> = {}
): DailyTip {
  return {
    id: prefix,
    category,
    emoji: CATEGORY_EMOJIS[category],
    text,
    actionable: true,
    evidenceLevel: "moderate",
    ...extras,
  };
}

// ── The Library ──────────────────────────────────────────────────
// Tip ids follow the convention "<category-prefix>-<NNN>".
// Tips are intentionally grouped by category for maintainability.

const CHOLESTEROL_TIPS: DailyTip[] = [
  mk("chol-001", "cholesterol", "Replace butter with olive oil this week — it can lower LDL by up to 10%.", { evidenceLevel: "strong", conditions: ["high cholesterol", "high ldl"] }),
  mk("chol-002", "cholesterol", "Eating two servings of fatty fish weekly improves your cholesterol profile.", { evidenceLevel: "strong" }),
  mk("chol-003", "cholesterol", "A handful of almonds daily may reduce LDL cholesterol by 5-10%.", { evidenceLevel: "strong" }),
  mk("chol-004", "cholesterol", "Oats contain beta-glucan fiber that binds cholesterol — try oatmeal for breakfast tomorrow.", { evidenceLevel: "strong" }),
  mk("chol-005", "cholesterol", "Avocados are rich in monounsaturated fats that help raise HDL and lower LDL.", { evidenceLevel: "moderate" }),
  mk("chol-006", "cholesterol", "Soluble fiber from beans, apples, and barley can lower LDL by 5-10% over a few weeks.", { evidenceLevel: "strong" }),
  mk("chol-007", "cholesterol", "Plant sterols and stanols in fortified foods can reduce LDL by 7-10% — check labels for them.", { evidenceLevel: "strong" }),
  mk("chol-008", "cholesterol", "Add ground flaxseed to yogurt or smoothies — its omega-3s and lignans help lower LDL.", { evidenceLevel: "moderate" }),
  mk("chol-009", "cholesterol", "Swap red meat for grilled chicken or tofu twice this week for a quick lipid win.", { evidenceLevel: "strong" }),
  mk("chol-010", "cholesterol", "Walnuts contain plant-based omega-3s — an ounce a day supports heart-healthy cholesterol.", { evidenceLevel: "moderate" }),
  mk("chol-011", "cholesterol", "Cutting trans fats (partially hydrogenated oils) is the single fastest way to lower LDL.", { evidenceLevel: "strong" }),
  mk("chol-012", "cholesterol", "Green tea contains catechins that may lower LDL by 5-10% — aim for 2-3 cups daily.", { evidenceLevel: "moderate" }),
  mk("chol-013", "cholesterol", "Aerobic exercise raises HDL (the good cholesterol) — even brisk walking 30 minutes counts.", { evidenceLevel: "strong" }),
  mk("chol-014", "cholesterol", "Replace one carb-heavy meal a week with a Mediterranean-style salad rich in olive oil and fish.", { evidenceLevel: "strong" }),
  mk("chol-015", "cholesterol", "Eat the rainbow: deep colors in produce contain antioxidants that protect LDL from oxidizing.", { evidenceLevel: "moderate" }),
  mk("chol-016", "cholesterol", "Garlic — about a clove a day — has a modest cholesterol-lowering effect.", { evidenceLevel: "emerging" }),
  mk("chol-017", "cholesterol", "Soy protein (tofu, edamame, soy milk) can lower LDL by 3-5% — try it as a meat alternative.", { evidenceLevel: "moderate" }),
  mk("chol-018", "cholesterol", "Pistachios are nutrient-dense and may improve HDL — a small handful is a perfect snack.", { evidenceLevel: "moderate" }),
  mk("chol-019", "cholesterol", "Drinking less sugar-sweetened beverages lowers triglycerides quickly — try water with lemon.", { evidenceLevel: "strong" }),
  mk("chol-020", "cholesterol", "Losing just 5-10% of body weight noticeably improves cholesterol numbers.", { evidenceLevel: "strong" }),
];

const GLUCOSE_TIPS: DailyTip[] = [
  mk("glu-001", "glucose", "Walking 30 minutes after meals can lower blood sugar by up to 30%.", { evidenceLevel: "strong", conditions: ["diabetes", "prediabetes", "high glucose"] }),
  mk("glu-002", "glucose", "Cinnamon may improve insulin sensitivity — try a dash in your morning coffee or oatmeal.", { evidenceLevel: "emerging" }),
  mk("glu-003", "glucose", "Eat protein before carbs at meals to blunt post-meal glucose spikes by 30-40%.", { evidenceLevel: "strong" }),
  mk("glu-004", "glucose", "Getting 7-8 hours of sleep helps regulate blood sugar — one bad night raises it.", { evidenceLevel: "strong" }),
  mk("glu-005", "glucose", "Apple cider vinegar before meals may improve insulin sensitivity by up to 34%.", { evidenceLevel: "moderate" }),
  mk("glu-006", "glucose", "Pair carbs with fat or protein — never eat refined carbs alone for stable blood sugar.", { evidenceLevel: "strong" }),
  mk("glu-007", "glucose", "Berries are lower glycemic than most fruits — perfect when you want sweet without a spike.", { evidenceLevel: "strong" }),
  mk("glu-008", "glucose", "Chromium-rich foods like broccoli and oats support insulin function.", { evidenceLevel: "emerging" }),
  mk("glu-009", "glucose", "Resistance training (even 2x/week) improves insulin sensitivity for up to 48 hours.", { evidenceLevel: "strong" }),
  mk("glu-010", "glucose", "Stress raises blood sugar by triggering cortisol — five slow breaths can help.", { evidenceLevel: "moderate" }),
  mk("glu-011", "glucose", "Beans and lentils are the lowest-glycemic protein source — swap one meal a week.", { evidenceLevel: "strong" }),
  mk("glu-012", "glucose", "Magnesium-rich foods (leafy greens, pumpkin seeds, dark chocolate) help insulin work better.", { evidenceLevel: "moderate" }),
  mk("glu-013", "glucose", "Try a 12-hour overnight fast (e.g. 7pm-7am) — it improves morning blood sugar.", { evidenceLevel: "moderate" }),
  mk("glu-014", "glucose", "Fiber slows sugar absorption — aim for 25-30g daily from vegetables, legumes, and whole grains.", { evidenceLevel: "strong" }),
  mk("glu-015", "glucose", "Skip sugar-sweetened drinks entirely — they're the single biggest driver of glucose spikes.", { evidenceLevel: "strong" }),
  mk("glu-016", "glucose", "Eating earlier in the day (front-loading calories) improves glucose tolerance.", { evidenceLevel: "moderate" }),
  mk("glu-017", "glucose", "A 10-minute walk after dinner is more effective than a longer walk earlier in the day.", { evidenceLevel: "strong" }),
  mk("glu-018", "glucose", "Coffee (without sugar) is linked to lower type 2 diabetes risk — keep yours plain.", { evidenceLevel: "strong" }),
  mk("glu-019", "glucose", "Whole fruit is fine — it's juice (even 100%) that causes the biggest spikes.", { evidenceLevel: "strong" }),
  mk("glu-020", "glucose", "If you eat dessert, take a short walk afterwards — it dramatically lowers the glucose spike.", { evidenceLevel: "strong" }),
];

const BLOOD_PRESSURE_TIPS: DailyTip[] = [
  mk("bp-001", "blood_pressure", "Deep breathing for 5 minutes can lower blood pressure by 5-10 points.", { evidenceLevel: "moderate", conditions: ["hypertension", "high blood pressure"] }),
  mk("bp-002", "blood_pressure", "Cutting sodium under 2,300mg/day lowers blood pressure by 5-6 mmHg.", { evidenceLevel: "strong" }),
  mk("bp-003", "blood_pressure", "Potassium-rich foods (bananas, sweet potatoes, spinach) counterbalance sodium.", { evidenceLevel: "strong" }),
  mk("bp-004", "blood_pressure", "Walking 30 minutes daily can lower systolic BP by 4-9 mmHg.", { evidenceLevel: "strong" }),
  mk("bp-005", "blood_pressure", "Dark chocolate (70%+) in small amounts may lower BP by 2-3 points.", { evidenceLevel: "moderate" }),
  mk("bp-006", "blood_pressure", "Try the DASH diet — it's the most evidence-backed approach to lower blood pressure.", { evidenceLevel: "strong" }),
  mk("bp-007", "blood_pressure", "Beetroot juice contains nitrates that can lower BP within hours — try a small glass.", { evidenceLevel: "moderate" }),
  mk("bp-008", "blood_pressure", "Limit alcohol to 1 drink/day for women and 2 for men — more raises blood pressure.", { evidenceLevel: "strong" }),
  mk("bp-009", "blood_pressure", "Slow box breathing (4-4-4-4) activates the vagus nerve and lowers BP almost immediately.", { evidenceLevel: "moderate" }),
  mk("bp-010", "blood_pressure", "Hibiscus tea has been shown to lower blood pressure with regular consumption.", { evidenceLevel: "moderate" }),
  mk("bp-011", "blood_pressure", "Salt is hidden in bread, soup, and condiments — check labels for sodium counts.", { evidenceLevel: "strong" }),
  mk("bp-012", "blood_pressure", "Drinking enough water keeps blood pressure stable — dehydration constricts blood vessels.", { evidenceLevel: "moderate" }),
  mk("bp-013", "blood_pressure", "Quit smoking — within 20 minutes, your blood pressure starts to drop.", { evidenceLevel: "strong", conditions: ["smoking", "smoker"] }),
  mk("bp-014", "blood_pressure", "Magnesium deficiency is linked to higher BP — eat more leafy greens, nuts, and seeds.", { evidenceLevel: "moderate" }),
  mk("bp-015", "blood_pressure", "Try progressive muscle relaxation before bed — it lowers nighttime blood pressure.", { evidenceLevel: "moderate" }),
  mk("bp-016", "blood_pressure", "Reduce caffeine if you're sensitive — it can temporarily spike BP by 10 mmHg.", { evidenceLevel: "moderate" }),
  mk("bp-017", "blood_pressure", "Garlic supplements (with doctor's OK) may lower BP by 5-8 mmHg in 12 weeks.", { evidenceLevel: "moderate" }),
  mk("bp-018", "blood_pressure", "Take blood pressure readings consistently — same time, same arm, after 5 minutes of rest.", { evidenceLevel: "strong", actionable: false }),
  mk("bp-019", "blood_pressure", "Yoga and tai chi modestly lower blood pressure when practiced regularly.", { evidenceLevel: "moderate" }),
  mk("bp-020", "blood_pressure", "Even small weight loss helps — every 2 lbs lost can lower systolic BP by 1 mmHg.", { evidenceLevel: "strong" }),
];

const HEART_TIPS: DailyTip[] = [
  mk("heart-001", "heart", "30 minutes of moderate cardio most days cuts heart disease risk by up to 35%.", { evidenceLevel: "strong" }),
  mk("heart-002", "heart", "Omega-3s from fatty fish (salmon, sardines) reduce triglycerides and inflammation.", { evidenceLevel: "strong" }),
  mk("heart-003", "heart", "Eating nuts 4+ times/week is linked to a 30% lower cardiovascular risk.", { evidenceLevel: "strong" }),
  mk("heart-004", "heart", "Flossing daily is linked to lower heart disease risk — oral inflammation matters.", { evidenceLevel: "moderate" }),
  mk("heart-005", "heart", "Laughter increases blood flow and reduces arterial stiffness — find something funny today.", { evidenceLevel: "emerging" }),
  mk("heart-006", "heart", "Two cups of green tea a day is linked to lower cardiovascular mortality.", { evidenceLevel: "moderate" }),
  mk("heart-007", "heart", "Strength training 2x/week is independently linked to lower heart disease risk.", { evidenceLevel: "strong" }),
  mk("heart-008", "heart", "Owning a dog is associated with a 24% lower risk of all-cause mortality — partly the walks.", { evidenceLevel: "moderate" }),
  mk("heart-009", "heart", "Loneliness raises heart disease risk by 29% — call a friend or family member today.", { evidenceLevel: "strong" }),
  mk("heart-010", "heart", "A daily handful of berries is linked to lower heart attack risk in women.", { evidenceLevel: "moderate", gender: "female" }),
  mk("heart-011", "heart", "Take the stairs whenever possible — adds up to real cardiovascular fitness.", { evidenceLevel: "strong" }),
  mk("heart-012", "heart", "Sitting under 6 hours/day reduces cardiovascular mortality even if you don't exercise more.", { evidenceLevel: "strong" }),
  mk("heart-013", "heart", "Saunas (or hot baths) several times a week are linked to lower heart disease risk.", { evidenceLevel: "moderate" }),
  mk("heart-014", "heart", "Eating breakfast (vs. skipping) is associated with lower coronary heart disease in some studies.", { evidenceLevel: "moderate" }),
  mk("heart-015", "heart", "Singing in a choir reduces stress and improves heart rate variability.", { evidenceLevel: "emerging" }),
  mk("heart-016", "heart", "Eating fish 2x/week vs. red meat lowers heart disease risk and improves cholesterol.", { evidenceLevel: "strong" }),
  mk("heart-017", "heart", "Brushing twice daily reduces oral bacteria linked to atherosclerosis.", { evidenceLevel: "moderate" }),
  mk("heart-018", "heart", "Yoga improves heart rate variability — a key marker of cardiac health.", { evidenceLevel: "moderate" }),
  mk("heart-019", "heart", "Eating tomatoes (cooked, with olive oil) boosts lycopene, which protects the heart.", { evidenceLevel: "moderate" }),
  mk("heart-020", "heart", "Aim for 8,000 steps a day — that's the sweet spot for cardiovascular mortality benefit.", { evidenceLevel: "strong" }),
];

const LIVER_TIPS: DailyTip[] = [
  mk("liver-001", "liver", "Your liver regenerates — cutting alcohol for 2 weeks can already improve enzyme levels.", { evidenceLevel: "strong", conditions: ["liver disease", "fatty liver"] }),
  mk("liver-002", "liver", "Coffee (2-3 cups/day) is linked to lower liver enzymes and lower liver disease risk.", { evidenceLevel: "strong" }),
  mk("liver-003", "liver", "Excess fructose (sugary drinks) gets converted to fat in the liver — cut back.", { evidenceLevel: "strong" }),
  mk("liver-004", "liver", "Dandelion root tea is traditionally used for liver support — gentle and well-tolerated.", { evidenceLevel: "emerging" }),
  mk("liver-005", "liver", "Cruciferous vegetables (broccoli, cauliflower) support liver detox pathways.", { evidenceLevel: "moderate" }),
  mk("liver-006", "liver", "Milk thistle is one of the most studied herbs for liver health — ask your doctor.", { evidenceLevel: "moderate" }),
  mk("liver-007", "liver", "Even a few alcohol-free days per week lower liver fat.", { evidenceLevel: "strong" }),
  mk("liver-008", "liver", "Beets contain betaine, which supports liver detoxification.", { evidenceLevel: "moderate" }),
  mk("liver-009", "liver", "Losing 5% of body weight can significantly reduce fatty liver disease.", { evidenceLevel: "strong" }),
  mk("liver-010", "liver", "Green tea catechins protect liver cells from oxidative stress.", { evidenceLevel: "moderate" }),
  mk("liver-011", "liver", "Walnuts contain glutathione precursors — your liver's main antioxidant.", { evidenceLevel: "moderate" }),
  mk("liver-012", "liver", "Acetaminophen is the leading cause of acute liver failure — stay under 3g/day.", { evidenceLevel: "strong", actionable: false }),
  mk("liver-013", "liver", "Drink water before reaching for juice or soda — hydration helps the liver work.", { evidenceLevel: "moderate" }),
  mk("liver-014", "liver", "Olive oil — a Mediterranean staple — protects against fatty liver disease.", { evidenceLevel: "moderate" }),
  mk("liver-015", "liver", "Turmeric's curcumin may reduce liver inflammation — pair with black pepper for absorption.", { evidenceLevel: "emerging" }),
];

const KIDNEY_TIPS: DailyTip[] = [
  mk("kid-001", "kidney", "Staying hydrated helps kidneys filter waste — aim for pale yellow urine.", { evidenceLevel: "strong", conditions: ["kidney disease", "ckd"] }),
  mk("kid-002", "kidney", "Limiting processed foods reduces sodium and phosphorus load on your kidneys.", { evidenceLevel: "strong" }),
  mk("kid-003", "kidney", "Berries are kidney-friendly fruits — low in potassium and rich in antioxidants.", { evidenceLevel: "moderate" }),
  mk("kid-004", "kidney", "Limit NSAIDs (ibuprofen, naproxen) — long-term use stresses the kidneys.", { evidenceLevel: "strong", actionable: false }),
  mk("kid-005", "kidney", "Cabbage, cauliflower, and bell peppers are excellent low-potassium vegetables.", { evidenceLevel: "moderate" }),
  mk("kid-006", "kidney", "Controlling blood pressure protects the kidneys — they're highly vulnerable to hypertension.", { evidenceLevel: "strong" }),
  mk("kid-007", "kidney", "Watch protein portions — about a palm-sized serving per meal is plenty for most.", { evidenceLevel: "moderate" }),
  mk("kid-008", "kidney", "Drinking water dilutes urine and reduces kidney stone risk.", { evidenceLevel: "strong" }),
  mk("kid-009", "kidney", "Citrate in lemon juice helps prevent kidney stones — add a slice to your water.", { evidenceLevel: "moderate" }),
  mk("kid-010", "kidney", "Avoiding sugary sodas reduces uric acid load on the kidneys.", { evidenceLevel: "strong" }),
  mk("kid-011", "kidney", "Cooking from scratch makes it easier to control sodium — and helps your kidneys.", { evidenceLevel: "strong" }),
  mk("kid-012", "kidney", "Quitting smoking improves kidney blood flow within weeks.", { evidenceLevel: "strong", conditions: ["smoking", "smoker"] }),
  mk("kid-013", "kidney", "If your urine is dark, drink water now — but if it persists, get checked.", { evidenceLevel: "moderate" }),
  mk("kid-014", "kidney", "Apple, watermelon, and grapes are great low-potassium fruit snacks.", { evidenceLevel: "moderate" }),
  mk("kid-015", "kidney", "Walking 30 minutes daily reduces kidney disease progression.", { evidenceLevel: "strong" }),
];

const THYROID_TIPS: DailyTip[] = [
  mk("thy-001", "thyroid", "Brazil nuts contain selenium that supports thyroid function — just 2 per day.", { evidenceLevel: "strong", conditions: ["hypothyroid", "thyroid"] }),
  mk("thy-002", "thyroid", "Iodized salt provides iodine essential for thyroid hormone production.", { evidenceLevel: "strong" }),
  mk("thy-003", "thyroid", "Chronic stress raises cortisol which can suppress thyroid function — try meditation.", { evidenceLevel: "moderate" }),
  mk("thy-004", "thyroid", "Take thyroid medication on an empty stomach — calcium and iron block absorption.", { evidenceLevel: "strong", actionable: false }),
  mk("thy-005", "thyroid", "Zinc and selenium together support T4 to T3 conversion — pumpkin seeds have both.", { evidenceLevel: "moderate" }),
  mk("thy-006", "thyroid", "Cooked cruciferous vegetables are fine even with thyroid issues — heat deactivates goitrogens.", { evidenceLevel: "moderate" }),
  mk("thy-007", "thyroid", "Sleep affects TSH levels — prioritizing 7-8 hours stabilizes thyroid function.", { evidenceLevel: "moderate" }),
  mk("thy-008", "thyroid", "Seaweed (in moderation) is one of the few food sources of natural iodine.", { evidenceLevel: "strong" }),
  mk("thy-009", "thyroid", "Soy can interfere with thyroid medication absorption — space them at least 4 hours apart.", { evidenceLevel: "moderate" }),
  mk("thy-010", "thyroid", "Vitamin D deficiency is common in thyroid conditions — get your levels checked.", { evidenceLevel: "moderate", actionable: false }),
  mk("thy-011", "thyroid", "Gentle walking and yoga support energy levels when thyroid is sluggish.", { evidenceLevel: "moderate" }),
  mk("thy-012", "thyroid", "Whole grains and fiber help relieve constipation, a common hypothyroid symptom.", { evidenceLevel: "strong" }),
  mk("thy-013", "thyroid", "Tyrosine, found in chicken, eggs, and dairy, is a thyroid hormone building block.", { evidenceLevel: "moderate" }),
  mk("thy-014", "thyroid", "Avoid fasting too long if thyroid is sluggish — eat every 4-5 hours.", { evidenceLevel: "emerging" }),
  mk("thy-015", "thyroid", "Get TSH rechecked every 6-12 weeks when adjusting thyroid medication.", { evidenceLevel: "strong", actionable: false }),
];

const IRON_TIPS: DailyTip[] = [
  mk("iron-001", "iron", "Vitamin C dramatically boosts iron absorption — pair iron-rich foods with citrus.", { evidenceLevel: "strong", conditions: ["anemia", "low iron", "iron deficiency"] }),
  mk("iron-002", "iron", "Cooking in a cast-iron skillet can increase the iron content of your food.", { evidenceLevel: "moderate" }),
  mk("iron-003", "iron", "Tea and coffee block iron absorption — wait 1 hour after iron-rich meals.", { evidenceLevel: "strong" }),
  mk("iron-004", "iron", "Beef liver is the most concentrated source of heme iron — a small portion goes far.", { evidenceLevel: "strong" }),
  mk("iron-005", "iron", "Spinach and lentils are great plant iron — eat them with bell peppers or strawberries.", { evidenceLevel: "moderate" }),
  mk("iron-006", "iron", "Calcium competes with iron — don't take supplements together.", { evidenceLevel: "strong", actionable: false }),
  mk("iron-007", "iron", "Iron supplements are best absorbed on an empty stomach — but take with food if it upsets your gut.", { evidenceLevel: "strong" }),
  mk("iron-008", "iron", "Heavy menstrual periods are a top cause of iron deficiency — flag to your doctor.", { evidenceLevel: "strong", gender: "female", actionable: false }),
  mk("iron-009", "iron", "Pumpkin seeds are a great plant-based iron source — sprinkle on salads.", { evidenceLevel: "moderate" }),
  mk("iron-010", "iron", "Dark chocolate has more iron than many other snacks — small treats add up.", { evidenceLevel: "moderate" }),
  mk("iron-011", "iron", "Soaking and sprouting beans reduces phytates that inhibit iron absorption.", { evidenceLevel: "moderate" }),
  mk("iron-012", "iron", "Quinoa is one of the highest-iron grains — try it instead of rice.", { evidenceLevel: "moderate" }),
  mk("iron-013", "iron", "Pair plant iron with animal protein at the same meal — the 'meat factor' boosts absorption.", { evidenceLevel: "strong" }),
  mk("iron-014", "iron", "Persistent fatigue, pale skin, and cold hands warrant an iron check.", { evidenceLevel: "strong", actionable: false }),
  mk("iron-015", "iron", "Liquid iron supplements often cause less constipation than tablets — ask your pharmacist.", { evidenceLevel: "moderate" }),
];

const VITAMIN_D_TIPS: DailyTip[] = [
  mk("vd-001", "vitamin_d", "Just 10-15 minutes of midday sun on bare arms helps your body make vitamin D.", { evidenceLevel: "strong" }),
  mk("vd-002", "vitamin_d", "Fatty fish (salmon, sardines) is the richest food source of vitamin D.", { evidenceLevel: "strong" }),
  mk("vd-003", "vitamin_d", "Egg yolks contain natural vitamin D — eat the whole egg.", { evidenceLevel: "moderate" }),
  mk("vd-004", "vitamin_d", "Mushrooms exposed to UV light produce significant vitamin D — check the label.", { evidenceLevel: "moderate" }),
  mk("vd-005", "vitamin_d", "Vitamin D is fat-soluble — take supplements with a meal that contains fat.", { evidenceLevel: "strong" }),
  mk("vd-006", "vitamin_d", "Most adults benefit from 1,000-2,000 IU vitamin D in winter — ask your doctor.", { evidenceLevel: "strong" }),
  mk("vd-007", "vitamin_d", "Darker skin needs more sun exposure to produce the same amount of vitamin D.", { evidenceLevel: "strong" }),
  mk("vd-008", "vitamin_d", "Low vitamin D is linked to fatigue, low mood, and frequent infections.", { evidenceLevel: "strong", actionable: false }),
  mk("vd-009", "vitamin_d", "Vitamin D works with K2 — leafy greens and natto contain K2.", { evidenceLevel: "moderate" }),
  mk("vd-010", "vitamin_d", "Cod liver oil packs vitamin D + omega-3s + vitamin A in one — old remedy, still useful.", { evidenceLevel: "moderate" }),
  mk("vd-011", "vitamin_d", "Office workers often have low vitamin D — get outside on lunch breaks.", { evidenceLevel: "moderate" }),
  mk("vd-012", "vitamin_d", "Sunscreen blocks vitamin D production — get a few minutes of sun before applying.", { evidenceLevel: "moderate" }),
  mk("vd-013", "vitamin_d", "If you're over 60, vitamin D + calcium reduces fracture risk.", { evidenceLevel: "strong", ageMin: 60 }),
  mk("vd-014", "vitamin_d", "Aim for blood levels of 30-50 ng/mL for optimal vitamin D status.", { evidenceLevel: "strong", actionable: false }),
  mk("vd-015", "vitamin_d", "Don't take more than 4,000 IU/day without a doctor's recommendation — toxicity is possible.", { evidenceLevel: "strong", actionable: false }),
];

const B12_TIPS: DailyTip[] = [
  mk("b12-001", "b12_folate", "B12 is only in animal foods — vegans should supplement or eat fortified foods.", { evidenceLevel: "strong" }),
  mk("b12-002", "b12_folate", "Folate is highest in leafy greens, beans, and asparagus — eat them often.", { evidenceLevel: "strong" }),
  mk("b12-003", "b12_folate", "Persistent fatigue, tingling, or memory issues can signal B12 deficiency.", { evidenceLevel: "strong", actionable: false }),
  mk("b12-004", "b12_folate", "Long-term acid reducers (omeprazole, etc.) lower B12 absorption.", { evidenceLevel: "strong", actionable: false }),
  mk("b12-005", "b12_folate", "Sublingual B12 is well-absorbed when stomach acid is low.", { evidenceLevel: "moderate" }),
  mk("b12-006", "b12_folate", "Nutritional yeast is a vegan-friendly source of fortified B12 — sprinkle on popcorn.", { evidenceLevel: "moderate" }),
  mk("b12-007", "b12_folate", "Folate-rich foods support healthy red blood cells and DNA repair.", { evidenceLevel: "strong" }),
  mk("b12-008", "b12_folate", "Methylated forms of B12 (methylcobalamin) are well-absorbed in some genetic variants.", { evidenceLevel: "moderate" }),
  mk("b12-009", "b12_folate", "Eggs, dairy, salmon, and clams are excellent B12 sources.", { evidenceLevel: "strong" }),
  mk("b12-010", "b12_folate", "Adults over 50 should get B12 from fortified foods or supplements — absorption drops.", { evidenceLevel: "strong", ageMin: 50 }),
  mk("b12-011", "b12_folate", "Folate is critical in pregnancy — start a prenatal vitamin early.", { evidenceLevel: "strong", gender: "female", actionable: false }),
  mk("b12-012", "b12_folate", "Don't cook leafy greens too long — folate degrades with heat.", { evidenceLevel: "moderate" }),
  mk("b12-013", "b12_folate", "Liver is one of the most concentrated B12 sources — a once-a-week serving covers a lot.", { evidenceLevel: "strong" }),
  mk("b12-014", "b12_folate", "Pernicious anemia (autoimmune B12 deficiency) needs injections, not pills.", { evidenceLevel: "strong", actionable: false }),
  mk("b12-015", "b12_folate", "Pair B vitamins together — they work synergistically in a B-complex.", { evidenceLevel: "moderate" }),
];

const SLEEP_TIPS: DailyTip[] = [
  mk("sleep-001", "sleep", "Go to bed and wake up at the same time every day — even on weekends.", { evidenceLevel: "strong" }),
  mk("sleep-002", "sleep", "Stop caffeine after noon — it has a 6-hour half-life and can wreck deep sleep.", { evidenceLevel: "strong" }),
  mk("sleep-003", "sleep", "Cool your bedroom to 60-67°F — body temperature must drop to fall asleep.", { evidenceLevel: "strong" }),
  mk("sleep-004", "sleep", "Get bright light within an hour of waking — it sets your circadian clock.", { evidenceLevel: "strong" }),
  mk("sleep-005", "sleep", "Dim screens 1-2 hours before bed — blue light suppresses melatonin.", { evidenceLevel: "moderate" }),
  mk("sleep-006", "sleep", "Try magnesium glycinate 30 minutes before bed — many find it deepens sleep.", { evidenceLevel: "moderate" }),
  mk("sleep-007", "sleep", "Write tomorrow's to-do list before bed — it quiets the racing mind.", { evidenceLevel: "moderate" }),
  mk("sleep-008", "sleep", "Avoid alcohol within 3 hours of bed — it fragments sleep even if you fall asleep faster.", { evidenceLevel: "strong" }),
  mk("sleep-009", "sleep", "Try the 4-7-8 breathing technique — inhale 4, hold 7, exhale 8.", { evidenceLevel: "moderate" }),
  mk("sleep-010", "sleep", "Tart cherry juice has natural melatonin — small glass before bed.", { evidenceLevel: "moderate" }),
  mk("sleep-011", "sleep", "If you can't sleep after 20 minutes, get up — train your brain that bed equals sleep.", { evidenceLevel: "strong" }),
  mk("sleep-012", "sleep", "Keep your bedroom dark — even small lights disrupt melatonin production.", { evidenceLevel: "strong" }),
  mk("sleep-013", "sleep", "Hot showers 90 minutes before bed help you sleep faster — the cooling effect signals sleep.", { evidenceLevel: "moderate" }),
  mk("sleep-014", "sleep", "Avoid heavy meals within 3 hours of bedtime — digestion interferes with deep sleep.", { evidenceLevel: "moderate" }),
  mk("sleep-015", "sleep", "Naps under 30 minutes don't ruin nighttime sleep and boost alertness.", { evidenceLevel: "strong" }),
  mk("sleep-016", "sleep", "If you snore loudly and feel tired, ask your doctor about sleep apnea.", { evidenceLevel: "strong", actionable: false }),
  mk("sleep-017", "sleep", "Sleep is when your brain clears toxins — 7-9 hours protects against dementia.", { evidenceLevel: "strong" }),
  mk("sleep-018", "sleep", "White noise machines or fans help mask environmental sleep disruptions.", { evidenceLevel: "moderate" }),
  mk("sleep-019", "sleep", "Phone in another room — even 'do not disturb' notifications wake your brain.", { evidenceLevel: "moderate" }),
  mk("sleep-020", "sleep", "Try journaling 3 things you're grateful for — gratitude lowers nighttime cortisol.", { evidenceLevel: "moderate" }),
];

const STRESS_TIPS: DailyTip[] = [
  mk("stress-001", "stress", "Five minutes of deep breathing activates your parasympathetic system — try it now.", { evidenceLevel: "strong" }),
  mk("stress-002", "stress", "A 10-minute walk outside reduces cortisol more than a 10-minute walk indoors.", { evidenceLevel: "strong" }),
  mk("stress-003", "stress", "Mindfulness meditation (even 10 min/day) reduces anxiety after 8 weeks.", { evidenceLevel: "strong" }),
  mk("stress-004", "stress", "Naming an emotion ('I feel anxious') reduces its intensity by activating the prefrontal cortex.", { evidenceLevel: "strong" }),
  mk("stress-005", "stress", "Hug someone you love for 20 seconds — releases oxytocin and lowers blood pressure.", { evidenceLevel: "moderate" }),
  mk("stress-006", "stress", "Cold water on your face triggers the dive reflex and rapidly calms the nervous system.", { evidenceLevel: "moderate" }),
  mk("stress-007", "stress", "Journaling for 15 minutes reduces stress and improves immune function.", { evidenceLevel: "moderate" }),
  mk("stress-008", "stress", "Texting a friend you care about boosts your mood and theirs — try it today.", { evidenceLevel: "moderate" }),
  mk("stress-009", "stress", "Limit news intake to twice a day — constant updates fuel anxiety.", { evidenceLevel: "moderate" }),
  mk("stress-010", "stress", "Listen to your favorite song — music releases dopamine and lowers cortisol.", { evidenceLevel: "moderate" }),
  mk("stress-011", "stress", "Forest bathing (just walking among trees) lowers cortisol within 20 minutes.", { evidenceLevel: "moderate" }),
  mk("stress-012", "stress", "Practice the 5-4-3-2-1 grounding technique when overwhelmed — five things you see, four you hear, etc.", { evidenceLevel: "moderate" }),
  mk("stress-013", "stress", "Therapy works — even a few CBT sessions improve mood and resilience.", { evidenceLevel: "strong", actionable: false }),
  mk("stress-014", "stress", "Exercise is as effective as antidepressants for mild-to-moderate depression.", { evidenceLevel: "strong" }),
  mk("stress-015", "stress", "Pet a dog or cat for 10 minutes — measurable cortisol drop.", { evidenceLevel: "moderate" }),
  mk("stress-016", "stress", "Limit alcohol — it worsens anxiety the next day even if it relaxes you in the moment.", { evidenceLevel: "strong" }),
  mk("stress-017", "stress", "Box breathing (4-4-4-4) is used by Navy SEALs to stay calm under pressure.", { evidenceLevel: "moderate" }),
  mk("stress-018", "stress", "A weighted blanket can lower nighttime anxiety and improve sleep.", { evidenceLevel: "moderate" }),
  mk("stress-019", "stress", "Compassion meditation strengthens emotional resilience — try a 10-min guided one.", { evidenceLevel: "moderate" }),
  mk("stress-020", "stress", "Schedule worry time — 15 minutes a day to think about problems, then move on.", { evidenceLevel: "moderate" }),
];

const NUTRITION_TIPS: DailyTip[] = [
  mk("nutr-001", "nutrition", "Half your plate as vegetables is the single best dietary rule — try it at lunch.", { evidenceLevel: "strong" }),
  mk("nutr-002", "nutrition", "Eat slowly — your brain takes 20 minutes to register fullness.", { evidenceLevel: "strong" }),
  mk("nutr-003", "nutrition", "Pre-cut vegetables in the fridge mean you'll actually eat them.", { evidenceLevel: "moderate" }),
  mk("nutr-004", "nutrition", "Cook at home one more meal a week — even simple cooking beats takeout.", { evidenceLevel: "strong" }),
  mk("nutr-005", "nutrition", "Eat the rainbow — colorful produce provides diverse antioxidants.", { evidenceLevel: "strong" }),
  mk("nutr-006", "nutrition", "Use smaller plates — your eyes calibrate portion size before your stomach does.", { evidenceLevel: "moderate" }),
  mk("nutr-007", "nutrition", "Don't drink your calories — liquid sugar doesn't trigger fullness.", { evidenceLevel: "strong" }),
  mk("nutr-008", "nutrition", "A handful of nuts is a portion — measure once and then eyeball it.", { evidenceLevel: "moderate" }),
  mk("nutr-009", "nutrition", "Frozen vegetables are just as nutritious as fresh — and they don't go bad.", { evidenceLevel: "strong" }),
  mk("nutr-010", "nutrition", "Eat protein with every meal — it stabilizes blood sugar and keeps you full.", { evidenceLevel: "strong" }),
  mk("nutr-011", "nutrition", "Whole grains over refined — brown rice and whole-wheat bread have more fiber and minerals.", { evidenceLevel: "strong" }),
  mk("nutr-012", "nutrition", "Mindful eating: no phone, no TV, just food — you'll naturally eat less.", { evidenceLevel: "moderate" }),
  mk("nutr-013", "nutrition", "Add one serving of beans or lentils this week — they're nutritional powerhouses.", { evidenceLevel: "strong" }),
  mk("nutr-014", "nutrition", "Read ingredient labels — if you can't pronounce it, your liver doesn't love it either.", { evidenceLevel: "moderate" }),
  mk("nutr-015", "nutrition", "Eat fish twice a week — sardines are budget-friendly and packed with nutrients.", { evidenceLevel: "strong" }),
  mk("nutr-016", "nutrition", "Bone broth provides collagen, minerals, and is gentle on the gut.", { evidenceLevel: "emerging" }),
  mk("nutr-017", "nutrition", "Sprouted seeds and grains are easier to digest and have more bioavailable nutrients.", { evidenceLevel: "moderate" }),
  mk("nutr-018", "nutrition", "Spices like turmeric, ginger, and rosemary are micro-nutrient bombs — use them generously.", { evidenceLevel: "moderate" }),
  mk("nutr-019", "nutrition", "Limit ultra-processed foods to 10% of calories — they're linked to most chronic disease.", { evidenceLevel: "strong" }),
  mk("nutr-020", "nutrition", "Eating dinner 3+ hours before bed improves digestion, sleep, and metabolism.", { evidenceLevel: "moderate" }),
];

const HYDRATION_TIPS: DailyTip[] = [
  mk("hydr-001", "hydration", "Drink a glass of water first thing in the morning — you wake up dehydrated.", { evidenceLevel: "strong" }),
  mk("hydr-002", "hydration", "Pale yellow urine means you're well hydrated — dark yellow means drink more.", { evidenceLevel: "strong" }),
  mk("hydr-003", "hydration", "Keep a water bottle on your desk — visual cues drive consumption.", { evidenceLevel: "moderate" }),
  mk("hydr-004", "hydration", "Thirst is a late signal — by the time you feel it, you're already mildly dehydrated.", { evidenceLevel: "strong" }),
  mk("hydr-005", "hydration", "Add lemon, mint, or cucumber to water for variety — and free electrolytes.", { evidenceLevel: "moderate" }),
  mk("hydr-006", "hydration", "Sparkling water counts toward hydration — and it's a great soda swap.", { evidenceLevel: "strong" }),
  mk("hydr-007", "hydration", "Coffee and tea hydrate too — the diuretic effect is mild and net-positive.", { evidenceLevel: "strong" }),
  mk("hydr-008", "hydration", "Watermelon, cucumber, and tomatoes are 90%+ water — eat your hydration.", { evidenceLevel: "strong" }),
  mk("hydr-009", "hydration", "Drink water before meals — it reduces calorie intake and supports digestion.", { evidenceLevel: "moderate" }),
  mk("hydr-010", "hydration", "Replace one sugary drink today with sparkling water and a slice of lime.", { evidenceLevel: "strong" }),
  mk("hydr-011", "hydration", "Headache? Try a glass of water first — dehydration is a top cause.", { evidenceLevel: "moderate" }),
  mk("hydr-012", "hydration", "After exercise, drink water with a pinch of salt — replenishes lost sodium.", { evidenceLevel: "strong" }),
  mk("hydr-013", "hydration", "Older adults often have a weaker thirst response — keep water within reach.", { evidenceLevel: "strong", ageMin: 65 }),
  mk("hydr-014", "hydration", "Try room-temperature water if cold water is hard to drink in volume.", { evidenceLevel: "moderate" }),
  mk("hydr-015", "hydration", "Bone broth, herbal tea, and coconut water all support hydration nicely.", { evidenceLevel: "moderate" }),
];

const EXERCISE_TIPS: DailyTip[] = [
  mk("ex-001", "exercise", "10 minutes counts — short bouts of exercise improve health.", { evidenceLevel: "strong", activityLevel: ["sedentary", "low"] }),
  mk("ex-002", "exercise", "Take the stairs whenever you can — small choices compound.", { evidenceLevel: "strong" }),
  mk("ex-003", "exercise", "Aim for 8,000 steps a day — that's the all-cause mortality sweet spot.", { evidenceLevel: "strong" }),
  mk("ex-004", "exercise", "Strength training 2x a week prevents muscle loss and improves metabolism.", { evidenceLevel: "strong" }),
  mk("ex-005", "exercise", "Park farther from the entrance — easiest way to add 1,000 steps daily.", { evidenceLevel: "moderate", activityLevel: ["sedentary"] }),
  mk("ex-006", "exercise", "Standing for 6+ hours/day independently lowers cardiovascular risk.", { evidenceLevel: "strong" }),
  mk("ex-007", "exercise", "Walk during phone calls — your brain works better while moving anyway.", { evidenceLevel: "moderate" }),
  mk("ex-008", "exercise", "Try a 5-minute mobility routine before bed — improves recovery and sleep.", { evidenceLevel: "moderate" }),
  mk("ex-009", "exercise", "Dancing in your kitchen counts as cardio — and it's free fun.", { evidenceLevel: "moderate" }),
  mk("ex-010", "exercise", "If you exercise mornings, your sleep tonight will be deeper.", { evidenceLevel: "moderate" }),
  mk("ex-011", "exercise", "VO2 max is the strongest predictor of longevity — high-intensity intervals improve it fast.", { evidenceLevel: "strong" }),
  mk("ex-012", "exercise", "Resistance bands give a great workout in a small space — even hotel rooms.", { evidenceLevel: "moderate" }),
  mk("ex-013", "exercise", "After-meal walks blunt blood sugar spikes — even 10 minutes helps.", { evidenceLevel: "strong" }),
  mk("ex-014", "exercise", "Pick exercise you enjoy — adherence beats optimization.", { evidenceLevel: "strong" }),
  mk("ex-015", "exercise", "Grip strength is a longevity marker — squeeze a tennis ball when you watch TV.", { evidenceLevel: "moderate" }),
  mk("ex-016", "exercise", "Yoga and pilates improve flexibility, balance, and core strength.", { evidenceLevel: "strong" }),
  mk("ex-017", "exercise", "Try 'exercise snacks' — 1-2 min of squats or pushups every hour at your desk.", { evidenceLevel: "moderate" }),
  mk("ex-018", "exercise", "Train balance — stand on one leg while brushing teeth. Reduces falls in older adults.", { evidenceLevel: "strong", ageMin: 60 }),
  mk("ex-019", "exercise", "Swimming is gentle on joints and full-body — great for arthritis or back issues.", { evidenceLevel: "strong" }),
  mk("ex-020", "exercise", "Walking with a weighted pack ('rucking') builds bone density and strength.", { evidenceLevel: "moderate" }),
];

const INFLAMMATION_TIPS: DailyTip[] = [
  mk("inflam-001", "inflammation", "Turmeric (with black pepper) reduces inflammatory markers in many studies.", { evidenceLevel: "moderate" }),
  mk("inflam-002", "inflammation", "Berries are among the most anti-inflammatory foods — eat a cup daily.", { evidenceLevel: "strong" }),
  mk("inflam-003", "inflammation", "Omega-3s from fish lower CRP and other inflammation markers.", { evidenceLevel: "strong" }),
  mk("inflam-004", "inflammation", "Sugar drives inflammation — even reducing by 50% shows benefit in weeks.", { evidenceLevel: "strong" }),
  mk("inflam-005", "inflammation", "Green tea polyphenols are anti-inflammatory — aim for 2-3 cups daily.", { evidenceLevel: "moderate" }),
  mk("inflam-006", "inflammation", "Extra virgin olive oil contains oleocanthal, which works like a natural ibuprofen.", { evidenceLevel: "moderate" }),
  mk("inflam-007", "inflammation", "Sleep less than 6 hours raises inflammation — prioritize rest.", { evidenceLevel: "strong" }),
  mk("inflam-008", "inflammation", "Chronic stress drives inflammation — meditation has measurable effects after 8 weeks.", { evidenceLevel: "strong" }),
  mk("inflam-009", "inflammation", "Replace seed oils (corn, soybean) with olive or avocado oil at home.", { evidenceLevel: "moderate" }),
  mk("inflam-010", "inflammation", "Dark leafy greens lower inflammation through antioxidants and folate.", { evidenceLevel: "strong" }),
  mk("inflam-011", "inflammation", "Ginger is one of the most studied natural anti-inflammatories — try fresh ginger tea.", { evidenceLevel: "moderate" }),
  mk("inflam-012", "inflammation", "Walking 30 min/day lowers CRP — independent of weight loss.", { evidenceLevel: "strong" }),
  mk("inflam-013", "inflammation", "Tart cherry juice reduces post-exercise inflammation and muscle soreness.", { evidenceLevel: "moderate" }),
  mk("inflam-014", "inflammation", "Sauna sessions (3-4x/week) reduce inflammation and cardiovascular risk.", { evidenceLevel: "moderate" }),
  mk("inflam-015", "inflammation", "Avoiding processed meats lowers inflammation and cancer risk.", { evidenceLevel: "strong" }),
];

const GUT_TIPS: DailyTip[] = [
  mk("gut-001", "gut", "Eat 30 different plants per week — diversity feeds a diverse microbiome.", { evidenceLevel: "strong" }),
  mk("gut-002", "gut", "Fermented foods (kimchi, sauerkraut, kefir) deliver live probiotics.", { evidenceLevel: "strong" }),
  mk("gut-003", "gut", "Fiber feeds your gut bacteria — aim for 25-30g daily.", { evidenceLevel: "strong" }),
  mk("gut-004", "gut", "Resistant starch (cooled potatoes, green bananas) feeds beneficial gut bacteria.", { evidenceLevel: "moderate" }),
  mk("gut-005", "gut", "Stress disrupts the gut — that 'gut feeling' is real.", { evidenceLevel: "strong" }),
  mk("gut-006", "gut", "Antibiotics disrupt gut bacteria for months — eat probiotic foods after a course.", { evidenceLevel: "strong" }),
  mk("gut-007", "gut", "Sleep affects gut microbes too — poor sleep shifts the bacterial balance.", { evidenceLevel: "moderate" }),
  mk("gut-008", "gut", "Bone broth supports gut lining repair — sip a cup a few times a week.", { evidenceLevel: "emerging" }),
  mk("gut-009", "gut", "Chew thoroughly — digestion starts in the mouth, and saliva contains enzymes.", { evidenceLevel: "moderate" }),
  mk("gut-010", "gut", "Try a meal of legumes, garlic, and onions — all prebiotics that feed good bacteria.", { evidenceLevel: "strong" }),
  mk("gut-011", "gut", "Artificial sweeteners may disrupt gut bacteria — go natural when you can.", { evidenceLevel: "moderate" }),
  mk("gut-012", "gut", "Plain yogurt with live cultures is one of the easiest probiotic foods.", { evidenceLevel: "strong" }),
  mk("gut-013", "gut", "If you bloat after dairy, try lactose-free or A2 milk.", { evidenceLevel: "strong" }),
  mk("gut-014", "gut", "Peppermint tea calms IBS symptoms naturally.", { evidenceLevel: "moderate" }),
  mk("gut-015", "gut", "Walking after meals aids digestion and reduces bloat.", { evidenceLevel: "strong" }),
];

const BONE_TIPS: DailyTip[] = [
  mk("bone-001", "bone", "Weight-bearing exercise (walking, dancing) is essential for bone density.", { evidenceLevel: "strong" }),
  mk("bone-002", "bone", "Calcium + vitamin D + vitamin K together support bone strength.", { evidenceLevel: "strong" }),
  mk("bone-003", "bone", "Sardines (with bones) are the most calcium-dense fish — a hidden superfood.", { evidenceLevel: "strong" }),
  mk("bone-004", "bone", "Leafy greens (kale, collards) are great non-dairy calcium sources.", { evidenceLevel: "strong" }),
  mk("bone-005", "bone", "Strength training builds bone density at any age — even 70+.", { evidenceLevel: "strong", ageMin: 50 }),
  mk("bone-006", "bone", "Adequate protein protects bone — about 0.8-1g per kg body weight daily.", { evidenceLevel: "strong" }),
  mk("bone-007", "bone", "Avoiding excess sodium reduces calcium loss in urine.", { evidenceLevel: "moderate" }),
  mk("bone-008", "bone", "Limit sodas — phosphoric acid is linked to lower bone density.", { evidenceLevel: "moderate" }),
  mk("bone-009", "bone", "Yoga and tai chi improve balance and reduce fracture risk in older adults.", { evidenceLevel: "strong", ageMin: 60 }),
  mk("bone-010", "bone", "Smoking weakens bones — quitting improves bone density.", { evidenceLevel: "strong", conditions: ["smoking", "smoker"] }),
  mk("bone-011", "bone", "Postmenopausal women should consider a bone density (DEXA) scan.", { evidenceLevel: "strong", gender: "female", ageMin: 50, actionable: false }),
  mk("bone-012", "bone", "Vitamin K2 (natto, hard cheese, egg yolks) directs calcium to bones, not arteries.", { evidenceLevel: "moderate" }),
  mk("bone-013", "bone", "Magnesium is also needed for bone health — get it from nuts, seeds, and greens.", { evidenceLevel: "moderate" }),
  mk("bone-014", "bone", "Jumping or skipping a few times daily stimulates bone growth.", { evidenceLevel: "moderate" }),
  mk("bone-015", "bone", "Excessive alcohol harms bone density — keep it moderate.", { evidenceLevel: "strong" }),
];

const IMMUNE_TIPS: DailyTip[] = [
  mk("imm-001", "immune", "Sleep is your immune system's reset — 7-9 hours strengthens defenses.", { evidenceLevel: "strong" }),
  mk("imm-002", "immune", "Vitamin C from oranges, peppers, and kiwi supports immune cell function.", { evidenceLevel: "strong" }),
  mk("imm-003", "immune", "Zinc from pumpkin seeds, beans, and shellfish shortens cold duration.", { evidenceLevel: "strong" }),
  mk("imm-004", "immune", "Garlic, onions, and ginger have antimicrobial properties — cook with them often.", { evidenceLevel: "moderate" }),
  mk("imm-005", "immune", "Probiotic foods support gut immunity — yogurt, kefir, kimchi.", { evidenceLevel: "strong" }),
  mk("imm-006", "immune", "Chronic stress suppresses immune function — recovery matters.", { evidenceLevel: "strong" }),
  mk("imm-007", "immune", "Wash hands for 20+ seconds — still the single most effective infection prevention.", { evidenceLevel: "strong" }),
  mk("imm-008", "immune", "Vitamin D deficiency is linked to more infections — get yours tested.", { evidenceLevel: "strong", actionable: false }),
  mk("imm-009", "immune", "Mushrooms (especially shiitake) contain beta-glucans that prime immune cells.", { evidenceLevel: "moderate" }),
  mk("imm-010", "immune", "Cold showers may boost white blood cell counts and resilience.", { evidenceLevel: "emerging" }),
  mk("imm-011", "immune", "Elderberry syrup may reduce cold severity if started at first symptoms.", { evidenceLevel: "moderate" }),
  mk("imm-012", "immune", "Bone broth provides amino acids that support immune cell production.", { evidenceLevel: "emerging" }),
  mk("imm-013", "immune", "Honey soothes sore throats and has antimicrobial activity.", { evidenceLevel: "moderate" }),
  mk("imm-014", "immune", "Limit alcohol when fighting infection — it impairs white blood cells.", { evidenceLevel: "strong" }),
  mk("imm-015", "immune", "Moderate exercise boosts immunity — extreme exercise temporarily suppresses it.", { evidenceLevel: "strong" }),
];

const SMOKING_TIPS: DailyTip[] = [
  mk("smk-001", "smoking", "Within 20 minutes of quitting, heart rate and blood pressure drop.", { evidenceLevel: "strong", conditions: ["smoking", "smoker"] }),
  mk("smk-002", "smoking", "After 1 year smoke-free, your heart disease risk is cut in half.", { evidenceLevel: "strong", conditions: ["smoking", "smoker"] }),
  mk("smk-003", "smoking", "Nicotine replacement (patches, gum) doubles your odds of quitting successfully.", { evidenceLevel: "strong", conditions: ["smoking", "smoker"] }),
  mk("smk-004", "smoking", "Cravings only last 3-5 minutes — distract yourself with a walk or glass of water.", { evidenceLevel: "moderate", conditions: ["smoking", "smoker"] }),
  mk("smk-005", "smoking", "Identify your top 3 smoking triggers — coffee, stress, social? Have a plan for each.", { evidenceLevel: "strong", conditions: ["smoking", "smoker"] }),
  mk("smk-006", "smoking", "Vaping is not 'safe' — but it's significantly less harmful than smoking for current smokers.", { evidenceLevel: "moderate", conditions: ["smoking", "smoker"] }),
  mk("smk-007", "smoking", "Tell three people you're quitting — public commitment boosts success rates.", { evidenceLevel: "moderate", conditions: ["smoking", "smoker"] }),
  mk("smk-008", "smoking", "Use quitlines (1-800-QUIT-NOW in the US) — free counseling doubles quit rates.", { evidenceLevel: "strong", conditions: ["smoking", "smoker"], actionable: false }),
  mk("smk-009", "smoking", "After 5 years smoke-free, your stroke risk matches a non-smoker.", { evidenceLevel: "strong", conditions: ["smoking", "smoker"] }),
  mk("smk-010", "smoking", "Carrots, gum, and toothpicks help with the oral fixation part of quitting.", { evidenceLevel: "moderate", conditions: ["smoking", "smoker"] }),
];

const WELLNESS_TIPS: DailyTip[] = [
  mk("well-001", "wellness", "Practice gratitude — write 3 things you're grateful for today.", { evidenceLevel: "strong" }),
  mk("well-002", "wellness", "Call someone you love — social connection adds years to your life.", { evidenceLevel: "strong" }),
  mk("well-003", "wellness", "Spend 20 minutes outside today — fresh air and sunlight lift mood.", { evidenceLevel: "strong" }),
  mk("well-004", "wellness", "Laugh out loud — even forced laughter releases endorphins.", { evidenceLevel: "moderate" }),
  mk("well-005", "wellness", "Volunteer or help someone today — altruism boosts happiness and longevity.", { evidenceLevel: "moderate" }),
  mk("well-006", "wellness", "Read for 10 minutes — reading lowers stress more than walking.", { evidenceLevel: "moderate" }),
  mk("well-007", "wellness", "Limit screen time before bed — your sleep and mood will both thank you.", { evidenceLevel: "moderate" }),
  mk("well-008", "wellness", "Try a 'digital sabbath' — one day a week off social media.", { evidenceLevel: "moderate" }),
  mk("well-009", "wellness", "Sing in the shower — releases endorphins and improves lung capacity.", { evidenceLevel: "emerging" }),
  mk("well-010", "wellness", "Hug a loved one for 20+ seconds — releases oxytocin.", { evidenceLevel: "moderate" }),
  mk("well-011", "wellness", "Stretch for 5 minutes when you wake up — sets a positive body tone for the day.", { evidenceLevel: "moderate" }),
  mk("well-012", "wellness", "Schedule downtime — rest is productive.", { evidenceLevel: "strong" }),
  mk("well-013", "wellness", "Curiosity is linked to longevity — learn one new thing today.", { evidenceLevel: "moderate" }),
  mk("well-014", "wellness", "Spend time with people who make you laugh — humor heals.", { evidenceLevel: "moderate" }),
  mk("well-015", "wellness", "Limit alcohol — even moderate drinking is now linked to cancer risk.", { evidenceLevel: "strong" }),
  mk("well-016", "wellness", "Annual checkups catch problems early — book one if you haven't this year.", { evidenceLevel: "strong", actionable: false }),
  mk("well-017", "wellness", "Sit less, move more — even short standing breaks count.", { evidenceLevel: "strong" }),
  mk("well-018", "wellness", "Forgiveness — even of yourself — lowers blood pressure and improves mood.", { evidenceLevel: "moderate" }),
  mk("well-019", "wellness", "Have a hobby that's not your job — purpose and flow protect mental health.", { evidenceLevel: "strong" }),
  mk("well-020", "wellness", "Live near or visit green spaces — even brief exposure lowers cortisol.", { evidenceLevel: "moderate" }),
];

/**
 * The complete tip library — 240+ tips across 20+ categories.
 */
export const DAILY_TIPS: DailyTip[] = [
  ...CHOLESTEROL_TIPS,
  ...GLUCOSE_TIPS,
  ...BLOOD_PRESSURE_TIPS,
  ...HEART_TIPS,
  ...LIVER_TIPS,
  ...KIDNEY_TIPS,
  ...THYROID_TIPS,
  ...IRON_TIPS,
  ...VITAMIN_D_TIPS,
  ...B12_TIPS,
  ...SLEEP_TIPS,
  ...STRESS_TIPS,
  ...NUTRITION_TIPS,
  ...HYDRATION_TIPS,
  ...EXERCISE_TIPS,
  ...INFLAMMATION_TIPS,
  ...GUT_TIPS,
  ...BONE_TIPS,
  ...IMMUNE_TIPS,
  ...SMOKING_TIPS,
  ...WELLNESS_TIPS,
];

// ── Personalization Engine ──────────────────────────────────────

/**
 * User context for personalization. All fields optional — partial data
 * still produces useful results.
 */
export interface UserContext {
  /** Flagged biomarkers from latest report. */
  concerns?: Array<{ name: string; flag: string }>;
  /** Known conditions from health profile. */
  conditions?: string[];
  /** Active medications by name. */
  medications?: string[];
  age?: number;
  gender?: "male" | "female";
  activityLevel?: string; // 'sedentary' | 'light' | 'moderate' | 'active' | etc.
  smokingStatus?: string; // 'current' | 'former' | 'never' | etc.
  sleepHours?: string; // e.g. '< 5', '5-6', '7-8', etc.
  /** Tip ids the user has dismissed. */
  dismissedTipIds?: Set<string> | string[];
}

const normalizeSet = (val: Set<string> | string[] | undefined): Set<string> => {
  if (!val) return new Set();
  if (val instanceof Set) return val;
  return new Set(val);
};

/**
 * A user is considered an "active smoker" for tip-targeting purposes
 * when their smoking_status is anything other than "none" / "never" /
 * "former". Profiles in this app use values like "occasionally" or
 * "daily" — both should receive cessation tips.
 */
function isActiveSmoker(smokingStatus: string | undefined): boolean {
  if (!smokingStatus) return false;
  const lower = smokingStatus.toLowerCase();
  if (
    lower === "none" ||
    lower === "never" ||
    lower === "former" ||
    lower === "quit"
  ) {
    return false;
  }
  return true;
}

const normalizeConditions = (
  ctx: UserContext
): string[] => {
  const list: string[] = [];
  if (ctx.conditions) {
    for (const c of ctx.conditions) list.push(c.toLowerCase());
  }
  if (isActiveSmoker(ctx.smokingStatus)) {
    list.push("smoking");
    list.push("smoker");
  }
  return list;
};

/**
 * Score a single tip for relevance to the given user context.
 * Higher score = more relevant. Negative score = should not show.
 */
function scoreTip(tip: DailyTip, ctx: UserContext): number {
  let score = 0;
  const dismissed = normalizeSet(ctx.dismissedTipIds);
  if (dismissed.has(tip.id)) return -1000;

  // Age filter — hard reject if outside range
  if (typeof ctx.age === "number") {
    if (typeof tip.ageMin === "number" && ctx.age < tip.ageMin) return -1000;
    if (typeof tip.ageMax === "number" && ctx.age > tip.ageMax) return -1000;
    // Bonus when tip explicitly targets the age range
    if (typeof tip.ageMin === "number" || typeof tip.ageMax === "number") {
      score += 5;
    }
  }

  // Gender filter — hard reject if mismatched
  if (tip.gender && ctx.gender && tip.gender !== ctx.gender) return -1000;
  if (tip.gender && ctx.gender && tip.gender === ctx.gender) score += 5;

  // Activity-level matching
  if (tip.activityLevel && ctx.activityLevel) {
    if (tip.activityLevel.includes(ctx.activityLevel.toLowerCase())) {
      score += 15;
    }
  }

  // Conditions match
  const userConds = normalizeConditions(ctx);
  if (tip.conditions && tip.conditions.length > 0) {
    const tipConds = tip.conditions.map((c) => c.toLowerCase());
    if (tipConds.some((tc) => userConds.some((uc) => uc.includes(tc) || tc.includes(uc)))) {
      score += 30;
    }
  }

  // Biomarker category boost
  const flaggedCategories = ctx.concerns
    ? getCategoriesFromBiomarkers(ctx.concerns)
    : [];
  if (flaggedCategories.includes(tip.category)) {
    // Red flags get a bigger bump than yellow
    const hasRedForCategory = (ctx.concerns ?? []).some((c) => {
      const lower = (c.name || "").toLowerCase();
      const map = BIOMARKER_TO_CATEGORY.find(
        (m) => m.category === tip.category
      );
      if (!map) return false;
      return (
        c.flag === "red" && map.keywords.some((kw) => lower.includes(kw))
      );
    });
    score += hasRedForCategory ? 50 : 25;
  }

  // Sleep tips for poor sleepers ('5_or_less', '6', or any '<' / 'less' string).
  if (tip.category === "sleep" && ctx.sleepHours) {
    const sh = ctx.sleepHours.toLowerCase();
    if (
      sh.includes("<") ||
      sh.startsWith("5") ||
      sh.startsWith("6") ||
      sh.includes("less") ||
      sh.includes("under")
    ) {
      score += 20;
    }
  }

  // Sedentary users get more exercise tips
  if (
    tip.category === "exercise" &&
    ctx.activityLevel &&
    ["sedentary", "low", "light"].includes(ctx.activityLevel.toLowerCase())
  ) {
    score += 15;
  }

  // Smokers get cessation tips
  if (tip.category === "smoking") {
    if (isActiveSmoker(ctx.smokingStatus)) {
      score += 40;
    } else if (ctx.smokingStatus) {
      // Explicit non-smoker — don't surface cessation tips
      return -1000;
    } else {
      // Unknown — strongly deprioritize but don't hard-exclude
      score -= 30;
    }
  }

  // Evidence-level bonus
  if (tip.evidenceLevel === "strong") score += 3;
  if (tip.evidenceLevel === "moderate") score += 1;

  return score;
}

/**
 * Result of personalization: the chosen tip plus the reasons it was
 * selected (for display in the dashboard hint).
 */
export interface SelectionResult {
  tip: DailyTip;
  reasons: string[];
}

/**
 * Build a friendly explanation for why a tip was chosen.
 */
function explainSelection(tip: DailyTip, ctx: UserContext): string[] {
  const reasons: string[] = [];

  const flaggedCategories = ctx.concerns
    ? getCategoriesFromBiomarkers(ctx.concerns)
    : [];
  if (flaggedCategories.includes(tip.category)) {
    const concernNames = (ctx.concerns ?? [])
      .map((c) => c.name)
      .filter(Boolean);
    if (concernNames.length > 0) {
      reasons.push(
        `Selected because of your ${concernNames.slice(0, 2).join(", ")} results`
      );
    } else {
      reasons.push(`Relevant to your ${CATEGORY_LABELS[tip.category]} markers`);
    }
  }

  const userConds = normalizeConditions(ctx);
  if (
    tip.conditions &&
    tip.conditions.some((tc) =>
      userConds.some((uc) => uc.includes(tc.toLowerCase()))
    )
  ) {
    reasons.push("Relevant to a condition you tracked");
  }

  if (
    tip.category === "exercise" &&
    ctx.activityLevel &&
    ["sedentary", "low", "light"].includes(ctx.activityLevel.toLowerCase())
  ) {
    reasons.push("Based on your activity level");
  }

  if (tip.category === "sleep" && ctx.sleepHours) {
    const sh = ctx.sleepHours.toLowerCase();
    if (
      sh.includes("<") ||
      sh.startsWith("5") ||
      sh.startsWith("6") ||
      sh.includes("less")
    ) {
      reasons.push("Because you reported short sleep");
    }
  }

  if (tip.category === "smoking" && isActiveSmoker(ctx.smokingStatus)) {
    reasons.push("To support your journey to quit smoking");
  }

  return reasons;
}

/**
 * Returns a personalized scored pool of tips, sorted by relevance.
 * Tips with negative score (dismissed/filtered) are excluded.
 */
export function getPersonalizedPool(ctx: UserContext): DailyTip[] {
  return DAILY_TIPS.map((tip) => ({ tip, score: scoreTip(tip, ctx) }))
    .filter((t) => t.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((t) => t.tip);
}

/**
 * Compute day-of-year (1-based). Used to rotate tips deterministically.
 */
export function dayOfYear(date: Date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Pick today's tip from a personalized pool using a deterministic rotation
 * keyed by the day of the year. Optionally accept an index offset to allow
 * users to cycle through alternatives.
 *
 * When the user has strong personalization signals (concerns, matching
 * conditions), high-relevance tips dominate the rotation. When signals
 * are weak, the rotation explores the wider pool for variety.
 */
export function selectDailyTip(
  ctx: UserContext,
  offset: number = 0
): SelectionResult | null {
  const scored = DAILY_TIPS
    .map((tip) => ({ tip, score: scoreTip(tip, ctx) }))
    .filter((t) => t.score >= 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;

  // Identify the "high-relevance" tier — those whose score is within 60%
  // of the top score, but no fewer than 3 tips for variety, and never
  // more than 25 to keep relevance meaningful.
  const topScore = scored[0].score;
  const threshold = Math.max(0, topScore * 0.6);
  const highRelevance = scored
    .filter((s, idx) => idx < 25 && (s.score >= threshold || idx < 3))
    .map((s) => s.tip);
  const lowRelevance = scored
    .slice(highRelevance.length)
    .map((s) => s.tip);

  const today = dayOfYear();

  // If the user has explicit, strong signals (top score >= 30) the rotation
  // stays entirely inside the high-relevance tier.
  const stayHigh = topScore >= 30 || lowRelevance.length === 0;
  const targetPool = stayHigh
    ? highRelevance
    : today % 10 < 7
      ? highRelevance
      : lowRelevance;

  const index = (today + offset) % targetPool.length;
  const tip = targetPool[index];

  return { tip, reasons: explainSelection(tip, ctx) };
}

/**
 * Group tips by category — used by the browse page.
 */
export function groupTipsByCategory(
  tips: DailyTip[] = DAILY_TIPS
): Record<TipCategory, DailyTip[]> {
  const groups = {} as Record<TipCategory, DailyTip[]>;
  for (const cat of Object.keys(CATEGORY_LABELS) as TipCategory[]) {
    groups[cat] = [];
  }
  for (const tip of tips) {
    if (!groups[tip.category]) groups[tip.category] = [];
    groups[tip.category].push(tip);
  }
  return groups;
}

/**
 * Compute a tip-completion streak from a chronological list of
 * 'completed' interaction timestamps (most recent first or any order).
 * Returns the number of consecutive days (ending today or yesterday) with
 * at least one completed tip.
 */
export function computeStreak(completedTimestamps: string[]): number {
  if (!completedTimestamps || completedTimestamps.length === 0) return 0;

  // Build a set of YYYY-MM-DD strings (UTC) of days with completions.
  const days = new Set<string>();
  for (const ts of completedTimestamps) {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) continue;
    const key = d.toISOString().slice(0, 10);
    days.add(key);
  }
  if (days.size === 0) return 0;

  // Walk backwards from today. The streak counts only if a completion
  // exists today OR yesterday (allows for the day to not be over yet).
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);

  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  if (!days.has(todayKey) && !days.has(yesterdayKey)) return 0;

  let streak = 0;
  // Start counting from today (if today completed) or yesterday otherwise.
  const cursor = new Date(today);
  if (!days.has(todayKey)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Valid interaction actions accepted by the API.
 */
export const VALID_TIP_ACTIONS = [
  "viewed",
  "helpful",
  "not_helpful",
  "completed",
  "favorited",
  "dismissed",
  "unfavorited",
  "undismissed",
] as const;

export type TipAction = (typeof VALID_TIP_ACTIONS)[number];

/**
 * Total tip count — useful for tests and display.
 */
export const TIP_COUNT = DAILY_TIPS.length;
