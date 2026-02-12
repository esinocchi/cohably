/** Row shape from the profiles table. */
interface Profile {
  id: string;
  user_id: string;
  assessment_completed: boolean;
  assessment_completed_at: string | null;
  first_name: string | null;
  last_name: string | null;
  location_state: string | null;
  location_country: string | null;
  generated_summary: string | null;
  profile_picture_url: string | null;
  additional_photos: string[] | null;
  created_at: string;
  updated_at: string;
}

export type { Profile };
