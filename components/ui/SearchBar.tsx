"use client";

import { useState, useCallback, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";

interface SearchBarProps {
  defaultValue?: string;
  placeholder?: string;
  onSubmit?: (query: string) => void;
}

export default function SearchBar({
  defaultValue = "",
  placeholder = "Search reports, biomarkers...",
  onSubmit,
}: SearchBarProps) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  // Sync if defaultValue changes (e.g., user navigates with new query)
  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed.length < 2) return;

      if (onSubmit) {
        onSubmit(trimmed);
      } else {
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      }
    },
    [value, onSubmit, router]
  );

  const handleClear = useCallback(() => {
    setValue("");
  }, []);

  return (
    <form
      className="search-bar"
      role="search"
      onSubmit={handleSubmit}
      aria-label="Search"
    >
      <span className="search-bar__icon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </span>
      <input
        type="search"
        className="search-bar__input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Search query"
      />
      {value.length > 0 && (
        <button
          type="button"
          className="search-bar__clear"
          onClick={handleClear}
          aria-label="Clear search"
        >
          <svg
            viewBox="0 0 20 20"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M6 6l8 8M14 6l-8 8" />
          </svg>
        </button>
      )}
    </form>
  );
}
