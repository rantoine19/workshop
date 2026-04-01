import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>HealthChat AI</h1>
        <LogoutButton />
      </header>

      <section className="dashboard-welcome">
        <h2>Welcome back!</h2>
        <p>
          Signed in as <strong>{user.email}</strong>
        </p>
      </section>

      <nav className="dashboard-nav">
        <Link href="/upload" className="dashboard-card">
          <h3>Upload Report</h3>
          <p>Upload a lab report or medical document for analysis</p>
        </Link>
        <Link href="/chat" className="dashboard-card">
          <h3>Chat</h3>
          <p>Ask questions about your health data in plain language</p>
        </Link>
        <Link href="/profile" className="dashboard-card">
          <h3>Profile</h3>
          <p>Manage your personal information for personalized health insights</p>
        </Link>
      </nav>
    </div>
  );
}
