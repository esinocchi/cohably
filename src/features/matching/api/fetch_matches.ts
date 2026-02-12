import { createClient } from "@/utils/supabase/client";
import type { MatchWithProfile } from "../types";

/**
 * Supabase row shape when selecting matches with a joined profile.
 */
interface MatchRow {
  matched_user_id: string;
  compatibility_score: number;
  category_breakdown: Record<string, unknown> | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    location_state: string | null;
    location_country: string | null;
    generated_summary: string | null;
    profile_picture_url: string | null;
  } | null;
}

/**
 * Fetches all matches for the given user, ordered by compatibility score
 * descending. Each match includes the matched user's profile data.
 * Only returns matches whose profiles are complete (name, country, photo).
 */
async function fetchMatchesForUser(
  userId: string,
): Promise<{ data: MatchWithProfile[]; error: string | null }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("matches")
    .select(
      "matched_user_id, compatibility_score, category_breakdown, profiles!matches_matched_user_id_profiles_fkey(first_name, last_name, location_state, location_country, generated_summary, profile_picture_url)",
    )
    .eq("user_id", userId)
    .order("compatibility_score", { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  const allMatches: MatchWithProfile[] = ((data ?? []) as unknown as MatchRow[]).map((row) => ({
    matchedUserId: row.matched_user_id,
    compatibilityScore: row.compatibility_score,
    categoryBreakdown: row.category_breakdown as MatchWithProfile["categoryBreakdown"],
    firstName: row.profiles?.first_name ?? null,
    lastName: row.profiles?.last_name ?? null,
    locationState: row.profiles?.location_state ?? null,
    locationCountry: row.profiles?.location_country ?? null,
    generatedSummary: row.profiles?.generated_summary ?? null,
    profilePictureUrl: row.profiles?.profile_picture_url ?? null,
  }));

  // Only show matches with complete profiles.
  const completeMatches = allMatches.filter((m) =>
    m.firstName?.trim() &&
    m.lastName?.trim() &&
    m.locationCountry?.trim() &&
    m.profilePictureUrl,
  );

  return { data: completeMatches, error: null };
}

export { fetchMatchesForUser };
