"use client";

/* eslint-disable @next/next/no-img-element */

interface AvatarProps {
  avatarUrl?: string | null;
  displayName?: string | null;
  size?: "sm" | "md" | "lg";
}

/**
 * Reusable avatar component with image or initials fallback.
 * Sizes: sm=32px, md=48px, lg=80px.
 */
export default function Avatar({
  avatarUrl,
  displayName,
  size = "md",
}: AvatarProps) {
  const initials = getInitials(displayName);

  return (
    <div className={`avatar avatar--${size}`} aria-label="User avatar">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName ? `${displayName}'s avatar` : "User avatar"}
          className="avatar__image"
        />
      ) : (
        <span className="avatar__initials">{initials}</span>
      )}
    </div>
  );
}

/** Extract up to 2 initials from a display name. */
export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
