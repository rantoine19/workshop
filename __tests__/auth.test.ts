import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase client
const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockGetUser = vi.fn();
const mockExchangeCodeForSession = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      getUser: mockGetUser,
    },
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: mockGetUser,
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  }),
}));

describe("Auth - Supabase integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signUp", () => {
    it("calls supabase.auth.signUp with email and password", async () => {
      mockSignUp.mockResolvedValue({
        data: { user: { id: "123", email: "test@example.com" }, session: {} },
        error: null,
      });

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const result = await supabase.auth.signUp({
        email: "test@example.com",
        password: "secure123",
      });

      expect(mockSignUp).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "secure123",
      });
      expect(result.error).toBeNull();
      expect(result.data.user?.email).toBe("test@example.com");
    });

    it("returns error for invalid signup", async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Password should be at least 6 characters" },
      });

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const result = await supabase.auth.signUp({
        email: "test@example.com",
        password: "123",
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain("6 characters");
    });
  });

  describe("signInWithPassword", () => {
    it("calls supabase.auth.signInWithPassword with credentials", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: "123", email: "test@example.com" }, session: {} },
        error: null,
      });

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const result = await supabase.auth.signInWithPassword({
        email: "test@example.com",
        password: "secure123",
      });

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "secure123",
      });
      expect(result.error).toBeNull();
      expect(result.data.user?.email).toBe("test@example.com");
    });

    it("returns error for invalid credentials", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      });

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const result = await supabase.auth.signInWithPassword({
        email: "test@example.com",
        password: "wrong",
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Invalid login credentials");
    });
  });

  describe("auth callback", () => {
    it("exchanges code for session", async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: {} },
        error: null,
      });

      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const result = await supabase.auth.exchangeCodeForSession("test-code");

      expect(mockExchangeCodeForSession).toHaveBeenCalledWith("test-code");
      expect(result.error).toBeNull();
    });
  });

  describe("getUser", () => {
    it("returns user when authenticated", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "123", email: "test@example.com" } },
        error: null,
      });

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const result = await supabase.auth.getUser();

      expect(result.data.user).not.toBeNull();
      expect(result.data.user?.email).toBe("test@example.com");
    });

    it("returns null user when unauthenticated", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const result = await supabase.auth.getUser();

      expect(result.data.user).toBeNull();
    });
  });
});
