import {
  PilotCaseError,
  PilotCasePayloadTooLargeError,
  PilotCaseUnauthorizedError,
  PilotCaseValidationError,
} from "@/src/infrastructure/pilot/api/case-contracts";
import { PilotCaseService } from "@/src/infrastructure/pilot/services/case-service";
import { PILOT_RELEASE_VERSIONS } from "@/src/infrastructure/pilot/release/release-version";
import { readPilotAdminSessionCookie, validatePilotAdminSession } from "@/src/infrastructure/pilot/admin/admin-session";
import { createRateLimiter } from "@/src/infrastructure/http/rate-limit-core";

/**
 * 基础防滥用限流（SEC-01）。内存滑动窗口，按隔离实例独立计数；
 * 试用阶段足够，多实例正式化时替换为共享存储实现。
 */
export const pilotCreateLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });
export const pilotWriteLimiter = createRateLimiter({ windowMs: 60_000, max: 60 });

type PilotRuntimeEnv = {
  PILOT_ADMIN_KEY?: string;
  PILOT_SQLITE_PATH?: string;
};

type ClosablePilotRepository = Awaited<ReturnType<typeof import("@/db/sqlite/sqlite-pilot-case-repository")["SqlitePilotCaseRepository"]["open"]>>;
let sqliteRepositoryState: { path: string; repository: ClosablePilotRepository } | null = null;
let sqliteRepositoryOpening: Promise<ClosablePilotRepository> | null = null;
let sqliteRepositoryOpeningPath = "";

export async function getPilotEnv(): Promise<PilotRuntimeEnv> {
  return process.env as PilotRuntimeEnv;
}

export function clientIpKey(request: Request): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

/** 命中限制时返回 429 响应；未命中返回 null。持有有效管理员密钥的请求不受限。 */
export async function enforceRateLimit(
  limiter: ReturnType<typeof createRateLimiter>,
  request: Request,
): Promise<Response | null> {
  const env = await getPilotEnv();
  const configuredKey = String(env.PILOT_ADMIN_KEY ?? "").trim();
  const provided = request.headers.get("x-pilot-admin-key")?.trim() ?? "";
  if (configuredKey && provided && provided === configuredKey) return null;
  const decision = limiter(clientIpKey(request));
  if (decision.allowed) return null;
  return Response.json(
    { error: "Too many requests", code: "rate_limited" },
    { status: 429, headers: { "retry-after": String(decision.retryAfterSec) } },
  );
}

export async function createPilotCaseRepository() {
  const env = await getPilotEnv();
  const databasePath = String(env.PILOT_SQLITE_PATH ?? "").trim() || "./data/rehabmind.sqlite";
  if (sqliteRepositoryState?.path === databasePath && sqliteRepositoryState.repository.sqlite.open) {
    return sqliteRepositoryState.repository;
  }
  if (sqliteRepositoryOpening && sqliteRepositoryOpeningPath === databasePath) return sqliteRepositoryOpening;
  sqliteRepositoryOpeningPath = databasePath;
  sqliteRepositoryOpening = import("@/db/sqlite/sqlite-pilot-case-repository").then(({ SqlitePilotCaseRepository }) => {
    sqliteRepositoryState?.repository.close();
    const repository = SqlitePilotCaseRepository.open(databasePath);
    sqliteRepositoryState = { path: databasePath, repository };
    return repository;
  }).finally(() => {
    sqliteRepositoryOpening = null;
    sqliteRepositoryOpeningPath = "";
  });
  return sqliteRepositoryOpening;
}

export function closePilotCaseRepository() {
  sqliteRepositoryState?.repository.close();
  sqliteRepositoryState = null;
  sqliteRepositoryOpening = null;
  sqliteRepositoryOpeningPath = "";
}

export async function createPilotCaseService() {
  return new PilotCaseService({
    repository: await createPilotCaseRepository(),
    versions: PILOT_RELEASE_VERSIONS,
  });
}

export async function createPilotCaseAdminService() {
  const { PilotCaseAdminService } = await import("@/src/infrastructure/pilot/services/case-admin-service");
  return new PilotCaseAdminService(await createPilotCaseRepository(), { versions: PILOT_RELEASE_VERSIONS });
}

export async function createPilotTrialOperationsService() {
  const { PilotTrialOperationsService } = await import("@/src/infrastructure/pilot/services/trial-operations-service");
  return new PilotTrialOperationsService(await createPilotCaseRepository(), PILOT_RELEASE_VERSIONS);
}

export function getAccessToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (authorization.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim();
  return request.headers.get("x-pilot-access-token")?.trim() ?? "";
}

export async function readJsonObject(request: Request, maxBytes = 1_500_000): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type");
  if (contentType && !contentType.toLowerCase().includes("application/json")) {
    throw new PilotCaseValidationError("Request content type must be application/json");
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new PilotCasePayloadTooLargeError("Request body exceeds the maximum size");
  }

  let bodyText = "";
  try {
    if (!request.body) bodyText = "";
    else {
      const reader = request.body.getReader();
      const decoder = new TextDecoder();
      let totalBytes = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) {
          bodyText += decoder.decode();
          break;
        }
        totalBytes += chunk.value.byteLength;
        if (totalBytes > maxBytes) {
          await reader.cancel();
          throw new PilotCasePayloadTooLargeError("Request body exceeds the maximum size");
        }
        bodyText += decoder.decode(chunk.value, { stream: true });
      }
    }
  } catch (error) {
    if (error instanceof PilotCaseError) throw error;
    throw new PilotCaseValidationError("Request body must be valid JSON");
  }
  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    throw new PilotCaseValidationError("Request body must be valid JSON");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new PilotCaseValidationError("Request body must be a JSON object");
  }
  return body as Record<string, unknown>;
}

export function requiredString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new PilotCaseValidationError(`${field} is required`);
  }
  return value.trim();
}

export function optionalString(value: unknown, field: string) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new PilotCaseValidationError(`${field} must be a string`);
  return value.trim();
}

export function optionalBoolean(value: unknown, field: string) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") throw new PilotCaseValidationError(`${field} must be a boolean`);
  return value;
}

export function optionalNonNegativeInteger(value: unknown, field: string) {
  if (value === undefined || value === null) return undefined;
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new PilotCaseValidationError(`${field} must be a non-negative integer`);
  }
  return value as number;
}

export async function requirePilotAdmin(request: Request): Promise<Response | null> {
  const env = await getPilotEnv();
  const configuredKey = String(env.PILOT_ADMIN_KEY ?? "").trim();
  if (!configuredKey) {
    return Response.json({ error: "Admin access is not configured" }, { status: 503 });
  }
  const session = readPilotAdminSessionCookie(request);
  if (await validatePilotAdminSession(session, configuredKey)) return null;
  // Non-browser maintenance scripts retain header authentication. The /admin UI
  // exchanges the key for an HttpOnly session and never persists the key.
  if (request.headers.get("x-pilot-admin-key") !== configuredKey) {
    throw new PilotCaseUnauthorizedError("Admin access denied");
  }
  return null;
}

export async function requirePilotTestAccess(request: Request): Promise<Response | null> {
  if (process.env.NODE_ENV === "development" || process.env.PILOT_ALLOW_TEST_WORKBENCH === "true") return null;
  return requirePilotAdmin(request);
}

export function pilotApiError(error: unknown) {
  if (error instanceof PilotCaseError) {
    const status = error.code === "validation" ? 400
      : error.code === "payload_too_large" ? 413
      : error.code === "not_found" ? 404
        : error.code === "unauthorized" ? 401
          : error.code === "conflict" ? 409
            : 500;
    const message = error.code === "unauthorized" ? "Case access denied"
      : error.code === "payload_too_large" ? "Request body is too large"
      : error.code === "not_found" ? "Case not found"
        : error.code === "conflict" ? "Case changed; reload the latest saved version"
          : error.message;
    return Response.json({ error: message, code: error.code }, { status });
  }
  console.error(
    "pilot API storage failure",
    error instanceof Error ? { name: error.name, message: error.message } : "unknown",
  );
  return Response.json({ error: "Case service is temporarily unavailable", code: "storage" }, { status: 500 });
}
