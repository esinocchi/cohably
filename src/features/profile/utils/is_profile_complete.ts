import type { Profile } from "../types";

/**
 * Returns true when all required profile fields are filled:
 * first name, last name, country, and a profile photo.
 *
 * This is the single source of truth for "profile completeness"
 * used by the connect gate and the match feed filter.
 */
function isProfileComplete(profile: Profile): boolean {
  return Boolean(
    profile.first_name?.trim() &&
    profile.last_name?.trim() &&
    profile.location_country?.trim() &&
    profile.profile_picture_url,
  );
}

export { isProfileComplete };
