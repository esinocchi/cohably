"use client";

interface ProgressIndicatorProps {
  currentIndex: number;
  totalQuestions: number;
}

/** Displays "Question N of M" with a progress bar. */
function ProgressIndicator({ currentIndex, totalQuestions }: ProgressIndicatorProps) {
  const current = currentIndex;
  const percentage = totalQuestions > 0 ? (current / totalQuestions) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
        <span>Question {current} of {totalQuestions}</span>
        <span>{Math.round(percentage)}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export { ProgressIndicator };
export type { ProgressIndicatorProps };
