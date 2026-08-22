import {
  createPilotCaseAdminService,
  pilotApiError,
  requirePilotAdmin,
} from "../../_shared";

/** PRIV-02：物理清除过期案例。body: { deletedBeforeDays?: number, createdBefore?: string } */
export async function POST(request: Request) {
  try {
    const configurationError = await requirePilotAdmin(request);
    if (configurationError) return configurationError;
    let body: Record<string, unknown> = {};
    try { body = await request.json(); } catch { body = {}; }
    if (!body || typeof body !== "object") body = {};
    const service = await createPilotCaseAdminService();
    const purged = await service.purgeCases({
      deletedBeforeDays: typeof body.deletedBeforeDays === "number" ? body.deletedBeforeDays : undefined,
      createdBefore: typeof body.createdBefore === "string" ? body.createdBefore : undefined,
    });
    return Response.json({ purged });
  } catch (error) {
    return pilotApiError(error);
  }
}
