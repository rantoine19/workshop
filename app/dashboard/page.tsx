import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "./logout-button";
import Logo from "@/components/ui/Logo";
import { ReportsCardBadge } from "./reports-card-badge";
import { HealthScore } from "./health-score";

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
    .select("display_name")
    .eq("id", user.id)
    .single();

  if (!profile?.display_name) {
    redirect("/onboarding");
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <Logo variant="full" size="md" />
        <LogoutButton />
      </header>

      <section className="dashboard-welcome">
        <h2>Welcome back, {profile.display_name}!</h2>
      </section>

      <HealthScore />

      <nav className="dashboard-nav">
        <Link href="/upload" className="dashboard-card dashboard-card--upload">
          <div className="dashboard-card__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="12" y2="12" />
              <line x1="15" y1="15" x2="12" y2="12" />
            </svg>
          </div>
          <h3>Upload Report</h3>
          <p>Upload a lab report or medical document for analysis</p>
        </Link>
        <Link href="/chat" className="dashboard-card dashboard-card--chat">
          <div className="dashboard-card__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h3>Chat</h3>
          <p>Ask questions about your health data in plain language</p>
        </Link>
        <Link href="/reports" className="dashboard-card dashboard-card--reports">
          <div className="dashboard-card__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="16" x2="13" y2="16" />
            </svg>
          </div>
          <div className="dashboard-card__title-row">
            <h3>Your Reports</h3>
            <ReportsCardBadge />
          </div>
          <p>View uploaded reports and analysis results</p>
        </Link>
        <Link href="/profile" className="dashboard-card dashboard-card--profile">
          <div className="dashboard-card__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h3>Profile</h3>
          <p>Manage your personal information for personalized health insights</p>
        </Link>
      </nav>
    </div>
  );
}
