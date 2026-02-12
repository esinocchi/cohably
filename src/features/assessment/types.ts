/** Valid option keys matching the DB check constraint. */
type OptionKey = "a" | "b" | "c" | "d";

/** Row shape from the assessment_questions table. */
interface AssessmentQuestion {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string | null;
  option_d: string | null;
  category: string;
  order_index: number;
}

/**
 * Response for forced-choice questions (Q1–12): pick MOST and LEAST.
 * Fields are optional to support the intermediate state where only MOST is chosen.
 */
interface ForcedChoiceResponse {
  most?: OptionKey;
  least?: OptionKey;
}

/** Response for the dealbreaker question (Q13): single select. */
interface SingleSelectResponse {
  selected: OptionKey;
}

/** Union of the two response shapes, keyed by question id. */
type QuestionResponse = ForcedChoiceResponse | SingleSelectResponse;

/** Payload sent to Supabase for a single user_responses upsert. */
interface ResponsePayload {
  user_id: string;
  question_id: string;
  most_option: OptionKey;
  least_option: OptionKey | null;
}

/** Type guard: is this a forced-choice (MOST/LEAST) response? */
function isForcedChoice(response: QuestionResponse): response is ForcedChoiceResponse {
  return !("selected" in response);
}

/** Returns true when a forced-choice response has both MOST and LEAST filled and they differ. */
function isForcedChoiceComplete(response: ForcedChoiceResponse): boolean {
  return response.most !== undefined && response.least !== undefined && response.most !== response.least;
}

export type { OptionKey, AssessmentQuestion, ForcedChoiceResponse, SingleSelectResponse, QuestionResponse, ResponsePayload };
export { isForcedChoice, isForcedChoiceComplete };
