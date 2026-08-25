import {
  createPilotCaseAdminService,
  pilotApiError,
  readJsonObject,
  requirePilotAdmin,
  requiredString,
} from "../../../_shared";

export async function GET(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  try {
    const configurationError = await requirePilotAdmin(request);
    if (configurationError) return configurationError;
    const { caseId } = await context.params;
    const service = await createPilotCaseAdminService();
    if (new URL(request.url).searchParams.get("format") === "redacted") {
      return Response.json({ export: await service.exportRedactedCase(caseId) });
    }
    return Response.json({ case: await service.readCaseWithAudit(caseId) });
  } catch (error) {
    return pilotApiError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  try {
    const configurationError = await requirePilotAdmin(request);
    if (configurationError) return configurationError;
    const { caseId } = await context.params;
    const body = await readJsonObject(request, 20_000);
    const action = requiredString(body.action, "action");
    const service = await createPilotCaseAdminService();
    if (action === "add-note") {
      return Response.json({ note: await service.addNote(caseId, requiredString(body.note, "note")) });
    }
    if (action === "update-feedback") {
      return Response.json({
        feedback: await service.updateFeedbackStatus(
          caseId,
          requiredString(body.feedbackId, "feedbackId"),
          requiredString(body.status, "status"),
        ),
      });
    }
    return Response.json({ error: "Unsupported admin action", code: "validation" }, { status: 400 });
  } catch (error) {
    return pilotApiError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  try {
    const configurationError = await requirePilotAdmin(request);
    if (configurationError) return configurationError;
    const { caseId } = await context.params;
    return Response.json({ case: await (await createPilotCaseAdminService()).deleteCase(caseId) });
  } catch (error) {
    return pilotApiError(error);
  }
}
