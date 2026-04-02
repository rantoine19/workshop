"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import Link from "next/link";
import NavHeader from "@/components/ui/NavHeader";

const ALLOWED_EXTENSIONS = ".pdf,.png,.jpg,.jpeg";
const MAX_SIZE_MB = 10;

type UploadStage = "idle" | "uploading" | "parsing" | "complete" | "error";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<UploadStage>("idle");
  const [reportId, setReportId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setStage("idle");
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Client-side validation
    const validTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
    ];
    if (!validTypes.includes(selected.type)) {
      setError("Please select a PDF, PNG, or JPG file.");
      return;
    }

    if (selected.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${MAX_SIZE_MB}MB.`);
      return;
    }

    setFile(selected);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setError(null);
    setStage("uploading");

    // Verify we're still authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Step 1: Upload
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        setError(uploadData.error || "Upload failed. Please try again.");
        setStage("error");
        return;
      }

      const newReportId = uploadData.report_id;
      setReportId(newReportId);

      // Step 2: Auto-parse
      setStage("parsing");

      const parseResponse = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: newReportId }),
      });

      const parseData = await parseResponse.json();

      if (!parseResponse.ok) {
        setError(
          parseData.error ||
            "Analysis failed. Your report was uploaded — you can retry analysis from the report page."
        );
        setStage("error");
        return;
      }

      // Step 3: Success — redirect to results
      setStage("complete");
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Brief delay so user sees the success state before redirect
      setTimeout(() => {
        router.push(`/reports/${newReportId}`);
      }, 1000);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setStage("error");
    }
  }

  async function handleRetryParse() {
    if (!reportId) return;

    setError(null);
    setStage("parsing");

    try {
      const parseResponse = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: reportId }),
      });

      const parseData = await parseResponse.json();

      if (!parseResponse.ok) {
        setError(parseData.error || "Analysis failed. Please try again.");
        setStage("error");
        return;
      }

      setStage("complete");
      setTimeout(() => {
        router.push(`/reports/${reportId}`);
      }, 1000);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setStage("error");
    }
  }

  const isProcessing = stage === "uploading" || stage === "parsing";

  return (
    <div className="upload-container">
      <NavHeader backLabel="Dashboard" />
      <h1>Upload Medical Report</h1>
      <p>
        Upload your lab results or medical reports. We accept PDF, PNG, and JPG
        files up to 10MB.
      </p>

      {/* Progress indicator */}
      {isProcessing && (
        <div className="upload-progress" role="status">
          <div className="upload-progress__steps">
            <div
              className={`upload-progress__step ${
                stage === "uploading"
                  ? "upload-progress__step--active"
                  : "upload-progress__step--done"
              }`}
            >
              <span className="upload-progress__step-number">1</span>
              <span className="upload-progress__step-label">Uploading</span>
            </div>
            <div className="upload-progress__connector" />
            <div
              className={`upload-progress__step ${
                stage === "parsing"
                  ? "upload-progress__step--active"
                  : ""
              }`}
            >
              <span className="upload-progress__step-number">2</span>
              <span className="upload-progress__step-label">Analyzing</span>
            </div>
            <div className="upload-progress__connector" />
            <div className="upload-progress__step">
              <span className="upload-progress__step-number">3</span>
              <span className="upload-progress__step-label">Done</span>
            </div>
          </div>
          <p className="upload-progress__message">
            {stage === "uploading"
              ? "Uploading your file..."
              : "Analyzing your report with AI... This may take a minute."}
          </p>
        </div>
      )}

      {/* Success state */}
      {stage === "complete" && (
        <div className="upload-success" role="status">
          <h2>Analysis complete!</h2>
          <p>Redirecting to your results...</p>
        </div>
      )}

      {/* Upload form — hidden during processing/complete */}
      {!isProcessing && stage !== "complete" && (
        <form onSubmit={handleUpload}>
          <div className="upload-area">
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_EXTENSIONS}
              onChange={handleFileSelect}
              id="file-input"
            />
            <label htmlFor="file-input" className="upload-label">
              {file ? file.name : "Choose a file or drag it here"}
            </label>
            {file && (
              <p className="file-info">
                {file.name} ({(file.size / 1024 / 1024).toFixed(1)}MB)
              </p>
            )}
          </div>

          {error && (
            <div className="error-message" role="alert">
              {error}
              {reportId && stage === "error" && (
                <button
                  type="button"
                  onClick={handleRetryParse}
                  className="upload-retry"
                >
                  Retry Analysis
                </button>
              )}
            </div>
          )}

          <button type="submit" disabled={!file || isProcessing}>
            Upload Report
          </button>
        </form>
      )}

      <p className="upload-note">
        Your files are encrypted and stored securely in compliance with HIPAA
        requirements. Only you can access your uploaded reports.
      </p>
    </div>
  );
}
