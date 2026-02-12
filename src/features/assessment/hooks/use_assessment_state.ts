"use client";

import { useCallback, useMemo, useState } from "react";
import type { AssessmentQuestion, QuestionResponse } from "../types";
import { isForcedChoice, isForcedChoiceComplete } from "../types";

const DEALBREAKER_CATEGORY = "dealbreaker";

interface UseAssessmentStateResult {
  currentIndex: number;
  currentQuestion: AssessmentQuestion | null;
  answers: Map<string, QuestionResponse>;
  setAnswer: (questionId: string, response: QuestionResponse) => void;
  next: () => void;
  back: () => void;
  canGoNext: boolean;
  isLastQuestion: boolean;
  isComplete: boolean;
  totalQuestions: number;
}

/**
 * Manages wizard navigation and in-memory answer state for the assessment.
 * Does not persist to the database; call submitAssessmentResponses on completion.
 */
function useAssessmentState(questions: AssessmentQuestion[]): UseAssessmentStateResult {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, QuestionResponse>>(new Map());

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex] ?? null;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const setAnswer = useCallback((questionId: string, response: QuestionResponse) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(questionId, response);
      return next;
    });
  }, []);

  const canGoNext = useMemo(() => {
    if (!currentQuestion) {
      return false;
    }
    const answer = answers.get(currentQuestion.id);
    if (!answer) {
      return false;
    }
    if (currentQuestion.category === DEALBREAKER_CATEGORY) {
      return "selected" in answer;
    }
    return isForcedChoice(answer) && isForcedChoiceComplete(answer);
  }, [currentQuestion, answers]);

  const next = useCallback(() => {
    if (canGoNext && currentIndex < totalQuestions - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [canGoNext, currentIndex, totalQuestions]);

  const back = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const isComplete = useMemo(() => {
    if (questions.length === 0) {
      return false;
    }
    return questions.every((q) => {
      const answer = answers.get(q.id);
      if (!answer) {
        return false;
      }
      if (q.category === DEALBREAKER_CATEGORY) {
        return "selected" in answer;
      }
      return isForcedChoice(answer) && isForcedChoiceComplete(answer);
    });
  }, [questions, answers]);

  return {
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
  };
}

export { useAssessmentState };
