import {
  createPilotCaseService,
  getAccessToken,
  pilotApiError,
} from "../../_shared";

export async function GET(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  try {
    const { caseId } = await context.params;
    const view = await (await createPilotCaseService()).readCase({ caseId, accessToken: getAccessToken(request) });
    return Response.json({ case: view });
  } catch (error) {
    return pilotApiError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  try {
    const { caseId } = await context.params;
    const caseRecord = await (await createPilotCaseService()).deleteCase({ caseId, accessToken: getAccessToken(request) });
    return Response.json({ case: { caseId: caseRecord.id, publicCode: caseRecord.publicCode, status: caseRecord.status, deletedAt: caseRecord.deletedAt } });
  } catch (error) {
    return pilotApiError(error);
  }
}
