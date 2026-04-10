/**
 * Comprehensive biomarker knowledge base for HealthChat AI.
 *
 * Each entry contains evidence-based information sourced from:
 * - American Heart Association (AHA)
 * - American Diabetes Association (ADA)
 * - World Health Organization (WHO)
 * - National Institutes of Health (NIH)
 * - Endocrine Society guidelines
 *
 * IMPORTANT: This is general wellness information, NOT medical advice.
 * Always recommend users consult their healthcare provider.
 */

export interface BiomarkerKnowledge {
  /** Canonical biomarker name (matches reference-ranges.ts) */
  name: string;
  /** 1-sentence plain English explanation of what this test measures */
  whatItMeasures: string;
  /** Why this number matters for health */
  whyItMatters: string;
  /** Common reasons this value may be elevated */
  commonCausesHigh: string[];
  /** Common reasons this value may be low */
  commonCausesLow: string[];
  /** Evidence-based lifestyle changes that may help */
  lifestyleTips: string[];
  /** Other tests that provide additional context */
  relatedTests: string[];
  /** Foods that may help improve this value */
  foodsThatHelp: string[];
  /** Foods that may worsen this value */
  foodsToAvoid: string[];
  /** Exercise guidance related to this biomarker */
  exerciseRecommendation: string;
  /** When to seek medical attention promptly */
  whenToWorry: string;
}

// ---------------------------------------------------------------------------
// Lipid Panel
// ---------------------------------------------------------------------------

const LIPID_KNOWLEDGE: BiomarkerKnowledge[] = [
  {
    name: "Total Cholesterol",
    whatItMeasures:
      "The total amount of cholesterol in your blood, including both good (HDL) and bad (LDL) types.",
    whyItMatters:
      "High total cholesterol increases your risk of heart disease and stroke over time.",
    commonCausesHigh: [
      "Diet high in saturated and trans fats",
      "Genetics and family history",
      "Obesity or being overweight",
      "Sedentary lifestyle",
      "Hypothyroidism",
      "Certain medications (e.g., steroids, some diuretics)",
    ],
    commonCausesLow: [
      "Malnutrition or very low-fat diet",
      "Hyperthyroidism",
      "Liver disease",
      "Certain genetic conditions",
    ],
    lifestyleTips: [
      "Replace saturated fats with olive oil and nuts",
      "Eat more soluble fiber (oats, beans, lentils)",
      "Exercise 30 minutes most days",
      "Lose 5-10% body weight if overweight",
      "Quit smoking if applicable",
    ],
    relatedTests: [
      "LDL Cholesterol",
      "HDL Cholesterol",
      "Triglycerides",
      "Cholesterol/HDL Ratio",
    ],
    foodsThatHelp: [
      "Oats and oat bran",
      "Fatty fish (salmon, mackerel)",
      "Nuts (almonds, walnuts)",
      "Olive oil",
      "Beans and lentils",
      "Avocados",
    ],
    foodsToAvoid: [
      "Red meat and processed meats",
      "Full-fat dairy products",
      "Fried foods",
      "Baked goods with trans fats",
      "Coconut and palm oil",
    ],
    exerciseRecommendation:
      "Aim for 150 minutes of moderate aerobic exercise per week (brisk walking, cycling, swimming). Regular exercise can raise HDL and lower LDL.",
    whenToWorry:
      "If total cholesterol is above 300 mg/dL, or if you have chest pain, shortness of breath, or a family history of early heart disease, see your doctor promptly.",
  },
  {
    name: "LDL Cholesterol",
    whatItMeasures:
      "The amount of 'bad' cholesterol that can build up in your artery walls.",
    whyItMatters:
      "High LDL is a major risk factor for heart attack and stroke because it forms plaque in arteries.",
    commonCausesHigh: [
      "Diet high in saturated fat and cholesterol",
      "Genetic predisposition (familial hypercholesterolemia)",
      "Obesity",
      "Diabetes",
      "Hypothyroidism",
      "Kidney disease",
    ],
    commonCausesLow: [
      "Very low-fat diet",
      "Hyperthyroidism",
      "Liver disease",
      "Malabsorption syndromes",
    ],
    lifestyleTips: [
      "Limit saturated fat to less than 7% of daily calories",
      "Add plant sterols/stanols (found in fortified foods)",
      "Increase soluble fiber intake to 10-25g per day",
      "Maintain a healthy weight",
      "Exercise regularly",
    ],
    relatedTests: [
      "Total Cholesterol",
      "HDL Cholesterol",
      "Triglycerides",
      "Cholesterol/HDL Ratio",
    ],
    foodsThatHelp: [
      "Oatmeal and oat bran",
      "Walnuts and almonds",
      "Fatty fish (salmon, sardines)",
      "Flaxseeds and chia seeds",
      "Beans, peas, lentils",
      "Fruits high in pectin (apples, grapes, citrus)",
    ],
    foodsToAvoid: [
      "Fatty cuts of red meat",
      "Full-fat cheese and butter",
      "Fried and fast food",
      "Processed snack foods",
      "Egg yolks in excess",
    ],
    exerciseRecommendation:
      "30 minutes of moderate-intensity exercise 5 days a week can lower LDL by 5-10%. Walking, jogging, cycling, and swimming all help.",
    whenToWorry:
      "LDL above 190 mg/dL may indicate a genetic condition. If combined with chest pain or family history of heart attacks before age 55, consult your doctor soon.",
  },
  {
    name: "HDL Cholesterol",
    whatItMeasures:
      "The amount of 'good' cholesterol that helps remove bad cholesterol from your arteries.",
    whyItMatters:
      "Higher HDL protects against heart disease. Low HDL increases cardiovascular risk even when LDL is normal.",
    commonCausesHigh: [
      "Regular exercise",
      "Moderate alcohol consumption",
      "Genetics",
      "Healthy weight",
    ],
    commonCausesLow: [
      "Smoking",
      "Sedentary lifestyle",
      "Obesity",
      "Type 2 diabetes",
      "High-carbohydrate diet",
      "Certain medications (beta-blockers, anabolic steroids)",
    ],
    lifestyleTips: [
      "Exercise at least 30 minutes, 5 times a week",
      "Quit smoking (can raise HDL by up to 10%)",
      "Choose healthy fats (olive oil, avocado, nuts)",
      "Maintain a healthy weight",
      "Limit refined carbohydrates",
    ],
    relatedTests: [
      "Total Cholesterol",
      "LDL Cholesterol",
      "Triglycerides",
      "Cholesterol/HDL Ratio",
    ],
    foodsThatHelp: [
      "Olive oil and avocado oil",
      "Fatty fish (salmon, mackerel, tuna)",
      "Avocados",
      "Nuts (especially almonds and walnuts)",
      "Whole grains",
      "Flaxseeds",
    ],
    foodsToAvoid: [
      "Trans fats (partially hydrogenated oils)",
      "Refined carbohydrates and sugar",
      "Excessive processed foods",
    ],
    exerciseRecommendation:
      "Aerobic exercise is the best way to raise HDL. Aim for 150 minutes per week of moderate activity or 75 minutes of vigorous activity.",
    whenToWorry:
      "HDL below 40 mg/dL for men or below 50 mg/dL for women is considered a risk factor. Discuss with your doctor, especially if other risk factors are present.",
  },
  {
    name: "Triglycerides",
    whatItMeasures:
      "The level of fat (triglycerides) circulating in your blood, often from food you eat.",
    whyItMatters:
      "High triglycerides increase heart disease risk and can cause pancreatitis at very high levels.",
    commonCausesHigh: [
      "High-sugar and high-carb diet",
      "Obesity",
      "Excessive alcohol consumption",
      "Physical inactivity",
      "Diabetes (poorly controlled)",
      "Hypothyroidism",
      "Certain medications (steroids, estrogen, some diuretics)",
    ],
    commonCausesLow: [
      "Very low-fat diet",
      "Malabsorption",
      "Hyperthyroidism",
      "Malnutrition",
    ],
    lifestyleTips: [
      "Cut back on sugar and refined carbohydrates",
      "Limit alcohol consumption",
      "Eat more omega-3 rich foods",
      "Exercise regularly (even 30-min daily walks help)",
      "Lose excess weight (5-10% weight loss can lower triglycerides 20%)",
    ],
    relatedTests: [
      "Total Cholesterol",
      "LDL Cholesterol",
      "HDL Cholesterol",
      "Glucose (Fasting)",
      "Hemoglobin A1C",
    ],
    foodsThatHelp: [
      "Fatty fish (salmon, sardines, herring)",
      "Walnuts and flaxseeds",
      "Olive oil",
      "Vegetables and leafy greens",
      "Whole grains (in moderation)",
    ],
    foodsToAvoid: [
      "Sugary drinks and soda",
      "White bread, pasta, and rice",
      "Candy and baked goods",
      "Alcohol",
      "Fruit juice in excess",
    ],
    exerciseRecommendation:
      "Regular aerobic exercise (brisk walking, cycling) for 30 minutes most days can lower triglycerides by 20-30%.",
    whenToWorry:
      "Triglycerides above 500 mg/dL increase the risk of pancreatitis and need prompt medical attention. Above 200 mg/dL warrants a doctor visit.",
  },
];

// ---------------------------------------------------------------------------
// Metabolic Panel
// ---------------------------------------------------------------------------

const METABOLIC_KNOWLEDGE: BiomarkerKnowledge[] = [
  {
    name: "Glucose (Fasting)",
    whatItMeasures:
      "Your blood sugar level after not eating for at least 8 hours, showing how well your body manages sugar.",
    whyItMatters:
      "Fasting glucose helps screen for pre-diabetes and diabetes, conditions that affect your whole body if not managed.",
    commonCausesHigh: [
      "Pre-diabetes or type 2 diabetes",
      "Stress (physical or emotional)",
      "Illness or infection",
      "Certain medications (steroids, some antipsychotics)",
      "Lack of sleep",
      "Cushing syndrome",
    ],
    commonCausesLow: [
      "Too much insulin or diabetes medication",
      "Skipping meals or not eating enough",
      "Excessive alcohol",
      "Adrenal insufficiency",
      "Liver disease",
    ],
    lifestyleTips: [
      "Walk 15-30 minutes after meals to lower blood sugar spikes",
      "Choose whole grains over refined carbs",
      "Maintain consistent meal times",
      "Get 7-8 hours of sleep",
      "Manage stress through relaxation techniques",
    ],
    relatedTests: [
      "Hemoglobin A1C",
      "Triglycerides",
    ],
    foodsThatHelp: [
      "Non-starchy vegetables (broccoli, spinach, peppers)",
      "Whole grains (quinoa, brown rice, oats)",
      "Lean protein (chicken, fish, tofu)",
      "Beans and lentils",
      "Nuts and seeds",
      "Berries",
    ],
    foodsToAvoid: [
      "Sugary drinks and soda",
      "White bread, white rice, and pasta",
      "Candy, pastries, and desserts",
      "Fruit juice in large amounts",
      "Highly processed snack foods",
    ],
    exerciseRecommendation:
      "Both aerobic exercise and resistance training improve insulin sensitivity. Even a 15-minute walk after meals can significantly reduce blood sugar spikes.",
    whenToWorry:
      "Fasting glucose above 126 mg/dL on two separate tests suggests diabetes. If you experience excessive thirst, frequent urination, or unexplained weight loss, see your doctor right away.",
  },
  {
    name: "Hemoglobin A1C",
    whatItMeasures:
      "Your average blood sugar level over the past 2-3 months, giving a bigger picture than a single glucose test.",
    whyItMatters:
      "A1C is the gold standard for monitoring long-term blood sugar control and diabetes risk.",
    commonCausesHigh: [
      "Uncontrolled or undiagnosed diabetes",
      "Pre-diabetes",
      "Consistently high-carbohydrate diet",
      "Sedentary lifestyle",
      "Stress",
      "Certain medications",
    ],
    commonCausesLow: [
      "Chronic blood loss or hemolytic anemia",
      "Recent blood transfusion",
      "Certain hemoglobin variants",
      "Chronic kidney disease (sometimes falsely low)",
    ],
    lifestyleTips: [
      "Monitor carbohydrate intake at each meal",
      "Exercise regularly (both aerobic and strength training)",
      "Lose 5-7% of body weight if overweight",
      "Test blood sugar at home if recommended by your doctor",
      "Stay consistent with meal timing",
    ],
    relatedTests: [
      "Glucose (Fasting)",
      "Triglycerides",
    ],
    foodsThatHelp: [
      "Non-starchy vegetables",
      "Legumes (beans, lentils, chickpeas)",
      "Whole grains in moderate portions",
      "Lean proteins",
      "Healthy fats (olive oil, avocado, nuts)",
    ],
    foodsToAvoid: [
      "Sugar-sweetened beverages",
      "Refined carbohydrates",
      "Processed snack foods",
      "Large portions of starchy foods",
      "Candy and sweets",
    ],
    exerciseRecommendation:
      "150 minutes per week of moderate exercise can lower A1C by 0.5-0.7%. Combining aerobic and resistance training is most effective.",
    whenToWorry:
      "A1C above 6.5% indicates diabetes. If your A1C is rising despite lifestyle changes, talk to your doctor about additional interventions.",
  },
  {
    name: "BUN",
    whatItMeasures:
      "The amount of urea nitrogen in your blood, which shows how well your kidneys are filtering waste.",
    whyItMatters:
      "BUN helps evaluate kidney function and hydration status. Abnormal levels may signal kidney problems.",
    commonCausesHigh: [
      "Dehydration",
      "High-protein diet",
      "Kidney disease or reduced kidney function",
      "Heart failure",
      "Gastrointestinal bleeding",
      "Certain medications (NSAIDs, some antibiotics)",
    ],
    commonCausesLow: [
      "Low-protein diet",
      "Severe liver disease",
      "Overhydration",
      "Malnutrition",
    ],
    lifestyleTips: [
      "Stay well hydrated (aim for 8 glasses of water daily)",
      "Moderate protein intake if levels are high",
      "Avoid excessive NSAID use",
      "Monitor blood pressure",
    ],
    relatedTests: [
      "Creatinine",
    ],
    foodsThatHelp: [
      "Fruits and vegetables",
      "Adequate water intake",
      "Plant-based protein sources",
    ],
    foodsToAvoid: [
      "Excessive red meat",
      "Very high-protein diets (if BUN is elevated)",
      "Excess sodium",
    ],
    exerciseRecommendation:
      "Moderate exercise supports kidney health. Stay hydrated before, during, and after exercise.",
    whenToWorry:
      "BUN above 25-30 mg/dL combined with high creatinine may indicate kidney disease. Symptoms like swelling, fatigue, or changes in urination warrant prompt medical attention.",
  },
  {
    name: "Creatinine",
    whatItMeasures:
      "A waste product from normal muscle activity that your kidneys filter out, used to assess kidney function.",
    whyItMatters:
      "Rising creatinine levels often indicate declining kidney function, which is important to catch early.",
    commonCausesHigh: [
      "Kidney disease or reduced kidney function",
      "Dehydration",
      "High muscle mass (can be normal in muscular individuals)",
      "High-protein diet",
      "Certain medications (NSAIDs, ACE inhibitors)",
      "Urinary tract obstruction",
    ],
    commonCausesLow: [
      "Low muscle mass (common in elderly)",
      "Severe liver disease",
      "Very low-protein diet",
    ],
    lifestyleTips: [
      "Stay well hydrated",
      "Limit NSAID use (ibuprofen, naproxen)",
      "Control blood pressure and blood sugar",
      "Moderate protein intake if kidney function is reduced",
    ],
    relatedTests: [
      "BUN",
    ],
    foodsThatHelp: [
      "Fruits and vegetables",
      "Adequate water",
      "Plant-based proteins (in moderation)",
    ],
    foodsToAvoid: [
      "Excessive red meat and high-protein foods (if creatinine is elevated)",
      "High-sodium foods",
      "Excessive creatine supplements",
    ],
    exerciseRecommendation:
      "Regular moderate exercise is fine. Intense exercise can temporarily raise creatinine. Stay hydrated during workouts.",
    whenToWorry:
      "Creatinine rising steadily over time, or combined with symptoms like swelling, fatigue, decreased urine output, or nausea, needs prompt evaluation.",
  },
];

// ---------------------------------------------------------------------------
// Blood Pressure
// ---------------------------------------------------------------------------

const BP_KNOWLEDGE: BiomarkerKnowledge[] = [
  {
    name: "Blood Pressure Systolic",
    whatItMeasures:
      "The pressure in your arteries when your heart beats (the top number in a blood pressure reading).",
    whyItMatters:
      "High systolic pressure is a major risk factor for heart attack, stroke, and kidney disease.",
    commonCausesHigh: [
      "High sodium diet",
      "Obesity",
      "Sedentary lifestyle",
      "Chronic stress",
      "Smoking",
      "Excessive alcohol",
      "Genetics/family history",
      "Aging",
    ],
    commonCausesLow: [
      "Dehydration",
      "Blood loss",
      "Certain medications",
      "Heart conditions",
      "Endocrine disorders",
    ],
    lifestyleTips: [
      "Reduce sodium intake to less than 2,300 mg per day",
      "Follow the DASH diet (rich in fruits, vegetables, whole grains)",
      "Exercise 30 minutes most days",
      "Maintain a healthy weight",
      "Limit alcohol to 1-2 drinks per day",
      "Manage stress with meditation or deep breathing",
    ],
    relatedTests: [
      "Blood Pressure Diastolic",
      "Total Cholesterol",
      "Glucose (Fasting)",
      "Creatinine",
    ],
    foodsThatHelp: [
      "Bananas and potassium-rich foods",
      "Leafy greens (spinach, kale)",
      "Berries (blueberries, strawberries)",
      "Beets and beet juice",
      "Oatmeal",
      "Low-fat dairy (yogurt)",
    ],
    foodsToAvoid: [
      "Processed and canned foods (high sodium)",
      "Deli meats and cured meats",
      "Pizza and fast food",
      "Salty snacks (chips, pretzels)",
      "Excessive caffeine",
    ],
    exerciseRecommendation:
      "Regular aerobic exercise (brisk walking, swimming, cycling) for 150 minutes per week can lower systolic BP by 5-8 mmHg.",
    whenToWorry:
      "Systolic above 180 mmHg is a hypertensive crisis. Seek immediate medical attention if accompanied by headache, chest pain, vision changes, or difficulty breathing.",
  },
  {
    name: "Blood Pressure Diastolic",
    whatItMeasures:
      "The pressure in your arteries between heartbeats when your heart is resting (the bottom number).",
    whyItMatters:
      "Elevated diastolic pressure indicates your arteries are not relaxing properly between beats, raising cardiovascular risk.",
    commonCausesHigh: [
      "High sodium diet",
      "Obesity",
      "Lack of exercise",
      "Excessive alcohol",
      "Stress",
      "Sleep apnea",
    ],
    commonCausesLow: [
      "Dehydration",
      "Blood loss",
      "Medications",
      "Sepsis",
    ],
    lifestyleTips: [
      "Reduce sodium intake",
      "Exercise regularly",
      "Maintain a healthy weight",
      "Limit alcohol consumption",
      "Get adequate sleep",
      "Practice stress management",
    ],
    relatedTests: [
      "Blood Pressure Systolic",
      "Total Cholesterol",
      "Glucose (Fasting)",
    ],
    foodsThatHelp: [
      "Potassium-rich foods (bananas, sweet potatoes, spinach)",
      "Garlic",
      "Dark chocolate (in small amounts)",
      "Berries",
      "Whole grains",
    ],
    foodsToAvoid: [
      "High-sodium foods",
      "Processed foods",
      "Excessive caffeine",
      "Alcohol in excess",
    ],
    exerciseRecommendation:
      "Regular aerobic exercise for at least 30 minutes most days. Even daily walking can lower diastolic BP by 4-5 mmHg.",
    whenToWorry:
      "Diastolic above 120 mmHg is a hypertensive crisis requiring immediate medical attention.",
  },
];

// ---------------------------------------------------------------------------
// CBC (Complete Blood Count)
// ---------------------------------------------------------------------------

const CBC_KNOWLEDGE: BiomarkerKnowledge[] = [
  {
    name: "Hemoglobin",
    whatItMeasures:
      "The protein in red blood cells that carries oxygen throughout your body.",
    whyItMatters:
      "Low hemoglobin (anemia) means your body may not get enough oxygen, causing fatigue and weakness.",
    commonCausesHigh: [
      "Dehydration",
      "Living at high altitude",
      "Chronic lung disease",
      "Polycythemia vera",
      "Smoking",
    ],
    commonCausesLow: [
      "Iron deficiency",
      "Vitamin B12 or folate deficiency",
      "Chronic disease (kidney disease, cancer)",
      "Blood loss (heavy periods, GI bleeding)",
      "Bone marrow disorders",
    ],
    lifestyleTips: [
      "Eat iron-rich foods if low (red meat, spinach, beans)",
      "Pair iron foods with vitamin C for better absorption",
      "Avoid tea/coffee with iron-rich meals (they block absorption)",
      "Get adequate B12 and folate",
    ],
    relatedTests: [
      "Hematocrit",
      "Iron",
      "Vitamin B12",
    ],
    foodsThatHelp: [
      "Red meat and organ meats (liver)",
      "Spinach and dark leafy greens",
      "Lentils and beans",
      "Fortified cereals",
      "Dried fruits (raisins, apricots)",
    ],
    foodsToAvoid: [
      "Excessive tea or coffee with meals (reduces iron absorption)",
      "Calcium-rich foods at the same time as iron-rich foods",
    ],
    exerciseRecommendation:
      "Moderate exercise is beneficial. If hemoglobin is very low, avoid strenuous exercise until levels improve, as your body needs adequate oxygen delivery.",
    whenToWorry:
      "Hemoglobin below 7 g/dL is severe anemia requiring urgent treatment. Symptoms like extreme fatigue, dizziness, or rapid heartbeat warrant a doctor visit.",
  },
  {
    name: "Hematocrit",
    whatItMeasures:
      "The percentage of your blood that is made up of red blood cells.",
    whyItMatters:
      "Hematocrit helps diagnose anemia and dehydration, and monitors conditions affecting red blood cell production.",
    commonCausesHigh: [
      "Dehydration",
      "Living at high altitude",
      "Smoking",
      "Chronic lung disease",
      "Polycythemia vera",
    ],
    commonCausesLow: [
      "Iron, B12, or folate deficiency",
      "Blood loss",
      "Chronic disease",
      "Bone marrow problems",
      "Overhydration",
    ],
    lifestyleTips: [
      "Stay well hydrated",
      "Eat a balanced diet rich in iron and vitamins",
      "If hematocrit is low, focus on iron-rich foods",
    ],
    relatedTests: [
      "Hemoglobin",
      "Iron",
      "Vitamin B12",
    ],
    foodsThatHelp: [
      "Iron-rich foods (meat, beans, spinach)",
      "B12-rich foods (fish, eggs, dairy)",
      "Vitamin C-rich foods (to enhance iron absorption)",
    ],
    foodsToAvoid: [
      "Excessive tea/coffee with meals",
    ],
    exerciseRecommendation:
      "Regular moderate exercise supports healthy blood cell production. Avoid overtraining, which can sometimes lower red blood cell counts.",
    whenToWorry:
      "Very high hematocrit (above 55%) increases blood clot risk. Very low levels (below 25%) may cause severe symptoms and need urgent care.",
  },
  {
    name: "White Blood Cell Count",
    whatItMeasures:
      "The number of infection-fighting white blood cells in your blood.",
    whyItMatters:
      "WBC count reflects your immune system's activity. Abnormal levels may indicate infection, inflammation, or immune disorders.",
    commonCausesHigh: [
      "Bacterial infection",
      "Inflammation",
      "Stress (physical or emotional)",
      "Allergic reactions",
      "Smoking",
      "Certain medications (steroids)",
      "Leukemia (rare)",
    ],
    commonCausesLow: [
      "Viral infections",
      "Bone marrow disorders",
      "Autoimmune conditions",
      "Certain medications (chemotherapy, some antibiotics)",
      "Severe infections (sepsis)",
    ],
    lifestyleTips: [
      "Get adequate sleep (7-9 hours)",
      "Manage stress levels",
      "Eat a balanced diet rich in fruits and vegetables",
      "Exercise regularly but avoid overtraining",
      "Wash hands frequently to prevent infections",
    ],
    relatedTests: [
      "Hemoglobin",
      "Platelet Count",
    ],
    foodsThatHelp: [
      "Citrus fruits (vitamin C)",
      "Garlic and ginger",
      "Yogurt with probiotics",
      "Green tea",
      "Almonds (vitamin E)",
    ],
    foodsToAvoid: [
      "Excessive sugar (may impair immune function)",
      "Highly processed foods",
      "Excessive alcohol",
    ],
    exerciseRecommendation:
      "Moderate regular exercise boosts immune function. Extreme endurance exercise can temporarily suppress WBC count.",
    whenToWorry:
      "WBC above 20,000/mcL or below 2,000/mcL warrants prompt evaluation. Fever with very low WBC needs urgent attention.",
  },
  {
    name: "Platelet Count",
    whatItMeasures:
      "The number of platelets in your blood, which are tiny cells that help your blood clot.",
    whyItMatters:
      "Too few platelets can cause excessive bleeding; too many can increase clot risk.",
    commonCausesHigh: [
      "Iron deficiency",
      "Infection or inflammation",
      "After surgery or trauma",
      "Certain cancers",
      "Spleen removal",
    ],
    commonCausesLow: [
      "Viral infections",
      "Autoimmune disorders (ITP)",
      "Certain medications (heparin, some antibiotics)",
      "Heavy alcohol use",
      "Liver disease",
      "Bone marrow disorders",
    ],
    lifestyleTips: [
      "Avoid excessive alcohol",
      "Eat a balanced diet",
      "Report unusual bruising or bleeding to your doctor",
      "Be cautious with NSAIDs if platelets are low",
    ],
    relatedTests: [
      "White Blood Cell Count",
      "Hemoglobin",
    ],
    foodsThatHelp: [
      "Folate-rich foods (leafy greens, beans)",
      "Vitamin B12-rich foods (meat, eggs, dairy)",
      "Iron-rich foods",
      "Vitamin C-rich foods",
    ],
    foodsToAvoid: [
      "Excessive alcohol",
      "Quinine (in tonic water) if platelets are low",
    ],
    exerciseRecommendation:
      "Moderate exercise is safe. If platelet count is very low, avoid contact sports or activities with high injury risk.",
    whenToWorry:
      "Platelets below 50,000/mcL increase bleeding risk. Unexplained bruising, petechiae (small red dots), or prolonged bleeding need prompt evaluation.",
  },
];

// ---------------------------------------------------------------------------
// Liver Function
// ---------------------------------------------------------------------------

const LIVER_KNOWLEDGE: BiomarkerKnowledge[] = [
  {
    name: "ALT",
    whatItMeasures:
      "An enzyme found mainly in your liver; when liver cells are damaged, ALT leaks into the blood.",
    whyItMatters:
      "Elevated ALT is one of the most sensitive indicators of liver cell damage or inflammation.",
    commonCausesHigh: [
      "Fatty liver disease (NAFLD)",
      "Excessive alcohol consumption",
      "Hepatitis (viral or autoimmune)",
      "Certain medications (statins, acetaminophen)",
      "Obesity",
      "Celiac disease",
    ],
    commonCausesLow: [
      "Normal — low ALT is generally not a concern",
      "Vitamin B6 deficiency (rare)",
    ],
    lifestyleTips: [
      "Limit alcohol consumption",
      "Maintain a healthy weight",
      "Avoid unnecessary medications and supplements",
      "Exercise regularly",
      "Limit acetaminophen (Tylenol) use",
    ],
    relatedTests: [
      "AST",
    ],
    foodsThatHelp: [
      "Coffee (associated with lower liver enzyme levels)",
      "Leafy green vegetables",
      "Berries and fruits",
      "Whole grains",
      "Lean proteins",
    ],
    foodsToAvoid: [
      "Alcohol",
      "High-fat and fried foods",
      "Excessive sugar",
      "Processed foods",
    ],
    exerciseRecommendation:
      "Regular aerobic exercise (30 minutes most days) can reduce fatty liver and lower ALT levels.",
    whenToWorry:
      "ALT more than 3 times the upper limit of normal, or rising steadily, should be evaluated. Jaundice (yellowing skin/eyes), dark urine, or abdominal pain need prompt attention.",
  },
  {
    name: "AST",
    whatItMeasures:
      "An enzyme found in your liver, heart, and muscles; elevated levels suggest tissue damage.",
    whyItMatters:
      "AST, especially when elevated alongside ALT, helps assess liver damage. It can also indicate heart or muscle injury.",
    commonCausesHigh: [
      "Liver disease (hepatitis, fatty liver)",
      "Excessive alcohol",
      "Heart attack or heart damage",
      "Intense exercise or muscle injury",
      "Certain medications",
    ],
    commonCausesLow: [
      "Normal — low AST is generally not concerning",
      "Vitamin B6 deficiency (rare)",
    ],
    lifestyleTips: [
      "Limit alcohol intake",
      "Maintain a healthy weight",
      "Avoid overuse of acetaminophen",
      "Stay physically active",
    ],
    relatedTests: [
      "ALT",
    ],
    foodsThatHelp: [
      "Coffee",
      "Green leafy vegetables",
      "Whole grains",
      "Lean proteins",
    ],
    foodsToAvoid: [
      "Alcohol",
      "Fried and processed foods",
      "Excessive sugar",
    ],
    exerciseRecommendation:
      "Regular moderate exercise benefits liver health. Note that very intense exercise can temporarily raise AST.",
    whenToWorry:
      "AST significantly higher than ALT may suggest alcohol-related liver damage or heart/muscle issues. Combined with jaundice or abdominal pain, see your doctor promptly.",
  },
];

// ---------------------------------------------------------------------------
// Thyroid
// ---------------------------------------------------------------------------

const THYROID_KNOWLEDGE: BiomarkerKnowledge[] = [
  {
    name: "TSH",
    whatItMeasures:
      "A hormone from your pituitary gland that tells your thyroid how much thyroid hormone to make.",
    whyItMatters:
      "TSH is the best screening test for thyroid disorders. Abnormal TSH affects energy, weight, mood, and many body functions.",
    commonCausesHigh: [
      "Hypothyroidism (underactive thyroid)",
      "Hashimoto's thyroiditis (autoimmune)",
      "Iodine deficiency",
      "Certain medications (lithium, amiodarone)",
      "Pituitary tumors (rare)",
    ],
    commonCausesLow: [
      "Hyperthyroidism (overactive thyroid)",
      "Graves' disease",
      "Excessive thyroid medication",
      "Early pregnancy",
      "Certain supplements (excess iodine or biotin)",
    ],
    lifestyleTips: [
      "Get adequate iodine from diet (iodized salt, seafood)",
      "Avoid excessive soy consumption if you have thyroid issues",
      "Take thyroid medication on empty stomach if prescribed",
      "Manage stress (stress affects thyroid function)",
      "Get enough selenium (Brazil nuts, fish)",
    ],
    relatedTests: [
      "Hemoglobin",
      "Total Cholesterol",
    ],
    foodsThatHelp: [
      "Iodine-rich foods (seafood, iodized salt, dairy)",
      "Selenium-rich foods (Brazil nuts, tuna, eggs)",
      "Zinc-rich foods (oysters, beef, pumpkin seeds)",
    ],
    foodsToAvoid: [
      "Excessive raw cruciferous vegetables if thyroid is underactive (broccoli, cabbage, kale in very large amounts)",
      "Soy products in excess (may interfere with thyroid medication)",
      "Highly processed foods",
    ],
    exerciseRecommendation:
      "Regular exercise supports thyroid function and helps manage symptoms like fatigue and weight changes. Start gently if you have been fatigued.",
    whenToWorry:
      "TSH above 10 mIU/L or below 0.1 mIU/L needs medical evaluation. Symptoms like rapid weight change, extreme fatigue, heart palpitations, or a visible neck swelling warrant prompt attention.",
  },
];

// ---------------------------------------------------------------------------
// Vitamins & Minerals
// ---------------------------------------------------------------------------

const VITAMIN_KNOWLEDGE: BiomarkerKnowledge[] = [
  {
    name: "Vitamin D",
    whatItMeasures:
      "The level of vitamin D in your blood, a nutrient essential for bone health, immune function, and mood.",
    whyItMatters:
      "Low vitamin D is very common and linked to weak bones, increased infection risk, fatigue, and mood changes.",
    commonCausesHigh: [
      "Excessive supplementation",
      "Granulomatous diseases (sarcoidosis)",
    ],
    commonCausesLow: [
      "Limited sun exposure",
      "Dark skin (reduces vitamin D production from sunlight)",
      "Living in northern latitudes",
      "Obesity (vitamin D gets trapped in fat tissue)",
      "Malabsorption (celiac disease, Crohn's disease)",
      "Aging (skin produces less vitamin D)",
    ],
    lifestyleTips: [
      "Get 10-30 minutes of midday sun exposure several times a week",
      "Take a vitamin D3 supplement (discuss dose with your doctor)",
      "Eat vitamin D-rich foods",
      "Maintain a healthy weight",
    ],
    relatedTests: [
      "Calcium",
    ],
    foodsThatHelp: [
      "Fatty fish (salmon, mackerel, sardines)",
      "Fortified milk and orange juice",
      "Egg yolks",
      "Mushrooms exposed to UV light",
      "Fortified cereals",
    ],
    foodsToAvoid: [
      "No specific foods to avoid — focus on adding vitamin D-rich foods",
    ],
    exerciseRecommendation:
      "Outdoor exercise provides both physical activity and sun exposure for natural vitamin D production. Weight-bearing exercise also supports the bone health that vitamin D protects.",
    whenToWorry:
      "Vitamin D below 12 ng/mL is considered severe deficiency. Symptoms like bone pain, muscle weakness, or frequent fractures need medical attention. Very high levels (above 150 ng/mL) can cause toxicity.",
  },
  {
    name: "Vitamin B12",
    whatItMeasures:
      "The amount of vitamin B12 in your blood, essential for nerve function, red blood cell production, and DNA synthesis.",
    whyItMatters:
      "B12 deficiency can cause anemia, nerve damage, fatigue, and cognitive problems, especially in older adults and vegans.",
    commonCausesHigh: [
      "Excessive supplementation",
      "Liver disease",
      "Certain blood cancers (rare)",
    ],
    commonCausesLow: [
      "Vegan or vegetarian diet (B12 is mainly in animal products)",
      "Pernicious anemia (autoimmune)",
      "Aging (reduced absorption)",
      "Medications (metformin, proton pump inhibitors)",
      "Celiac or Crohn's disease",
      "Gastric bypass surgery",
    ],
    lifestyleTips: [
      "Eat B12-rich foods or take supplements if vegan/vegetarian",
      "Consider sublingual B12 if absorption is an issue",
      "Discuss with your doctor if taking metformin or acid reducers",
    ],
    relatedTests: [
      "Hemoglobin",
    ],
    foodsThatHelp: [
      "Shellfish (clams, mussels)",
      "Fish (salmon, trout, tuna)",
      "Beef and liver",
      "Eggs and dairy",
      "Fortified nutritional yeast",
      "Fortified plant milks and cereals",
    ],
    foodsToAvoid: [
      "No specific foods to avoid — focus on ensuring adequate B12 intake",
    ],
    exerciseRecommendation:
      "Regular exercise is beneficial. If B12 is very low and causing nerve symptoms (tingling, numbness), be cautious with exercises requiring fine balance until levels improve.",
    whenToWorry:
      "B12 below 150 pg/mL can cause neurological symptoms (numbness, tingling, balance problems, memory issues). These symptoms are reversible if caught early but can become permanent.",
  },
  {
    name: "Iron",
    whatItMeasures:
      "The amount of iron circulating in your blood, needed to make hemoglobin and carry oxygen.",
    whyItMatters:
      "Iron deficiency is the most common nutritional deficiency worldwide and leads to anemia, fatigue, and weakened immunity.",
    commonCausesHigh: [
      "Hemochromatosis (genetic iron overload)",
      "Excessive iron supplementation",
      "Multiple blood transfusions",
      "Liver disease",
    ],
    commonCausesLow: [
      "Inadequate dietary intake",
      "Heavy menstrual periods",
      "Pregnancy",
      "Gastrointestinal bleeding (ulcers, polyps)",
      "Celiac disease or malabsorption",
      "Vegetarian/vegan diet",
    ],
    lifestyleTips: [
      "Pair iron-rich foods with vitamin C (e.g., spinach salad with lemon dressing)",
      "Cook in cast-iron pans (adds small amounts of iron to food)",
      "Avoid drinking tea or coffee with meals (tannins reduce iron absorption)",
      "Space calcium supplements away from iron-rich meals",
    ],
    relatedTests: [
      "Hemoglobin",
      "Hematocrit",
      "Vitamin B12",
    ],
    foodsThatHelp: [
      "Red meat and organ meats",
      "Oysters and shellfish",
      "Spinach and dark leafy greens",
      "Lentils and beans",
      "Tofu and tempeh",
      "Fortified cereals",
      "Pumpkin seeds",
    ],
    foodsToAvoid: [
      "Tea and coffee with meals (blocks absorption)",
      "Excessive dairy at mealtimes (calcium competes with iron)",
      "High-fiber foods at the same time as iron supplements (reduces absorption)",
    ],
    exerciseRecommendation:
      "Moderate exercise is fine. Endurance athletes may need more iron due to increased losses. If iron is very low, reduce intense exercise until levels recover.",
    whenToWorry:
      "Severe iron deficiency with hemoglobin below 8 g/dL causes significant symptoms (extreme fatigue, rapid heartbeat, dizziness). Also watch for signs of iron overload if levels are persistently high.",
  },
];

// ---------------------------------------------------------------------------
// Other
// ---------------------------------------------------------------------------

const OTHER_KNOWLEDGE: BiomarkerKnowledge[] = [
  {
    name: "Uric Acid",
    whatItMeasures:
      "A waste product formed when your body breaks down purines (found in certain foods and body tissues).",
    whyItMatters:
      "High uric acid can crystallize in joints causing gout (painful arthritis) and may contribute to kidney stones.",
    commonCausesHigh: [
      "Purine-rich diet (organ meats, shellfish, beer)",
      "Obesity",
      "Kidney disease (reduced excretion)",
      "Excessive alcohol (especially beer)",
      "Certain medications (diuretics)",
      "Genetics",
    ],
    commonCausesLow: [
      "Low-purine diet",
      "Certain medications",
      "Liver disease",
      "Fanconi syndrome",
    ],
    lifestyleTips: [
      "Stay well hydrated (8+ glasses of water daily)",
      "Limit alcohol, especially beer",
      "Reduce high-purine foods",
      "Maintain a healthy weight (avoid crash diets)",
      "Limit sugary drinks with fructose",
    ],
    relatedTests: [
      "Creatinine",
      "BUN",
    ],
    foodsThatHelp: [
      "Cherries and cherry juice",
      "Low-fat dairy products",
      "Plenty of water",
      "Vegetables (most are fine despite some containing purines)",
      "Coffee (associated with lower uric acid)",
      "Vitamin C-rich foods",
    ],
    foodsToAvoid: [
      "Organ meats (liver, kidney, sweetbreads)",
      "Shellfish (shrimp, lobster, mussels)",
      "Beer and spirits",
      "Sugary drinks with high-fructose corn syrup",
      "Red meat in excess",
    ],
    exerciseRecommendation:
      "Regular moderate exercise helps maintain a healthy weight and can lower uric acid. Avoid dehydration during exercise, as it can trigger gout flares.",
    whenToWorry:
      "Sudden severe joint pain (especially in the big toe) may be a gout attack. Uric acid above 9 mg/dL significantly increases gout and kidney stone risk.",
  },
  {
    name: "Resting Heart Rate",
    whatItMeasures:
      "How many times your heart beats per minute when you are at rest, reflecting your cardiovascular fitness.",
    whyItMatters:
      "A lower resting heart rate generally means better cardiovascular fitness. A consistently high rate may indicate heart stress.",
    commonCausesHigh: [
      "Deconditioning or sedentary lifestyle",
      "Stress and anxiety",
      "Excessive caffeine",
      "Dehydration",
      "Anemia",
      "Hyperthyroidism",
      "Fever or infection",
      "Smoking",
    ],
    commonCausesLow: [
      "High cardiovascular fitness (athletes)",
      "Certain medications (beta-blockers)",
      "Hypothyroidism",
      "Heart conduction disorders (sometimes)",
    ],
    lifestyleTips: [
      "Exercise regularly to strengthen your heart",
      "Practice deep breathing and relaxation",
      "Limit caffeine and stimulants",
      "Stay well hydrated",
      "Get adequate sleep",
      "Quit smoking if applicable",
    ],
    relatedTests: [
      "Blood Pressure Systolic",
      "Blood Pressure Diastolic",
      "TSH",
    ],
    foodsThatHelp: [
      "Omega-3 rich foods (fish, flaxseed)",
      "Magnesium-rich foods (nuts, dark chocolate, spinach)",
      "Potassium-rich foods (bananas, avocados)",
    ],
    foodsToAvoid: [
      "Excessive caffeine",
      "Energy drinks",
      "Excessive alcohol",
    ],
    exerciseRecommendation:
      "Regular aerobic exercise is the most effective way to lower resting heart rate. Over weeks of consistent training, your heart becomes more efficient.",
    whenToWorry:
      "Resting heart rate consistently above 100 bpm (tachycardia) needs evaluation. Heart palpitations, dizziness, or fainting episodes warrant prompt medical attention.",
  },
];

// ---------------------------------------------------------------------------
// Exported knowledge base
// ---------------------------------------------------------------------------

export const BIOMARKER_KNOWLEDGE: BiomarkerKnowledge[] = [
  ...LIPID_KNOWLEDGE,
  ...METABOLIC_KNOWLEDGE,
  ...BP_KNOWLEDGE,
  ...CBC_KNOWLEDGE,
  ...LIVER_KNOWLEDGE,
  ...THYROID_KNOWLEDGE,
  ...VITAMIN_KNOWLEDGE,
  ...OTHER_KNOWLEDGE,
];

/**
 * Pre-built lookup: lowercase canonical name -> BiomarkerKnowledge.
 */
export const KNOWLEDGE_INDEX: Map<string, BiomarkerKnowledge> = (() => {
  const map = new Map<string, BiomarkerKnowledge>();
  for (const entry of BIOMARKER_KNOWLEDGE) {
    map.set(entry.name.toLowerCase(), entry);
  }
  return map;
})();

/**
 * Look up knowledge for a biomarker by canonical name (case-insensitive).
 */
export function getBiomarkerKnowledge(
  name: string
): BiomarkerKnowledge | undefined {
  return KNOWLEDGE_INDEX.get(name.toLowerCase());
}
