"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import NavHeader from "@/components/ui/NavHeader";

interface Medication {
  id: string;
  name: string;
  dosage: string | null;
  dosage_unit: string | null;
  frequency: string;
  time_of_day: string | null;
  prescribing_doctor: string | null;
  start_date: string | null;
  notes: string | null;
  photo_path: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const FREQUENCY_LABELS: Record<string, string> = {
  once_daily: "Once daily",
  twice_daily: "Twice daily",
  three_times_daily: "3x daily",
  weekly: "Weekly",
  as_needed: "As needed",
  other: "Other",
};

const TIME_LABELS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  bedtime: "Bedtime",
  with_meals: "With meals",
  any_time: "Any time",
};

export default function MedicationsPage() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const fetchMedications = useCallback(async () => {
    try {
      const response = await fetch("/api/medications");
      if (!response.ok) throw new Error("Failed to load medications");
      const data = await response.json();
      setMedications(data.medications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load medications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  const handleToggleActive = async (med: Medication) => {
    try {
      const response = await fetch(`/api/medications/${med.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !med.active }),
      });
      if (!response.ok) throw new Error("Failed to update medication");
      await fetchMedications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/medications/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete medication");
      setDeleteConfirm(null);
      await fetchMedications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const activeMeds = medications.filter((m) => m.active);
  const inactiveMeds = medications.filter((m) => !m.active);

  if (loading) {
    return (
      <div className="medications-page medications-page--loading">
        <div className="medications-page__spinner" aria-label="Loading medications" />
        <p>Loading your medications...</p>
      </div>
    );
  }

  return (
    <div className="medications-page">
      <div className="medications-page__header">
        <NavHeader backLabel="Dashboard" />
        <div className="medications-page__title-row">
          <div>
            <h1>Medications</h1>
            <p>Track your prescriptions, dosages, and schedules.</p>
          </div>
          <Link href="/medications/add" className="medications-page__add-btn">
            + Add Medication
          </Link>
        </div>
      </div>

      <p className="medications-page__disclaimer">
        This is for your records only. Always follow your doctor&apos;s instructions.
      </p>

      {error && (
        <div className="medications-page__error" role="alert">
          {error}
          <button onClick={() => setError(null)} className="medications-page__dismiss">
            Dismiss
          </button>
        </div>
      )}

      {medications.length === 0 ? (
        <div className="medications-page__empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-gray-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 13.5h.008v.008H10.5v-.008zm0-3h.008v.008H10.5V12zm0-3h.008v.008H10.5V9z" />
          </svg>
          <h2>No medications yet</h2>
          <p>Add your first medication to start tracking your prescriptions.</p>
          <Link href="/medications/add" className="medications-page__add-btn">
            + Add Medication
          </Link>
        </div>
      ) : (
        <>
          {/* Active Medications */}
          <section className="medications-page__section">
            <h2 className="medications-page__section-title">
              Active Medications ({activeMeds.length})
            </h2>
            {activeMeds.length === 0 ? (
              <p className="medications-page__section-empty">No active medications.</p>
            ) : (
              <div className="medications-page__grid">
                {activeMeds.map((med) => (
                  <MedicationCard
                    key={med.id}
                    medication={med}
                    onToggleActive={() => handleToggleActive(med)}
                    onDelete={() => setDeleteConfirm(med.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Inactive Medications */}
          {inactiveMeds.length > 0 && (
            <section className="medications-page__section">
              <button
                className="medications-page__section-toggle"
                onClick={() => setShowInactive(!showInactive)}
                aria-expanded={showInactive}
              >
                <h2 className="medications-page__section-title">
                  Inactive Medications ({inactiveMeds.length})
                </h2>
                <span className="medications-page__chevron" data-open={showInactive}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </button>
              {showInactive && (
                <div className="medications-page__grid">
                  {inactiveMeds.map((med) => (
                    <MedicationCard
                      key={med.id}
                      medication={med}
                      onToggleActive={() => handleToggleActive(med)}
                      onDelete={() => setDeleteConfirm(med.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="medications-page__overlay" onClick={() => setDeleteConfirm(null)}>
          <div
            className="medications-page__dialog"
            role="alertdialog"
            aria-labelledby="delete-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="delete-dialog-title">Delete Medication?</h3>
            <p>This will permanently remove this medication and its photo. This cannot be undone.</p>
            <div className="medications-page__dialog-actions">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="medications-page__dialog-cancel"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="medications-page__dialog-delete"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MedicationCard({
  medication,
  onToggleActive,
  onDelete,
}: {
  medication: Medication;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const dosageText = [
    medication.dosage,
    medication.dosage_unit,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`medication-card${medication.active ? "" : " medication-card--inactive"}`}>
      <div className="medication-card__header">
        <div className="medication-card__info">
          <h3 className="medication-card__name">{medication.name}</h3>
          {dosageText && (
            <span className="medication-card__dosage">{dosageText}</span>
          )}
        </div>
        <span className={`medication-card__status medication-card__status--${medication.active ? "active" : "inactive"}`}>
          {medication.active ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="medication-card__details">
        <div className="medication-card__detail">
          <span className="medication-card__label">Frequency</span>
          <span>{FREQUENCY_LABELS[medication.frequency] || medication.frequency}</span>
        </div>
        {medication.time_of_day && (
          <div className="medication-card__detail">
            <span className="medication-card__label">Time</span>
            <span>{TIME_LABELS[medication.time_of_day] || medication.time_of_day}</span>
          </div>
        )}
        {medication.prescribing_doctor && (
          <div className="medication-card__detail">
            <span className="medication-card__label">Doctor</span>
            <span>{medication.prescribing_doctor}</span>
          </div>
        )}
        {medication.start_date && (
          <div className="medication-card__detail">
            <span className="medication-card__label">Started</span>
            <span>{new Date(medication.start_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {medication.notes && (
        <p className="medication-card__notes">{medication.notes}</p>
      )}

      {medication.photo_path && (
        <div className="medication-card__photo">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span>Photo attached</span>
        </div>
      )}

      <div className="medication-card__actions">
        <Link
          href={`/medications/${medication.id}/edit`}
          className="medication-card__action medication-card__action--edit"
        >
          Edit
        </Link>
        <button
          onClick={onToggleActive}
          className="medication-card__action medication-card__action--toggle"
        >
          {medication.active ? "Deactivate" : "Reactivate"}
        </button>
        <button
          onClick={onDelete}
          className="medication-card__action medication-card__action--delete"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
