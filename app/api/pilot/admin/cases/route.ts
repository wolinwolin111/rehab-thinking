import {
  createPilotCaseAdminService,
  pilotApiError,
  requirePilotAdmin,
} from "../../_shared";

export async function GET(request: Request) {
  try {
    const configurationError = await requirePilotAdmin(request);
    if (configurationError) return configurationError;
    const service = await createPilotCaseAdminService();
    const publicCode = new URL(request.url).searchParams.get("publicCode")?.trim() ?? "";
    if (publicCode) return Response.json({ case: await service.readCaseByPublicCode(publicCode) });
    const cases = await service.listCases();
    return Response.json({ cases });
  } catch (error) {
    return pilotApiError(error);
  }
}
