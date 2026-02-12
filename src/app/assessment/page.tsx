"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAssessmentQuestions } from "@/features/assessment/hooks/use_assessment_questions";
import { useAssessmentState } from "@/features/assessment/hooks/use_assessment_state";
import { submitAssessmentResponses } from "@/features/assessment/api/submit_response";
import { generateAndSaveSummary } from "@/features/profile/api/generate_summary";
import { computeAndSaveMatches } from "@/features/matching/api/compute_matches";
import { AssessmentQuestion } from "@/features/assessment/components/assessment_question";
import { ProgressIndicator } from "@/features/assessment/components/progress_indicator";

export default function AssessmentPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Auth check
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/signin");
      } else {
        setUserId(user.id);
      }
      setAuthLoading(false);
    }
    checkAuth();
  }, [router]);

  // Fetch questions
  const { questions, loading: questionsLoading, error: questionsError } = useAssessmentQuestions();

  // Assessment state
  const {
    currentIndex,
    currentQuestion,
    answers,
    setAnswer,
    next,
    back,
    canGoNext,
    isLastQuestion,
    isComplete,
    totalQuestions,
  } = useAssessmentState(questions);

  const handleSubmit = async () => {
    if (!userId || !isComplete) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    const { error: submitError } = await submitAssessmentResponses(userId, answers);
    if (submitError) {
      setSubmitError(submitError);
      setSubmitting(false);
      return;
    }

    const { error: summaryError } = await generateAndSaveSummary(userId);
    if (summaryError) {
      setSubmitError(summaryError);
      setSubmitting(false);
      return;
    }

    const { error: matchError } = await computeAndSaveMatches(userId);
    if (matchError) {
      setSubmitError(matchError);
      setSubmitting(false);
      return;
    }

    router.push("/matches");
  };

  // Loading states
  if (authLoading || questionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!userId) {
    return null;
  }

  if (questionsError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-600 dark:text-red-400">Failed to load questions.</p>
          <p className="text-sm text-gray-500">{questionsError}</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">No questions found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Compatibility Assessment</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Answer honestly — there are no right or wrong answers.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <ProgressIndicator currentIndex={currentIndex} totalQuestions={totalQuestions} />
        </div>

        {/* Question */}
        <div className="mb-8">
          <AssessmentQuestion
            key={currentQuestion.id}
            question={currentQuestion}
            response={answers.get(currentQuestion.id)}
            onResponse={setAnswer}
          />
        </div>

        {/* Error */}
        {submitError && (
          <div className="mb-6 p-3 bg-red-100 border border-red-400 text-red-700 rounded dark:bg-red-900 dark:border-red-700 dark:text-red-200 text-sm">
            {submitError}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={back}
            disabled={currentIndex === 0}
            className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Back
          </button>

          {isLastQuestion ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isComplete || submitting}
              className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              disabled={!canGoNext}
              className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
