import type { Dimension } from "@/features/assessment/api/score_responses";

/** Score threshold below which the "low" descriptor is used. */
const LOW_THRESHOLD = 0.33;

/** Score threshold above which the "high" descriptor is used. */
const HIGH_THRESHOLD = 0.67;

interface DimensionDescriptors {
  low: string;
  moderate: string;
  high: string;
}

/** Human-readable descriptors for each dimension at each score range. */
const DIMENSION_DESCRIPTORS: Record<Dimension, DimensionDescriptors> = {
  circadian_rhythm: {
    low: "night owl",
    moderate: "flexible with their schedule",
    high: "early riser",
  },
  orderliness: {
    low: "relaxed about tidiness",
    moderate: "moderately tidy",
    high: "keeps a very clean space",
  },
  social_permeability: {
    low: "prefers quiet, private space",
    moderate: "occasionally social at home",
    high: "loves having people over",
  },
  conflict_reactivity: {
    low: "avoids confrontation",
    moderate: "handles conflict pragmatically",
    high: "addresses issues head-on",
  },
  property_boundaries: {
    low: "happy to share everything",
    moderate: "shares selectively",
    high: "values personal property boundaries",
  },
};

/** Selects the descriptor for a dimension based on the normalized score. */
function getDescriptor(dimension: Dimension, score: number): string {
  if (score <= LOW_THRESHOLD) {
    return DIMENSION_DESCRIPTORS[dimension].low;
  }
  if (score >= HIGH_THRESHOLD) {
    return DIMENSION_DESCRIPTORS[dimension].high;
  }
  return DIMENSION_DESCRIPTORS[dimension].moderate;
}

/**
 * Builds a 1-2 sentence lifestyle summary from dimension scores.
 * Picks the most distinctive traits (furthest from the midpoint) and
 * assembles them into natural prose.
 */
function buildSummaryText(scores: Record<Dimension, number>): string {
  const ranked = (Object.entries(scores) as [Dimension, number][])
    .map(([dim, score]) => ({
      dimension: dim,
      score,
      distance: Math.abs(score - 0.5),
      descriptor: getDescriptor(dim, score),
    }))
    .sort((a, b) => b.distance - a.distance);

  const top = ranked.slice(0, 3);
  if (top.length === 0) {
    return "A balanced roommate with flexible habits.";
  }

  const first = capitalizeFirst(top[0].descriptor);
  if (top.length === 1) {
    return `${first}.`;
  }

  const second = top[1].descriptor;
  if (top.length === 2) {
    return `${first} who ${second}.`;
  }

  const third = top[2].descriptor;
  return `${first} who ${second} and ${third}.`;
}

function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export { DIMENSION_DESCRIPTORS, getDescriptor, buildSummaryText, LOW_THRESHOLD, HIGH_THRESHOLD };
export type { DimensionDescriptors };
