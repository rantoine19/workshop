import { describe, it, expect, vi } from "vitest";
import { parseSentryEnvelope } from "@/app/api/error-events/parse";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

// Import route AFTER mock setup
const { POST } = await import("@/app/api/error-events/route");

const VALID_ENVELOPE = [
  '{"event_id":"abc123","sent_at":"2024-01-01T00:00:00Z"}',
  '{"type":"event","length":200}',
  JSON.stringify({
    exception: {
      values: [
        {
          type: "TypeError",
          value: "Cannot read properties of null",
          stacktrace: {
            frames: [
              {
                filename: "app/page.tsx",
                lineno: 42,
                function: "render",
                context_line: "const x = obj.value;",
              },
            ],
          },
        },
      ],
    },
    timestamp: 1704067200,
    environment: "production",
    server_name: "web-1",
  }),
].join("\n");

const NO_EXCEPTION_ENVELOPE = [
  '{"event_id":"abc123","sent_at":"2024-01-01T00:00:00Z"}',
  '{"type":"session","length":50}',
  '{"sid":"sess123","status":"ok"}',
].join("\n");

describe("parseSentryEnvelope", () => {
  it("extracts error info from a valid envelope", () => {
    const result = parseSentryEnvelope(VALID_ENVELOPE);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("TypeError");
    expect(result!.value).toBe("Cannot read properties of null");
    expect(result!.environment).toBe("production");
    expect(result!.timestamp).toBe("2024-01-01T00:00:00.000Z");
    expect(result!.stacktrace).toContain("app/page.tsx");
  });

  it("returns null for envelopes without exception data", () => {
    const result = parseSentryEnvelope(NO_EXCEPTION_ENVELOPE);
    expect(result).toBeNull();
  });

  it("returns null for garbage input", () => {
    const result = parseSentryEnvelope("not a valid envelope at all");
    expect(result).toBeNull();
  });
});

describe("POST /api/error-events", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const request = new NextRequest("http://localhost:3000/api/error-events", {
      method: "POST",
      body: VALID_ENVELOPE,
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 200 for a valid envelope", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const request = new NextRequest("http://localhost:3000/api/error-events", {
      method: "POST",
      body: VALID_ENVELOPE,
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("id");
  });

  it("returns 200 for garbage input", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const request = new NextRequest("http://localhost:3000/api/error-events", {
      method: "POST",
      body: "garbage",
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
