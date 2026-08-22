import {
  createPilotCaseAdminService,
  pilotApiError,
  requirePilotAdmin,
} from "../../../_shared";

export async function GET(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  try {
    const configurationError = await requirePilotAdmin(request);
    if (configurationError) return configurationError;
    const { caseId } = await context.params;
    const view = await (await createPilotCaseAdminService()).readCase(caseId);
    return Response.json({ case: view });
  } catch (error) {
    return pilotApiError(error);
  }
}
