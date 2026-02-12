/**
 * Pure scoring logic that converts raw forced-choice responses into
 * normalized dimension scores (0-1). Shared by both profile summary
 * generation and match computation.
 */

/** Ordinal value assigned to each option key within a question. */
const OPTION_VALUES: Record<string, number> = {
  a: 1,
  b: 2,
  c: 3,
};

/** The five compatibility dimensions measured by the assessment. */
const DIMENSIONS = [
  "circadian_rhythm",
  "orderliness",
  "social_permeability",
  "conflict_reactivity",
  "property_boundaries",
] as const;

type Dimension = (typeof DIMENSIONS)[number];

/** Normalized score (0-1) for each dimension. */
type DimensionScores = Record<Dimension, number>;

/** Minimal shape needed from a joined user_responses + assessment_questions row. */
interface ResponseWithCategory {
  most_option: string;
  least_option: string | null;
  category: string;
}

/**
 * Converts raw forced-choice responses into normalized dimension scores (0-1).
 *
 * Scoring per forced-choice question:
 *   rawScore = OPTION_VALUES[most] - OPTION_VALUES[least]   range: [-2, 2]
 *   normalized = (rawScore + 2) / 4                         range: [0, 1]
 *
 * Dimension score = average of normalized scores across all questions in that category.
 * Dimensions with no responses default to 0.5 (midpoint).
 */
function computeDimensionScores(responses: ResponseWithCategory[]): DimensionScores {
  const totals: Record<string, { sum: number; count: number }> = {};

  for (const dim of DIMENSIONS) {
    totals[dim] = { sum: 0, count: 0 };
  }

  for (const r of responses) {
    if (r.category === "dealbreaker" || !(r.category in totals)) {
      continue;
    }

    const mostVal = OPTION_VALUES[r.most_option] ?? 2;
    const leastVal = r.least_option !== null ? (OPTION_VALUES[r.least_option] ?? 2) : 2;
    const rawScore = mostVal - leastVal;
    const normalized = (rawScore + 2) / 4;

    totals[r.category].sum += normalized;
    totals[r.category].count += 1;
  }

  const scores = {} as DimensionScores;
  for (const dim of DIMENSIONS) {
    const { sum, count } = totals[dim];
    scores[dim] = count > 0 ? sum / count : 0.5;
  }

  return scores;
}

/**
 * Extracts the dealbreaker option selected by a user from their responses.
 * Returns null if no dealbreaker question was answered.
 */
function extractDealbreaker(responses: ResponseWithCategory[]): string | null {
  for (const r of responses) {
    if (r.category === "dealbreaker") {
      return r.most_option;
    }
  }
  return null;
}

export { computeDimensionScores, extractDealbreaker, DIMENSIONS, OPTION_VALUES };
export type { Dimension, DimensionScores, ResponseWithCategory };
