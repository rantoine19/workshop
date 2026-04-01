"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import QuestionList from "@/components/doctor/QuestionList";

interface Question {
  id?: string;
  question: string;
  category: "clarifying" | "follow_up" | "lifestyle" | "medication";
  priority: "high" | "medium" | "low";
}

const STORAGE_KEY_PREFIX = "doctor-prep-saved-";

export default function DoctorPrepPage() {
  const params = useParams();
  const reportId = params.id as string;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [disclaimer, setDisclaimer] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Check if questions are already saved in session storage
  useEffect(() => {
    if (reportId) {
      const stored = sessionStorage.getItem(
        `${STORAGE_KEY_PREFIX}${reportId}`
      );
      if (stored) {
        setSaved(true);
      }
    }
  }, [reportId]);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // First, get the parsed result ID for this report
      const reportRes = await fetch(`/api/reports/${reportId}`);
      if (!reportRes.ok) {
        if (reportRes.status === 401) {
          throw new Error("Please log in to view this page");
        }
        if (reportRes.status === 404) {
          throw new Error("Report not found");
        }
        throw new Error("Failed to load report");
      }

      const reportData = await reportRes.json();
      const parsedResultId = reportData.report?.parsed_result_id
        || reportData.parsed_result_id;

      if (!parsedResultId) {
        throw new Error(
          "This report has not been parsed yet. Please wait for parsing to complete."
        );
      }

      // Fetch (or generate) doctor questions
      const questionsRes = await fetch("/api/doctor-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parsed_result_id: parsedResultId }),
      });

      if (!questionsRes.ok) {
        const data = await questionsRes.json();
        throw new Error(data.error || "Failed to generate questions");
      }

      const data = await questionsRes.json();
      setQuestions(data.questions || []);
      setDisclaimer(
        data.disclaimer ||
          "These questions are suggestions to help guide your conversation with your doctor."
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load questions"
      );
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handlePrint = () => {
    window.print();
  };

  const handleSave = () => {
    sessionStorage.setItem(
      `${STORAGE_KEY_PREFIX}${reportId}`,
      JSON.stringify(questions)
    );
    setSaved(true);
  };

  const handleUnsave = () => {
    sessionStorage.removeItem(`${STORAGE_KEY_PREFIX}${reportId}`);
    setSaved(false);
  };

  if (loading) {
    return (
      <div className="doctor-prep doctor-prep--loading">
        <div
          className="doctor-prep__spinner"
          aria-label="Generating questions"
          role="status"
        />
        <p>Generating questions for your doctor visit...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="doctor-prep doctor-prep--error">
        <p className="doctor-prep__error" role="alert">
          {error}
        </p>
        <div className="doctor-prep__actions">
          <button onClick={fetchQuestions} className="doctor-prep__retry">
            Try Again
          </button>
          <Link href="/dashboard" className="doctor-prep__back">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="doctor-prep">
      <div className="doctor-prep__header">
        <Link href="/dashboard" className="doctor-prep__back">
          Back to Dashboard
        </Link>
        <h1>Doctor Visit Prep</h1>
        <p>
          Questions to discuss with your healthcare provider based on your lab
          results.
        </p>
      </div>

      {disclaimer && (
        <div className="doctor-prep__disclaimer" role="alert">
          {disclaimer}
        </div>
      )}

      <QuestionList questions={questions} />

      <div className="doctor-prep__footer no-print">
        <button onClick={handlePrint} className="doctor-prep__print">
          Print Questions
        </button>
        {saved ? (
          <button onClick={handleUnsave} className="doctor-prep__save doctor-prep__save--saved">
            Saved
          </button>
        ) : (
          <button onClick={handleSave} className="doctor-prep__save">
            Save for Later
          </button>
        )}
        <Link href="/dashboard" className="doctor-prep__back-link">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
