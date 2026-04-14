"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useActiveProfile } from "@/hooks/useActiveProfile";

/**
 * ProfileSwitcher — "Viewing as" dropdown for switching between
 * the user's own profile and family member profiles.
 */
export default function ProfileSwitcher() {
  const {
    activeProfileId,
    activeProfileName,
    setActiveProfile,
    familyMembers,
    loading,
  } = useActiveProfile();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  if (loading) return null;

  // Don't show switcher if no family members
  if (familyMembers.length === 0) {
    return (
      <div className="profile-switcher">
        <Link href="/family" className="profile-switcher__add-link">
          Add Family
        </Link>
      </div>
    );
  }

  function handleSelect(id: string | null) {
    setActiveProfile(id);
    setOpen(false);
    // Reload dashboard data
    window.location.reload();
  }

  const initials = (name: string) =>
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="profile-switcher" ref={ref}>
      <button
        className="profile-switcher__current"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        type="button"
      >
        <span className="profile-switcher__avatar">
          {initials(activeProfileName)}
        </span>
        <span className="profile-switcher__name">
          {activeProfileId ? `Viewing: ${activeProfileName}` : "You"}
        </span>
        <svg
          className={`profile-switcher__chevron${open ? " profile-switcher__chevron--open" : ""}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <ul className="profile-switcher__dropdown" role="listbox">
          <li
            className={`profile-switcher__item${!activeProfileId ? " profile-switcher__item--active" : ""}`}
            role="option"
            aria-selected={!activeProfileId}
            onClick={() => handleSelect(null)}
          >
            <span className="profile-switcher__item-avatar">
              {initials("You")}
            </span>
            <span className="profile-switcher__item-info">
              <span className="profile-switcher__item-name">You</span>
              <span className="profile-switcher__item-label">Your profile</span>
            </span>
          </li>

          {familyMembers.map((m) => (
            <li
              key={m.id}
              className={`profile-switcher__item${activeProfileId === m.id ? " profile-switcher__item--active" : ""}`}
              role="option"
              aria-selected={activeProfileId === m.id}
              onClick={() => handleSelect(m.id)}
            >
              <span className="profile-switcher__item-avatar">
                {initials(m.display_name)}
              </span>
              <span className="profile-switcher__item-info">
                <span className="profile-switcher__item-name">
                  {m.display_name}
                </span>
                {m.relationship && (
                  <span className="profile-switcher__item-label">
                    {m.relationship}
                  </span>
                )}
              </span>
            </li>
          ))}

          <li className="profile-switcher__divider" />
          <li className="profile-switcher__manage">
            <Link href="/family" onClick={() => setOpen(false)}>
              Manage Family
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
