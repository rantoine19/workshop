"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import NavHeader from "@/components/ui/NavHeader";

const FREQUENCY_OPTIONS = [
  { value: "once_daily", label: "Once daily" },
  { value: "twice_daily", label: "Twice daily" },
  { value: "three_times_daily", label: "Three times daily" },
  { value: "weekly", label: "Weekly" },
  { value: "as_needed", label: "As needed" },
  { value: "other", label: "Other" },
];

const UNIT_OPTIONS = [
  { value: "", label: "Select unit..." },
  { value: "mg", label: "mg" },
  { value: "mcg", label: "mcg" },
  { value: "ml", label: "ml" },
  { value: "tablets", label: "tablets" },
  { value: "capsules", label: "capsules" },
  { value: "drops", label: "drops" },
  { value: "units", label: "units" },
  { value: "other", label: "Other" },
];

const TIME_OPTIONS = [
  { value: "", label: "Select time..." },
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "bedtime", label: "Bedtime" },
  { value: "with_meals", label: "With meals" },
  { value: "any_time", label: "Any time" },
];

export default function EditMedicationPage() {
  const router = useRouter();
  const params = useParams();
  const medicationId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [dosageUnit, setDosageUnit] = useState("");
  const [frequency, setFrequency] = useState("once_daily");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [prescribingDoctor, setPrescribingDoctor] = useState("");
  const [startDate, setStartDate] = useState("");
  const [notes, setNotes] = useState("");
  const [hasPhoto, setHasPhoto] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMedication = useCallback(async () => {
    try {
      const response = await fetch(`/api/medications/${medicationId}`);
      if (!response.ok) throw new Error("Medication not found");
      const { medication } = await response.json();
      setName(medication.name || "");
      setDosage(medication.dosage || "");
      setDosageUnit(medication.dosage_unit || "");
      setFrequency(medication.frequency || "once_daily");
      setTimeOfDay(medication.time_of_day || "");
      setPrescribingDoctor(medication.prescribing_doctor || "");
      setStartDate(medication.start_date || "");
      setNotes(medication.notes || "");
      setHasPhoto(!!medication.photo_path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load medication");
    } finally {
      setLoading(false);
    }
  }, [medicationId]);

  useEffect(() => {
    fetchMedication();
  }, [fetchMedication]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Accepted: PNG, JPEG, WebP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large. Maximum size is 5MB");
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    if (hasPhoto) {
      // Delete from server
      try {
        await fetch(`/api/medications/${medicationId}/photo`, {
          method: "DELETE",
        });
        setHasPhoto(false);
      } catch {
        setError("Failed to remove photo");
        return;
      }
    }
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Medication name is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/medications/${medicationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          dosage: dosage.trim() || null,
          dosage_unit: dosageUnit || null,
          frequency,
          time_of_day: timeOfDay || null,
          prescribing_doctor: prescribingDoctor.trim() || null,
          start_date: startDate || null,
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update medication");
      }

      // Upload new photo if provided
      if (photoFile) {
        const formData = new FormData();
        formData.append("file", photoFile);

        const photoResponse = await fetch(
          `/api/medications/${medicationId}/photo`,
          { method: "POST", body: formData }
        );

        if (!photoResponse.ok) {
          console.error("Photo upload failed");
        }
      }

      router.push("/medications");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update medication");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="medications-page medications-page--loading">
        <div className="medications-page__spinner" aria-label="Loading medication" />
        <p>Loading medication...</p>
      </div>
    );
  }

  return (
    <div className="medications-page">
      <div className="medications-page__header">
        <NavHeader backHref="/medications" backLabel="Medications" />
        <h1>Edit Medication</h1>
      </div>

      {error && (
        <div className="medications-page__error" role="alert">
          {error}
          <button onClick={() => setError(null)} className="medications-page__dismiss">
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="medication-form">
        <div className="medication-form__field">
          <label htmlFor="med-name">
            Medication Name <span className="medication-form__required">*</span>
          </label>
          <input
            id="med-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Metformin"
            maxLength={200}
            required
          />
        </div>

        <div className="medication-form__row">
          <div className="medication-form__field">
            <label htmlFor="med-dosage">Dosage</label>
            <input
              id="med-dosage"
              type="text"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="e.g., 500"
              maxLength={50}
            />
          </div>
          <div className="medication-form__field">
            <label htmlFor="med-unit">Unit</label>
            <select
              id="med-unit"
              value={dosageUnit}
              onChange={(e) => setDosageUnit(e.target.value)}
            >
              {UNIT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="medication-form__row">
          <div className="medication-form__field">
            <label htmlFor="med-frequency">
              Frequency <span className="medication-form__required">*</span>
            </label>
            <select
              id="med-frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              required
            >
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="medication-form__field">
            <label htmlFor="med-time">Time of Day</label>
            <select
              id="med-time"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
            >
              {TIME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="medication-form__field">
          <label htmlFor="med-doctor">Prescribing Doctor</label>
          <input
            id="med-doctor"
            type="text"
            value={prescribingDoctor}
            onChange={(e) => setPrescribingDoctor(e.target.value)}
            placeholder="e.g., Dr. Smith"
            maxLength={200}
          />
        </div>

        <div className="medication-form__field">
          <label htmlFor="med-start-date">Start Date</label>
          <input
            id="med-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
          />
        </div>

        <div className="medication-form__field">
          <label htmlFor="med-notes">Notes</label>
          <textarea
            id="med-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes..."
            maxLength={1000}
            rows={3}
          />
        </div>

        {/* Photo Upload */}
        <div className="medication-form__field">
          <label>Prescription Photo</label>
          <div className="medication-form__photo-upload">
            {(photoPreview || hasPhoto) ? (
              <div className="medication-form__photo-preview">
                {photoPreview ? (
                  <img src={photoPreview} alt="Prescription photo preview" />
                ) : (
                  <div className="medication-form__photo-existing">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span>Photo on file</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="medication-form__photo-remove"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label htmlFor="med-photo" className="medication-form__photo-label">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>Take or upload a photo</span>
                <span className="medication-form__photo-hint">PNG, JPEG, or WebP. Max 5MB.</span>
              </label>
            )}
            <input
              ref={fileInputRef}
              id="med-photo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              capture="environment"
              onChange={handlePhotoChange}
              className="medication-form__photo-input"
            />
          </div>
        </div>

        <div className="medication-form__actions">
          <button
            type="button"
            onClick={() => router.push("/medications")}
            className="medication-form__cancel"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="medication-form__submit"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
