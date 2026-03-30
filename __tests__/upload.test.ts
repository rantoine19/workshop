import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateFile,
  getFileExtension,
  getFileType,
} from "@/lib/supabase/storage";

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
  randomUUID: () => "test-uuid-1234",
});

function createMockFile(
  name: string,
  size: number,
  type: string
): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

describe("File upload validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateFile", () => {
    it("accepts PDF files under 10MB", () => {
      const file = createMockFile("report.pdf", 5 * 1024 * 1024, "application/pdf");
      const result = validateFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("accepts PNG files under 10MB", () => {
      const file = createMockFile("scan.png", 2 * 1024 * 1024, "image/png");
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it("accepts JPG files under 10MB", () => {
      const file = createMockFile("scan.jpg", 2 * 1024 * 1024, "image/jpeg");
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it("rejects invalid file types with 400", () => {
      const file = createMockFile("doc.txt", 1024, "text/plain");
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toContain("Invalid file type");
    });

    it("rejects files over 10MB with 413", () => {
      const file = createMockFile(
        "huge.pdf",
        11 * 1024 * 1024,
        "application/pdf"
      );
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(413);
      expect(result.error).toContain("too large");
    });

    it("rejects executable files", () => {
      const file = createMockFile("malware.exe", 1024, "application/x-msdownload");
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(400);
    });
  });

  describe("getFileExtension", () => {
    it("returns pdf for PDF files", () => {
      const file = createMockFile("report.pdf", 1024, "application/pdf");
      expect(getFileExtension(file)).toBe("pdf");
    });

    it("returns png for PNG files", () => {
      const file = createMockFile("scan.png", 1024, "image/png");
      expect(getFileExtension(file)).toBe("png");
    });

    it("returns jpg for JPEG files", () => {
      const file = createMockFile("scan.jpg", 1024, "image/jpeg");
      expect(getFileExtension(file)).toBe("jpg");
    });
  });

  describe("getFileType", () => {
    it("returns pdf for PDF files", () => {
      const file = createMockFile("report.pdf", 1024, "application/pdf");
      expect(getFileType(file)).toBe("pdf");
    });

    it("returns image for PNG files", () => {
      const file = createMockFile("scan.png", 1024, "image/png");
      expect(getFileType(file)).toBe("image");
    });

    it("returns image for JPEG files", () => {
      const file = createMockFile("scan.jpg", 1024, "image/jpeg");
      expect(getFileType(file)).toBe("image");
    });
  });
});
