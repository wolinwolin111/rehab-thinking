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
import type { PilotCaseEventType } from "@/src/infrastructure/pilot/api/case-contracts";
import { PilotCaseValidationError } from "@/src/infrastructure/pilot/api/case-contracts";
import { publicPilotCaseRecord } from "@/src/infrastructure/pilot/services/case-view";

export async function POST(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  try {
    const limited = await enforceRateLimit(pilotWriteLimiter, request);
    if (limited) return limited;
    const { caseId } = await context.params;
    const body = await readJsonObject(request, 1_500_000);
    const bodyCaseId = requiredString(body.caseId ?? caseId, "caseId");
    if (bodyCaseId !== caseId) throw new PilotCaseValidationError("caseId does not match the request path");
    const expectedRevision = body.baseRevision ?? body.expectedRevision;
    if (body.baseRevision !== undefined && body.expectedRevision !== undefined && body.baseRevision !== body.expectedRevision) {
      throw new PilotCaseValidationError("baseRevision and expectedRevision must match");
    }
    const requestId = requiredString(body.requestId ?? body.eventId, "requestId");
    const sessionNumber = optionalNonNegativeInteger(body.sessionCount, "sessionCount");
    const sessionId = requiredString(body.sessionId ?? `session-${sessionNumber ?? 0}`, "sessionId");
    const problemThreadId = optionalString(body.problemThreadId, "problemThreadId");
    const service = await createPilotCaseService();
    const result = await service.saveProgress({
      caseId,
      accessToken: getAccessToken(request),
      expectedRevision: expectedRevision as number,
      requestId,
      sessionId,
      problemThreadId,
      snapshot: body.snapshot,
      eventType: requiredString(body.eventType, "eventType") as PilotCaseEventType,
      eventPayload: body.eventPayload,
      eventId: optionalString(body.eventId, "eventId"),
      currentStage: optionalString(body.currentStage, "currentStage"),
      isBilateral: optionalBoolean(body.isBilateral, "isBilateral"),
      hasSafetyStop: optionalBoolean(body.hasSafetyStop, "hasSafetyStop"),
      sessionCount: sessionNumber,
    });
    return Response.json(
      { progress: { ...result, caseRecord: publicPilotCaseRecord(result.caseRecord), operation: { requestId, caseId, sessionId, baseRevision: expectedRevision } } },
      { headers: { "x-pilot-request-id": requestId } },
    );
  } catch (error) {
    return pilotApiError(error);
  }
}
