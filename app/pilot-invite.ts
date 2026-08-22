export type PilotInviteConfig = {
  token: string;
  expiresAt?: string;
  revoked?: boolean;
};

export type PilotInviteValidation = "valid" | "missing" | "invalid" | "expired" | "revoked" | "not_configured" | "invalid_config";

const MAX_INVITE_LENGTH = 256;

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return new Uint8Array(bytes);
}

function sameBytes(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export async function validatePilotInvite(
  providedToken: string | null | undefined,
  config: PilotInviteConfig,
  now = Date.now(),
): Promise<PilotInviteValidation> {
  const configuredToken = config.token.trim();
  if (!configuredToken) return "not_configured";
  if (config.revoked) return "revoked";
  if (config.expiresAt !== undefined) {
    const expiresAt = Date.parse(config.expiresAt);
    if (!Number.isFinite(expiresAt)) return "invalid_config";
    if (now >= expiresAt) return "expired";
  }
  const candidate = typeof providedToken === "string" ? providedToken.trim() : "";
  if (!candidate) return "missing";
  if (candidate.length > MAX_INVITE_LENGTH) return "invalid";
  const [expected, actual] = await Promise.all([digest(configuredToken), digest(candidate)]);
  return sameBytes(expected, actual) ? "valid" : "invalid";
}

export function isPilotInviteFailure(result: PilotInviteValidation) {
  return result !== "valid";
}

