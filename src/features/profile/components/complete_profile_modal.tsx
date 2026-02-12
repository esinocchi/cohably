"use client";

import { useCallback, useRef, useState } from "react";
import { uploadProfilePhoto } from "../api/upload_photo";
import { saveProfileFields } from "../api/save_profile";
import type { Profile } from "../types";

interface CompleteProfileModalProps {
  userId: string;
  /** Called with the updated profile after all fields + photo are saved. */
  onCompleted: (updatedProfile: Partial<Profile>) => void;
  onClose: () => void;
}

const MAX_FILE_SIZE_MB = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Modal that collects name, location, and a profile photo.
 * Shown when a user attempts to connect but has an incomplete profile.
 */
function CompleteProfileModal({ userId, onCompleted, onClose }: CompleteProfileModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [locationCountry, setLocationCountry] = useState("");
  const [locationState, setLocationState] = useState("");

  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    locationCountry.trim().length > 0 &&
    selectedFile !== null &&
    !submitting;

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Please upload a JPEG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setError(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (file) {
        const fakeEvent = {
          target: { files: [file] },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleFileChange(fakeEvent);
      }
    },
    [handleFileChange],
  );

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !selectedFile) {
      return;
    }

    setSubmitting(true);
    setError(null);

    // 1. Upload photo.
    const { url, error: uploadError } = await uploadProfilePhoto(userId, selectedFile);
    if (uploadError || !url) {
      setError(uploadError ?? "Photo upload failed. Please try again.");
      setSubmitting(false);
      return;
    }

    // 2. Save text fields + photo URL.
    const { error: saveError } = await saveProfileFields(userId, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      locationCountry: locationCountry.trim(),
      locationState: locationState.trim() || undefined,
      profilePictureUrl: url,
    });

    if (saveError) {
      setError(saveError);
      setSubmitting(false);
      return;
    }

    onCompleted({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      location_country: locationCountry.trim(),
      location_state: locationState.trim() || null,
      profile_picture_url: url,
    });
  }, [canSubmit, selectedFile, userId, firstName, lastName, locationCountry, locationState, onCompleted]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-1">Complete Your Profile</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Add your info so your matches can learn about you.
        </p>

        {/* Name fields */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium mb-1">
              First name <span className="text-red-500">*</span>
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Alex"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium mb-1">
              Last name <span className="text-red-500">*</span>
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Smith"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Location fields */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label htmlFor="locationCountry" className="block text-sm font-medium mb-1">
              Country <span className="text-red-500">*</span>
            </label>
            <input
              id="locationCountry"
              type="text"
              value={locationCountry}
              onChange={(e) => setLocationCountry(e.target.value)}
              placeholder="United States"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="locationState" className="block text-sm font-medium mb-1">
              State / Region
            </label>
            <input
              id="locationState"
              type="text"
              value={locationState}
              onChange={(e) => setLocationState(e.target.value)}
              placeholder="Pennsylvania"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Photo upload */}
        <label className="block text-sm font-medium mb-2">
          Profile photo <span className="text-red-500">*</span>
        </label>
        <div
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-5 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors mb-4"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter") fileInputRef.current?.click(); }}
        >
          {preview ? (
            <img
              src={preview}
              alt="Preview"
              className="w-20 h-20 rounded-full mx-auto object-cover mb-2"
            />
          ) : (
            <div className="w-14 h-14 mx-auto mb-2 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <svg
                className="w-7 h-7 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                />
              </svg>
            </div>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {preview ? "Click to change" : "Click or drag to upload"}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            JPEG, PNG, or WebP up to {MAX_FILE_SIZE_MB}MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}

export { CompleteProfileModal };
export type { CompleteProfileModalProps };
