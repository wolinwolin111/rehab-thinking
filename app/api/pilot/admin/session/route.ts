import {
  buildPilotAdminSessionClearCookie,
  buildPilotAdminSessionCookie,
  issuePilotAdminSession,
  PILOT_ADMIN_SESSION_TTL_SECONDS,
} from "@/src/infrastructure/pilot/admin/admin-session";
import { getPilotEnv, pilotApiError, readJsonObject, requiredString } from "../../_shared";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request, 4_000);
    const env = await getPilotEnv();
    const session = await issuePilotAdminSession({
      providedKey: requiredString(body.adminKey, "adminKey"),
      configuredKey: String(env.PILOT_ADMIN_KEY ?? ""),
      ttlSeconds: PILOT_ADMIN_SESSION_TTL_SECONDS,
    });
    return Response.json(
      { authenticated: true, expiresAt: session.expiresAt },
      { headers: { "set-cookie": buildPilotAdminSessionCookie(session.token, PILOT_ADMIN_SESSION_TTL_SECONDS), "cache-control": "no-store" } },
    );
  } catch (error) {
    return pilotApiError(error);
  }
}

export async function DELETE() {
  return Response.json(
    { authenticated: false },
    { headers: { "set-cookie": buildPilotAdminSessionClearCookie(), "cache-control": "no-store" } },
  );
}
