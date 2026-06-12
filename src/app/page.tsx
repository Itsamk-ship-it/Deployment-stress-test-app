import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Dashboard from "@/components/Dashboard";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <header className="topbar">
        <div>
          <h1>🚀 Deployment Stress Test</h1>
          <div className="sub">
            Postgres · Redis · jobs · uploads · webhooks · email · health · logs
          </div>
        </div>
        <div className="row" style={{ alignItems: "center", gap: 12 }}>
          <span className="muted" style={{ fontSize: 12 }}>{user.email}</span>
          <LogoutButton />
        </div>
      </header>
      <div className="container">
        <Dashboard userEmail={user.email} />
      </div>
    </>
  );
}
