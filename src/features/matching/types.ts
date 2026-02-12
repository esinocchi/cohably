/** Row shape from the matches table. */
interface Match {
  id: string;
  user_id: string;
  matched_user_id: string;
  compatibility_score: number;
  category_breakdown: CategoryBreakdown | null;
  created_at: string;
  updated_at: string;
}

/** Per-dimension distance detail stored in category_breakdown JSONB. */
interface DimensionDetail {
  weight: number;
  userScore: number;
  otherScore: number;
  weightedSquaredDiff: number;
}

/** JSONB payload for category_breakdown on the matches table. */
interface CategoryBreakdown {
  [dimension: string]: DimensionDetail;
}

/** Hydrated match result with the matched user's profile data attached. */
interface MatchWithProfile {
  matchedUserId: string;
  compatibilityScore: number;
  categoryBreakdown: CategoryBreakdown | null;
  firstName: string | null;
  lastName: string | null;
  locationState: string | null;
  locationCountry: string | null;
  generatedSummary: string | null;
  profilePictureUrl: string | null;
}

export type { Match, DimensionDetail, CategoryBreakdown, MatchWithProfile };
