import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";
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

// ── Upload Page — Auto-Parse Flow ────────────────────────────────────

describe("Upload Page — auto-parse flow", () => {
  const mockFetch = vi.fn();
  const mockPush = vi.fn();

  // Profile API response for NavHeader avatar fetch
  const profileResponse = {
    ok: true,
    json: async () => ({
      profile: {
        id: "user-1",
        display_name: null,
        avatar_url: null,
        updated_at: null,
      },
    }),
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // Wrap mockFetch to auto-handle NavHeader's /api/profile calls
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (input: string | URL | Request, ...args: unknown[]) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (url === "/api/profile") {
          return Promise.resolve(profileResponse as Response);
        }
        return mockFetch(input, ...args);
      }
    );

    vi.doMock("next/navigation", () => ({
      useRouter: () => ({ push: mockPush }),
      usePathname: () => "/upload",
    }));

    vi.doMock("@/lib/supabase/client", () => ({
      createClient: () => ({
        auth: {
          getUser: async () => ({
            data: { user: { id: "user-1", email: "test@test.com" } },
          }),
        },
      }),
    }));
  });

  it("exports a default page component", async () => {
    const mod = await import("@/app/upload/page");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });

  it("renders upload form with file input and submit button", async () => {
    const { default: UploadPage } = await import("@/app/upload/page");
    render(React.createElement(UploadPage));

    expect(screen.getByText("Upload Medical Report")).toBeDefined();
    expect(screen.getByText("Upload Report")).toBeDefined();
    expect(screen.getByLabelText("Choose a file or drag it here")).toBeDefined();
  });

  it("shows progress steps during upload and parse", async () => {
    // Upload succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ report_id: "report-abc" }),
    });
    // Parse stays pending
    mockFetch.mockReturnValueOnce(new Promise(() => {}));

    const { default: UploadPage } = await import("@/app/upload/page");
    render(React.createElement(UploadPage));

    // Simulate file selection via fireEvent
    const fileInput = screen.getByLabelText("Choose a file or drag it here");
    const testFile = new File(["test"], "lab.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    // Submit form
    fireEvent.click(screen.getByText("Upload Report"));

    // After upload succeeds, should show "Analyzing" step
    await waitFor(() => {
      expect(
        screen.getByText(
          "Analyzing your report with AI... This may take a minute."
        )
      ).toBeDefined();
    });

    // Verify parse was called with the report_id
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const parseCall = mockFetch.mock.calls[1];
    expect(parseCall[0]).toBe("/api/parse");
    expect(parseCall[1].method).toBe("POST");
    const parseBody = JSON.parse(parseCall[1].body);
    expect(parseBody.report_id).toBe("report-abc");
  });

  it("shows success state after parse completes", async () => {
    // Upload succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ report_id: "report-abc" }),
    });
    // Parse succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ parsed_result_id: "parsed-1" }),
    });

    const { default: UploadPage } = await import("@/app/upload/page");
    render(React.createElement(UploadPage));

    // Simulate file selection
    const fileInput = screen.getByLabelText("Choose a file or drag it here");
    const testFile = new File(["test"], "lab.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    // Submit form
    fireEvent.click(screen.getByText("Upload Report"));

    await waitFor(() => {
      expect(screen.getByText("Analysis complete!")).toBeDefined();
    });

    expect(
      screen.getByText("Redirecting to your results...")
    ).toBeDefined();

    // Verify both fetch calls were made (upload + parse)
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("shows error with retry when parse fails", async () => {
    // Upload succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ report_id: "report-abc" }),
    });
    // Parse fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Parse failed" }),
    });

    const { default: UploadPage } = await import("@/app/upload/page");
    render(React.createElement(UploadPage));

    const fileInput = screen.getByLabelText("Choose a file or drag it here");
    const testFile = new File(["test"], "lab.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    fireEvent.click(screen.getByText("Upload Report"));

    await waitFor(() => {
      expect(screen.getByText("Retry Analysis")).toBeDefined();
    });
  });

  it("has a back to dashboard link", async () => {
    const { default: UploadPage } = await import("@/app/upload/page");
    render(React.createElement(UploadPage));

    // NavHeader provides navigation — check for "Dashboard" link
    expect(screen.getByText("Dashboard")).toBeDefined();
    // NavHeader also provides Upload, Chat, Profile links
    expect(screen.getByText("Upload")).toBeDefined();
    expect(screen.getByText("Chat")).toBeDefined();
  });
});
