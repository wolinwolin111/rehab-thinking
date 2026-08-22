import {
  createPilotCaseService,
  getAccessToken,
  optionalNonNegativeInteger,
  optionalString,
  enforceRateLimit,
  pilotApiError,
  pilotWriteLimiter,
  readJsonObject,
  requiredString,
} from "../../../_shared";

export async function POST(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  try {
    const limited = await enforceRateLimit(pilotWriteLimiter, request);
    if (limited) return limited;
    const { caseId } = await context.params;
    const body = await readJsonObject(request, 64_000);
    const feedback = await (await createPilotCaseService()).submitFeedback({
      caseId,
      accessToken: getAccessToken(request),
      eventId: optionalString(body.eventId, "eventId"),
      sessionNumber: optionalNonNegativeInteger(body.sessionNumber, "sessionNumber"),
      stage: requiredString(body.stage, "stage"),
      kind: requiredString(body.kind, "kind"),
      message: optionalString(body.message, "message"),
      payload: body.payload,
      sourceSessionNumber: optionalNonNegativeInteger(body.sourceSessionNumber, "sourceSessionNumber"),
      sourceStage: optionalString(body.sourceStage, "sourceStage"),
      sourceEventId: optionalString(body.sourceEventId, "sourceEventId"),
    });
    return Response.json({ feedback }, { status: 201 });
  } catch (error) {
    return pilotApiError(error);
  }
}
