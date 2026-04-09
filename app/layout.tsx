import type { Metadata } from "next";
import { Figtree, Noto_Sans } from "next/font/google";
import AuthSessionProvider from "@/components/auth/AuthSessionProvider";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-heading" });
const notoSans = Noto_Sans({ subsets: ["latin"], variable: "--font-body" });

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
      <body className={`${figtree.variable} ${notoSans.variable}`}>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
