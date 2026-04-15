"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface InsuranceCard {
  id: string;
  provider_name: string;
  plan_type: string | null;
  member_id: string | null;
  group_number: string | null;
  policy_holder_name: string | null;
  customer_service_phone: string | null;
  is_primary: boolean;
  front_photo_path: string | null;
  back_photo_path: string | null;
}

export default function InsuranceShowPage() {
  const router = useRouter();
  const params = useParams();
  const cardId = params.id as string;

  const [card, setCard] = useState<InsuranceCard | null>(null);
  const [frontUrl, setFrontUrl] = useState<string | null>(null);
  const [backUrl, setBackUrl] = useState<string | null>(null);
  const [showingBack, setShowingBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/insurance-cards/${cardId}`);
      if (!res.ok) throw new Error("Insurance card not found");
      const { insurance_card } = await res.json();
      setCard(insurance_card);

      if (insurance_card.front_photo_path || insurance_card.back_photo_path) {
        const urlRes = await fetch(`/api/insurance-cards/${cardId}/photo-url`);
        if (urlRes.ok) {
          const urlData = await urlRes.json();
          setFrontUrl(urlData.front_url ?? null);
          setBackUrl(urlData.back_url ?? null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load card");
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="insurance-show insurance-show--loading">
        <div className="insurance-show__spinner" aria-label="Loading insurance card" />
        <p>Loading card...</p>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="insurance-show insurance-show--error">
        <p>{error || "Insurance card not found"}</p>
        <button onClick={() => router.push("/insurance")}>Back to cards</button>
      </div>
    );
  }

  const currentUrl = showingBack ? backUrl : frontUrl;
  const canFlip = Boolean(backUrl);

  return (
    <div className="insurance-show">
      <header className="insurance-show__header">
        <Link href="/insurance" className="insurance-show__back">
          {"< Back"}
        </Link>
        <div className="insurance-show__title">
          <h1>{card.provider_name}</h1>
          <span
            className={`insurance-show__badge insurance-show__badge--${
              card.is_primary ? "primary" : "secondary"
            }`}
          >
            {card.is_primary ? "Primary" : "Secondary"}
          </span>
        </div>
      </header>

      <div className="insurance-show__photo-wrapper">
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentUrl}
            alt={`${card.provider_name} card ${showingBack ? "back" : "front"}`}
            className="insurance-show__photo"
            onClick={() => canFlip && setShowingBack(!showingBack)}
          />
        ) : (
          <div className="insurance-show__photo-missing">
            <p>No {showingBack ? "back" : "front"} photo uploaded.</p>
          </div>
        )}
        {canFlip && (
          <button
            type="button"
            className="insurance-show__flip-btn"
            onClick={() => setShowingBack(!showingBack)}
          >
            {showingBack ? "Show Front" : "Show Back"}
          </button>
        )}
      </div>

      <div className="insurance-show__info">
        {card.plan_type && (
          <div className="insurance-show__info-row">
            <span className="insurance-show__info-label">Plan</span>
            <span className="insurance-show__info-value">{card.plan_type}</span>
          </div>
        )}
        {card.member_id && (
          <div className="insurance-show__info-row">
            <span className="insurance-show__info-label">Member ID</span>
            <span className="insurance-show__info-value insurance-show__info-value--big">
              {card.member_id}
            </span>
          </div>
        )}
        {card.group_number && (
          <div className="insurance-show__info-row">
            <span className="insurance-show__info-label">Group</span>
            <span className="insurance-show__info-value insurance-show__info-value--big">
              {card.group_number}
            </span>
          </div>
        )}
        {card.policy_holder_name && (
          <div className="insurance-show__info-row">
            <span className="insurance-show__info-label">Policy Holder</span>
            <span className="insurance-show__info-value">
              {card.policy_holder_name}
            </span>
          </div>
        )}
        {card.customer_service_phone && (
          <div className="insurance-show__info-row">
            <span className="insurance-show__info-label">Customer Service</span>
            <span className="insurance-show__info-value">
              {card.customer_service_phone}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
