import {
  createPilotTrialOperationsService,
  enforceRateLimit,
  getAccessToken,
  pilotApiError,
  pilotWriteLimiter,
  readJsonObject,
  requiredString,
} from "../_shared";

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(pilotWriteLimiter, request);
    if (limited) return limited;
    const body = await readJsonObject(request, 4_000);
    const eventType = requiredString(body.eventType, "eventType");
    await (await createPilotTrialOperationsService()).record({
      eventType,
      flowId: requiredString(body.flowId, "flowId"),
      caseId: typeof body.caseId === "string" ? body.caseId : undefined,
      accessToken: getAccessToken(request) || undefined,
    });
    return new Response(null, { status: 202 });
  } catch (error) {
    return pilotApiError(error);
  }
}
