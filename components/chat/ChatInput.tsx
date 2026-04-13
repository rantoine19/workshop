"use client";

import { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  onFileUpload?: (file: File) => void;
  uploadingFile?: string | null;
  uploadProgress?: "uploading" | "parsing" | null;
  isListening?: boolean;
  isVoiceSupported?: boolean;
  voiceTranscript?: string;
  voiceError?: string | null;
  onToggleListening?: () => void;
  onResetTranscript?: () => void;
}

export function ChatInput({
  onSend,
  disabled,
  onFileUpload,
  uploadingFile,
  uploadProgress,
  isListening = false,
  isVoiceSupported = false,
  voiceTranscript = "",
  voiceError,
  onToggleListening,
  onResetTranscript,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fill input with voice transcript as it arrives
  useEffect(() => {
    if (voiceTranscript) {
      setInput(voiceTranscript);
      // Auto-resize textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
      }
    }
  }, [voiceTranscript]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input);
    setInput("");
    onResetTranscript?.();
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }

  function handleAttachClick() {
    fileInputRef.current?.click();
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleRemoveFile() {
    setSelectedFile(null);
  }

  function handleUploadFile() {
    if (selectedFile && onFileUpload) {
      onFileUpload(selectedFile);
      setSelectedFile(null);
    }
  }

  return (
    <div className="chat-input__wrapper">
      {/* Listening indicator */}
      {isListening && (
        <div className="chat-input__listening" role="status" aria-live="polite">
          Listening...
        </div>
      )}

      {/* Voice error */}
      {voiceError && (
        <div className="chat-input__voice-error" role="alert">
          {voiceError}
        </div>
      )}

      {/* File preview bar */}
      {selectedFile && !uploadProgress && (
        <div className="chat-input__file-preview">
          <span className="chat-input__file-preview-name">{selectedFile.name}</span>
          <button
            type="button"
            className="chat-input__file-preview-upload"
            onClick={handleUploadFile}
            aria-label="Upload file"
          >
            Upload
          </button>
          <button
            type="button"
            className="chat-input__file-preview-remove"
            onClick={handleRemoveFile}
            aria-label="Remove file"
          >
            x
          </button>
        </div>
      )}

      {/* Upload progress indicator */}
      {uploadProgress && uploadingFile && (
        <div className="chat-input__upload-progress">
          <span className="chat-input__upload-progress-spinner" aria-hidden="true"></span>
          <span>
            {uploadProgress === "uploading"
              ? `Uploading ${uploadingFile}...`
              : `Analyzing ${uploadingFile}...`}
          </span>
        </div>
      )}

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <button
          type="button"
          className="chat-input__attach-btn"
          onClick={handleAttachClick}
          disabled={disabled || !!uploadProgress}
          aria-label="Attach file"
          title="Upload a medical report"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleFileSelect}
          className="chat-input__file-hidden"
          aria-hidden="true"
          tabIndex={-1}
        />

        {isVoiceSupported && onToggleListening && (
          <button
            type="button"
            className={`chat-input__mic-btn${isListening ? " chat-input__mic-btn--recording" : ""}`}
            onClick={onToggleListening}
            disabled={disabled || !!uploadProgress}
            aria-label={isListening ? "Stop recording" : "Start voice input"}
            title={isListening ? "Stop recording" : "Voice input"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
        )}

        <textarea
          ref={textareaRef}
          className="chat-input"
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your health data..."
          disabled={disabled}
          rows={1}
          aria-label="Chat message"
        />
        <button
          type="submit"
          className="chat-send-button"
          disabled={!input.trim() || disabled}
          aria-label="Send message"
        >
          Send
        </button>
      </form>
    </div>
  );
}
