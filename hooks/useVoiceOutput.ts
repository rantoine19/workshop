"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const STORAGE_KEY = "healthchat-voice-autospeak";

/**
 * Strip markdown formatting and emojis from text for cleaner TTS output.
 */
function stripForSpeech(text: string): string {
  return (
    text
      // Remove markdown headers
      .replace(/#{1,6}\s+/g, "")
      // Remove bold/italic markers
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
      .replace(/_{1,3}([^_]+)_{1,3}/g, "$1")
      // Remove inline code
      .replace(/`([^`]+)`/g, "$1")
      // Remove links — keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove images
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      // Remove bullet points
      .replace(/^[\s]*[-*+]\s+/gm, "")
      // Remove numbered lists prefix
      .replace(/^[\s]*\d+\.\s+/gm, "")
      // Remove blockquotes
      .replace(/^>\s+/gm, "")
      // Remove horizontal rules
      .replace(/^[-*_]{3,}$/gm, "")
      // Remove emojis (Unicode emoji ranges)
      .replace(
        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{FE0F}]/gu,
        ""
      )
      // Collapse multiple spaces/newlines
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
  );
}

export interface UseVoiceOutputReturn {
  isSpeaking: boolean;
  isSupported: boolean;
  speak: (text: string) => void;
  stop: () => void;
  autoSpeak: boolean;
  toggleAutoSpeak: () => void;
}

export function useVoiceOutput(): UseVoiceOutputReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isMountedRef = useRef(true);

  // Check support and load preference on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsSupported("speechSynthesis" in window);
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "true") {
          setAutoSpeak(true);
        }
      } catch {
        // localStorage may be unavailable
      }
    }
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    if (isMountedRef.current) {
      setIsSpeaking(false);
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        return;
      }

      // Stop any current speech
      stop();

      const cleaned = stripForSpeech(text);
      if (!cleaned) return;

      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.rate = 0.9;
      utterance.lang = "en-US";

      // Try to pick a natural-sounding voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("natural")
      );
      const english = voices.find((v) => v.lang.startsWith("en"));
      if (preferred) {
        utterance.voice = preferred;
      } else if (english) {
        utterance.voice = english;
      }

      utterance.onstart = () => {
        if (isMountedRef.current) setIsSpeaking(true);
      };
      utterance.onend = () => {
        if (isMountedRef.current) setIsSpeaking(false);
        utteranceRef.current = null;
      };
      utterance.onerror = () => {
        if (isMountedRef.current) setIsSpeaking(false);
        utteranceRef.current = null;
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [stop]
  );

  const toggleAutoSpeak = useCallback(() => {
    setAutoSpeak((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // localStorage may be unavailable
      }
      return next;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    isSpeaking,
    isSupported,
    speak,
    stop,
    autoSpeak,
    toggleAutoSpeak,
  };
}
