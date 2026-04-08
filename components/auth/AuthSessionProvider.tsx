"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import SessionTimeout from "./SessionTimeout";

/**
 * Wraps authenticated pages with HIPAA-compliant session timeout.
 * Only renders the timeout monitor on non-auth pages (i.e., when user is likely logged in).
 */

const PUBLIC_PATHS = ["/auth/login", "/auth/signup", "/auth/callback"];

export default function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isPublicPage = PUBLIC_PATHS.some((p) => pathname?.startsWith(p));

  return (
    <>
      {children}
      {mounted && !isPublicPage && <SessionTimeout />}
    </>
  );
}
