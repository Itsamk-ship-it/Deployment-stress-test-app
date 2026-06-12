import { prisma } from "./prisma";

export type LogLevel = "debug" | "info" | "warn" | "error";

// Logs to stdout (captured by the platform's log drain) AND persists to the
// database so the in-app logs dashboard can display them.
export async function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  source = "app",
): Promise<void> {
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} (${source}) ${message}`;
  // eslint-disable-next-line no-console
  console[level === "debug" ? "log" : level](line, context ?? "");

  try {
    await prisma.logEntry.create({
      data: {
        level,
        source,
        message,
        context: context ? (context as object) : undefined,
      },
    });
  } catch {
    // Never let logging failures break the request path.
  }
}

export const logger = {
  debug: (m: string, c?: Record<string, unknown>, s?: string) => log("debug", m, c, s),
  info: (m: string, c?: Record<string, unknown>, s?: string) => log("info", m, c, s),
  warn: (m: string, c?: Record<string, unknown>, s?: string) => log("warn", m, c, s),
  error: (m: string, c?: Record<string, unknown>, s?: string) => log("error", m, c, s),
};
