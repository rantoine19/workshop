"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import NavHeader from "@/components/ui/NavHeader";

interface FamilyMember {
  id: string;
  display_name: string;
}

export default function AddInsuranceCardPage() {
  const router = useRouter();
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [providerName, setProviderName] = useState("");
  const [planType, setPlanType] = useState("");
  const [memberId, setMemberId] = useState("");
  const [groupNumber, setGroupNumber] = useState("");
  const [rxBin, setRxBin] = useState("");
  const [rxPcn, setRxPcn] = useState("");
  const [rxGroup, setRxGroup] = useState("");
  const [policyHolderName, setPolicyHolderName] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [familyMemberId, setFamilyMemberId] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFamilyMembers = useCallback(async () => {
    try {
      const response = await fetch("/api/family-members");
      if (!response.ok) return;
      const data = await response.json();
      setFamilyMembers(data.family_members || []);
    } catch {
      // Silent
    }
  }, []);

  useEffect(() => {
    fetchFamilyMembers();
  }, [fetchFamilyMembers]);

  const validatePhoto = (file: File): string | null => {
    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return "Invalid file type. Accepted: PNG, JPEG, WebP";
    }
    if (file.size > 5 * 1024 * 1024) {
      return "File too large. Maximum size is 5MB";
    }
    return null;
  };

  const handlePhotoChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    side: "front" | "back"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validatePhoto(file);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    if (side === "front") {
      setFrontFile(file);
    } else {
      setBackFile(file);
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (side === "front") {
        setFrontPreview(reader.result as string);
      } else {
        setBackPreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (side: "front" | "back") => {
    if (side === "front") {
      setFrontFile(null);
      setFrontPreview(null);
      if (frontInputRef.current) frontInputRef.current.value = "";
    } else {
      setBackFile(null);
      setBackPreview(null);
      if (backInputRef.current) backInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerName.trim()) {
      setError("Provider name is required");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/insurance-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_name: providerName.trim(),
          plan_type: planType.trim() || null,
          member_id: memberId.trim() || null,
          group_number: groupNumber.trim() || null,
          rx_bin: rxBin.trim() || null,
          rx_pcn: rxPcn.trim() || null,
          rx_group: rxGroup.trim() || null,
          policy_holder_name: policyHolderName.trim() || null,
          effective_date: effectiveDate || null,
          customer_service_phone: phone.trim() || null,
          notes: notes.trim() || null,
          family_member_id: familyMemberId || null,
          is_primary: isPrimary,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create insurance card");
      }

      const { insurance_card } = await response.json();

      // Upload photos if provided
      const uploadPromises: Promise<unknown>[] = [];
      if (frontFile && insurance_card.id) {
        const fd = new FormData();
        fd.append("file", frontFile);
        fd.append("side", "front");
        uploadPromises.push(
          fetch(`/api/insurance-cards/${insurance_card.id}/photo`, {
            method: "POST",
            body: fd,
          })
        );
      }
      if (backFile && insurance_card.id) {
        const fd = new FormData();
        fd.append("file", backFile);
        fd.append("side", "back");
        uploadPromises.push(
          fetch(`/api/insurance-cards/${insurance_card.id}/photo`, {
            method: "POST",
            body: fd,
          })
        );
      }
      await Promise.all(uploadPromises);

      router.push("/insurance");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create insurance card"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="insurance-page">
      <div className="insurance-page__header">
        <NavHeader backHref="/insurance" backLabel="Insurance" />
        <h1>Add Insurance Card</h1>
      </div>

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

      <form onSubmit={handleSubmit} className="insurance-form">
        <div className="insurance-form__field">
          <label htmlFor="ic-provider">
            Provider Name <span className="insurance-form__required">*</span>
          </label>
          <input
            id="ic-provider"
            type="text"
            value={providerName}
            onChange={(e) => setProviderName(e.target.value)}
            placeholder="e.g., Blue Cross Blue Shield"
            maxLength={200}
            required
          />
        </div>

        <div className="insurance-form__row">
          <div className="insurance-form__field">
            <label htmlFor="ic-plan-type">Plan Type</label>
            <input
              id="ic-plan-type"
              type="text"
              value={planType}
              onChange={(e) => setPlanType(e.target.value)}
              placeholder="e.g., PPO, HMO, Medicare Part B"
              maxLength={100}
            />
          </div>
          <div className="insurance-form__field">
            <label htmlFor="ic-member-id">Member ID</label>
            <input
              id="ic-member-id"
              type="text"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              placeholder="Member ID"
              maxLength={100}
            />
          </div>
        </div>

        <div className="insurance-form__row">
          <div className="insurance-form__field">
            <label htmlFor="ic-group">Group Number</label>
            <input
              id="ic-group"
              type="text"
              value={groupNumber}
              onChange={(e) => setGroupNumber(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="insurance-form__field">
            <label htmlFor="ic-policy-holder">Policy Holder Name</label>
            <input
              id="ic-policy-holder"
              type="text"
              value={policyHolderName}
              onChange={(e) => setPolicyHolderName(e.target.value)}
              placeholder="If not yourself"
              maxLength={200}
            />
          </div>
        </div>

        <fieldset className="insurance-form__fieldset">
          <legend>Pharmacy / RX (optional)</legend>
          <div className="insurance-form__row">
            <div className="insurance-form__field">
              <label htmlFor="ic-rxbin">RX BIN</label>
              <input
                id="ic-rxbin"
                type="text"
                value={rxBin}
                onChange={(e) => setRxBin(e.target.value)}
                maxLength={50}
              />
            </div>
            <div className="insurance-form__field">
              <label htmlFor="ic-rxpcn">RX PCN</label>
              <input
                id="ic-rxpcn"
                type="text"
                value={rxPcn}
                onChange={(e) => setRxPcn(e.target.value)}
                maxLength={50}
              />
            </div>
            <div className="insurance-form__field">
              <label htmlFor="ic-rxgroup">RX Group</label>
              <input
                id="ic-rxgroup"
                type="text"
                value={rxGroup}
                onChange={(e) => setRxGroup(e.target.value)}
                maxLength={50}
              />
            </div>
          </div>
        </fieldset>

        <div className="insurance-form__row">
          <div className="insurance-form__field">
            <label htmlFor="ic-effective">Effective Date</label>
            <input
              id="ic-effective"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>
          <div className="insurance-form__field">
            <label htmlFor="ic-phone">Customer Service Phone</label>
            <input
              id="ic-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="1-800-555-0100"
              maxLength={50}
            />
          </div>
        </div>

        {familyMembers.length > 0 && (
          <div className="insurance-form__field">
            <label htmlFor="ic-family">For</label>
            <select
              id="ic-family"
              value={familyMemberId}
              onChange={(e) => setFamilyMemberId(e.target.value)}
            >
              <option value="">Myself</option>
              {familyMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="insurance-form__field">
          <label>Primary or Secondary</label>
          <div className="insurance-form__radio-group">
            <label className="insurance-form__radio">
              <input
                type="radio"
                name="is_primary"
                checked={isPrimary}
                onChange={() => setIsPrimary(true)}
              />
              <span>Primary</span>
            </label>
            <label className="insurance-form__radio">
              <input
                type="radio"
                name="is_primary"
                checked={!isPrimary}
                onChange={() => setIsPrimary(false)}
              />
              <span>Secondary</span>
            </label>
          </div>
        </div>

        <div className="insurance-form__field">
          <label htmlFor="ic-notes">Notes</label>
          <textarea
            id="ic-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes..."
            maxLength={2000}
            rows={3}
          />
        </div>

        <div className="insurance-form__field">
          <label>Card Photos</label>
          <div className="insurance-form__photo-upload">
            <PhotoUploadBox
              side="front"
              preview={frontPreview}
              inputRef={frontInputRef}
              onChange={(e) => handlePhotoChange(e, "front")}
              onRemove={() => handleRemovePhoto("front")}
            />
            <PhotoUploadBox
              side="back"
              preview={backPreview}
              inputRef={backInputRef}
              onChange={(e) => handlePhotoChange(e, "back")}
              onRemove={() => handleRemovePhoto("back")}
            />
          </div>
        </div>

        <div className="insurance-form__actions">
          <button
            type="button"
            onClick={() => router.push("/insurance")}
            className="insurance-form__cancel"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="insurance-form__submit"
            disabled={saving}
          >
            {saving ? "Saving..." : "Add Insurance Card"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PhotoUploadBox({
  side,
  preview,
  inputRef,
  onChange,
  onRemove,
}: {
  side: "front" | "back";
  preview: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  const inputId = `ic-photo-${side}`;
  const label = side === "front" ? "Front" : "Back";
  return (
    <div className="insurance-form__photo-box">
      <span className="insurance-form__photo-title">{label}</span>
      {preview ? (
        <div className="insurance-form__photo-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={`Insurance card ${label.toLowerCase()} preview`} />
          <button
            type="button"
            onClick={onRemove}
            className="insurance-form__photo-remove"
          >
            Remove
          </button>
        </div>
      ) : (
        <label htmlFor={inputId} className="insurance-form__photo-label">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span>Take or upload {label.toLowerCase()} photo</span>
          <span className="insurance-form__photo-hint">
            PNG, JPEG, or WebP. Max 5MB.
          </span>
        </label>
      )}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        capture="environment"
        onChange={onChange}
        className="insurance-form__photo-input"
      />
    </div>
  );
}
