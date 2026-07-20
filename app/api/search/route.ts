import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  BIOMARKER_MAPPINGS,
  SYNONYM_INDEX,
  type BiomarkerMapping,
} from "@/lib/health/biomarker-synonyms";
import { normalizeBiomarkerName } from "@/lib/health/normalize-biomarker";
import { calculateBiomarkerTrend, type TrendDirection } from "@/lib/health/trend";

interface BiomarkerJSON {
  name: string;
  value: number;
  unit: string;
  reference_low: number | null;
  reference_high: number | null;
  flag: string;
}

interface BiomarkerReading {
  reportId: string;
  reportName: string;
  date: string;
  value: number;
  unit: string;
  flag: string;
}

interface BiomarkerSearchResult {
  canonicalName: string;
  category: string;
  readingCount: number;
  trend: TrendDirection;
  readings: BiomarkerReading[];
}

interface ReportSearchResult {
  id: string;
  name: string;
  date: string;
  biomarkerCount: number;
}

/**
 * Find biomarker mappings whose canonical name or synonyms contain the query.
 * Case-insensitive substring match. Returns unique mappings.
 */
function findMatchingMappings(query: string): BiomarkerMapping[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  // 1. Direct exact synonym match (e.g., "ldl" -> LDL Cholesterol)
  const exact = SYNONYM_INDEX.get(q);
  const matches = new Map<string, BiomarkerMapping>();
  if (exact) {
    matches.set(exact.canonical, exact);
  }

  // 2. Substring matches against canonical names + synonyms
  for (const mapping of BIOMARKER_MAPPINGS) {
    if (mapping.canonical.toLowerCase().includes(q)) {
      matches.set(mapping.canonical, mapping);
      continue;
    }
    for (const synonym of mapping.synonyms) {
      if (synonym.includes(q)) {
        matches.set(mapping.canonical, mapping);
        break;
      }
    }
  }

  return Array.from(matches.values());
}

export async function GET(request: Request) {
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse query parameter
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q") ?? "";
  const query = rawQuery.trim();

  if (query.length < 2) {
    return NextResponse.json(
      { error: "Query must be at least 2 characters" },
      { status: 400 }
    );
  }

  const queryLower = query.toLowerCase();
  const matchedCanonicals = new Set(
    findMatchingMappings(query).map((m) => m.canonical)
  );

  // Fetch all the user's reports with parsed results (RLS applies)
  const { data: reports, error: reportsError } = await supabase
    .from("reports")
    .select(
      "id, original_filename, report_date, created_at, parsed_results(id, biomarkers)"
    )
    .order("created_at", { ascending: false });

  if (reportsError) {
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }

  // Build per-canonical-name reading collections + match reports
  const biomarkerMap = new Map<
    string,
    { category: string; readings: BiomarkerReading[] }
  >();
  const reportResults: ReportSearchResult[] = [];

  for (const report of reports ?? []) {
    const reportId = report.id as string;
    const filename = (report.original_filename as string) ?? "";
    const reportDate =
      (report.report_date as string | null) ??
      (report.created_at as string);

    // parsed_results is a relation; can be array or object depending on count
    const parsedArr = Array.isArray(report.parsed_results)
      ? report.parsed_results
      : report.parsed_results
        ? [report.parsed_results]
        : [];

    const biomarkers: BiomarkerJSON[] = [];
    for (const pr of parsedArr) {
      const bms = (pr as { biomarkers?: BiomarkerJSON[] }).biomarkers;
      if (Array.isArray(bms)) {
        biomarkers.push(...bms);
      }
    }

    // Filename match -> include in report results
    if (filename.toLowerCase().includes(queryLower)) {
      reportResults.push({
        id: reportId,
        name: filename,
        date: reportDate,
        biomarkerCount: biomarkers.length,
      });
    }

    // Walk biomarkers and check matches
    for (const bm of biomarkers) {
      if (!bm || typeof bm.name !== "string" || typeof bm.value !== "number") {
        continue;
      }

      const norm = normalizeBiomarkerName(bm.name);
      const canonical = norm.matched ? norm.canonical : bm.name.trim();
      const category = norm.matched ? norm.category : "Unknown";

      // Match if canonical matches an extracted synonym/canonical, or
      // if the raw biomarker name itself contains the query (handles unmapped names).
      const matchedByCanonical = matchedCanonicals.has(canonical);
      const matchedByRawName = bm.name.toLowerCase().includes(queryLower);
      const matchedByCanonicalText = canonical
        .toLowerCase()
        .includes(queryLower);

      if (!matchedByCanonical && !matchedByRawName && !matchedByCanonicalText) {
        continue;
      }

      let entry = biomarkerMap.get(canonical);
      if (!entry) {
        entry = { category, readings: [] };
        biomarkerMap.set(canonical, entry);
      }

      entry.readings.push({
        reportId,
        reportName: filename,
        date: reportDate,
        value: bm.value,
        unit: bm.unit ?? "",
        flag: bm.flag ?? "unknown",
      });
    }
  }

  // Build biomarker results — sort readings by date desc, compute trend
  const biomarkerResults: BiomarkerSearchResult[] = [];
  for (const [canonicalName, { category, readings }] of biomarkerMap) {
    const sorted = [...readings].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    let trend: TrendDirection = "stable";
    if (sorted.length >= 2) {
      const newest = sorted[0];
      const oldest = sorted[sorted.length - 1];
      trend = calculateBiomarkerTrend(canonicalName, oldest.value, newest.value);
    }

    biomarkerResults.push({
      canonicalName,
      category,
      readingCount: sorted.length,
      trend,
      readings: sorted,
    });
  }

  // Sort biomarker results: most readings first, then alphabetical
  biomarkerResults.sort((a, b) => {
    if (b.readingCount !== a.readingCount) {
      return b.readingCount - a.readingCount;
    }
    return a.canonicalName.localeCompare(b.canonicalName);
  });

  // Sort report results by date desc
  reportResults.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const totalResults = biomarkerResults.length + reportResults.length;

  return NextResponse.json(
    {
      query,
      totalResults,
      biomarkers: biomarkerResults,
      reports: reportResults,
    },
    { status: 200 }
  );
}
