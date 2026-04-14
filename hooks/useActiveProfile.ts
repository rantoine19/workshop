"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "activeProfileId";

interface FamilyMember {
  id: string;
  display_name: string;
  relationship: string | null;
}

interface ActiveProfileState {
  activeProfileId: string | null;
  activeProfileName: string;
  setActiveProfile: (id: string | null) => void;
  isViewingSelf: boolean;
  familyMembers: FamilyMember[];
  loading: boolean;
}

/**
 * Hook to manage the active family profile.
 * Reads/writes `activeProfileId` from localStorage.
 * null = viewing as self.
 */
export function useActiveProfile(): ActiveProfileState {
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Read from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored !== "null") {
      setActiveProfileIdState(stored);
    }
  }, []);

  // Fetch family members
  useEffect(() => {
    async function fetchMembers() {
      try {
        const res = await fetch("/api/family-members");
        if (res.ok) {
          const data = await res.json();
          setFamilyMembers(data.members ?? []);

          // If stored profile doesn't exist in the list, reset to self
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored && stored !== "null") {
            const exists = (data.members ?? []).some(
              (m: FamilyMember) => m.id === stored
            );
            if (!exists) {
              localStorage.removeItem(STORAGE_KEY);
              setActiveProfileIdState(null);
            }
          }
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }
    fetchMembers();
  }, []);

  const setActiveProfile = useCallback((id: string | null) => {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setActiveProfileIdState(id);

    // Dispatch custom event so other components can react
    window.dispatchEvent(new CustomEvent("activeProfileChanged", { detail: { id } }));
  }, []);

  const activeMember = familyMembers.find((m) => m.id === activeProfileId);
  const activeProfileName = activeMember ? activeMember.display_name : "You";
  const isViewingSelf = !activeProfileId;

  return {
    activeProfileId,
    activeProfileName,
    setActiveProfile,
    isViewingSelf,
    familyMembers,
    loading,
  };
}
