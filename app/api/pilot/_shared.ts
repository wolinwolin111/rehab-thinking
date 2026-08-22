import {
  PilotCaseError,
  PilotCasePayloadTooLargeError,
  PilotCaseUnauthorizedError,
  PilotCaseValidationError,
} from "@/app/pilot-case-contracts";
import { PilotCaseService } from "@/app/pilot-case-service";
import { PILOT_RELEASE_VERSIONS } from "@/app/pilot-release";
import { isPilotInviteFailure, validatePilotInvite } from "@/app/pilot-invite";
import { createRateLimiter } from "../../rate-limit-core";

/**
 * 基础防滥用限流（SEC-01）。内存滑动窗口，按隔离实例独立计数；
 * 试用阶段足够，多实例正式化时替换为共享存储实现。
 */
export const pilotCreateLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });
export const pilotWriteLimiter = createRateLimiter({ windowMs: 60_000, max: 60 });

export function clientIpKey(request: Request): string {
  const connectingIp = request.headers.get("cf-connecting-ip");
  if (connectingIp) return connectingIp;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

/** 命中限制时返回 429 响应；未命中返回 null。持有有效管理员密钥的请求不受限。 */
export async function enforceRateLimit(
  limiter: ReturnType<typeof createRateLimiter>,
  request: Request,
): Promise<Response | null> {
  try {
    const { env } = await import("cloudflare:workers");
    const configuredKey = String((env as unknown as { PILOT_ADMIN_KEY?: string }).PILOT_ADMIN_KEY ?? "").trim();
    const provided = request.headers.get("x-pilot-admin-key")?.trim() ?? "";
    if (configuredKey && provided && provided === configuredKey) return null;
  } catch {
    // 环境不可用时按普通流量限流。
  }
  const decision = limiter(clientIpKey(request));
  if (decision.allowed) return null;
  return Response.json(
    { error: "Too many requests", code: "rate_limited" },
    { status: 429, headers: { "retry-after": String(decision.retryAfterSec) } },
  );
}

export async function createPilotCaseRepository() {
  const [{ getDb }, { D1PilotCaseRepository }] = await Promise.all([
    import("@/db"),
    import("@/db/pilot-case-repository"),
  ]);
  return new D1PilotCaseRepository(getDb());
}

export async function createPilotCaseService() {
  return new PilotCaseService({
    repository: await createPilotCaseRepository(),
    versions: PILOT_RELEASE_VERSIONS,
  });
}

export async function requirePilotInvite(request: Request): Promise<Response | null> {
  const { env } = await import("cloudflare:workers");
  const runtimeEnv = env as unknown as {
    PILOT_INVITE_TOKEN?: string;
    PILOT_INVITE_EXPIRES_AT?: string;
    PILOT_INVITE_REVOKED?: string;
  };
  const validation = await validatePilotInvite(
    request.headers.get("x-pilot-invite-token"),
    {
      token: runtimeEnv.PILOT_INVITE_TOKEN ?? "",
      expiresAt: runtimeEnv.PILOT_INVITE_EXPIRES_AT,
      revoked: runtimeEnv.PILOT_INVITE_REVOKED === "true",
    },
  );
  if (validation === "valid") return null;
  if (validation === "not_configured" || validation === "invalid_config") {
    console.error("pilot invite configuration is unavailable", { reason: validation });
    return Response.json({ error: "Pilot invite is not configured", code: "invite_unavailable" }, { status: 503 });
  }
  if (isPilotInviteFailure(validation)) {
    return Response.json({ error: "A valid invitation is required", code: "invite_required" }, { status: 403 });
  }
  return null;
}

export async function createPilotCaseAdminService() {
  const { PilotCaseAdminService } = await import("@/app/pilot-case-admin-service");
  return new PilotCaseAdminService(await createPilotCaseRepository());
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
  const { env } = await import("cloudflare:workers");
  const configuredKey = String((env as unknown as { PILOT_ADMIN_KEY?: string }).PILOT_ADMIN_KEY ?? "").trim();
  if (!configuredKey) {
    return Response.json({ error: "Admin access is not configured" }, { status: 503 });
  }
  if (request.headers.get("x-pilot-admin-key") !== configuredKey) {
    throw new PilotCaseUnauthorizedError("Admin access denied");
  }
  return null;
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
