"use client";

import { useCallback } from "react";
import type {
  AssessmentQuestion as AssessmentQuestionType,
  ForcedChoiceResponse,
  OptionKey,
  QuestionResponse,
} from "../types";
import { isForcedChoice } from "../types";
import { OptionCard } from "./option_card";
import type { SelectionRole } from "./option_card";

const DEALBREAKER_CATEGORY = "dealbreaker";

interface AssessmentQuestionProps {
  question: AssessmentQuestionType;
  response: QuestionResponse | undefined;
  onResponse: (questionId: string, response: QuestionResponse) => void;
}

/** Returns available options (a, b, c, d) for a question, excluding nulls. */
function getOptions(question: AssessmentQuestionType): { key: OptionKey; label: string }[] {
  const options: { key: OptionKey; label: string }[] = [
    { key: "a", label: question.option_a },
    { key: "b", label: question.option_b },
  ];
  if (question.option_c !== null) {
    options.push({ key: "c", label: question.option_c });
  }
  if (question.option_d !== null) {
    options.push({ key: "d", label: question.option_d });
  }
  return options;
}

/** Determines the visual role of an option given the current response state. */
function getSelectionRole(
  optionKey: OptionKey,
  response: QuestionResponse | undefined,
  isDealbreaker: boolean,
): SelectionRole {
  if (!response) {
    return undefined;
  }
  if (isDealbreaker && "selected" in response && response.selected === optionKey) {
    return "selected";
  }
  if (isForcedChoice(response)) {
    if (response.most === optionKey) {
      return "most";
    }
    if (response.least === optionKey) {
      return "least";
    }
  }
  return undefined;
}

/**
 * Handles forced-choice click logic.
 * First click = MOST. Second click on a different option = LEAST.
 * Clicking an already-assigned option clears that role.
 */
function handleForcedChoiceClick(
  optionKey: OptionKey,
  current: ForcedChoiceResponse | undefined,
): ForcedChoiceResponse {
  const prev: ForcedChoiceResponse = current ?? {};

  // Clicking the current MOST: clear it
  if (prev.most === optionKey) {
    return { least: prev.least };
  }

  // Clicking the current LEAST: clear it
  if (prev.least === optionKey) {
    return { most: prev.most };
  }

  // Fill the first empty slot (MOST takes priority)
  if (prev.most === undefined) {
    return { most: optionKey, least: prev.least };
  }
  if (prev.least === undefined) {
    return { most: prev.most, least: optionKey };
  }

  // Both assigned, replace LEAST
  return { most: prev.most, least: optionKey };
}

/**
 * Renders a single assessment question with its option cards.
 * Q1–12: two-step selection (MOST then LEAST). Q13: single select.
 */
function AssessmentQuestion({ question, response, onResponse }: AssessmentQuestionProps) {
  const isDealbreaker = question.category === DEALBREAKER_CATEGORY;
  const options = getOptions(question);

  const handleSelect = useCallback(
    (optionKey: OptionKey) => {
      if (isDealbreaker) {
        onResponse(question.id, { selected: optionKey });
        return;
      }

      const current = response && isForcedChoice(response) ? response : undefined;
      const next = handleForcedChoiceClick(optionKey, current);
      onResponse(question.id, next);
    },
    [isDealbreaker, question.id, response, onResponse],
  );

  /** Instruction text shown below the question prompt. */
  const instructionText = isDealbreaker
    ? "Select the one that would be most difficult for you."
    : getInstructionForState(response);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-lg font-medium leading-relaxed">{question.question_text}</p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {instructionText}
        </p>
      </div>

      <div className="space-y-3">
        {options.map((opt) => (
          <OptionCard
            key={opt.key}
            optionKey={opt.key}
            label={opt.label}
            selectionRole={getSelectionRole(opt.key, response, isDealbreaker)}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  );
}

/** Returns contextual instruction based on current selection state. */
function getInstructionForState(response: QuestionResponse | undefined): string {
  if (!response || !isForcedChoice(response)) {
    return "Tap the option that is MOST like you.";
  }
  if (response.most !== undefined && response.least === undefined) {
    return "Now tap the option that is LEAST like you.";
  }
  if (response.most !== undefined && response.least !== undefined) {
    return "Both selected. Tap any option to change your answer.";
  }
  return "Tap the option that is MOST like you.";
}

export { AssessmentQuestion };
export type { AssessmentQuestionProps };
