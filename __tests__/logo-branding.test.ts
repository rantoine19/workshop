import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// ── Logo Component ───────────────────────────────────────────────────

describe("Logo Component", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("renders full variant with correct alt text", async () => {
    const { default: Logo } = await import("@/components/ui/Logo");
    render(React.createElement(Logo, { variant: "full", size: "md" }));

    const img = screen.getByAltText("HealthChat AI");
    expect(img).toBeDefined();
    expect(img.getAttribute("src")).toContain("logo.svg");
  });

  it("renders icon variant", async () => {
    const { default: Logo } = await import("@/components/ui/Logo");
    render(React.createElement(Logo, { variant: "icon", size: "md" }));

    const img = screen.getByAltText("HealthChat AI");
    expect(img).toBeDefined();
    expect(img.getAttribute("src")).toContain("logo-icon.svg");
  });

  it("renders as link when linkTo is provided", async () => {
    const { default: Logo } = await import("@/components/ui/Logo");
    render(
      React.createElement(Logo, {
        variant: "full",
        size: "md",
        linkTo: "/dashboard",
      })
    );

    const link = screen.getByRole("link");
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("/dashboard");
  });

  it("renders without link when linkTo is not provided", async () => {
    const { default: Logo } = await import("@/components/ui/Logo");
    render(React.createElement(Logo, { variant: "full", size: "md" }));

    const links = screen.queryAllByRole("link");
    expect(links).toHaveLength(0);
  });

  it("supports sm, md, and lg sizes", async () => {
    const { default: Logo } = await import("@/components/ui/Logo");

    const { unmount: u1 } = render(
      React.createElement(Logo, { variant: "full", size: "sm" })
    );
    let img = screen.getByAltText("HealthChat AI");
    expect(img.getAttribute("width")).toBe("140");
    expect(img.getAttribute("height")).toBe("28");
    u1();

    const { unmount: u2 } = render(
      React.createElement(Logo, { variant: "full", size: "lg" })
    );
    img = screen.getByAltText("HealthChat AI");
    expect(img.getAttribute("width")).toBe("240");
    expect(img.getAttribute("height")).toBe("48");
    u2();
  });
});

// ── Layout Metadata ──────────────────────────────────────────────────

describe("Root Layout Metadata", () => {
  it("has HealthChat AI title and description", async () => {
    const mod = await import("@/app/layout");
    const metadata = mod.metadata;

    expect(metadata.title).toBe("HealthChat AI");
    expect(metadata.description).toContain("lab results");
    expect(metadata.description).toContain("plain language");
  });

  it("has favicon configured", async () => {
    const mod = await import("@/app/layout");
    const metadata = mod.metadata;
    const icons = metadata.icons as { icon: string };

    expect(icons.icon).toBe("/favicon.svg");
  });
});

// ── Auth Pages Include Logo ──────────────────────────────────────────

describe("Auth Pages — Logo", () => {
  beforeEach(() => {
    vi.resetModules();

    vi.doMock("@/lib/supabase/client", () => ({
      createClient: () => ({
        auth: {
          signInWithPassword: async () => ({ error: null }),
          signUp: async () => ({ error: null }),
        },
      }),
    }));

    vi.doMock("next/navigation", () => ({
      useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
    }));
  });

  it("login page includes logo", async () => {
    const { default: LoginPage } = await import("@/app/auth/login/page");
    render(React.createElement(LoginPage));

    expect(screen.getByAltText("HealthChat AI")).toBeDefined();
    expect(screen.getByText("Welcome Back")).toBeDefined();
  });

  it("signup page includes logo", async () => {
    const { default: SignupPage } = await import("@/app/auth/signup/page");
    render(React.createElement(SignupPage));

    expect(screen.getByAltText("HealthChat AI")).toBeDefined();
    expect(screen.getByText("Create Account")).toBeDefined();
  });
});
