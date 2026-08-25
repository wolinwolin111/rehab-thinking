import {
  createPilotCaseAdminService,
  pilotApiError,
  requirePilotAdmin,
} from "../../_shared";
import { PilotCaseValidationError } from "@/src/infrastructure/pilot/api/case-contracts";

function optionalEnum<T extends string>(name: string, value: string | null, allowed: readonly T[]): T | undefined {
  if (value === null || value === "") return undefined;
  if (!allowed.includes(value as T)) throw new PilotCaseValidationError(`${name} is invalid`);
  return value as T;
}

export async function GET(request: Request) {
  try {
    const configurationError = await requirePilotAdmin(request);
    if (configurationError) return configurationError;
    const service = await createPilotCaseAdminService();
    const search = new URL(request.url).searchParams;
    const publicCode = search.get("publicCode")?.trim() ?? "";
    if (publicCode && search.get("detail") === "true") return Response.json({ case: await service.readCaseByPublicCode(publicCode, true) });
    const status = optionalEnum("status", search.get("status"), ["active", "deleted"] as const);
    const feedbackStatus = optionalEnum("feedbackStatus", search.get("feedbackStatus"), ["open", "in_review", "resolved", "dismissed"] as const);
    const sort = optionalEnum("sort", search.get("sort"), ["oldest", "newest"] as const);
    const testFlag = optionalEnum("isTestCase", search.get("isTestCase"), ["true", "false"] as const);
    const integer = (name: string) => {
      const value = search.get(name);
      return value === null || value === "" ? undefined : Number(value);
    };
    const result = await service.searchCases({
      publicCode: publicCode || undefined,
      status,
      feedbackStatus,
      appVersion: search.get("appVersion") ?? undefined,
      knowledgeVersion: search.get("knowledgeVersion") ?? undefined,
      decisionVersion: search.get("decisionVersion") ?? undefined,
      sessionNumber: integer("sessionNumber"),
      createdFrom: search.get("createdFrom") ?? undefined,
      createdTo: search.get("createdTo") ?? undefined,
      sort,
      cursor: search.get("cursor") ?? undefined,
      limit: integer("limit"),
      isTestCase: testFlag === undefined ? undefined : testFlag === "true",
    });
    return Response.json(result);
  } catch (error) {
    return pilotApiError(error);
  }
}
