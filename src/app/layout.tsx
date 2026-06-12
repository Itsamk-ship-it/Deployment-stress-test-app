import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deployment Stress Test",
  description:
    "Exercises auth, Postgres, Redis, background jobs, file uploads, webhooks, email, health checks, and logs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
