import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// ── Avatar Component ───────────────────────────────────────────────

describe("Avatar Component", () => {
  it("exports a default component and getInitials helper", async () => {
    const mod = await import("@/components/ui/Avatar");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
    expect(mod.getInitials).toBeDefined();
    expect(typeof mod.getInitials).toBe("function");
  });

  it("renders initials when no avatar URL is provided", async () => {
    const { default: Avatar } = await import("@/components/ui/Avatar");
    render(React.createElement(Avatar, { displayName: "Jane Doe", size: "md" }));
    expect(screen.getByText("JD")).toBeDefined();
  });

  it("renders single initial for single-word name", async () => {
    const { default: Avatar } = await import("@/components/ui/Avatar");
    render(React.createElement(Avatar, { displayName: "Alice", size: "md" }));
    expect(screen.getByText("A")).toBeDefined();
  });

  it("renders '?' when no display name is provided", async () => {
    const { default: Avatar } = await import("@/components/ui/Avatar");
    render(React.createElement(Avatar, { displayName: null, size: "md" }));
    expect(screen.getByText("?")).toBeDefined();
  });

  it("renders image when avatar URL is provided", async () => {
    const { default: Avatar } = await import("@/components/ui/Avatar");
    render(
      React.createElement(Avatar, {
        avatarUrl: "https://example.com/avatar.png",
        displayName: "Jane Doe",
        size: "lg",
      })
    );
    const img = screen.getByRole("img");
    expect(img).toBeDefined();
    expect(img.getAttribute("src")).toBe("https://example.com/avatar.png");
  });

  it("applies size class correctly", async () => {
    const { default: Avatar } = await import("@/components/ui/Avatar");
    const { container } = render(
      React.createElement(Avatar, { displayName: "Test", size: "sm" })
    );
    const el = container.querySelector(".avatar--sm");
    expect(el).not.toBeNull();
  });
});

// ── getInitials Helper ─────────────────────────────────────────────

describe("getInitials", () => {
  it("returns first and last initials for multi-word name", async () => {
    const { getInitials } = await import("@/components/ui/Avatar");
    expect(getInitials("John Smith")).toBe("JS");
  });

  it("returns single initial for single name", async () => {
    const { getInitials } = await import("@/components/ui/Avatar");
    expect(getInitials("Alice")).toBe("A");
  });

  it("returns ? for null", async () => {
    const { getInitials } = await import("@/components/ui/Avatar");
    expect(getInitials(null)).toBe("?");
  });

  it("returns ? for empty string", async () => {
    const { getInitials } = await import("@/components/ui/Avatar");
    expect(getInitials("")).toBe("?");
  });

  it("returns ? for whitespace-only string", async () => {
    const { getInitials } = await import("@/components/ui/Avatar");
    expect(getInitials("   ")).toBe("?");
  });

  it("handles three-word names (first + last)", async () => {
    const { getInitials } = await import("@/components/ui/Avatar");
    expect(getInitials("Mary Jane Watson")).toBe("MW");
  });

  it("uppercases initials", async () => {
    const { getInitials } = await import("@/components/ui/Avatar");
    expect(getInitials("jane doe")).toBe("JD");
  });
});

// ── Avatar API Route ───────────────────────────────────────────────

describe("Avatar API Route", () => {
  it("exports POST and DELETE handlers", async () => {
    const mod = await import("@/app/api/profile/avatar/route");
    expect(mod.POST).toBeDefined();
    expect(mod.DELETE).toBeDefined();
    expect(typeof mod.POST).toBe("function");
    expect(typeof mod.DELETE).toBe("function");
  });
});

describe("Avatar API — POST", () => {
  let mockGetUser: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;
  let mockStorage: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();
    mockGetUser = vi.fn();
    mockFrom = vi.fn();
    mockStorage = {
      from: vi.fn(),
    };

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn().mockResolvedValue({
        auth: { getUser: mockGetUser },
        from: mockFrom,
        storage: mockStorage,
      }),
    }));
  });

  function createUploadRequest(
    fileName: string,
    fileSize: number,
    fileType: string
  ): Request {
    const buffer = new ArrayBuffer(fileSize);
    const file = new File([buffer], fileName, { type: fileType });
    const formData = new FormData();
    formData.append("file", file);
    return new Request("http://localhost:3000/api/profile/avatar", {
      method: "POST",
      body: formData,
    });
  }

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import("@/app/api/profile/avatar/route");
    const response = await POST(createUploadRequest("avatar.png", 1024, "image/png"));

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid request body (no formData)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { POST } = await import("@/app/api/profile/avatar/route");
    const response = await POST(
      new Request("http://localhost:3000/api/profile/avatar", {
        method: "POST",
        body: "not form data",
        headers: { "Content-Type": "text/plain" },
      })
    );

    expect(response.status).toBe(400);
  });

  it("returns 200 with avatar_url on successful upload", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    // Mock storage list (no existing files)
    const listMock = vi.fn().mockResolvedValue({ data: [], error: null });
    // Mock storage upload
    const uploadMock = vi.fn().mockResolvedValue({ error: null });
    // Mock storage getPublicUrl
    const getPublicUrlMock = vi.fn().mockReturnValue({
      data: { publicUrl: "https://storage.example.com/avatars/user-1/avatar.png" },
    });

    mockStorage.from = vi.fn().mockReturnValue({
      list: listMock,
      remove: vi.fn(),
      upload: uploadMock,
      getPublicUrl: getPublicUrlMock,
    });

    // Mock profile upsert
    mockFrom.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    });

    const { POST } = await import("@/app/api/profile/avatar/route");

    // Create request with mocked formData to avoid JSDOM serialization issues
    const mockFile = new File([new ArrayBuffer(1024)], "avatar.png", { type: "image/png" });
    const mockFormData = new FormData();
    mockFormData.append("file", mockFile);
    const request = new Request("http://localhost:3000/api/profile/avatar", {
      method: "POST",
    });
    // Override formData method to return our mock
    vi.spyOn(request, "formData").mockResolvedValue(mockFormData);

    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.avatar_url).toBe("https://storage.example.com/avatars/user-1/avatar.png");
  });

  it("deletes existing avatar before uploading new one", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const removeMock = vi.fn().mockResolvedValue({ error: null });
    const listMock = vi.fn().mockResolvedValue({
      data: [{ name: "avatar.jpg" }],
      error: null,
    });

    mockStorage.from = vi.fn().mockReturnValue({
      list: listMock,
      remove: removeMock,
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: "https://storage.example.com/avatars/user-1/avatar.png" },
      }),
    });

    mockFrom.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    });

    const { POST } = await import("@/app/api/profile/avatar/route");

    // Create request with mocked formData
    const mockFile = new File([new ArrayBuffer(1024)], "avatar.png", { type: "image/png" });
    const mockFormData = new FormData();
    mockFormData.append("file", mockFile);
    const request = new Request("http://localhost:3000/api/profile/avatar", {
      method: "POST",
    });
    vi.spyOn(request, "formData").mockResolvedValue(mockFormData);

    await POST(request);

    expect(removeMock).toHaveBeenCalledWith(["user-1/avatar.jpg"]);
  });
});

describe("Avatar API — DELETE", () => {
  let mockGetUser: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;
  let mockStorage: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();
    mockGetUser = vi.fn();
    mockFrom = vi.fn();
    mockStorage = {
      from: vi.fn(),
    };

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn().mockResolvedValue({
        auth: { getUser: mockGetUser },
        from: mockFrom,
        storage: mockStorage,
      }),
    }));
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { DELETE } = await import("@/app/api/profile/avatar/route");
    const response = await DELETE();

    expect(response.status).toBe(401);
  });

  it("returns 200 and clears avatar_url on successful delete", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    mockStorage.from = vi.fn().mockReturnValue({
      list: vi.fn().mockResolvedValue({
        data: [{ name: "avatar.png" }],
        error: null,
      }),
      remove: vi.fn().mockResolvedValue({ error: null }),
    });

    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const { DELETE } = await import("@/app/api/profile/avatar/route");
    const response = await DELETE();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.avatar_url).toBeNull();
  });
});
