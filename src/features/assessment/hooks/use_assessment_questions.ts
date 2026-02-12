"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { AssessmentQuestion } from "../types";

interface UseAssessmentQuestionsResult {
  questions: AssessmentQuestion[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetches all assessment questions ordered by order_index.
 * Intended to be called once when the assessment page mounts.
 */
function useAssessmentQuestions(): UseAssessmentQuestionsResult {
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchQuestions() {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("assessment_questions")
        .select("*")
        .order("order_index", { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setQuestions(data as AssessmentQuestion[]);
      }
      setLoading(false);
    }

    fetchQuestions();
  }, []);

  return { questions, loading, error };
}

export { useAssessmentQuestions };
