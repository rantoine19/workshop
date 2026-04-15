"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NavHeader from "@/components/ui/NavHeader";

const RELATIONSHIPS = [
  "Parent",
  "Child",
  "Spouse",
  "Grandparent",
  "Sibling",
  "Other",
];

export default function AddFamilyMemberPage() {
  return (
    <Suspense fallback={<div className="family-page">Loading...</div>}>
      <AddFamilyMemberForm />
    </Suspense>
  );
}

function AddFamilyMemberForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEdit = Boolean(editId);

  const [displayName, setDisplayName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(isEdit);

  // Load existing data when editing
  useEffect(() => {
    if (!editId) return;

    async function loadMember() {
      try {
        const res = await fetch(`/api/family-members/${editId}`);
        if (res.ok) {
          const data = await res.json();
          const m = data.member;
          setDisplayName(m.display_name || "");
          setRelationship(m.relationship || "");
          setDateOfBirth(m.date_of_birth || "");
          setGender(m.gender || "");
        } else {
          setError("Family member not found");
        }
      } catch {
        setError("Failed to load family member");
      } finally {
        setLoadingEdit(false);
      }
    }
    loadMember();
  }, [editId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!displayName.trim()) {
      setError("Name is required");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        display_name: displayName.trim(),
        relationship: relationship || null,
        date_of_birth: dateOfBirth || null,
        gender: gender || null,
      };

      const url = isEdit
        ? `/api/family-members/${editId}`
        : "/api/family-members";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }

      router.push("/family");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <NavHeader />
      <div className="page-content">
        <div className="family-form">
          <div className="family-form__header">
            <h1>{isEdit ? "Edit Family Member" : "Add Family Member"}</h1>
            <p>
              {isEdit
                ? "Update this family member's information."
                : "Add a family member to track their health data."}
            </p>
          </div>

          {loadingEdit ? (
            <div className="family-page__loading">
              <div className="profile-page__spinner" />
              <span>Loading...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="family-form__form">
              {error && <div className="profile-page__error">{error}</div>}

              <div className="profile-page__field">
                <label htmlFor="displayName">Name *</label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., Mom, Dad, Sarah"
                  required
                  autoFocus
                />
              </div>

              <div className="profile-page__field">
                <label htmlFor="relationship">Relationship</label>
                <select
                  id="relationship"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                >
                  <option value="">Select...</option>
                  {RELATIONSHIPS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="profile-page__field">
                <label htmlFor="dob">Date of Birth</label>
                <input
                  id="dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
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
              </div>

              <div className="family-form__actions">
                <button
                  type="submit"
                  className="family-form__save"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : isEdit
                      ? "Update Family Member"
                      : "Add Family Member"}
                </button>
                <button
                  type="button"
                  className="family-form__cancel"
                  onClick={() => router.push("/family")}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
