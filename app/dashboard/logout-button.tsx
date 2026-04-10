"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

export function LogoutButton() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <button onClick={handleLogout} className="logout-button">
      Log Out
    </button>
  );
}
