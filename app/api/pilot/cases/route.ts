import {
  createPilotCaseService,
  enforceRateLimit,
  optionalBoolean,
  pilotApiError,
  pilotCreateLimiter,
  readJsonObject,
  requirePilotInvite,
  requiredString,
} from "../_shared";

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(pilotCreateLimiter, request);
    if (limited) return limited;
    const inviteError = await requirePilotInvite(request);
    if (inviteError) return inviteError;
    const body = await readJsonObject(request, 1_500_000);
    const service = await createPilotCaseService();
    const access = await service.createCase({
      clientCreationId: requiredString(body.clientCreationId, "clientCreationId"),
      accessToken: requiredString(body.accessToken, "accessToken"),
      initialSnapshot: body.initialSnapshot ?? {},
      currentStage: typeof body.currentStage === "string" ? body.currentStage.trim() : undefined,
      isBilateral: optionalBoolean(body.isBilateral, "isBilateral"),
      hasSafetyStop: optionalBoolean(body.hasSafetyStop, "hasSafetyStop"),
    });
    return Response.json({ case: access }, { status: 201 });
  } catch (error) {
    return pilotApiError(error);
  }
}
