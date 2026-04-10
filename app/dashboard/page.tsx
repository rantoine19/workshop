import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "./logout-button";
import Logo from "@/components/ui/Logo";
import Avatar from "@/components/ui/Avatar";
import { DashboardGrid } from "./dashboard-grid";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Check if user needs onboarding (no display_name set)
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile?.display_name) {
    redirect("/onboarding");
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <Logo variant="full" size="md" />
        <nav className="dashboard-header__nav">
          <Link href="/upload" className="dashboard-header__link">Upload</Link>
          <Link href="/chat" className="dashboard-header__link">Chat</Link>
          <Link href="/reports" className="dashboard-header__link">Reports</Link>
          <Link href="/profile" className="dashboard-header__link">Profile</Link>
        </nav>
        <div className="dashboard-header__right">
          <Avatar
            avatarUrl={profile.avatar_url}
            displayName={profile.display_name}
            size="sm"
          />
          <LogoutButton />
        </div>
      </header>

      <DashboardGrid displayName={profile.display_name} />
    </div>
  );
}
