import { createClient } from "@/utils/supabase/client";
import type { QuestionResponse, ResponsePayload } from "../types";
import { isForcedChoice, isForcedChoiceComplete } from "../types";

/**
 * Upserts all assessment answers into user_responses.
 * Uses onConflict on (user_id, question_id) so re-submissions update existing rows.
 * Skips incomplete forced-choice responses (should not happen if isComplete is true).
 */
async function submitAssessmentResponses(
  userId: string,
  answers: Map<string, QuestionResponse>,
): Promise<{ error: string | null }> {
  const payloads: ResponsePayload[] = [];

  for (const [questionId, response] of answers) {
    if (isForcedChoice(response)) {
      if (!isForcedChoiceComplete(response)) {
        continue;
      }
      payloads.push({
        user_id: userId,
        question_id: questionId,
        most_option: response.most!,
        least_option: response.least!,
      });
    } else {
      payloads.push({
        user_id: userId,
        question_id: questionId,
        most_option: response.selected,
        least_option: null,
      });
    }
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("user_responses")
    .upsert(payloads, { onConflict: "user_id,question_id" });

  if (error) {
    return { error: error.message };
  }
  return { error: null };
}

export { submitAssessmentResponses };
