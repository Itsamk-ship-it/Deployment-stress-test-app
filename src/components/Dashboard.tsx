"use client";

import { useState } from "react";
import HealthPanel from "./panels/HealthPanel";
import CachePanel from "./panels/CachePanel";
import JobsPanel from "./panels/JobsPanel";
import EmailPanel from "./panels/EmailPanel";
import WebhookPanel from "./panels/WebhookPanel";
import UploadPanel from "./panels/UploadPanel";
import StressPanel from "./panels/StressPanel";
import LogsPanel from "./panels/LogsPanel";

export default function Dashboard({ userEmail }: { userEmail: string }) {
  // A shared counter that panels bump to ask sibling panels (logs/jobs) to refresh.
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((k) => k + 1);

  return (
    <div className="grid">
      <HealthPanel />
      <CachePanel />
      <JobsPanel refreshKey={refreshKey} onChange={bump} />
      <EmailPanel onChange={bump} />
      <WebhookPanel onChange={bump} />
      <UploadPanel onChange={bump} />
      <StressPanel />
      <LogsPanel refreshKey={refreshKey} />
    </div>
  );
}
