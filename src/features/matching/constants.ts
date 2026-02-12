import type { Dimension } from "@/features/assessment/api/score_responses";

/**
 * Construct weights (W_k) for the compatibility distance function.
 * Higher weight = more influence on the overall compatibility score.
 * Weights are tuned for practical roommate compatibility:
 *   - Orderliness and sleep schedule have the most daily friction impact.
 *   - Social and property preferences are still important but slightly less.
 *   - Conflict style is relevant but less of a day-to-day issue.
 */
const DIMENSION_WEIGHTS: Record<Dimension, number> = {
  orderliness: 1.2,
  circadian_rhythm: 1.1,
  social_permeability: 1.0,
  property_boundaries: 0.9,
  conflict_reactivity: 0.8,
};

/**
 * Dealbreaker penalty multiplier (P_dealbreaker).
 * Applied when two users selected different dealbreaker options in Q13,
 * indicating mismatched non-negotiable priorities.
 */
const DEALBREAKER_PENALTY = 1.5;

/** No penalty when dealbreaker options match or when either is absent. */
const NO_PENALTY = 1.0;

/**
 * Sum of all dimension weights, used to compute maximum possible distance.
 * MAX_DISTANCE_BASE = sqrt(sum of weights) when every dimension differs maximally.
 */
const SUM_OF_WEIGHTS = Object.values(DIMENSION_WEIGHTS).reduce((sum, w) => sum + w, 0);
const MAX_DISTANCE_BASE = Math.sqrt(SUM_OF_WEIGHTS);

/** Theoretical maximum distance including the worst-case penalty. */
const MAX_DISTANCE = MAX_DISTANCE_BASE * DEALBREAKER_PENALTY;

export {
  DIMENSION_WEIGHTS,
  DEALBREAKER_PENALTY,
  NO_PENALTY,
  MAX_DISTANCE_BASE,
  MAX_DISTANCE,
  SUM_OF_WEIGHTS,
};
