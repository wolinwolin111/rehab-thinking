import {
  createPilotCaseService,
  enforceRateLimit,
  optionalBoolean,
  pilotApiError,
  pilotCreateLimiter,
  readJsonObject,
  requirePilotTestAccess,
  requiredString,
} from "../../_shared";
import { buildPilotConsentRecord } from "@/src/infrastructure/pilot/consent/consent-core";

export async function POST(request: Request) {
  try {
    const denied = await requirePilotTestAccess(request);
    if (denied) return denied;
    const limited = await enforceRateLimit(pilotCreateLimiter, request);
    if (limited) return limited;
    const body = await readJsonObject(request, 1_500_000);
    const consent = buildPilotConsentRecord(new Date().toISOString());
    const access = await (await createPilotCaseService()).createCase({
      clientCreationId: requiredString(body.clientCreationId, "clientCreationId"),
      accessToken: requiredString(body.accessToken, "accessToken"),
      initialSnapshot: body.initialSnapshot ?? {},
      currentStage: typeof body.currentStage === "string" ? body.currentStage.trim() : undefined,
      isBilateral: optionalBoolean(body.isBilateral, "isBilateral"),
      hasSafetyStop: optionalBoolean(body.hasSafetyStop, "hasSafetyStop"),
      source: { channel: "internal_test", detail: null },
      consent,
      testContext: {
        testRunId: requiredString(body.testRunId, "testRunId"),
        scenarioId: requiredString(body.scenarioId, "scenarioId"),
        createdBy: "test_workbench",
      },
    });
    return Response.json({ case: access }, { status: 201 });
  } catch (error) {
    return pilotApiError(error);
  }
}
