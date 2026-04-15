"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import NavHeader from "@/components/ui/NavHeader";

interface InsuranceCard {
  id: string;
  family_member_id: string | null;
  provider_name: string;
  plan_type: string | null;
  member_id: string | null;
  group_number: string | null;
  rx_bin: string | null;
  rx_pcn: string | null;
  rx_group: string | null;
  policy_holder_name: string | null;
  effective_date: string | null;
  customer_service_phone: string | null;
  notes: string | null;
  front_photo_path: string | null;
  back_photo_path: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

interface FamilyMember {
  id: string;
  display_name: string;
}

export default function InsuranceCardsPage() {
  const [cards, setCards] = useState<InsuranceCard[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("self");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string | null>>({});

  const fetchFamilyMembers = useCallback(async () => {
    try {
      const response = await fetch("/api/family-members");
      if (!response.ok) return;
      const data = await response.json();
      setFamilyMembers(data.family_members || []);
    } catch {
      // Silent — family members are optional
    }
  }, []);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        activeFilter === "self"
          ? "/api/insurance-cards"
          : `/api/insurance-cards?family_member_id=${activeFilter}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to load insurance cards");
      const data = await response.json();
      const loadedCards: InsuranceCard[] = data.insurance_cards || [];
      setCards(loadedCards);

      // Fetch signed URLs for front photos in parallel
      const urlMap: Record<string, string | null> = {};
      await Promise.all(
        loadedCards.map(async (card) => {
          if (card.front_photo_path) {
            try {
              const res = await fetch(`/api/insurance-cards/${card.id}/photo-url`);
              if (res.ok) {
                const json = await res.json();
                urlMap[card.id] = json.front_url ?? null;
              }
            } catch {
              urlMap[card.id] = null;
            }
          }
        })
      );
      setPhotoUrls(urlMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cards");
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchFamilyMembers();
  }, [fetchFamilyMembers]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/insurance-cards/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete insurance card");
      setDeleteConfirm(null);
      await fetchCards();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="insurance-page insurance-page--loading">
        <div className="insurance-page__spinner" aria-label="Loading insurance cards" />
        <p>Loading your insurance cards...</p>
      </div>
    );
  }

  return (
    <div className="insurance-page">
      <div className="insurance-page__header">
        <NavHeader backLabel="Dashboard" />
        <div className="insurance-page__title-row">
          <div>
            <h1>Insurance Cards</h1>
            <p>Keep your insurance info on hand for every doctor visit.</p>
          </div>
          <Link href="/insurance/add" className="insurance-page__add-btn">
            + Add Insurance Card
          </Link>
        </div>
      </div>

      {familyMembers.length > 0 && (
        <div className="insurance-page__filter">
          <label htmlFor="family-filter">Show cards for:</label>
          <select
            id="family-filter"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
          >
            <option value="self">Myself</option>
            {familyMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="insurance-page__error" role="alert">
          {error}
          <button
            onClick={() => setError(null)}
            className="insurance-page__dismiss"
          >
            Dismiss
          </button>
        </div>
      )}

      {cards.length === 0 ? (
        <div className="insurance-page__empty">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-gray-400)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
          <h2>No insurance cards yet</h2>
          <p>
            Add your first insurance card so you always have it when you need
            it.
          </p>
          <Link href="/insurance/add" className="insurance-page__add-btn">
            + Add Insurance Card
          </Link>
        </div>
      ) : (
        <div className="insurance-page__list">
          {cards.map((card) => (
            <InsuranceCardItem
              key={card.id}
              card={card}
              frontUrl={photoUrls[card.id] ?? null}
              onDelete={() => setDeleteConfirm(card.id)}
            />
          ))}
        </div>
      )}

      {deleteConfirm && (
        <div
          className="insurance-page__overlay"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="insurance-page__dialog"
            role="alertdialog"
            aria-labelledby="ic-delete-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="ic-delete-title">Delete Insurance Card?</h3>
            <p>
              This will permanently remove this insurance card and its photos.
              This cannot be undone.
            </p>
            <div className="insurance-page__dialog-actions">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="insurance-page__dialog-cancel"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="insurance-page__dialog-delete"
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

function InsuranceCardItem({
  card,
  frontUrl,
  onDelete,
}: {
  card: InsuranceCard;
  frontUrl: string | null;
  onDelete: () => void;
}) {
  return (
    <div className="insurance-card">
      <div className="insurance-card__photo">
        {frontUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={frontUrl} alt={`${card.provider_name} card front`} />
        ) : (
          <div className="insurance-card__photo-placeholder">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            <span>No photo</span>
          </div>
        )}
      </div>
      <div className="insurance-card__info">
        <div className="insurance-card__header-row">
          <h3 className="insurance-card__provider">{card.provider_name}</h3>
          <span
            className={`insurance-card__badge insurance-card__badge--${
              card.is_primary ? "primary" : "secondary"
            }`}
          >
            {card.is_primary ? "Primary" : "Secondary"}
          </span>
        </div>
        {card.plan_type && (
          <p className="insurance-card__plan">{card.plan_type}</p>
        )}
        {card.member_id && (
          <p className="insurance-card__detail">
            <span className="insurance-card__label">Member ID</span>
            <span className="insurance-card__value">{card.member_id}</span>
          </p>
        )}
        {card.group_number && (
          <p className="insurance-card__detail">
            <span className="insurance-card__label">Group</span>
            <span className="insurance-card__value">{card.group_number}</span>
          </p>
        )}
        <div className="insurance-card__actions">
          <Link
            href={`/insurance/${card.id}/show`}
            className="insurance-card__action insurance-card__action--primary"
          >
            Quick Show
          </Link>
          <Link
            href={`/insurance/${card.id}/edit`}
            className="insurance-card__action"
          >
            Edit
          </Link>
          <button
            onClick={onDelete}
            className="insurance-card__action insurance-card__action--danger"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
