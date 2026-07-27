import helmet from "helmet";

export function corsOrigins() {
  return (process.env.REMI_CORS_ORIGINS || (process.env.NODE_ENV === "production" ? "" : "http://localhost:19006,http://localhost:8081"))
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isCorsOriginAllowed(origin?: string) {
  return !origin || corsOrigins().includes(origin);
}

export function corsOptions() {
  return {
    origin: (origin: string | undefined, callback: (error: Error | null, allowed?: boolean) => void) => {
      if (isCorsOriginAllowed(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  };
}

export function securityHeadersMiddleware() {
  return helmet();
}
