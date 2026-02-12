import { createClient } from "@/utils/supabase/client";
import {
  computeDimensionScores,
  extractDealbreaker,
  DIMENSIONS,
} from "@/features/assessment/api/score_responses";
import type {
  DimensionScores,
  ResponseWithCategory,
} from "@/features/assessment/api/score_responses";
import {
  DIMENSION_WEIGHTS,
  DEALBREAKER_PENALTY,
  NO_PENALTY,
  MAX_DISTANCE,
} from "../constants";
import type { CategoryBreakdown, DimensionDetail } from "../types";

/**
 * Supabase row shape when joining user_responses with assessment_questions.
 * Supabase may return the join as a single object or an array depending
 * on the inferred relationship cardinality; we handle both in toResponsesWithCategory.
 */
interface UserResponseRow {
  user_id: string;
  most_option: string;
  least_option: string | null;
  assessment_questions: { category: string } | { category: string }[];
}

/**
 * Computes compatibility scores between the current user and all other
 * users who have completed the assessment, then upserts the results
 * into the matches table.
 *
 * Uses the weighted Euclidean distance formula:
 *   S_xy = sqrt( sum( W_k * (θ_xk - θ_yk)² ) ) * P_dealbreaker
 *
 * Lower distance = better match. The distance is converted to a 0-100
 * compatibility score for storage.
 */
async function computeAndSaveMatches(userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();

  // 1. Fetch all profiles that have completed the assessment (excluding current user).
  const { data: completedProfiles, error: profileError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("assessment_completed", true)
    .neq("user_id", userId);

  if (profileError) {
    return { error: profileError.message };
  }

  const otherUserIds = (completedProfiles ?? []).map((p) => p.user_id as string);

  if (otherUserIds.length === 0) {
    return { error: null };
  }

  // 2. Fetch the current user's responses.
  const { data: currentUserData, error: currentError } = await supabase
    .from("user_responses")
    .select("user_id, most_option, least_option, assessment_questions(category)")
    .eq("user_id", userId);

  if (currentError || !currentUserData) {
    return { error: currentError?.message ?? "Failed to fetch current user responses" };
  }

  const currentResponses = toResponsesWithCategory(currentUserData as unknown as UserResponseRow[]);
  const currentScores = computeDimensionScores(currentResponses);
  const currentDealbreaker = extractDealbreaker(currentResponses);

  // 3. Fetch all other users' responses in a single batch query.
  const { data: otherUsersData, error: othersError } = await supabase
    .from("user_responses")
    .select("user_id, most_option, least_option, assessment_questions(category)")
    .in("user_id", otherUserIds);

  if (othersError || !otherUsersData) {
    return { error: othersError?.message ?? "Failed to fetch other user responses" };
  }

  // 4. Group responses by user_id.
  const responsesByUser = groupByUserId(otherUsersData as unknown as UserResponseRow[]);

  // 5. Compute compatibility for each other user.
  const matchRows: {
    user_id: string;
    matched_user_id: string;
    compatibility_score: number;
    category_breakdown: CategoryBreakdown;
    updated_at: string;
  }[] = [];

  for (const [otherUserId, otherRows] of responsesByUser) {
    const otherResponses = toResponsesWithCategory(otherRows);
    const otherScores = computeDimensionScores(otherResponses);
    const otherDealbreaker = extractDealbreaker(otherResponses);

    const { score, breakdown } = computeCompatibility(
      currentScores,
      otherScores,
      currentDealbreaker,
      otherDealbreaker,
    );

    matchRows.push({
      user_id: userId,
      matched_user_id: otherUserId,
      compatibility_score: score,
      category_breakdown: breakdown,
      updated_at: new Date().toISOString(),
    });
  }

  if (matchRows.length === 0) {
    return { error: null };
  }

  // 6. Upsert all match rows.
  const { error: upsertError } = await supabase
    .from("matches")
    .upsert(matchRows, { onConflict: "user_id,matched_user_id" });

  if (upsertError) {
    return { error: upsertError.message };
  }

  return { error: null };
}

/**
 * Computes the compatibility score and per-dimension breakdown between two users.
 *
 * S_xy = sqrt( sum( W_k * (θ_xk - θ_yk)² ) ) * P_dealbreaker
 *
 * Returns an integer 0-100 where 100 = perfect match.
 */
function computeCompatibility(
  scoresA: DimensionScores,
  scoresB: DimensionScores,
  dealbreakerA: string | null,
  dealbreakerB: string | null,
): { score: number; breakdown: CategoryBreakdown } {
  let weightedSumOfSquares = 0;
  const breakdown: CategoryBreakdown = {};

  for (const dim of DIMENSIONS) {
    const weight = DIMENSION_WEIGHTS[dim];
    const diff = scoresA[dim] - scoresB[dim];
    const weightedSquaredDiff = weight * diff * diff;
    weightedSumOfSquares += weightedSquaredDiff;

    const detail: DimensionDetail = {
      weight,
      userScore: scoresA[dim],
      otherScore: scoresB[dim],
      weightedSquaredDiff,
    };
    breakdown[dim] = detail;
  }

  const rawDistance = Math.sqrt(weightedSumOfSquares);

  // Apply dealbreaker penalty.
  const penalty = computeDealBreakerPenalty(dealbreakerA, dealbreakerB);
  const finalDistance = rawDistance * penalty;

  // Convert distance to 0-100 compatibility score (lower distance = higher score).
  const normalizedDistance = Math.min(finalDistance / MAX_DISTANCE, 1);
  const compatibilityScore = Math.max(0, Math.round(100 * (1 - normalizedDistance)));

  return { score: compatibilityScore, breakdown };
}

/**
 * Determines the dealbreaker penalty multiplier.
 * If both users answered the dealbreaker question and selected different options,
 * the penalty increases the distance (worsens compatibility).
 */
function computeDealBreakerPenalty(
  dealbreakerA: string | null,
  dealbreakerB: string | null,
): number {
  if (dealbreakerA === null || dealbreakerB === null) {
    return NO_PENALTY;
  }
  if (dealbreakerA === dealbreakerB) {
    return NO_PENALTY;
  }
  return DEALBREAKER_PENALTY;
}

/** Converts raw Supabase rows to the ResponseWithCategory shape. */
function toResponsesWithCategory(rows: UserResponseRow[]): ResponseWithCategory[] {
  return rows.map((row) => {
    const aq = row.assessment_questions;
    const category = Array.isArray(aq) ? aq[0]?.category : aq.category;
    return {
      most_option: row.most_option,
      least_option: row.least_option,
      category: category ?? "",
    };
  });
}

/** Groups an array of response rows by user_id. */
function groupByUserId(rows: UserResponseRow[]): Map<string, UserResponseRow[]> {
  const grouped = new Map<string, UserResponseRow[]>();
  for (const row of rows) {
    const existing = grouped.get(row.user_id);
    if (existing) {
      existing.push(row);
    } else {
      grouped.set(row.user_id, [row]);
    }
  }
  return grouped;
}

export { computeAndSaveMatches, computeCompatibility };
