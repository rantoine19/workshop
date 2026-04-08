"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import NavHeader from "@/components/ui/NavHeader";
import Avatar from "@/components/ui/Avatar";

const CONDITIONS_OPTIONS = [
  "Diabetes",
  "Hypertension",
  "Heart Disease",
  "Thyroid Disorder",
  "Kidney Disease",
  "High Cholesterol",
  "Asthma/COPD",
  "None",
];

const FAMILY_HISTORY_OPTIONS = [
  "Heart Disease",
  "Diabetes",
  "Cancer",
  "High Blood Pressure",
  "Stroke",
  "None",
];

interface ProfileData {
  id: string;
  display_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  avatar_url: string | null;
  height_inches: number | null;
  known_conditions: string[];
  medications: string | null;
  smoking_status: string | null;
  family_history: string[];
  activity_level: string | null;
  sleep_hours: string | null;
  updated_at: string | null;
}

function computeCompletion(profile: ProfileData): number {
  const fields = [
    profile.display_name,
    profile.date_of_birth,
    profile.gender,
    profile.known_conditions?.length ? profile.known_conditions : null,
    profile.medications,
    profile.smoking_status,
    profile.family_history?.length ? profile.family_history : null,
    profile.activity_level,
    profile.sleep_hours,
  ];
  const filled = fields.filter((f) => f !== null && f !== undefined).length;
  return Math.round((filled / fields.length) * 100);
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [knownConditions, setKnownConditions] = useState<string[]>([]);
  const [medications, setMedications] = useState("");
  const [smokingStatus, setSmokingStatus] = useState("");
  const [familyHistory, setFamilyHistory] = useState<string[]>([]);
  const [activityLevel, setActivityLevel] = useState("");
  const [sleepHours, setSleepHours] = useState("");
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
      setKnownConditions(data.profile.known_conditions || []);
      setMedications(data.profile.medications || "");
      setSmokingStatus(data.profile.smoking_status || "");
      setFamilyHistory(data.profile.family_history || []);
      setActivityLevel(data.profile.activity_level || "");
      setSleepHours(data.profile.sleep_hours || "");
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

  const handleConditionToggle = (condition: string) => {
    setKnownConditions((prev) => {
      if (condition === "None") {
        return prev.includes("None") ? [] : ["None"];
      }
      const without = prev.filter((c) => c !== "None");
      return without.includes(condition)
        ? without.filter((c) => c !== condition)
        : [...without, condition];
    });
  };

  const handleFamilyHistoryToggle = (item: string) => {
    setFamilyHistory((prev) => {
      if (item === "None") {
        return prev.includes("None") ? [] : ["None"];
      }
      const without = prev.filter((f) => f !== "None");
      return without.includes(item)
        ? without.filter((f) => f !== item)
        : [...without, item];
    });
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
          known_conditions: knownConditions,
          medications: medications || null,
          smoking_status: smokingStatus || null,
          family_history: familyHistory,
          activity_level: activityLevel || null,
          sleep_hours: sleepHours || null,
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

  const completion = profile ? computeCompletion({
    ...profile,
    display_name: displayName || null,
    date_of_birth: dateOfBirth || null,
    gender: gender || null,
    known_conditions: knownConditions,
    medications: medications || null,
    smoking_status: smokingStatus || null,
    family_history: familyHistory,
    activity_level: activityLevel || null,
    sleep_hours: sleepHours || null,
  }) : 0;

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

      <div className="profile-completion" role="progressbar" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}>
        <div className="profile-completion__label">
          Complete your health profile for more personalized insights — {completion}% complete
        </div>
        <div className="profile-completion__track">
          <div className="profile-completion__bar" style={{ width: `${completion}%` }} />
        </div>
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

        {/* Health Background Section */}
        <div className="profile-section">
          <h2 className="profile-section__heading">Health Background</h2>
          <p className="profile-section__description">
            Helps personalize your experience. All fields are optional.
          </p>

          <div className="profile-page__field">
            <label>Known Conditions</label>
            <div className="profile-checkbox-group">
              {CONDITIONS_OPTIONS.map((condition) => (
                <label key={condition} className="profile-checkbox-group__item">
                  <input
                    type="checkbox"
                    checked={knownConditions.includes(condition)}
                    onChange={() => handleConditionToggle(condition)}
                  />
                  <span>{condition}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="profile-page__field">
            <label htmlFor="medications">Current Medications</label>
            <textarea
              id="medications"
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
              placeholder="e.g., Metformin, Lisinopril, Atorvastatin"
              maxLength={1000}
              rows={3}
              className="profile-page__textarea"
            />
            <span className="profile-page__hint">
              Optional. Medications can affect lab values.
            </span>
          </div>

          <div className="profile-page__field">
            <label>Smoking Status</label>
            <div className="profile-radio-group">
              {[
                { value: "none", label: "None" },
                { value: "occasionally", label: "Occasionally" },
                { value: "daily", label: "Daily" },
              ].map((option) => (
                <label key={option.value} className="profile-radio-group__item">
                  <input
                    type="radio"
                    name="smoking_status"
                    value={option.value}
                    checked={smokingStatus === option.value}
                    onChange={(e) => setSmokingStatus(e.target.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Lifestyle Section */}
        <div className="profile-section">
          <h2 className="profile-section__heading">Lifestyle</h2>
          <p className="profile-section__description">
            Lifestyle factors influence reference ranges and risk interpretation.
          </p>

          <div className="profile-page__field">
            <label>Activity Level</label>
            <div className="profile-radio-group">
              {[
                { value: "sedentary", label: "Sedentary" },
                { value: "light", label: "Light" },
                { value: "moderate", label: "Moderate" },
                { value: "very_active", label: "Very Active" },
              ].map((option) => (
                <label key={option.value} className="profile-radio-group__item">
                  <input
                    type="radio"
                    name="activity_level"
                    value={option.value}
                    checked={activityLevel === option.value}
                    onChange={(e) => setActivityLevel(e.target.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="profile-page__field">
            <label>Sleep</label>
            <div className="profile-radio-group">
              {[
                { value: "7plus", label: "7+ hours" },
                { value: "6", label: "6 hours" },
                { value: "5_or_less", label: "5 hours or less" },
              ].map((option) => (
                <label key={option.value} className="profile-radio-group__item">
                  <input
                    type="radio"
                    name="sleep_hours"
                    value={option.value}
                    checked={sleepHours === option.value}
                    onChange={(e) => setSleepHours(e.target.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Family History Section */}
        <div className="profile-section">
          <h2 className="profile-section__heading">Family History</h2>
          <p className="profile-section__description">
            Family history helps assess health risks. Select conditions that run in your family.
          </p>

          <div className="profile-page__field">
            <div className="profile-checkbox-group">
              {FAMILY_HISTORY_OPTIONS.map((item) => (
                <label key={item} className="profile-checkbox-group__item">
                  <input
                    type="checkbox"
                    checked={familyHistory.includes(item)}
                    onChange={() => handleFamilyHistoryToggle(item)}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>
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
