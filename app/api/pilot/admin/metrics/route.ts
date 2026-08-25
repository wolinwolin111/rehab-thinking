import { createPilotCaseAdminService, pilotApiError, requirePilotAdmin } from "../../_shared";

export async function GET(request: Request) {
  try {
    const configurationError = await requirePilotAdmin(request);
    if (configurationError) return configurationError;
    return Response.json({ metrics: await (await createPilotCaseAdminService()).getTrialMetrics() });
  } catch (error) {
    return pilotApiError(error);
  }
}
