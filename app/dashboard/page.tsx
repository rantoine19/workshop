import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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

      <section className="dashboard-placeholder">
        <p>
          Your health dashboard is coming soon. You&apos;ll be able to upload
          medical reports, chat about your health data, and prepare questions
          for your doctor.
        </p>
      </section>
    </div>
  );
}
