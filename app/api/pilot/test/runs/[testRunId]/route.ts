import { createPilotCaseAdminService, pilotApiError, requirePilotTestAccess } from "../../../_shared";

export async function DELETE(request: Request, context: { params: Promise<{ testRunId: string }> }) {
  try {
    const denied = await requirePilotTestAccess(request);
    if (denied) return denied;
    const { testRunId } = await context.params;
    const deleted = await (await createPilotCaseAdminService()).deleteTestRun(testRunId);
    return Response.json({ deleted, testRunId });
  } catch (error) {
    return pilotApiError(error);
  }
}
