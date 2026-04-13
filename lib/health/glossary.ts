/**
 * Comprehensive medical glossary for HealthChat AI.
 *
 * Plain-English definitions at a 5th-grade reading level.
 * This is the SINGLE SOURCE OF TRUTH for term definitions
 * throughout the application.
 *
 * Sources: AHA, ADA, NIH, WHO, Endocrine Society (public domain
 * medical knowledge). This is general wellness information,
 * NOT medical advice.
 */

import { lookupCondition } from "./nlm-api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GlossaryEntry {
  /** Display name */
  term: string;
  /** Alternate names / abbreviations (stored lowercase for matching) */
  aliases: string[];
  /** Plain English definition, 1-2 sentences, 5th grade reading level */
  definition: string;
  /** Category grouping */
  category:
    | "Lab Test"
    | "Condition"
    | "Measurement"
    | "Organ"
    | "Medication Term"
    | "General";
  /** Other glossary terms the user might want to look up */
  relatedTerms?: string[];
}

// ---------------------------------------------------------------------------
// Glossary entries
// ---------------------------------------------------------------------------

export const GLOSSARY_ENTRIES: GlossaryEntry[] = [
  // =========================================================================
  // LAB TESTS — Lipid Panel
  // =========================================================================
  {
    term: "Total Cholesterol",
    aliases: ["total cholesterol", "cholesterol total", "tc"],
    definition:
      "A blood test that measures all the cholesterol in your blood, including the good and bad kinds. Too much cholesterol can clog your arteries over time.",
    category: "Lab Test",
    relatedTerms: ["LDL Cholesterol", "HDL Cholesterol", "Triglycerides", "Lipid Panel"],
  },
  {
    term: "LDL Cholesterol",
    aliases: ["ldl", "ldl cholesterol", "ldl-c", "bad cholesterol"],
    definition:
      "Often called 'bad' cholesterol. When there is too much LDL, it can stick to the walls of your blood vessels and make them narrow.",
    category: "Lab Test",
    relatedTerms: ["HDL Cholesterol", "Total Cholesterol", "Atherosclerosis"],
  },
  {
    term: "HDL Cholesterol",
    aliases: ["hdl", "hdl cholesterol", "hdl-c", "good cholesterol"],
    definition:
      "Known as 'good' cholesterol. HDL acts like a cleanup crew — it picks up extra cholesterol in your blood and carries it back to your liver to be removed.",
    category: "Lab Test",
    relatedTerms: ["LDL Cholesterol", "Total Cholesterol", "Cholesterol/HDL Ratio"],
  },
  {
    term: "Triglycerides",
    aliases: ["triglycerides", "trigs", "tg"],
    definition:
      "A type of fat found in your blood. Your body makes them from extra calories you eat. High levels can increase your risk of heart disease.",
    category: "Lab Test",
    relatedTerms: ["Total Cholesterol", "Lipid Panel", "VLDL"],
  },
  {
    term: "VLDL",
    aliases: ["vldl", "vldl cholesterol", "very low density lipoprotein"],
    definition:
      "A type of cholesterol that carries triglycerides through your blood. High VLDL means more fat is moving through your bloodstream.",
    category: "Lab Test",
    relatedTerms: ["Triglycerides", "LDL Cholesterol"],
  },
  {
    term: "Cholesterol/HDL Ratio",
    aliases: [
      "cholesterol/hdl ratio",
      "cholesterol ratio",
      "tc/hdl ratio",
      "chol/hdl",
    ],
    definition:
      "A number that compares your total cholesterol to your good cholesterol. A lower ratio means a healthier balance of cholesterol in your blood.",
    category: "Lab Test",
    relatedTerms: ["Total Cholesterol", "HDL Cholesterol"],
  },

  // =========================================================================
  // LAB TESTS — Blood Sugar
  // =========================================================================
  {
    term: "Glucose (Fasting)",
    aliases: [
      "glucose",
      "fasting glucose",
      "blood sugar",
      "fasting blood sugar",
      "fbs",
      "fbg",
    ],
    definition:
      "A test that measures the sugar in your blood after you have not eaten for at least 8 hours. It helps check for diabetes or pre-diabetes.",
    category: "Lab Test",
    relatedTerms: ["A1C", "Insulin", "Diabetes", "Pre-diabetes"],
  },
  {
    term: "A1C",
    aliases: ["a1c", "hemoglobin a1c", "hba1c", "glycated hemoglobin", "hgb a1c"],
    definition:
      "A blood test that shows your average blood sugar level over the past 2-3 months. It is like a report card for how well your blood sugar has been managed.",
    category: "Lab Test",
    relatedTerms: ["Glucose (Fasting)", "Diabetes", "Pre-diabetes"],
  },
  {
    term: "Insulin",
    aliases: ["insulin", "fasting insulin"],
    definition:
      "A hormone made by your pancreas that helps sugar move from your blood into your cells for energy. High levels may mean your body is working extra hard to control blood sugar.",
    category: "Lab Test",
    relatedTerms: ["Glucose (Fasting)", "A1C", "Pancreas"],
  },

  // =========================================================================
  // LAB TESTS — Complete Blood Count (CBC)
  // =========================================================================
  {
    term: "Hemoglobin",
    aliases: ["hemoglobin", "hgb", "hb"],
    definition:
      "A protein inside your red blood cells that carries oxygen from your lungs to the rest of your body. Low hemoglobin can make you feel tired and weak.",
    category: "Lab Test",
    relatedTerms: ["Hematocrit", "RBC", "Anemia", "Iron"],
  },
  {
    term: "Hematocrit",
    aliases: ["hematocrit", "hct"],
    definition:
      "The percentage of your blood that is made up of red blood cells. It helps your doctor check for anemia or dehydration.",
    category: "Lab Test",
    relatedTerms: ["Hemoglobin", "RBC", "Anemia"],
  },
  {
    term: "WBC",
    aliases: ["wbc", "white blood cell count", "white blood cells", "leukocytes"],
    definition:
      "White blood cells are your body's defense team. They fight infections and germs. A count that is too high or too low can signal a problem.",
    category: "Lab Test",
    relatedTerms: ["CBC"],
  },
  {
    term: "RBC",
    aliases: ["rbc", "red blood cell count", "red blood cells", "erythrocytes"],
    definition:
      "Red blood cells carry oxygen throughout your body. If you have too few, your organs may not get enough oxygen.",
    category: "Lab Test",
    relatedTerms: ["Hemoglobin", "Hematocrit", "Anemia"],
  },
  {
    term: "Platelets",
    aliases: ["platelets", "platelet count", "plt", "thrombocytes"],
    definition:
      "Tiny blood cells that help your body form clots to stop bleeding. Too few can cause bruising; too many can cause dangerous clots.",
    category: "Lab Test",
    relatedTerms: ["CBC"],
  },
  {
    term: "MCV",
    aliases: ["mcv", "mean corpuscular volume"],
    definition:
      "A measure of the average size of your red blood cells. Cells that are too big or too small can point to different types of anemia.",
    category: "Lab Test",
    relatedTerms: ["RBC", "MCH", "Anemia"],
  },
  {
    term: "MCH",
    aliases: ["mch", "mean corpuscular hemoglobin"],
    definition:
      "The average amount of hemoglobin (the oxygen-carrying protein) in each red blood cell. It helps figure out what kind of anemia you may have.",
    category: "Lab Test",
    relatedTerms: ["MCV", "MCHC", "Hemoglobin"],
  },
  {
    term: "MCHC",
    aliases: ["mchc", "mean corpuscular hemoglobin concentration"],
    definition:
      "How concentrated the hemoglobin is inside your red blood cells. Low levels can mean iron deficiency; high levels are less common.",
    category: "Lab Test",
    relatedTerms: ["MCH", "MCV", "Iron Deficiency"],
  },
  {
    term: "RDW",
    aliases: ["rdw", "red cell distribution width"],
    definition:
      "Shows how much your red blood cells vary in size. A wide range can be an early sign of anemia or other blood conditions.",
    category: "Lab Test",
    relatedTerms: ["MCV", "RBC", "Anemia"],
  },

  // =========================================================================
  // LAB TESTS — Kidney
  // =========================================================================
  {
    term: "BUN",
    aliases: ["bun", "blood urea nitrogen"],
    definition:
      "A waste product that your kidneys filter out of your blood. High BUN can be a sign that your kidneys are not working as well as they should.",
    category: "Lab Test",
    relatedTerms: ["Creatinine", "eGFR", "Kidney", "Kidney Disease"],
  },
  {
    term: "Creatinine",
    aliases: ["creatinine", "creat"],
    definition:
      "A waste product made by your muscles that your kidneys remove. A high level may mean your kidneys need extra attention.",
    category: "Lab Test",
    relatedTerms: ["BUN", "eGFR", "Kidney"],
  },
  {
    term: "eGFR",
    aliases: ["egfr", "estimated glomerular filtration rate", "gfr"],
    definition:
      "A number that estimates how well your kidneys are filtering waste from your blood. Higher is better — a low number may mean your kidneys need attention.",
    category: "Lab Test",
    relatedTerms: ["Creatinine", "BUN", "Kidney Disease"],
  },
  {
    term: "Uric Acid",
    aliases: ["uric acid", "urate"],
    definition:
      "A waste product that forms when your body breaks down certain foods. Too much can build up in your joints and cause a painful condition called gout.",
    category: "Lab Test",
    relatedTerms: ["Gout", "Kidney"],
  },

  // =========================================================================
  // LAB TESTS — Liver
  // =========================================================================
  {
    term: "ALT",
    aliases: ["alt", "alanine aminotransferase", "sgpt"],
    definition:
      "A liver enzyme. When your liver is damaged or irritated, ALT leaks into your blood. A high level is a signal that your liver may need attention.",
    category: "Lab Test",
    relatedTerms: ["AST", "Liver", "Alkaline Phosphatase", "GGT"],
  },
  {
    term: "AST",
    aliases: ["ast", "aspartate aminotransferase", "sgot"],
    definition:
      "An enzyme found mainly in your liver and heart. High levels can mean your liver, heart, or muscles have been stressed or damaged.",
    category: "Lab Test",
    relatedTerms: ["ALT", "Liver", "Alkaline Phosphatase"],
  },
  {
    term: "Alkaline Phosphatase",
    aliases: ["alkaline phosphatase", "alp", "alk phos"],
    definition:
      "An enzyme found in your liver and bones. High levels can point to liver problems or bone conditions.",
    category: "Lab Test",
    relatedTerms: ["ALT", "AST", "Bilirubin", "Liver"],
  },
  {
    term: "Bilirubin",
    aliases: ["bilirubin", "total bilirubin", "tbili"],
    definition:
      "A yellow substance made when your body breaks down old red blood cells. Your liver clears it out. High levels can cause yellowing of the skin.",
    category: "Lab Test",
    relatedTerms: ["Liver", "ALT", "AST"],
  },
  {
    term: "Albumin",
    aliases: ["albumin", "alb"],
    definition:
      "A protein made by your liver that keeps fluid in your blood vessels and carries important substances. Low levels can signal liver or kidney problems.",
    category: "Lab Test",
    relatedTerms: ["Liver", "Kidney"],
  },
  {
    term: "GGT",
    aliases: ["ggt", "gamma-glutamyl transferase", "gamma gt"],
    definition:
      "A liver enzyme that goes up when your liver or bile ducts are irritated. It is especially sensitive to alcohol use.",
    category: "Lab Test",
    relatedTerms: ["ALT", "AST", "Alkaline Phosphatase", "Liver"],
  },

  // =========================================================================
  // LAB TESTS — Thyroid
  // =========================================================================
  {
    term: "TSH",
    aliases: ["tsh", "thyroid stimulating hormone", "thyroid-stimulating hormone"],
    definition:
      "A hormone that tells your thyroid gland how much thyroid hormone to make. Abnormal levels can mean your thyroid is over-active or under-active.",
    category: "Lab Test",
    relatedTerms: ["Free T3", "Free T4", "Thyroid", "Hypothyroidism", "Hyperthyroidism"],
  },
  {
    term: "Free T3",
    aliases: ["free t3", "t3", "triiodothyronine"],
    definition:
      "A thyroid hormone that helps control how fast your body uses energy. Low or high levels can affect your weight, mood, and energy.",
    category: "Lab Test",
    relatedTerms: ["TSH", "Free T4", "Thyroid"],
  },
  {
    term: "Free T4",
    aliases: ["free t4", "t4", "thyroxine"],
    definition:
      "The main hormone your thyroid gland makes. It controls your metabolism — how your body turns food into energy.",
    category: "Lab Test",
    relatedTerms: ["TSH", "Free T3", "Thyroid"],
  },

  // =========================================================================
  // LAB TESTS — Vitamins & Minerals
  // =========================================================================
  {
    term: "Vitamin D",
    aliases: ["vitamin d", "vit d", "25-hydroxy vitamin d", "25-oh vitamin d"],
    definition:
      "A vitamin your skin makes from sunlight. It keeps your bones strong and helps your immune system. Many people do not get enough.",
    category: "Lab Test",
    relatedTerms: ["Calcium", "Vitamin D Deficiency"],
  },
  {
    term: "Vitamin B12",
    aliases: ["vitamin b12", "b12", "cobalamin"],
    definition:
      "A vitamin that helps your nerves work properly and helps make red blood cells. Low levels can cause tiredness and numbness.",
    category: "Lab Test",
    relatedTerms: ["Folate", "Anemia"],
  },
  {
    term: "Folate",
    aliases: ["folate", "folic acid", "vitamin b9"],
    definition:
      "A B vitamin that helps your body make new cells, especially red blood cells. It is very important during pregnancy.",
    category: "Lab Test",
    relatedTerms: ["Vitamin B12", "Anemia"],
  },
  {
    term: "Iron",
    aliases: ["iron", "serum iron"],
    definition:
      "A mineral your body needs to make hemoglobin, the part of red blood cells that carries oxygen. Low iron makes you feel tired and weak.",
    category: "Lab Test",
    relatedTerms: ["Ferritin", "TIBC", "Hemoglobin", "Iron Deficiency"],
  },
  {
    term: "Ferritin",
    aliases: ["ferritin"],
    definition:
      "A protein that stores iron in your body. It shows how much iron you have saved up. Low ferritin is an early sign of low iron.",
    category: "Lab Test",
    relatedTerms: ["Iron", "TIBC", "Iron Deficiency"],
  },
  {
    term: "TIBC",
    aliases: ["tibc", "total iron binding capacity"],
    definition:
      "Measures how well your blood can carry iron. When iron is low, TIBC goes up because your body is trying harder to grab the iron it needs.",
    category: "Lab Test",
    relatedTerms: ["Iron", "Ferritin", "Iron Deficiency"],
  },

  // =========================================================================
  // LAB TESTS — Electrolytes
  // =========================================================================
  {
    term: "Sodium",
    aliases: ["sodium", "na"],
    definition:
      "An electrolyte that helps control how much water is in your body and keeps your nerves and muscles working. Most sodium comes from salt in food.",
    category: "Lab Test",
    relatedTerms: ["Potassium", "Chloride", "CMP"],
  },
  {
    term: "Potassium",
    aliases: ["potassium", "k"],
    definition:
      "An electrolyte that is critical for keeping your heart beating in a regular rhythm and your muscles working properly.",
    category: "Lab Test",
    relatedTerms: ["Sodium", "Magnesium"],
  },
  {
    term: "Calcium",
    aliases: ["calcium", "ca"],
    definition:
      "A mineral that keeps your bones and teeth strong. It also helps your heart, muscles, and nerves work the way they should.",
    category: "Lab Test",
    relatedTerms: ["Vitamin D", "Phosphorus"],
  },
  {
    term: "Magnesium",
    aliases: ["magnesium", "mg"],
    definition:
      "A mineral that helps with muscle movement, nerve signals, and keeping your heartbeat steady. Low levels can cause muscle cramps.",
    category: "Lab Test",
    relatedTerms: ["Calcium", "Potassium"],
  },
  {
    term: "Chloride",
    aliases: ["chloride", "cl"],
    definition:
      "An electrolyte that works with sodium to keep the right amount of fluid in your body and helps maintain proper blood acidity.",
    category: "Lab Test",
    relatedTerms: ["Sodium", "CO2/Bicarbonate"],
  },
  {
    term: "CO2/Bicarbonate",
    aliases: ["co2", "bicarbonate", "carbon dioxide", "hco3", "co2/bicarbonate"],
    definition:
      "A substance in your blood that keeps it from becoming too acidic or too basic. Your kidneys and lungs work together to keep it balanced.",
    category: "Lab Test",
    relatedTerms: ["Chloride", "Sodium", "Kidney"],
  },
  {
    term: "Phosphorus",
    aliases: ["phosphorus", "phosphate"],
    definition:
      "A mineral that works with calcium to build strong bones and teeth. It also helps your body make energy and repair cells.",
    category: "Lab Test",
    relatedTerms: ["Calcium", "Vitamin D"],
  },

  // =========================================================================
  // LAB TESTS — Other
  // =========================================================================
  {
    term: "PSA",
    aliases: ["psa", "prostate specific antigen", "prostate-specific antigen"],
    definition:
      "A protein made by the prostate gland. Doctors measure it to screen for prostate problems, including prostate cancer. A high number does not always mean cancer.",
    category: "Lab Test",
    relatedTerms: [],
  },
  {
    term: "CRP",
    aliases: ["crp", "c-reactive protein", "hs-crp", "high-sensitivity crp"],
    definition:
      "A substance your liver makes when there is swelling (inflammation) somewhere in your body. High CRP can be a warning sign for heart disease.",
    category: "Lab Test",
    relatedTerms: ["ESR", "Heart Disease"],
  },
  {
    term: "ESR",
    aliases: ["esr", "sed rate", "erythrocyte sedimentation rate"],
    definition:
      "A blood test that checks for inflammation in your body. A high number means something may be causing swelling or irritation.",
    category: "Lab Test",
    relatedTerms: ["CRP"],
  },

  // =========================================================================
  // CONDITIONS
  // =========================================================================
  {
    term: "Diabetes",
    aliases: ["diabetes", "type 2 diabetes", "type 1 diabetes", "diabetes mellitus"],
    definition:
      "A condition where your blood sugar stays too high because your body cannot make or properly use insulin. Over time, high blood sugar can damage your heart, eyes, and kidneys.",
    category: "Condition",
    relatedTerms: ["A1C", "Glucose (Fasting)", "Insulin", "Pre-diabetes"],
  },
  {
    term: "Pre-diabetes",
    aliases: ["pre-diabetes", "prediabetes", "borderline diabetes"],
    definition:
      "When your blood sugar is higher than normal but not high enough to be called diabetes. Making healthy changes now can often prevent it from becoming diabetes.",
    category: "Condition",
    relatedTerms: ["Diabetes", "A1C", "Glucose (Fasting)"],
  },
  {
    term: "Hypertension",
    aliases: ["hypertension", "high blood pressure", "htn"],
    definition:
      "When the force of blood pushing against your artery walls stays too high. It makes your heart work harder and can damage blood vessels over time.",
    category: "Condition",
    relatedTerms: ["Blood Pressure", "Systolic", "Diastolic", "Heart Disease"],
  },
  {
    term: "Hyperlipidemia",
    aliases: ["hyperlipidemia", "high cholesterol", "dyslipidemia"],
    definition:
      "When you have too much fat (like cholesterol or triglycerides) in your blood. It raises your risk of heart disease but usually has no symptoms.",
    category: "Condition",
    relatedTerms: ["Total Cholesterol", "LDL Cholesterol", "Triglycerides"],
  },
  {
    term: "Anemia",
    aliases: ["anemia", "anaemia"],
    definition:
      "When you do not have enough healthy red blood cells to carry oxygen to your body. It can make you feel tired, weak, and short of breath.",
    category: "Condition",
    relatedTerms: ["Hemoglobin", "Hematocrit", "Iron", "Iron Deficiency"],
  },
  {
    term: "Hypothyroidism",
    aliases: ["hypothyroidism", "underactive thyroid", "low thyroid"],
    definition:
      "When your thyroid gland does not make enough thyroid hormone. This can make you feel tired, gain weight, and feel cold more easily.",
    category: "Condition",
    relatedTerms: ["TSH", "Free T4", "Thyroid"],
  },
  {
    term: "Hyperthyroidism",
    aliases: ["hyperthyroidism", "overactive thyroid"],
    definition:
      "When your thyroid gland makes too much thyroid hormone. It can speed up your heartbeat, cause weight loss, and make you feel anxious or shaky.",
    category: "Condition",
    relatedTerms: ["TSH", "Free T3", "Thyroid"],
  },
  {
    term: "Gout",
    aliases: ["gout"],
    definition:
      "A type of arthritis caused by too much uric acid building up in your joints. It causes sudden, severe pain — most often in the big toe.",
    category: "Condition",
    relatedTerms: ["Uric Acid"],
  },
  {
    term: "Kidney Disease",
    aliases: ["kidney disease", "chronic kidney disease", "ckd", "renal disease"],
    definition:
      "When your kidneys are damaged and cannot filter blood as well as they should. Waste can build up in your body and cause other health problems.",
    category: "Condition",
    relatedTerms: ["eGFR", "Creatinine", "BUN", "Kidney"],
  },
  {
    term: "Metabolic Syndrome",
    aliases: ["metabolic syndrome", "syndrome x"],
    definition:
      "A group of conditions that happen together — high blood sugar, high blood pressure, extra belly fat, and abnormal cholesterol. Having them raises your risk of heart disease and diabetes.",
    category: "Condition",
    relatedTerms: ["Diabetes", "Hypertension", "Hyperlipidemia"],
  },
  {
    term: "Atherosclerosis",
    aliases: ["atherosclerosis", "hardening of the arteries"],
    definition:
      "When fatty deposits build up inside your arteries, making them narrow and stiff. This can reduce blood flow and lead to heart attack or stroke.",
    category: "Condition",
    relatedTerms: ["LDL Cholesterol", "Heart Disease", "Stroke"],
  },
  {
    term: "Heart Disease",
    aliases: [
      "heart disease",
      "cardiovascular disease",
      "cvd",
      "coronary artery disease",
      "cad",
    ],
    definition:
      "A group of conditions that affect your heart or blood vessels. It is the leading cause of death worldwide, but many types can be prevented with healthy habits.",
    category: "Condition",
    relatedTerms: ["Atherosclerosis", "Hypertension", "Total Cholesterol", "CRP"],
  },
  {
    term: "Stroke",
    aliases: ["stroke", "cerebrovascular accident", "cva"],
    definition:
      "When blood flow to part of your brain is blocked or a blood vessel in your brain bursts. It is a medical emergency that can cause lasting damage.",
    category: "Condition",
    relatedTerms: ["Hypertension", "Heart Disease", "Atherosclerosis"],
  },
  {
    term: "Iron Deficiency",
    aliases: ["iron deficiency", "low iron"],
    definition:
      "When your body does not have enough iron to make healthy red blood cells. It is the most common cause of anemia and can make you feel exhausted.",
    category: "Condition",
    relatedTerms: ["Iron", "Ferritin", "TIBC", "Anemia"],
  },
  {
    term: "Vitamin D Deficiency",
    aliases: ["vitamin d deficiency", "low vitamin d"],
    definition:
      "When you do not have enough vitamin D in your body. It can weaken your bones and may affect your mood and immune system.",
    category: "Condition",
    relatedTerms: ["Vitamin D", "Calcium"],
  },
  {
    term: "Fatty Liver Disease",
    aliases: ["fatty liver", "nafld", "fatty liver disease", "non-alcoholic fatty liver disease"],
    definition:
      "When too much fat builds up in your liver. It is very common and often linked to being overweight. Most people have no symptoms at first.",
    category: "Condition",
    relatedTerms: ["ALT", "AST", "GGT", "Liver"],
  },
  {
    term: "Celiac Disease",
    aliases: ["celiac disease", "celiac", "coeliac disease"],
    definition:
      "A condition where eating gluten (a protein in wheat, barley, and rye) damages the lining of your small intestine and makes it hard to absorb nutrients.",
    category: "Condition",
    relatedTerms: ["Iron Deficiency", "Vitamin B12", "Folate"],
  },
  {
    term: "Osteoporosis",
    aliases: ["osteoporosis", "bone loss"],
    definition:
      "A condition where your bones become weak and brittle, making them more likely to break. It often develops slowly with no symptoms until a fracture happens.",
    category: "Condition",
    relatedTerms: ["Calcium", "Vitamin D", "Alkaline Phosphatase"],
  },
  {
    term: "Inflammation",
    aliases: ["inflammation"],
    definition:
      "Your body's natural response to injury or infection — it causes redness, swelling, and warmth. Chronic (long-lasting) inflammation can damage healthy tissue over time.",
    category: "Condition",
    relatedTerms: ["CRP", "ESR"],
  },
  {
    term: "Dehydration",
    aliases: ["dehydration"],
    definition:
      "When your body loses more water than it takes in. It can make you feel dizzy, tired, and thirsty, and can affect your blood test results.",
    category: "Condition",
    relatedTerms: ["Sodium", "Hematocrit", "BUN"],
  },

  // =========================================================================
  // MEASUREMENTS
  // =========================================================================
  {
    term: "Blood Pressure",
    aliases: ["blood pressure", "bp"],
    definition:
      "The force of blood pushing against the walls of your arteries. It is written as two numbers (like 120/80) — the top number (systolic) and the bottom number (diastolic).",
    category: "Measurement",
    relatedTerms: ["Systolic", "Diastolic", "Hypertension"],
  },
  {
    term: "Systolic",
    aliases: ["systolic", "systolic blood pressure", "systolic pressure"],
    definition:
      "The top number in a blood pressure reading. It measures the pressure in your arteries when your heart beats and pushes blood out.",
    category: "Measurement",
    relatedTerms: ["Diastolic", "Blood Pressure", "Hypertension"],
  },
  {
    term: "Diastolic",
    aliases: ["diastolic", "diastolic blood pressure", "diastolic pressure"],
    definition:
      "The bottom number in a blood pressure reading. It measures the pressure in your arteries when your heart rests between beats.",
    category: "Measurement",
    relatedTerms: ["Systolic", "Blood Pressure", "Hypertension"],
  },
  {
    term: "BMI",
    aliases: ["bmi", "body mass index"],
    definition:
      "A number calculated from your height and weight. It gives a rough idea of whether your weight is in a healthy range for your height.",
    category: "Measurement",
    relatedTerms: ["Body Fat Percentage", "Waist-to-Hip Ratio"],
  },
  {
    term: "Heart Rate",
    aliases: ["heart rate", "hr", "resting heart rate", "pulse rate"],
    definition:
      "How many times your heart beats in one minute. A normal resting heart rate for adults is usually between 60 and 100 beats per minute.",
    category: "Measurement",
    relatedTerms: ["Pulse", "Blood Pressure"],
  },
  {
    term: "Pulse",
    aliases: ["pulse"],
    definition:
      "The rhythmic beating you can feel in your wrist or neck as your heart pumps blood. It tells you how fast your heart is beating.",
    category: "Measurement",
    relatedTerms: ["Heart Rate"],
  },
  {
    term: "Body Fat Percentage",
    aliases: ["body fat percentage", "body fat", "bf%"],
    definition:
      "The portion of your total body weight that is fat. A healthy amount of body fat is needed for energy and protecting organs.",
    category: "Measurement",
    relatedTerms: ["BMI", "Waist-to-Hip Ratio"],
  },
  {
    term: "Waist-to-Hip Ratio",
    aliases: ["waist-to-hip ratio", "whr", "waist to hip ratio"],
    definition:
      "A measurement that compares the size of your waist to your hips. A higher ratio can mean more belly fat, which is linked to higher health risks.",
    category: "Measurement",
    relatedTerms: ["BMI", "Body Fat Percentage", "Metabolic Syndrome"],
  },
  {
    term: "Blood Oxygen",
    aliases: ["blood oxygen", "spo2", "oxygen saturation", "o2 sat"],
    definition:
      "The percentage of your red blood cells that are carrying oxygen. Normal levels are usually 95% or higher.",
    category: "Measurement",
    relatedTerms: ["Hemoglobin", "Heart Rate"],
  },
  {
    term: "Temperature",
    aliases: ["temperature", "body temperature", "temp"],
    definition:
      "A measure of how warm your body is. Normal is around 98.6 degrees Fahrenheit (37 degrees Celsius). A fever means your body is fighting an infection.",
    category: "Measurement",
    relatedTerms: [],
  },

  // =========================================================================
  // ORGANS
  // =========================================================================
  {
    term: "Thyroid",
    aliases: ["thyroid", "thyroid gland"],
    definition:
      "A small, butterfly-shaped gland in your neck that makes hormones controlling your metabolism — how fast or slow your body uses energy.",
    category: "Organ",
    relatedTerms: ["TSH", "Free T3", "Free T4", "Hypothyroidism", "Hyperthyroidism"],
  },
  {
    term: "Liver",
    aliases: ["liver"],
    definition:
      "A large organ on the right side of your belly that filters your blood, breaks down toxins, makes bile to digest fat, and stores energy.",
    category: "Organ",
    relatedTerms: ["ALT", "AST", "Bilirubin", "Albumin", "GGT"],
  },
  {
    term: "Kidney",
    aliases: ["kidney", "kidneys"],
    definition:
      "Two bean-shaped organs that filter waste and extra water from your blood to make urine. They also help control blood pressure.",
    category: "Organ",
    relatedTerms: ["eGFR", "Creatinine", "BUN", "Kidney Disease"],
  },
  {
    term: "Pancreas",
    aliases: ["pancreas"],
    definition:
      "An organ behind your stomach that makes insulin (to control blood sugar) and enzymes (to help digest food).",
    category: "Organ",
    relatedTerms: ["Insulin", "Glucose (Fasting)", "Diabetes"],
  },
  {
    term: "Bone Marrow",
    aliases: ["bone marrow"],
    definition:
      "The soft, spongy tissue inside your bones where blood cells are made — red blood cells, white blood cells, and platelets.",
    category: "Organ",
    relatedTerms: ["RBC", "WBC", "Platelets", "CBC"],
  },

  // =========================================================================
  // MEDICATION TERMS
  // =========================================================================
  {
    term: "Dosage",
    aliases: ["dosage", "dose"],
    definition:
      "The amount of medicine you take at one time. Your doctor sets the right dosage based on your age, weight, and condition.",
    category: "Medication Term",
    relatedTerms: ["Frequency"],
  },
  {
    term: "Frequency",
    aliases: ["frequency", "how often"],
    definition:
      "How often you take your medicine — for example, once a day, twice a day, or every 8 hours.",
    category: "Medication Term",
    relatedTerms: ["Dosage"],
  },
  {
    term: "Side Effect",
    aliases: ["side effect", "side effects", "adverse effect"],
    definition:
      "An unwanted reaction caused by a medicine. Some side effects are mild (like an upset stomach), while others can be serious.",
    category: "Medication Term",
    relatedTerms: [],
  },
  {
    term: "Generic",
    aliases: ["generic", "generic medication", "generic drug"],
    definition:
      "A medicine that has the same active ingredient as a brand-name drug but usually costs less. It works the same way in your body.",
    category: "Medication Term",
    relatedTerms: [],
  },
  {
    term: "Over-the-Counter",
    aliases: ["over-the-counter", "otc", "over the counter"],
    definition:
      "Medicine you can buy without a prescription from your doctor. Examples include pain relievers and cold medicine.",
    category: "Medication Term",
    relatedTerms: [],
  },

  // =========================================================================
  // GENERAL MEDICAL TERMS
  // =========================================================================
  {
    term: "Biomarker",
    aliases: ["biomarker", "bio marker"],
    definition:
      "A measurable substance in your body (like cholesterol or blood sugar) that doctors use to check your health or track a condition.",
    category: "General",
    relatedTerms: ["Lab Work", "Reference Range"],
  },
  {
    term: "Reference Range",
    aliases: ["reference range", "normal range", "expected range"],
    definition:
      "The range of values that is considered normal for a lab test. If your result falls outside this range, it may need a closer look.",
    category: "General",
    relatedTerms: ["Biomarker", "Flagged"],
  },
  {
    term: "Fasting",
    aliases: ["fasting"],
    definition:
      "Not eating or drinking anything except water for a period of time before a blood test, usually 8-12 hours. This gives more accurate results for some tests.",
    category: "General",
    relatedTerms: ["Glucose (Fasting)", "Triglycerides"],
  },
  {
    term: "CBC",
    aliases: ["cbc", "complete blood count"],
    definition:
      "A common blood test that counts different types of cells in your blood — red blood cells, white blood cells, and platelets. It gives a broad picture of your overall health.",
    category: "General",
    relatedTerms: ["RBC", "WBC", "Hemoglobin", "Platelets"],
  },
  {
    term: "CMP",
    aliases: ["cmp", "comprehensive metabolic panel", "metabolic panel"],
    definition:
      "A group of 14 blood tests that check your blood sugar, kidney function, liver function, and electrolyte levels all at once.",
    category: "General",
    relatedTerms: ["Glucose (Fasting)", "Creatinine", "ALT", "Sodium"],
  },
  {
    term: "Lipid Panel",
    aliases: ["lipid panel", "lipid profile", "cholesterol panel"],
    definition:
      "A blood test that measures the different types of fats in your blood — total cholesterol, LDL, HDL, and triglycerides.",
    category: "General",
    relatedTerms: ["Total Cholesterol", "LDL Cholesterol", "HDL Cholesterol", "Triglycerides"],
  },
  {
    term: "Metabolic Panel",
    aliases: ["metabolic panel", "basic metabolic panel", "bmp"],
    definition:
      "A group of blood tests that check your blood sugar, kidney function, and electrolyte levels. The 'basic' version has 8 tests; the 'comprehensive' version has 14.",
    category: "General",
    relatedTerms: ["CMP", "Glucose (Fasting)", "Sodium", "Potassium"],
  },
  {
    term: "Normal Range",
    aliases: ["normal range"],
    definition:
      "The set of values for a lab test that most healthy people fall within. Being outside the normal range does not always mean something is wrong.",
    category: "General",
    relatedTerms: ["Reference Range", "Borderline", "Flagged"],
  },
  {
    term: "Borderline",
    aliases: ["borderline"],
    definition:
      "A test result that is close to the edge of the normal range — not quite normal, but not clearly abnormal either. Your doctor may want to watch it over time.",
    category: "General",
    relatedTerms: ["Reference Range", "Normal Range", "Flagged"],
  },
  {
    term: "Flagged",
    aliases: ["flagged", "flag", "abnormal flag"],
    definition:
      "When a lab result is marked because it falls outside the normal range. A flag is a heads-up, not a diagnosis — your doctor will help explain what it means.",
    category: "General",
    relatedTerms: ["Reference Range", "Borderline"],
  },
  {
    term: "PHI",
    aliases: ["phi", "protected health information"],
    definition:
      "Personal health information that is protected by law — things like your name, medical records, and lab results. Hospitals and apps must keep it private.",
    category: "General",
    relatedTerms: ["HIPAA"],
  },
  {
    term: "HIPAA",
    aliases: ["hipaa"],
    definition:
      "A U.S. law that protects your personal health information. It requires doctors, hospitals, and health apps to keep your medical data private and secure.",
    category: "General",
    relatedTerms: ["PHI"],
  },
  {
    term: "Lab Work",
    aliases: ["lab work", "labs", "laboratory tests", "blood work"],
    definition:
      "Tests done on samples of your blood, urine, or other body fluids. Lab work helps your doctor check how your body is doing and spot problems early.",
    category: "General",
    relatedTerms: ["Blood Draw", "Biomarker", "CBC", "CMP"],
  },
  {
    term: "Blood Draw",
    aliases: ["blood draw", "venipuncture", "phlebotomy"],
    definition:
      "When a nurse or technician uses a needle to take a small amount of blood from a vein in your arm for lab tests.",
    category: "General",
    relatedTerms: ["Lab Work", "Fasting"],
  },
  {
    term: "Specimen",
    aliases: ["specimen", "sample"],
    definition:
      "A small amount of blood, urine, or other body fluid collected for testing in a lab.",
    category: "General",
    relatedTerms: ["Lab Work", "Blood Draw"],
  },
  {
    term: "Screening",
    aliases: ["screening", "health screening"],
    definition:
      "Testing done to look for a disease before you have any symptoms. Screenings can catch problems early when they are easier to treat.",
    category: "General",
    relatedTerms: ["Lab Work", "Biomarker"],
  },
  {
    term: "Diagnosis",
    aliases: ["diagnosis"],
    definition:
      "When a doctor identifies a disease or condition based on your symptoms, exam, and test results. It is the name given to what is causing your health issue.",
    category: "General",
    relatedTerms: ["Screening", "Biomarker"],
  },
  {
    term: "Chronic",
    aliases: ["chronic"],
    definition:
      "A condition or disease that lasts a long time — usually months or years. Chronic conditions like diabetes or high blood pressure need ongoing care.",
    category: "General",
    relatedTerms: ["Diabetes", "Hypertension"],
  },
  {
    term: "Acute",
    aliases: ["acute"],
    definition:
      "A condition that comes on suddenly and usually does not last long. An acute illness like a cold is different from a chronic one like diabetes.",
    category: "General",
    relatedTerms: ["Chronic"],
  },
  {
    term: "Inflammation Marker",
    aliases: ["inflammation marker"],
    definition:
      "A substance in your blood that goes up when your body is fighting an injury, infection, or disease. CRP and ESR are common inflammation markers.",
    category: "General",
    relatedTerms: ["CRP", "ESR", "Inflammation"],
  },
  {
    term: "Electrolyte",
    aliases: ["electrolyte", "electrolytes"],
    definition:
      "Minerals in your blood (like sodium, potassium, and calcium) that carry an electric charge. They keep your muscles, nerves, and heart working properly.",
    category: "General",
    relatedTerms: ["Sodium", "Potassium", "Calcium", "Magnesium"],
  },
  {
    term: "Enzyme",
    aliases: ["enzyme", "enzymes"],
    definition:
      "A protein that speeds up chemical reactions in your body. Liver enzymes like ALT and AST are measured to check if your liver is healthy.",
    category: "General",
    relatedTerms: ["ALT", "AST", "Alkaline Phosphatase"],
  },
  {
    term: "Hormone",
    aliases: ["hormone", "hormones"],
    definition:
      "A chemical messenger made by glands in your body. Hormones travel through your blood and tell organs and tissues what to do — like insulin controlling blood sugar.",
    category: "General",
    relatedTerms: ["Insulin", "TSH", "Free T3", "Free T4"],
  },
  {
    term: "Antibody",
    aliases: ["antibody", "antibodies"],
    definition:
      "A protein your immune system makes to fight germs. Each antibody is designed to attack a specific virus or bacteria.",
    category: "General",
    relatedTerms: ["WBC"],
  },
  {
    term: "Antigen",
    aliases: ["antigen"],
    definition:
      "A substance (usually on the surface of germs) that triggers your immune system to make antibodies. Lab tests sometimes measure antigens to detect infections.",
    category: "General",
    relatedTerms: ["Antibody", "PSA"],
  },
];

// ---------------------------------------------------------------------------
// Index for O(1) lookups by term or alias
// ---------------------------------------------------------------------------

/** Maps lowercase term or alias to the glossary entry index */
const termIndex = new Map<string, number>();

function buildIndex(): void {
  for (let i = 0; i < GLOSSARY_ENTRIES.length; i++) {
    const entry = GLOSSARY_ENTRIES[i];
    termIndex.set(entry.term.toLowerCase(), i);
    for (const alias of entry.aliases) {
      termIndex.set(alias.toLowerCase(), i);
    }
  }
}

// Build on module load
buildIndex();

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/**
 * Look up a glossary entry by term name or alias. O(1) via index map.
 * Case-insensitive.
 */
export function getGlossaryEntry(term: string): GlossaryEntry | null {
  const idx = termIndex.get(term.toLowerCase());
  if (idx !== undefined) {
    return GLOSSARY_ENTRIES[idx];
  }
  return null;
}

/**
 * Get a plain-English definition for a term. Returns a default message
 * if the term is not in the glossary.
 */
export function getDefinition(term: string): string {
  const entry = getGlossaryEntry(term);
  return entry?.definition ?? "A health marker measured in your lab work.";
}

/**
 * Get all entries for a given category.
 */
export function getEntriesByCategory(
  category: GlossaryEntry["category"]
): GlossaryEntry[] {
  return GLOSSARY_ENTRIES.filter((e) => e.category === category);
}

/**
 * Get all unique categories in the glossary.
 */
export function getCategories(): GlossaryEntry["category"][] {
  const seen = new Set<GlossaryEntry["category"]>();
  for (const entry of GLOSSARY_ENTRIES) {
    seen.add(entry.category);
  }
  return Array.from(seen);
}

/**
 * Search the glossary for terms matching a query string.
 * Matches against term name, aliases, and definition.
 * Case-insensitive.
 */
export function searchGlossary(query: string): GlossaryEntry[] {
  if (!query || query.trim().length === 0) {
    return [];
  }
  const q = query.trim().toLowerCase();
  return GLOSSARY_ENTRIES.filter(
    (entry) =>
      entry.term.toLowerCase().includes(q) ||
      entry.aliases.some((a) => a.includes(q)) ||
      entry.definition.toLowerCase().includes(q)
  );
}

// ---------------------------------------------------------------------------
// NLM API fallback lookup
// ---------------------------------------------------------------------------

/** Cache for NLM-sourced glossary entries */
const nlmCache = new Map<string, GlossaryEntry | null>();

/**
 * Look up a term — local glossary first (instant), then NLM API fallback.
 * Caches NLM results in memory.
 */
export async function lookupTerm(
  term: string
): Promise<GlossaryEntry | null> {
  // 1. Check local glossary (instant)
  const local = getGlossaryEntry(term);
  if (local) return local;

  // 2. Check NLM cache
  const normalized = term.trim().toLowerCase();
  if (nlmCache.has(normalized)) {
    return nlmCache.get(normalized) ?? null;
  }

  // 3. Query NLM Clinical Tables API
  try {
    const nlmResult = await lookupCondition(term);
    if (nlmResult) {
      const entry: GlossaryEntry = {
        term: term.trim(),
        aliases: [normalized],
        definition: nlmResult,
        category: "Condition",
        relatedTerms: [],
      };
      nlmCache.set(normalized, entry);
      return entry;
    }
  } catch {
    // Graceful degradation — NLM lookup is best-effort
  }

  nlmCache.set(normalized, null);
  return null;
}

/**
 * Clear the NLM lookup cache (useful for testing).
 */
export function clearGlossaryNlmCache(): void {
  nlmCache.clear();
}
