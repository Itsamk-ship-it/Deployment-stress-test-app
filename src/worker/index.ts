// Worker bootstrap. We load .env BEFORE importing any module that reads
// environment variables at import time (the Redis/queue modules open
// connections on load). `process.loadEnvFile` is built into Node 20.12+, so
// there's no dotenv dependency. In Docker the platform injects env directly,
// and the missing-.env case is ignored.
try {
  (process as NodeJS.Process & { loadEnvFile?: (path?: string) => void }).loadEnvFile?.(".env");
} catch {
  // .env is optional — env may be provided by the platform.
}

// Dynamic import runs only after the synchronous loadEnvFile call above, so the
// queue/Redis modules see the loaded env when their module graph initializes.
import("./run").catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[worker] failed to start:", err);
  process.exit(1);
});
