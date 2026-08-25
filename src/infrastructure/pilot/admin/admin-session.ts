import { PilotCaseUnauthorizedError, PilotCaseValidationError } from "@/src/infrastructure/pilot/api/case-contracts";

export const PILOT_ADMIN_SESSION_COOKIE = "rehabmind_admin_session";
export const PILOT_ADMIN_SESSION_TTL_SECONDS = 15 * 60;

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  const maxLength = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < maxLength; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

async function sign(payload: string, secret: string) {
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToHex(new Uint8Array(await globalThis.crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))));
}

export async function issuePilotAdminSession(input: {
  providedKey: string;
  configuredKey: string;
  nowMs?: number;
  ttlSeconds?: number;
  nonce?: string;
}) {
  const configuredKey = input.configuredKey.trim();
  if (!configuredKey) throw new PilotCaseValidationError("Admin access is not configured");
  if (!constantTimeEqual(input.providedKey, configuredKey)) throw new PilotCaseUnauthorizedError("Admin access denied");
  const nowMs = input.nowMs ?? Date.now();
  const ttlSeconds = input.ttlSeconds ?? PILOT_ADMIN_SESSION_TTL_SECONDS;
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 60 || ttlSeconds > 3600) {
    throw new PilotCaseValidationError("Admin session TTL must be between 60 and 3600 seconds");
  }
  const expiresSeconds = Math.floor(nowMs / 1000) + ttlSeconds;
  const nonce = input.nonce ?? globalThis.crypto.randomUUID();
  const payload = `v1.${expiresSeconds}.${nonce}`;
  return {
    token: `${payload}.${await sign(payload, configuredKey)}`,
    expiresAt: new Date(expiresSeconds * 1000).toISOString(),
  };
}

export async function validatePilotAdminSession(token: string | null | undefined, configuredKey: string, nowMs = Date.now()) {
  if (!token || !configuredKey.trim()) return false;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return false;
  const expiresSeconds = Number(parts[1]);
  if (!Number.isInteger(expiresSeconds) || expiresSeconds * 1000 <= nowMs) return false;
  const payload = parts.slice(0, 3).join(".");
  return constantTimeEqual(parts[3], await sign(payload, configuredKey.trim()));
}

export function readPilotAdminSessionCookie(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === PILOT_ADMIN_SESSION_COOKIE) return decodeURIComponent(value.join("="));
  }
  return null;
}

export function buildPilotAdminSessionCookie(token: string, maxAgeSeconds = PILOT_ADMIN_SESSION_TTL_SECONDS) {
  return `${PILOT_ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${maxAgeSeconds}; Path=/api/pilot/admin; HttpOnly; Secure; SameSite=Strict`;
}

export function buildPilotAdminSessionClearCookie() {
  return `${PILOT_ADMIN_SESSION_COOKIE}=; Max-Age=0; Path=/api/pilot/admin; HttpOnly; Secure; SameSite=Strict`;
}
