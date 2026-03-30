"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";

const ALLOWED_EXTENSIONS = ".pdf,.png,.jpg,.jpeg";
const MAX_SIZE_MB = 10;

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setSuccess(null);
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
    setSuccess(null);
    setUploading(true);

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
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Upload failed. Please try again.");
        setUploading(false);
        return;
      }

      setSuccess(`Report uploaded successfully! ID: ${data.report_id}`);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="upload-container">
      <h1>Upload Medical Report</h1>
      <p>
        Upload your lab results or medical reports. We accept PDF, PNG, and JPG
        files up to 10MB.
      </p>

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

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <button type="submit" disabled={!file || uploading}>
          {uploading ? "Uploading..." : "Upload Report"}
        </button>
      </form>

      <p className="upload-note">
        Your files are encrypted and stored securely in compliance with HIPAA
        requirements. Only you can access your uploaded reports.
      </p>
    </div>
  );
}
