"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useMatches } from "@/features/matching/hooks/use_matches";
import { MatchCard } from "@/features/matching/components/match_card";
import { CompleteProfileModal } from "@/features/profile/components/complete_profile_modal";
import { isProfileComplete } from "@/features/profile/utils/is_profile_complete";
import type { Profile } from "@/features/profile/types";

export default function MatchesPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [pendingConnectId, setPendingConnectId] = useState<string | null>(null);

  // Auth check and profile fetch.
  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/signin");
        setAuthLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData as Profile);
      }

      setAuthLoading(false);
    }
    init();
  }, [router]);

  const { matches, loading: matchesLoading, error: matchesError } = useMatches(userId);

  /** Handles a connect attempt -- gates behind profile completion if needed. */
  function handleConnect(matchedUserId: string) {
    if (!profile || !isProfileComplete(profile)) {
      setPendingConnectId(matchedUserId);
      setShowProfileModal(true);
      return;
    }
    // For now, just log the connection intent.
    // Future: create a connection/swipe record.
    console.log("Connect with:", matchedUserId);
  }

  /** Called after the user completes their profile via the modal. */
  function handleProfileCompleted(updatedFields: Partial<Profile>) {
    setProfile((prev) => prev ? { ...prev, ...updatedFields } : prev);
    setShowProfileModal(false);

    // Proceed with the pending connection.
    if (pendingConnectId) {
      console.log("Connect with:", pendingConnectId);
      setPendingConnectId(null);
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/signin");
    router.refresh();
  };

  // Loading state.
  if (authLoading || matchesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading matches...</p>
      </div>
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Your Matches</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Sorted by compatibility
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* Error state */}
        {matchesError && (
          <div className="mb-6 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200 text-sm">
            {matchesError}
          </div>
        )}

        {/* Empty state */}
        {!matchesError && matches.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <span className="text-2xl text-gray-400">?</span>
            </div>
            <h2 className="text-lg font-semibold mb-2">No matches yet</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              You&apos;re one of the first here! As more students complete the assessment, your matches will appear.
            </p>
          </div>
        )}

        {/* Match list */}
        {matches.length > 0 && (
          <div className="space-y-4">
            {matches.map((match) => (
              <MatchCard
                key={match.matchedUserId}
                match={match}
                onConnect={handleConnect}
              />
            ))}
          </div>
        )}
      </div>

      {/* Complete profile modal */}
      {showProfileModal && userId && (
        <CompleteProfileModal
          userId={userId}
          onCompleted={handleProfileCompleted}
          onClose={() => {
            setShowProfileModal(false);
            setPendingConnectId(null);
          }}
        />
      )}
    </div>
  );
}
