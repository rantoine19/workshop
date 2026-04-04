"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import NavHeader from "@/components/ui/NavHeader";
import Avatar from "@/components/ui/Avatar";

interface ProfileData {
  id: string;
  display_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  avatar_url: string | null;
  updated_at: string | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/profile");
      if (!response.ok) {
        throw new Error("Failed to load profile");
      }
      const data = await response.json();
      setProfile(data.profile);
      setDisplayName(data.profile.display_name || "");
      setDateOfBirth(data.profile.date_of_birth || "");
      setGender(data.profile.gender || "");
      setAvatarUrl(data.profile.avatar_url || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Accepted: PNG, JPEG, WebP");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("File too large. Maximum size is 2MB");
      return;
    }

    setUploadingAvatar(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to upload avatar");
      }

      const data = await response.json();
      setAvatarUrl(data.avatar_url);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
      // Reset file input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleAvatarRemove = async () => {
    setUploadingAvatar(true);
    setError(null);

    try {
      const response = await fetch("/api/profile/avatar", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove avatar");
      }

      setAvatarUrl(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName || null,
          date_of_birth: dateOfBirth || null,
          gender: gender || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save profile");
      }

      const data = await response.json();
      setProfile(data.profile);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-page profile-page--loading">
        <div className="profile-page__spinner" aria-label="Loading profile" />
        <p>Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-page__header">
        <NavHeader backLabel="Dashboard" />
        <h1>Your Profile</h1>
        <p>Manage your personal information. This helps us personalize your health explanations.</p>
      </div>

      {error && (
        <div className="profile-page__error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="profile-page__success" role="status">
          Profile saved successfully!
        </div>
      )}

      <div className="profile-avatar">
        <Avatar avatarUrl={avatarUrl} displayName={displayName} size="lg" />
        <div className="profile-avatar__actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleAvatarUpload}
            className="profile-avatar__input"
            id="avatar-upload"
            aria-label="Upload avatar"
          />
          <label
            htmlFor="avatar-upload"
            className="profile-avatar__upload-btn"
          >
            {uploadingAvatar ? "Uploading..." : "Change Photo"}
          </label>
          {avatarUrl && (
            <button
              type="button"
              onClick={handleAvatarRemove}
              className="profile-avatar__remove-btn"
              disabled={uploadingAvatar}
            >
              Remove
            </button>
          )}
          <span className="profile-avatar__hint">
            PNG, JPEG, or WebP. Max 2MB.
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="profile-page__form">
        <div className="profile-page__field">
          <label htmlFor="display-name">Display Name</label>
          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your name"
            maxLength={100}
          />
        </div>

        <div className="profile-page__field">
          <label htmlFor="date-of-birth">Date of Birth</label>
          <input
            id="date-of-birth"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
          />
          <span className="profile-page__hint">
            Used to personalize age-appropriate health information.
          </span>
        </div>

        <div className="profile-page__field">
          <label htmlFor="gender">Gender</label>
          <select
            id="gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">Select...</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
          <span className="profile-page__hint">
            Some lab reference ranges differ by gender.
          </span>
        </div>

        <button
          type="submit"
          className="profile-page__submit"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>

      {profile?.updated_at && (
        <p className="profile-page__updated">
          Last updated: {new Date(profile.updated_at).toLocaleDateString()}
        </p>
      )}

      <Link href="/profile/reference-ranges" className="profile-page__link-card">
        <h3>Custom Reference Ranges</h3>
        <p>Set personalized reference ranges from your doctor to override default thresholds.</p>
      </Link>
    </div>
  );
}
