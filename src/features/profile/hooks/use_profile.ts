"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Profile } from "../types";

interface UseProfileResult {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetches the profile for the given user on mount.
 * Provides a refresh function to re-fetch after updates.
 */
function useProfile(userId: string | null): UseProfileResult {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId!)
        .single();

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setProfile(data as Profile);
      }
      setLoading(false);
    }

    load();
  }, [userId, refreshKey]);

  function refresh() {
    setRefreshKey((prev) => prev + 1);
  }

  return { profile, loading, error, refresh };
}

export { useProfile };
