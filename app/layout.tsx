import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HealthChat AI",
  description:
    "Understand your lab results in plain language. Upload medical reports, get simplified explanations, and prepare for your next doctor visit.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
