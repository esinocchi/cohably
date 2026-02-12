import { createClient } from "@/utils/supabase/client";

/**
 * Uploads a profile photo to Supabase Storage and updates the user's
 * profile_picture_url in the profiles table.
 *
 * Requires a "profile-photos" bucket to exist in Supabase Storage.
 * Upload path: {user_id}/{timestamp}_{filename}
 */
async function uploadProfilePhoto(
  userId: string,
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient();
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${userId}/${timestamp}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("profile-photos")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    return { url: null, error: uploadError.message };
  }

  const { data: urlData } = supabase.storage
    .from("profile-photos")
    .getPublicUrl(filePath);

  const publicUrl = urlData.publicUrl;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      profile_picture_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) {
    return { url: null, error: updateError.message };
  }

  return { url: publicUrl, error: null };
}

export { uploadProfilePhoto };
