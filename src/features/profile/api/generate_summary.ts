import { createClient } from "@/utils/supabase/client";
import { computeDimensionScores } from "@/features/assessment/api/score_responses";
import type { ResponseWithCategory } from "@/features/assessment/api/score_responses";
import { buildSummaryText } from "../constants";

/**
 * Supabase row shape when joining user_responses with assessment_questions.
 * Supabase may return the join as a single object or an array.
 */
interface UserResponseRow {
  most_option: string;
  least_option: string | null;
  assessment_questions: { category: string } | { category: string }[];
}

/**
 * Generates a template-based lifestyle summary from the user's assessment
 * responses, then saves it to the profiles table and marks the assessment
 * as completed.
 */
async function generateAndSaveSummary(userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { data, error: fetchError } = await supabase
    .from("user_responses")
    .select("most_option, least_option, assessment_questions(category)")
    .eq("user_id", userId);

  if (fetchError || !data) {
    return { error: fetchError?.message ?? "Failed to fetch responses" };
  }

  const responses: ResponseWithCategory[] = (data as unknown as UserResponseRow[]).map((row) => {
    const aq = row.assessment_questions;
    const category = Array.isArray(aq) ? aq[0]?.category : aq.category;
    return {
      most_option: row.most_option,
      least_option: row.least_option,
      category: category ?? "",
    };
  });

  const scores = computeDimensionScores(responses);
  const summary = buildSummaryText(scores);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      generated_summary: summary,
      assessment_completed: true,
      assessment_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) {
    return { error: updateError.message };
  }

  return { error: null };
}

export { generateAndSaveSummary };
