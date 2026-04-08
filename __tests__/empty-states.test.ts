import { describe, it, expect } from "vitest";

describe("Empty States — helpful CTAs (#111)", () => {
  describe("ReportList empty state", () => {
    it("contains an SVG illustration for empty state", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.resolve(
        __dirname,
        "../components/reports/ReportList.tsx"
      );
      const source = fs.readFileSync(filePath, "utf-8");

      expect(source).toContain("empty-state__icon");
      expect(source).toContain("<svg");
    });

    it("shows 'No reports yet' heading", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.resolve(
        __dirname,
        "../components/reports/ReportList.tsx"
      );
      const source = fs.readFileSync(filePath, "utf-8");

      expect(source).toContain("No reports yet");
      expect(source).toContain("empty-state__heading");
    });

    it("shows helpful subtext about uploading", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.resolve(
        __dirname,
        "../components/reports/ReportList.tsx"
      );
      const source = fs.readFileSync(filePath, "utf-8");

      expect(source).toContain("Upload your first medical report");
      expect(source).toContain("empty-state__text");
    });

    it("has a CTA button linking to /upload", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.resolve(
        __dirname,
        "../components/reports/ReportList.tsx"
      );
      const source = fs.readFileSync(filePath, "utf-8");

      expect(source).toContain("empty-state__cta");
      expect(source).toContain('href="/upload"');
      expect(source).toContain("Upload Report");
    });
  });

  describe("ChatSidebar empty state", () => {
    it("contains an SVG chat bubble icon", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.resolve(
        __dirname,
        "../components/chat/ChatSidebar.tsx"
      );
      const source = fs.readFileSync(filePath, "utf-8");

      expect(source).toContain("chat-sidebar__empty-icon");
      expect(source).toContain("<svg");
    });

    it("shows 'No conversations yet' heading", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.resolve(
        __dirname,
        "../components/chat/ChatSidebar.tsx"
      );
      const source = fs.readFileSync(filePath, "utf-8");

      expect(source).toContain("No conversations yet");
      expect(source).toContain("chat-sidebar__empty-heading");
    });

    it("shows subtext encouraging chat", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.resolve(
        __dirname,
        "../components/chat/ChatSidebar.tsx"
      );
      const source = fs.readFileSync(filePath, "utf-8");

      expect(source).toContain("Start a chat to ask about your health");
      expect(source).toContain("chat-sidebar__empty-text");
    });
  });

  describe("ChatWindow welcome state with suggestion chips", () => {
    it("uses BotAvatar in the welcome state", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.resolve(
        __dirname,
        "../components/chat/ChatWindow.tsx"
      );
      const source = fs.readFileSync(filePath, "utf-8");

      expect(source).toContain("chat-welcome__avatar");
      expect(source).toContain("<BotAvatar");
    });

    it("shows friendly greeting heading", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.resolve(
        __dirname,
        "../components/chat/ChatWindow.tsx"
      );
      const source = fs.readFileSync(filePath, "utf-8");

      expect(source).toContain("your HealthChat guide");
    });

    it("renders clickable suggestion chips", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.resolve(
        __dirname,
        "../components/chat/ChatWindow.tsx"
      );
      const source = fs.readFileSync(filePath, "utf-8");

      expect(source).toContain("chat-suggestions__chip");
      expect(source).toContain("What do my lab results mean?");
      expect(source).toContain("Help me prepare for my doctor visit");
      expect(source).toContain("Explain my cholesterol levels");
    });

    it("suggestion chips call sendMessage on click", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.resolve(
        __dirname,
        "../components/chat/ChatWindow.tsx"
      );
      const source = fs.readFileSync(filePath, "utf-8");

      // Each chip should trigger sendMessage with its text
      expect(source).toContain('sendMessage("What do my lab results mean?")');
      expect(source).toContain('sendMessage("Help me prepare for my doctor visit")');
      expect(source).toContain('sendMessage("Explain my cholesterol levels")');
    });
  });

  describe("Compare page empty state", () => {
    it("shows empty state when fewer than 2 reports", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.resolve(
        __dirname,
        "../app/reports/compare/page.tsx"
      );
      const source = fs.readFileSync(filePath, "utf-8");

      expect(source).toContain("reports.length < 2");
      expect(source).toContain("compare-page__empty");
    });

    it("contains an SVG illustration of two documents", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.resolve(
        __dirname,
        "../app/reports/compare/page.tsx"
      );
      const source = fs.readFileSync(filePath, "utf-8");

      expect(source).toContain("empty-state__icon");
      expect(source).toContain("<svg");
    });

    it("shows helpful message and upload CTA", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.resolve(
        __dirname,
        "../app/reports/compare/page.tsx"
      );
      const source = fs.readFileSync(filePath, "utf-8");

      expect(source).toContain("Upload at least 2 reports");
      expect(source).toContain("empty-state__cta");
      expect(source).toContain('href="/upload"');
    });
  });

  describe("Dashboard welcome banner", () => {
    it("WelcomeBanner component exists", async () => {
      const mod = await import("@/app/dashboard/welcome-banner");
      expect(mod.WelcomeBanner).toBeDefined();
      expect(typeof mod.WelcomeBanner).toBe("function");
    });

    it("dashboard page redirects new users to onboarding", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.resolve(
        __dirname,
        "../app/dashboard/page.tsx"
      );
      const source = fs.readFileSync(filePath, "utf-8");

      // Onboarding wizard replaces WelcomeBanner for new users
      expect(source).toContain("onboarding");
      expect(source).toContain("display_name");
    });

    it("WelcomeBanner shows encouraging text and CTA", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.resolve(
        __dirname,
        "../app/dashboard/welcome-banner.tsx"
      );
      const source = fs.readFileSync(filePath, "utf-8");

      expect(source).toContain("Welcome to HealthChat AI");
      expect(source).toContain("uploading your first lab report");
      expect(source).toContain('href="/upload"');
      expect(source).toContain("dashboard-welcome-banner__cta");
    });

    it("WelcomeBanner only shows when report count is 0", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.resolve(
        __dirname,
        "../app/dashboard/welcome-banner.tsx"
      );
      const source = fs.readFileSync(filePath, "utf-8");

      expect(source).toContain("reports.length === 0");
      expect(source).toContain("setShow(true)");
    });
  });

  describe("CSS styles for empty states", () => {
    it("has empty-state__cta button styles", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.resolve(
        __dirname,
        "../app/globals.css"
      );
      const source = fs.readFileSync(filePath, "utf-8");

      expect(source).toContain(".empty-state__cta");
      expect(source).toContain("--color-green-600");
    });

    it("has chat-suggestions__chip styles", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.resolve(
        __dirname,
        "../app/globals.css"
      );
      const source = fs.readFileSync(filePath, "utf-8");

      expect(source).toContain(".chat-suggestions__chip");
      expect(source).toContain("border-radius: 999px");
    });

    it("has dashboard-welcome-banner styles", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.resolve(
        __dirname,
        "../app/globals.css"
      );
      const source = fs.readFileSync(filePath, "utf-8");

      expect(source).toContain(".dashboard-welcome-banner");
      expect(source).toContain("--color-green-50");
    });

    it("has compare-page__empty styles", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.resolve(
        __dirname,
        "../app/globals.css"
      );
      const source = fs.readFileSync(filePath, "utf-8");

      expect(source).toContain(".compare-page__empty");
    });
  });
});
