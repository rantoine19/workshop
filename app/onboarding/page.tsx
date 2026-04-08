"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/ui/Logo";

type OnboardingStep = 1 | 2 | 3;

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload state for step 3
  const [file, setFile] = useState<File | null>(null);
  const [uploadStage, setUploadStage] = useState<
    "idle" | "uploading" | "parsing" | "complete" | "error"
  >("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const supabase = createClient();
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Redirect if not authenticated or already onboarded
  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Check if already onboarded
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.profile?.display_name) {
            router.push("/dashboard");
          }
        }
      } catch {
        // Continue with onboarding
      }
    }
    checkAuth();
  }, [router, supabase.auth]);

  // Auto-focus name input on step 1
  useEffect(() => {
    if (step === 1 && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [step]);

  async function saveProfile(data: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to save");
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleStep1Continue() {
    if (!displayName.trim()) {
      setError("Please enter your name");
      return;
    }
    const ok = await saveProfile({ display_name: displayName.trim() });
    if (ok) {
      setError(null);
      setStep(2);
    }
  }

  async function handleStep1Skip() {
    // Save a placeholder name so onboarding is marked complete
    const ok = await saveProfile({ display_name: "Friend" });
    if (ok) {
      setError(null);
      setStep(2);
    }
  }

  async function handleStep2Continue() {
    const profileData: Record<string, unknown> = {};
    if (gender) profileData.gender = gender;
    if (dateOfBirth) profileData.date_of_birth = dateOfBirth;
    if (heightFeet || heightInches) {
      const feet = parseInt(heightFeet) || 0;
      const inches = parseInt(heightInches) || 0;
      profileData.height_inches = feet * 12 + inches;
    }

    if (Object.keys(profileData).length > 0) {
      const ok = await saveProfile(profileData);
      if (ok) {
        setError(null);
        setStep(3);
      }
    } else {
      setError(null);
      setStep(3);
    }
  }

  async function handleStep2Skip() {
    setError(null);
    setStep(3);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setUploadStage("idle");
    const selected = e.target.files?.[0];
    if (!selected) return;

    const validTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
    ];
    if (!validTypes.includes(selected.type)) {
      setError("Please select a PDF, PNG, or JPG file.");
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError("File is too large. Maximum size is 10MB.");
      return;
    }
    setFile(selected);
  }

  async function handleUpload() {
    if (!file) return;

    setError(null);
    setUploadStage("uploading");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        setError(uploadData.error || "Upload failed. Please try again.");
        setUploadStage("error");
        return;
      }

      const reportId = uploadData.report_id;

      setUploadStage("parsing");
      const parseRes = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: reportId }),
      });

      if (!parseRes.ok) {
        const parseData = await parseRes.json();
        setError(
          parseData.error ||
            "Analysis failed, but your report was uploaded. You can retry from the reports page."
        );
        setUploadStage("error");
        return;
      }

      setUploadStage("complete");
      setTimeout(() => {
        router.push(`/reports/${reportId}`);
      }, 1000);
    } catch {
      setError("Network error. Please check your connection.");
      setUploadStage("error");
    }
  }

  function handleSkipUpload() {
    router.push("/dashboard");
  }

  const isUploading = uploadStage === "uploading" || uploadStage === "parsing";

  return (
    <div className="onboarding">
      <div className="onboarding__logo">
        <Logo variant="full" size="md" />
      </div>

      {/* Progress dots */}
      <div className="onboarding__progress" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={TOTAL_STEPS}>
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`onboarding__dot ${
              s < step
                ? "onboarding__dot--completed"
                : s === step
                  ? "onboarding__dot--active"
                  : ""
            }`}
          />
        ))}
      </div>

      <div className="onboarding__card">
        {/* Step 1: Display Name */}
        {step === 1 && (
          <div className="onboarding__step" data-testid="onboarding-step-1">
            <h1 className="onboarding__heading">
              Hey! What should we call you?
            </h1>
            <p className="onboarding__subtext">
              We like to keep things friendly around here.
            </p>

            <div className="onboarding__field">
              <input
                ref={nameInputRef}
                type="text"
                className="onboarding__input"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleStep1Continue();
                }}
                maxLength={100}
                autoComplete="given-name"
              />
            </div>

            {error && (
              <p className="onboarding__error" role="alert">
                {error}
              </p>
            )}

            <div className="onboarding__actions">
              <button
                className="onboarding__btn onboarding__btn--primary"
                onClick={handleStep1Continue}
                disabled={saving}
              >
                {saving ? "Saving..." : "Continue"}
              </button>
            </div>
            <button
              className="onboarding__skip"
              onClick={handleStep1Skip}
              disabled={saving}
            >
              Skip for now
            </button>
          </div>
        )}

        {/* Step 2: Health Basics */}
        {step === 2 && (
          <div className="onboarding__step" data-testid="onboarding-step-2">
            <h1 className="onboarding__heading">Quick health basics</h1>
            <p className="onboarding__subtext">
              This helps us flag your results accurately. All fields are
              optional.
            </p>

            <div className="onboarding__field">
              <label className="onboarding__label" htmlFor="ob-gender">
                Gender
              </label>
              <select
                id="ob-gender"
                className="onboarding__select"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>

            <div className="onboarding__field">
              <label className="onboarding__label" htmlFor="ob-dob">
                Date of Birth
              </label>
              <input
                id="ob-dob"
                type="date"
                className="onboarding__input"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="onboarding__field">
              <label className="onboarding__label">Height</label>
              <div className="height-input">
                <div className="height-input__group">
                  <input
                    type="number"
                    className="onboarding__input height-input__field"
                    placeholder="ft"
                    value={heightFeet}
                    onChange={(e) => setHeightFeet(e.target.value)}
                    min="0"
                    max="8"
                  />
                  <span className="height-input__unit">ft</span>
                </div>
                <div className="height-input__group">
                  <input
                    type="number"
                    className="onboarding__input height-input__field"
                    placeholder="in"
                    value={heightInches}
                    onChange={(e) => setHeightInches(e.target.value)}
                    min="0"
                    max="11"
                  />
                  <span className="height-input__unit">in</span>
                </div>
              </div>
            </div>

            {error && (
              <p className="onboarding__error" role="alert">
                {error}
              </p>
            )}

            <div className="onboarding__actions">
              <button
                className="onboarding__btn onboarding__btn--primary"
                onClick={handleStep2Continue}
                disabled={saving}
              >
                {saving ? "Saving..." : "Continue"}
              </button>
            </div>
            <button
              className="onboarding__skip"
              onClick={handleStep2Skip}
              disabled={saving}
            >
              Skip for now
            </button>
          </div>
        )}

        {/* Step 3: Upload Report */}
        {step === 3 && (
          <div className="onboarding__step" data-testid="onboarding-step-3">
            <h1 className="onboarding__heading">
              Upload your first report
            </h1>
            <p className="onboarding__subtext">
              Upload a lab report and we&apos;ll analyze it in seconds. We
              accept PDF, PNG, and JPG files.
            </p>

            {uploadStage === "complete" ? (
              <div className="onboarding__success" role="status">
                <p>Analysis complete! Redirecting to your results...</p>
              </div>
            ) : isUploading ? (
              <div className="onboarding__uploading" role="status">
                <div className="onboarding__spinner" />
                <p>
                  {uploadStage === "uploading"
                    ? "Uploading your file..."
                    : "Analyzing your report... This may take a minute."}
                </p>
              </div>
            ) : (
              <>
                <div className="onboarding__upload-area">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileSelect}
                    id="onboarding-file-input"
                    className="onboarding__file-input"
                  />
                  <label
                    htmlFor="onboarding-file-input"
                    className="onboarding__upload-label"
                  >
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="12" y1="18" x2="12" y2="12" />
                      <line x1="9" y1="15" x2="12" y2="12" />
                      <line x1="15" y1="15" x2="12" y2="12" />
                    </svg>
                    {file ? file.name : "Choose a file or drag it here"}
                  </label>
                  {file && (
                    <p className="onboarding__file-info">
                      {file.name} ({(file.size / 1024 / 1024).toFixed(1)}MB)
                    </p>
                  )}
                </div>

                {error && (
                  <p className="onboarding__error" role="alert">
                    {error}
                  </p>
                )}

                <div className="onboarding__actions">
                  <button
                    className="onboarding__btn onboarding__btn--primary"
                    onClick={handleUpload}
                    disabled={!file}
                  >
                    Upload
                  </button>
                </div>
                <button
                  className="onboarding__skip"
                  onClick={handleSkipUpload}
                >
                  I&apos;ll do this later
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
