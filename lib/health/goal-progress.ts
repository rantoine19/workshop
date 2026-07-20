/**
 * Server-side helpers for computing goal progress.
 *
 * Goals are tied to canonical biomarkers stored on risk_flags. The
 * `boost_health_score` goal is special — it derives its value from the
 * Health Credit Score computed off the latest report's flags instead of a
 * biomarker reading.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateHealthScore } from "./health-score";
import {
  STANDARD_GOALS,
  isAchieved,
  type StandardGoal,
} from "./standard-goals";

/**
 * Return the latest numeric value the user has recorded for the goal's
 * primary or alternate biomarker.
 *
 * Uses risk_flags joined against reports so we only look at parsed reports
 * scoped to the given family member (or the account owner when null).
 */
export async function fetchLatestBiomarkerValue(
  supabase: SupabaseClient,
  userId: string,
  familyMemberId: string | null,
  goal: StandardGoal
): Promise<number | null> {
  // Special-case the health score goal.
  if (goal.id === "boost_health_score") {
    return fetchLatestHealthScore(supabase, userId, familyMemberId);
  }

  const names = [goal.targetBiomarker];
  if (goal.alternateBiomarker) names.push(goal.alternateBiomarker);

  // Find the user's parsed reports (newest first) scoped to the profile.
  let reportsQuery = supabase
    .from("reports")
    .select("id, created_at")
    .eq("user_id", userId)
    .eq("status", "parsed")
    .order("created_at", { ascending: false })
    .limit(10);

  if (familyMemberId) {
    reportsQuery = reportsQuery.eq("family_member_id", familyMemberId);
  } else {
    reportsQuery = reportsQuery.is("family_member_id", null);
  }

  const { data: reports } = await reportsQuery;
  if (!reports || reports.length === 0) return null;

  const reportIds = reports.map((r) => r.id);

  const { data: parsed } = await supabase
    .from("parsed_results")
    .select("id, report_id")
    .in("report_id", reportIds);

  if (!parsed || parsed.length === 0) return null;

  // Build a report_id -> created_at map to find the most recent match.
  const orderIndex = new Map<string, number>();
  reports.forEach((r, i) => orderIndex.set(r.id, i));

  const parsedIds = parsed.map((p) => p.id);

  const { data: flags } = await supabase
    .from("risk_flags")
    .select("biomarker_name, value, parsed_result_id")
    .in("parsed_result_id", parsedIds)
    .in("biomarker_name", names);

  if (!flags || flags.length === 0) return null;

  // Map parsed_result_id back to report ordering.
  const parsedToReport = new Map<string, string>();
  parsed.forEach((p) => parsedToReport.set(p.id, p.report_id));

  // Prefer the goal's primary biomarker, falling back to alternate. Within
  // each biomarker, pick the value from the newest report.
  let bestValue: number | null = null;
  let bestOrder = Number.POSITIVE_INFINITY;
  let bestIsPrimary = false;

  for (const flag of flags) {
    if (flag.value === null || flag.value === undefined) continue;
    const reportId = parsedToReport.get(flag.parsed_result_id);
    if (!reportId) continue;
    const order = orderIndex.get(reportId);
    if (order === undefined) continue;

    const isPrimary = flag.biomarker_name === goal.targetBiomarker;

    // Primary beats alternate. Newer report beats older within same tier.
    if (
      (isPrimary && !bestIsPrimary) ||
      (isPrimary === bestIsPrimary && order < bestOrder)
    ) {
      bestValue = Number(flag.value);
      bestOrder = order;
      bestIsPrimary = isPrimary;
    }
  }

  return bestValue;
}

async function fetchLatestHealthScore(
  supabase: SupabaseClient,
  userId: string,
  familyMemberId: string | null
): Promise<number | null> {
  let reportQuery = supabase
    .from("reports")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "parsed")
    .order("created_at", { ascending: false })
    .limit(1);

  if (familyMemberId) {
    reportQuery = reportQuery.eq("family_member_id", familyMemberId);
  } else {
    reportQuery = reportQuery.is("family_member_id", null);
  }

  const { data: latest } = await reportQuery.maybeSingle();
  if (!latest) return null;

  const { data: parsed } = await supabase
    .from("parsed_results")
    .select("id")
    .eq("report_id", latest.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!parsed) return null;

  const { data: flags } = await supabase
    .from("risk_flags")
    .select("biomarker_name, flag")
    .eq("parsed_result_id", parsed.id);

  if (!flags || flags.length === 0) return null;

  const result = calculateHealthScore(
    flags.map((f) => ({
      name: f.biomarker_name,
      flag: f.flag as "green" | "yellow" | "red",
    }))
  );
  return result.score;
}

/**
 * Row shape from the health_goals table.
 */
export interface HealthGoalRow {
  id: string;
  user_id: string;
  family_member_id: string | null;
  goal_id: string;
  status: string;
  activated_at: string;
  achieved_at: string | null;
  starting_value: number | null;
  current_value: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Refresh current values (and achieved status) for every active goal of the
 * given user/family-member combination. Fire-and-forget from the parse
 * pipeline — errors are logged but never thrown.
 *
 * Returns the ids of goals that transitioned to `achieved` on this pass so
 * callers can raise a celebration notification.
 */
export async function refreshGoalsForUser(
  supabase: SupabaseClient,
  userId: string,
  familyMemberId: string | null
): Promise<string[]> {
  const goalsQuery = supabase
    .from("health_goals")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active");

  const scopedQuery = familyMemberId
    ? goalsQuery.eq("family_member_id", familyMemberId)
    : goalsQuery.is("family_member_id", null);

  const { data: goals, error } = await scopedQuery;

  if (error || !goals || goals.length === 0) return [];

  const newlyAchieved: string[] = [];

  for (const row of goals as HealthGoalRow[]) {
    const goal = STANDARD_GOALS.find((g) => g.id === row.goal_id);
    if (!goal) continue;

    const value = await fetchLatestBiomarkerValue(
      supabase,
      userId,
      familyMemberId,
      goal
    );

    if (value === null) continue;

    const updates: Partial<HealthGoalRow> = {
      current_value: value,
      updated_at: new Date().toISOString(),
    };

    // Backfill a starting value if we never captured one at activation.
    if (row.starting_value === null) {
      updates.starting_value = value;
    }

    if (isAchieved(goal, value)) {
      updates.status = "achieved";
      updates.achieved_at = new Date().toISOString();
      newlyAchieved.push(row.goal_id);
    }

    await supabase
      .from("health_goals")
      .update(updates)
      .eq("id", row.id);
  }

  return newlyAchieved;
}
