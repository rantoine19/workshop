"use client";

import { useState, useEffect, useCallback } from "react";
import NavHeader from "@/components/ui/NavHeader";

interface CustomRange {
  id: string;
  biomarker_name: string;
  green_low: number | null;
  green_high: number | null;
  yellow_low: number | null;
  yellow_high: number | null;
  red_low: number | null;
  red_high: number | null;
  direction: "lower-is-better" | "higher-is-better" | "range";
  source: string | null;
}

interface EditState {
  biomarker_name: string;
  green_low: string;
  green_high: string;
  yellow_low: string;
  yellow_high: string;
  red_low: string;
  red_high: string;
  direction: "lower-is-better" | "higher-is-better" | "range";
  source: string;
}

const EMPTY_EDIT: Omit<EditState, "biomarker_name"> = {
  green_low: "",
  green_high: "",
  yellow_low: "",
  yellow_high: "",
  red_low: "",
  red_high: "",
  direction: "range",
  source: "",
};

export default function CustomReferenceRangesPage() {
  const [ranges, setRanges] = useState<CustomRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchRanges = useCallback(async () => {
    try {
      const response = await fetch("/api/profile/reference-ranges");
      if (!response.ok) throw new Error("Failed to load custom ranges");
      const data = await response.json();
      setRanges(data.ranges || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ranges");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRanges();
  }, [fetchRanges]);

  const handleEdit = (range: CustomRange) => {
    setEditing({
      biomarker_name: range.biomarker_name,
      green_low: range.green_low?.toString() ?? "",
      green_high: range.green_high?.toString() ?? "",
      yellow_low: range.yellow_low?.toString() ?? "",
      yellow_high: range.yellow_high?.toString() ?? "",
      red_low: range.red_low?.toString() ?? "",
      red_high: range.red_high?.toString() ?? "",
      direction: range.direction,
      source: range.source ?? "",
    });
    setError(null);
    setSuccess(null);
  };

  const handleAddNew = () => {
    setEditing({
      biomarker_name: "",
      ...EMPTY_EDIT,
    });
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setEditing(null);
  };

  const parseNum = (val: string): number | null => {
    if (val.trim() === "") return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.biomarker_name.trim()) {
      setError("Biomarker name is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/profile/reference-ranges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          biomarker_name: editing.biomarker_name.trim(),
          green_low: parseNum(editing.green_low),
          green_high: parseNum(editing.green_high),
          yellow_low: parseNum(editing.yellow_low),
          yellow_high: parseNum(editing.yellow_high),
          red_low: parseNum(editing.red_low),
          red_high: parseNum(editing.red_high),
          direction: editing.direction,
          source: editing.source.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save custom range");
      }

      setEditing(null);
      setSuccess("Custom range saved successfully");
      setTimeout(() => setSuccess(null), 3000);
      await fetchRanges();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (biomarkerName: string) => {
    setDeleting(biomarkerName);
    setError(null);

    try {
      const response = await fetch("/api/profile/reference-ranges", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ biomarker_name: biomarkerName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete custom range");
      }

      setSuccess("Custom range removed. Default range will be used.");
      setTimeout(() => setSuccess(null), 3000);
      await fetchRanges();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="custom-ranges custom-ranges--loading">
        <div className="custom-ranges__spinner" aria-label="Loading custom ranges" />
        <p>Loading your custom ranges...</p>
      </div>
    );
  }

  return (
    <div className="custom-ranges">
      <div className="custom-ranges__header">
        <NavHeader backHref="/profile" backLabel="Profile" />
        <h1>Custom Reference Ranges</h1>
        <p>
          Set personalized reference ranges from your doctor. Custom ranges
          override the default population-based thresholds when flagging your
          biomarker results.
        </p>
      </div>

      {error && (
        <div className="custom-ranges__error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="custom-ranges__success" role="status">
          {success}
        </div>
      )}

      {/* Editing / Adding form */}
      {editing && (
        <div className="custom-ranges__form">
          <h2>{editing.biomarker_name ? `Edit: ${editing.biomarker_name}` : "Add Custom Range"}</h2>

          <div className="custom-ranges__field">
            <label htmlFor="crr-biomarker">Biomarker Name</label>
            <input
              id="crr-biomarker"
              type="text"
              value={editing.biomarker_name}
              onChange={(e) =>
                setEditing({ ...editing, biomarker_name: e.target.value })
              }
              placeholder="e.g., Glucose (Fasting)"
              disabled={ranges.some(
                (r) => r.biomarker_name === editing.biomarker_name
              )}
            />
          </div>

          <div className="custom-ranges__field">
            <label htmlFor="crr-direction">Direction</label>
            <select
              id="crr-direction"
              value={editing.direction}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  direction: e.target.value as EditState["direction"],
                })
              }
            >
              <option value="range">Range (normal band)</option>
              <option value="lower-is-better">Lower is better</option>
              <option value="higher-is-better">Higher is better</option>
            </select>
          </div>

          <fieldset className="custom-ranges__thresholds">
            <legend>Green (Normal)</legend>
            <div className="custom-ranges__threshold-row">
              <div className="custom-ranges__field">
                <label htmlFor="crr-green-low">Low</label>
                <input
                  id="crr-green-low"
                  type="number"
                  step="any"
                  value={editing.green_low}
                  onChange={(e) =>
                    setEditing({ ...editing, green_low: e.target.value })
                  }
                  placeholder="Low bound"
                />
              </div>
              <div className="custom-ranges__field">
                <label htmlFor="crr-green-high">High</label>
                <input
                  id="crr-green-high"
                  type="number"
                  step="any"
                  value={editing.green_high}
                  onChange={(e) =>
                    setEditing({ ...editing, green_high: e.target.value })
                  }
                  placeholder="High bound"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="custom-ranges__thresholds">
            <legend>Yellow (Borderline)</legend>
            <div className="custom-ranges__threshold-row">
              <div className="custom-ranges__field">
                <label htmlFor="crr-yellow-low">Low</label>
                <input
                  id="crr-yellow-low"
                  type="number"
                  step="any"
                  value={editing.yellow_low}
                  onChange={(e) =>
                    setEditing({ ...editing, yellow_low: e.target.value })
                  }
                  placeholder="Low bound"
                />
              </div>
              <div className="custom-ranges__field">
                <label htmlFor="crr-yellow-high">High</label>
                <input
                  id="crr-yellow-high"
                  type="number"
                  step="any"
                  value={editing.yellow_high}
                  onChange={(e) =>
                    setEditing({ ...editing, yellow_high: e.target.value })
                  }
                  placeholder="High bound"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="custom-ranges__thresholds">
            <legend>Red (High Risk)</legend>
            <div className="custom-ranges__threshold-row">
              <div className="custom-ranges__field">
                <label htmlFor="crr-red-low">Low</label>
                <input
                  id="crr-red-low"
                  type="number"
                  step="any"
                  value={editing.red_low}
                  onChange={(e) =>
                    setEditing({ ...editing, red_low: e.target.value })
                  }
                  placeholder="Low bound"
                />
              </div>
              <div className="custom-ranges__field">
                <label htmlFor="crr-red-high">High</label>
                <input
                  id="crr-red-high"
                  type="number"
                  step="any"
                  value={editing.red_high}
                  onChange={(e) =>
                    setEditing({ ...editing, red_high: e.target.value })
                  }
                  placeholder="High bound"
                />
              </div>
            </div>
          </fieldset>

          <div className="custom-ranges__field">
            <label htmlFor="crr-source">Source (optional)</label>
            <input
              id="crr-source"
              type="text"
              value={editing.source}
              onChange={(e) =>
                setEditing({ ...editing, source: e.target.value })
              }
              placeholder="e.g., Dr. Smith, Endocrinologist"
            />
          </div>

          <div className="custom-ranges__form-actions">
            <button
              type="button"
              className="custom-ranges__save-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Range"}
            </button>
            <button
              type="button"
              className="custom-ranges__cancel-btn"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Range list */}
      <div className="custom-ranges__list">
        <div className="custom-ranges__list-header">
          <h2>Your Custom Ranges ({ranges.length})</h2>
          {!editing && (
            <button
              type="button"
              className="custom-ranges__add-btn"
              onClick={handleAddNew}
            >
              + Add Custom Range
            </button>
          )}
        </div>

        {ranges.length === 0 ? (
          <div className="custom-ranges__empty">
            <p>
              No custom ranges set. Default population-based ranges are being
              used for all biomarkers. Click &quot;Add Custom Range&quot; to set
              personalized thresholds from your doctor.
            </p>
          </div>
        ) : (
          <div className="custom-ranges__table-wrapper">
            <table className="custom-ranges__table">
              <thead>
                <tr>
                  <th>Biomarker</th>
                  <th>Green</th>
                  <th>Yellow</th>
                  <th>Direction</th>
                  <th>Source</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ranges.map((range) => (
                  <tr key={range.id}>
                    <td className="custom-ranges__biomarker-name">
                      {range.biomarker_name}
                      <span className="custom-ranges__custom-badge">
                        Custom
                      </span>
                    </td>
                    <td>
                      {formatBound(range.green_low)} &ndash;{" "}
                      {formatBound(range.green_high)}
                    </td>
                    <td>
                      {formatBound(range.yellow_low)} &ndash;{" "}
                      {formatBound(range.yellow_high)}
                    </td>
                    <td>{formatDirection(range.direction)}</td>
                    <td>{range.source || "---"}</td>
                    <td className="custom-ranges__actions">
                      <button
                        type="button"
                        className="custom-ranges__edit-btn"
                        onClick={() => handleEdit(range)}
                        disabled={!!editing}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="custom-ranges__delete-btn"
                        onClick={() => handleDelete(range.biomarker_name)}
                        disabled={deleting === range.biomarker_name}
                      >
                        {deleting === range.biomarker_name
                          ? "Removing..."
                          : "Reset to Default"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function formatBound(val: number | null): string {
  if (val === null || val === undefined) return "---";
  return String(val);
}

function formatDirection(dir: string): string {
  switch (dir) {
    case "lower-is-better":
      return "Lower better";
    case "higher-is-better":
      return "Higher better";
    case "range":
      return "Range";
    default:
      return dir;
  }
}
