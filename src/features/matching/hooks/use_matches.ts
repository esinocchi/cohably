"use client";

import { useEffect, useState } from "react";
import type { MatchWithProfile } from "../types";
import { fetchMatchesForUser } from "../api/fetch_matches";

interface UseMatchesResult {
  matches: MatchWithProfile[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetches matches for the given user on mount.
 * Returns the match list sorted by compatibility score descending.
 */
function useMatches(userId: string | null): UseMatchesResult {
  const [matches, setMatches] = useState<MatchWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function load() {
      const result = await fetchMatchesForUser(userId!);
      if (result.error) {
        setError(result.error);
      } else {
        setMatches(result.data);
      }
      setLoading(false);
    }

    load();
  }, [userId]);

  return { matches, loading, error };
}

export { useMatches };
