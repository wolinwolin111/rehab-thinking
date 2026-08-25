import {
  createPilotCaseService,
  enforceRateLimit,
  optionalBoolean,
  pilotApiError,
  pilotCreateLimiter,
  readJsonObject,
  requiredString,
} from "../_shared";

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(pilotCreateLimiter, request);
    if (limited) return limited;
    const body = await readJsonObject(request, 1_500_000);
    const service = await createPilotCaseService();
    const access = await service.createCase({
      clientCreationId: requiredString(body.clientCreationId, "clientCreationId"),
      accessToken: requiredString(body.accessToken, "accessToken"),
      initialSnapshot: body.initialSnapshot ?? {},
      currentStage: typeof body.currentStage === "string" ? body.currentStage.trim() : undefined,
      isBilateral: optionalBoolean(body.isBilateral, "isBilateral"),
      hasSafetyStop: optionalBoolean(body.hasSafetyStop, "hasSafetyStop"),
      firstUseFlowId: typeof body.firstUseFlowId === "string" ? body.firstUseFlowId.trim() : undefined,
      source: body.source as never,
      consent: body.consent as never,
    });
    return Response.json({ case: access }, { status: 201 });
  } catch (error) {
    return pilotApiError(error);
  }
}
