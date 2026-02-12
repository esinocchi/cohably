"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import type { Profile } from "@/features/profile/types";

export default function HomePage() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkUser() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/signin");
        setLoading(false);
        return;
      }

      // Check if the user has already completed the assessment.
      const { data: profileData } = await supabase
        .from("profiles")
        .select("assessment_completed")
        .eq("user_id", authUser.id)
        .single();

      const profile = profileData as Profile | null;

      if (profile?.assessment_completed) {
        router.replace("/matches");
        return;
      }

      setUser(authUser);
      setLoading(false);
    }
    checkUser();
  }, [router]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/signin");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Welcome!</h1>
          <button
            type="button"
            onClick={handleSignOut}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
          >
            Sign Out
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <p className="text-lg mb-2">You&apos;re signed in as:</p>
          <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
        </div>

        <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Find Your Ideal Roommate</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Complete a short behavioral assessment so we can match you with compatible roommates.
          </p>
          <a
            href="/assessment"
            className="inline-block px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Take the Assessment
          </a>
        </div>
      </div>
    </div>
  );
}
