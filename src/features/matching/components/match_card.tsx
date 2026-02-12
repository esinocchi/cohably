"use client";

import type { MatchWithProfile } from "../types";

interface MatchCardProps {
  match: MatchWithProfile;
  onConnect: (matchedUserId: string) => void;
}

/** Returns a color class based on the compatibility score. */
function getScoreColor(score: number): string {
  if (score >= 80) {
    return "text-green-600 dark:text-green-400";
  }
  if (score >= 60) {
    return "text-blue-600 dark:text-blue-400";
  }
  if (score >= 40) {
    return "text-yellow-600 dark:text-yellow-400";
  }
  return "text-red-600 dark:text-red-400";
}

/** Returns a badge background class based on the compatibility score. */
function getScoreBadgeBg(score: number): string {
  if (score >= 80) {
    return "bg-green-100 dark:bg-green-900/30";
  }
  if (score >= 60) {
    return "bg-blue-100 dark:bg-blue-900/30";
  }
  if (score >= 40) {
    return "bg-yellow-100 dark:bg-yellow-900/30";
  }
  return "bg-red-100 dark:bg-red-900/30";
}

/** Builds a display name from first/last, with a fallback. */
function getDisplayName(firstName: string | null, lastName: string | null): string {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Penn State Student";
}

/** Builds a location string from state and country. */
function getLocationText(state: string | null, country: string | null): string | null {
  const parts = [state, country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

/** Displays a single potential match with compatibility score and lifestyle summary. */
function MatchCard({ match, onConnect }: MatchCardProps) {
  const displayName = getDisplayName(match.firstName, match.lastName);
  const location = getLocationText(match.locationState, match.locationCountry);
  const summary = match.generatedSummary ?? "No summary available yet.";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Profile photo or initial avatar */}
          {match.profilePictureUrl ? (
            <img
              src={match.profilePictureUrl}
              alt={displayName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-500 dark:text-gray-400">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="font-semibold text-base">{displayName}</h3>
            {location && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{location}</p>
            )}
          </div>
        </div>

        {/* Compatibility badge */}
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold ${getScoreBadgeBg(match.compatibilityScore)} ${getScoreColor(match.compatibilityScore)}`}
        >
          {match.compatibilityScore}% match
        </span>
      </div>

      {/* Lifestyle summary */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
        {summary}
      </p>

      {/* Connect button */}
      <button
        type="button"
        onClick={() => onConnect(match.matchedUserId)}
        className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Connect
      </button>
    </div>
  );
}

export { MatchCard };
export type { MatchCardProps };
