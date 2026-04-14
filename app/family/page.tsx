"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NavHeader from "@/components/ui/NavHeader";

interface FamilyMember {
  id: string;
  display_name: string;
  relationship: string | null;
  date_of_birth: string | null;
  gender: string | null;
  created_at: string;
}

export default function FamilyPage() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchMembers() {
    try {
      const res = await fetch("/api/family-members");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members ?? []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMembers();
  }, []);

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/family-members/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        // Clear active profile if deleting the active one
        const stored = localStorage.getItem("activeProfileId");
        if (stored === id) {
          localStorage.removeItem("activeProfileId");
        }
        setMembers((prev) => prev.filter((m) => m.id !== id));
      }
    } catch {
      // Silent fail
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  function calculateAge(dob: string): number {
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  function getInitials(name: string): string {
    return name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <>
      <NavHeader />
      <div className="page-content">
        <div className="family-page">
          <div className="family-page__header">
            <div>
              <h1>Family Members</h1>
              <p>Manage health profiles for your family members.</p>
            </div>
            {members.length < 10 && (
              <Link href="/family/add" className="family-page__add-btn">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Family Member
              </Link>
            )}
          </div>

          {loading && (
            <div className="family-page__loading">
              <div className="profile-page__spinner" />
              <span>Loading family members...</span>
            </div>
          )}

          {!loading && members.length === 0 && (
            <div className="family-page__empty">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-gray-300)"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <h3>No family members yet</h3>
              <p>Add family members to track their health alongside yours.</p>
              <Link href="/family/add" className="family-page__add-btn">
                Add Your First Family Member
              </Link>
            </div>
          )}

          {!loading && members.length > 0 && (
            <div className="family-page__grid">
              {members.map((m) => (
                <div key={m.id} className="family-card">
                  <div className="family-card__top">
                    <div className="family-card__avatar">
                      {getInitials(m.display_name)}
                    </div>
                    <div className="family-card__info">
                      <h3 className="family-card__name">{m.display_name}</h3>
                      <div className="family-card__meta">
                        {m.relationship && (
                          <span className="family-card__relationship">
                            {m.relationship}
                          </span>
                        )}
                        {m.date_of_birth && (
                          <span className="family-card__age">
                            {calculateAge(m.date_of_birth)} years old
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="family-card__actions">
                    <Link
                      href={`/family/add?edit=${m.id}`}
                      className="family-card__edit"
                    >
                      Edit
                    </Link>
                    <button
                      className="family-card__delete"
                      onClick={() => setDeleteId(m.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>

                  {deleteId === m.id && (
                    <div className="family-card__confirm">
                      <p>
                        Delete <strong>{m.display_name}</strong>? Their reports
                        will be unlinked.
                      </p>
                      <div className="family-card__confirm-actions">
                        <button
                          className="family-card__confirm-yes"
                          onClick={() => handleDelete(m.id)}
                          disabled={deleting}
                          type="button"
                        >
                          {deleting ? "Deleting..." : "Yes, Delete"}
                        </button>
                        <button
                          className="family-card__confirm-no"
                          onClick={() => setDeleteId(null)}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!loading && members.length >= 10 && (
            <p className="family-page__limit">
              Maximum of 10 family members reached.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
