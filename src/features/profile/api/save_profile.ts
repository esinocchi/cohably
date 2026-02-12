import { createClient } from "@/utils/supabase/client";

/** Fields that can be updated via the profile completion form. */
interface ProfileFields {
  firstName: string;
  lastName: string;
  locationCountry: string;
  locationState?: string;
  profilePictureUrl?: string;
}

/**
 * Updates the profile text fields (and optionally the photo URL)
 * in a single call. Used by the CompleteProfileModal after the
 * photo has been uploaded separately.
 */
async function saveProfileFields(
  userId: string,
  fields: ProfileFields,
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const payload: Record<string, unknown> = {
    first_name: fields.firstName.trim(),
    last_name: fields.lastName.trim(),
    location_country: fields.locationCountry.trim(),
    location_state: fields.locationState?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (fields.profilePictureUrl) {
    payload.profile_picture_url = fields.profilePictureUrl;
  }

  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("user_id", userId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export { saveProfileFields };
export type { ProfileFields };
