"use client";

import type { OptionKey } from "../types";

type SelectionRole = "most" | "least" | "selected" | undefined;

interface OptionCardProps {
  optionKey: OptionKey;
  label: string;
  /** Current role assigned to this card: most, least, selected (Q13), or undefined. */
  selectionRole: SelectionRole;
  /** Called when the user clicks this card. */
  onSelect: (optionKey: OptionKey) => void;
}

const ROLE_STYLES: Record<string, string> = {
  most: "border-green-500 bg-green-50 dark:bg-green-900/30 ring-2 ring-green-500",
  least: "border-red-500 bg-red-50 dark:bg-red-900/30 ring-2 ring-red-500",
  selected: "border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500",
};

const ROLE_LABELS: Record<string, string> = {
  most: "MOST like me",
  least: "LEAST like me",
  selected: "Selected",
};

const OPTION_LETTERS: Record<OptionKey, string> = {
  a: "A",
  b: "B",
  c: "C",
  d: "D",
};

/** A clickable card representing one answer option within a question. */
function OptionCard({ optionKey, label, selectionRole, onSelect }: OptionCardProps) {
  const isSelected = selectionRole !== undefined;
  const roleStyle = isSelected ? ROLE_STYLES[selectionRole] : "";
  const baseStyle =
    "w-full text-left p-4 rounded-lg border-2 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400";
  const defaultStyle = isSelected
    ? ""
    : "border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50";

  return (
    <button
      type="button"
      className={`${baseStyle} ${roleStyle} ${defaultStyle}`}
      aria-pressed={isSelected}
      onClick={() => onSelect(optionKey)}
    >
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-sm font-semibold">
          {OPTION_LETTERS[optionKey]}
        </span>
        <div className="flex-1">
          <p className="text-sm leading-relaxed">{label}</p>
          {isSelected && (
            <span className="inline-block mt-2 text-xs font-semibold uppercase tracking-wide">
              {ROLE_LABELS[selectionRole]}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export { OptionCard };
export type { SelectionRole, OptionCardProps };
