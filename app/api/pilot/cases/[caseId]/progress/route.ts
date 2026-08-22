import {
  createPilotCaseService,
  getAccessToken,
  optionalBoolean,
  optionalNonNegativeInteger,
  optionalString,
  enforceRateLimit,
  pilotApiError,
  pilotWriteLimiter,
  readJsonObject,
  requiredString,
} from "../../../_shared";
import type { PilotCaseEventType } from "@/app/pilot-case-contracts";
import { publicPilotCaseRecord } from "@/app/pilot-case-view";

export async function POST(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  try {
    const limited = await enforceRateLimit(pilotWriteLimiter, request);
    if (limited) return limited;
    const { caseId } = await context.params;
    const body = await readJsonObject(request, 1_500_000);
    const service = await createPilotCaseService();
    const result = await service.saveProgress({
      caseId,
      accessToken: getAccessToken(request),
      expectedRevision: body.expectedRevision as number,
      snapshot: body.snapshot,
      eventType: requiredString(body.eventType, "eventType") as PilotCaseEventType,
      eventPayload: body.eventPayload,
      eventId: optionalString(body.eventId, "eventId"),
      currentStage: optionalString(body.currentStage, "currentStage"),
      isBilateral: optionalBoolean(body.isBilateral, "isBilateral"),
      hasSafetyStop: optionalBoolean(body.hasSafetyStop, "hasSafetyStop"),
      sessionCount: optionalNonNegativeInteger(body.sessionCount, "sessionCount"),
    });
    return Response.json({ progress: { ...result, caseRecord: publicPilotCaseRecord(result.caseRecord) } });
  } catch (error) {
    return pilotApiError(error);
  }
}
