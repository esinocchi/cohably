/**
 * Seed script for local testing.
 * Creates test users, profiles, assessment responses, and matches.
 *
 * Requirements:
 *   - .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   - assessment_questions table already seeded
 *
 * Run: npm run seed
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { computeDimensionScores } from "../src/features/assessment/api/score_responses";
import type { ResponseWithCategory } from "../src/features/assessment/api/score_responses";
import { buildSummaryText } from "../src/features/profile/constants";
import { computeCompatibility } from "../src/features/matching/api/compute_matches";
import type { DimensionScores } from "../src/features/assessment/api/score_responses";

// Load .env.local for Supabase credentials
config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Test user definition. */
interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  locationState: string;
  locationCountry: string;
  /** Response pattern: for each question index (0-12), [most, least]. For Q13 (dealbreaker), [selected, null]. */
  responses: [string, string | null][];
}

/** Three distinct personas producing different summaries and compatibility scores. */
const TEST_USERS: TestUser[] = [
  {
    email: "alex@cohably.test",
    password: "testpassword123",
    firstName: "Alex",
    lastName: "Rivera",
    locationState: "Pennsylvania",
    locationCountry: "United States",
    // Early riser, tidy, prefers quiet
    responses: [
      ["c", "a"], // circadian high
      ["c", "a"],
      ["a", "c"], // orderliness high
      ["a", "c"],
      ["a", "c"], // social low
      ["a", "c"],
      ["b", "a"], // conflict moderate
      ["b", "c"],
      ["b", "a"], // property moderate
      ["b", "c"],
      ["a", "c"],
      ["b", "c"],
      ["a", null], // dealbreaker
    ],
  },
  {
    email: "jordan@cohably.test",
    password: "testpassword123",
    firstName: "Jordan",
    lastName: "Chen",
    locationState: "New Jersey",
    locationCountry: "United States",
    // Night owl, relaxed, social
    responses: [
      ["a", "c"],
      ["a", "c"],
      ["a", "c"], // orderliness low
      ["a", "c"],
      ["c", "a"], // social high
      ["c", "a"],
      ["c", "a"], // conflict high
      ["c", "b"],
      ["a", "c"], // property low
      ["a", "b"],
      ["a", "c"],
      ["a", "b"],
      ["b", null], // dealbreaker
    ],
  },
  {
    email: "sam@cohably.test",
    password: "testpassword123",
    firstName: "Sam",
    lastName: "Okafor",
    locationState: "",
    locationCountry: "Nigeria",
    // Balanced moderate profile
    responses: [
      ["b", "a"],
      ["b", "c"],
      ["b", "a"],
      ["b", "c"],
      ["b", "a"],
      ["b", "c"],
      ["b", "a"],
      ["b", "c"],
      ["b", "a"],
      ["b", "c"],
      ["b", "a"],
      ["b", "c"],
      ["a", null], // dealbreaker
    ],
  },
];

async function main() {
  console.log("Seeding test data...\n");

  // 1. Fetch assessment questions (must be seeded already)
  const { data: questions, error: questionsError } = await supabase
    .from("assessment_questions")
    .select("id, category, order_index")
    .order("order_index", { ascending: true });

  if (questionsError || !questions?.length) {
    console.error("Failed to fetch assessment_questions. Ensure the table is seeded first.");
    process.exit(1);
  }

  console.log(`Found ${questions.length} assessment questions.\n`);

  const userIds: string[] = [];

  // 2. Create users and insert responses, profiles, then matches
  for (const testUser of TEST_USERS) {
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const alreadyExists = existingUser?.users?.some((u) => u.email === testUser.email);

    let userId: string;

    if (alreadyExists) {
      const match = existingUser!.users!.find((u) => u.email === testUser.email);
      userId = match!.id;
      console.log(`User ${testUser.email} already exists (${userId}).`);
    } else {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: testUser.email,
        password: testUser.password,
        email_confirm: true,
      });

      if (createError) {
        console.error(`Failed to create user ${testUser.email}:`, createError.message);
        process.exit(1);
      }

      userId = newUser.user.id;
      console.log(`Created user ${testUser.email} (${userId}).`);
    }

    userIds.push(userId);

    // 3. Upsert profile (trigger may have created one)
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        user_id: userId,
        first_name: testUser.firstName,
        last_name: testUser.lastName,
        location_state: testUser.locationState || null,
        location_country: testUser.locationCountry,
        profile_picture_url: "https://i.pravatar.cc/200",
        assessment_completed: true,
        assessment_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (profileError) {
      console.error(`Failed to upsert profile for ${testUser.email}:`, profileError.message);
      process.exit(1);
    }

    // 4. Insert user_responses
    const responsePayloads = questions.map((q, idx) => {
      const [most, least] = testUser.responses[idx];
      return {
        user_id: userId,
        question_id: q.id,
        most_option: most,
        least_option: least,
      };
    });

    const { error: responsesError } = await supabase
      .from("user_responses")
      .upsert(responsePayloads, { onConflict: "user_id,question_id" });

    if (responsesError) {
      console.error(`Failed to insert responses for ${testUser.email}:`, responsesError.message);
      process.exit(1);
    }

    // 5. Compute and save generated_summary
    const responsesWithCategory: ResponseWithCategory[] = questions.map((q, idx) => {
      const [most, least] = testUser.responses[idx];
      return {
        most_option: most,
        least_option: least,
        category: q.category,
      };
    });

    const scores = computeDimensionScores(responsesWithCategory);
    const summary = buildSummaryText(scores);

    await supabase
      .from("profiles")
      .update({
        generated_summary: summary,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  }

  console.log("\nProfiles and responses created.\n");

  // 6. Compute and insert matches for each user
  const allResponsesByUser = new Map<string, ResponseWithCategory[]>();

  for (let i = 0; i < TEST_USERS.length; i++) {
    const testUser = TEST_USERS[i];
    const userId = userIds[i];
    const responsesWithCategory: ResponseWithCategory[] = questions.map((q, idx) => {
      const [most, least] = testUser.responses[idx];
      return {
        most_option: most,
        least_option: least,
        category: q.category,
      };
    });
    allResponsesByUser.set(userId, responsesWithCategory);
  }

  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    const scoresA = computeDimensionScores(allResponsesByUser.get(userId)!);
    const dealbreakerA = allResponsesByUser
      .get(userId)!
      .find((r) => r.category === "dealbreaker")?.most_option ?? null;

    const matchRows: {
      user_id: string;
      matched_user_id: string;
      compatibility_score: number;
      category_breakdown: Record<string, unknown>;
      updated_at: string;
    }[] = [];

    for (let j = 0; j < userIds.length; j++) {
      if (i === j) continue;

      const otherUserId = userIds[j];
      const scoresB = computeDimensionScores(allResponsesByUser.get(otherUserId)!);
      const dealbreakerB = allResponsesByUser
        .get(otherUserId)!
        .find((r) => r.category === "dealbreaker")?.most_option ?? null;

      const { score, breakdown } = computeCompatibility(
        scoresA as DimensionScores,
        scoresB as DimensionScores,
        dealbreakerA,
        dealbreakerB,
      );

      matchRows.push({
        user_id: userId,
        matched_user_id: otherUserId,
        compatibility_score: score,
        category_breakdown: breakdown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      });
    }

    const { error: matchesError } = await supabase
      .from("matches")
      .upsert(matchRows, { onConflict: "user_id,matched_user_id" });

    if (matchesError) {
      console.error(`Failed to insert matches:`, matchesError.message);
      process.exit(1);
    }
  }

  console.log("Matches computed and inserted.\n");
  console.log("Seed complete! Test accounts:");
  for (const u of TEST_USERS) {
    console.log(`  - ${u.email} / ${u.password}`);
  }
  console.log("\nSign in with any of these to see the match feed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
