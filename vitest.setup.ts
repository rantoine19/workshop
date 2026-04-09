import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Mock next/font/google — font loaders are not available in test environment
vi.mock("next/font/google", () => ({
  Figtree: () => ({ variable: "--font-heading" }),
  Noto_Sans: () => ({ variable: "--font-body" }),
}));

afterEach(() => {
  cleanup();
});
