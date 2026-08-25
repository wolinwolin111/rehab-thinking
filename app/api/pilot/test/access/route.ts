import { pilotApiError, requirePilotTestAccess } from "../../_shared";

export async function GET(request: Request) {
  try {
    const denied = await requirePilotTestAccess(request);
    if (denied) return denied;
    return Response.json({ allowed: true });
  } catch (error) {
    return pilotApiError(error);
  }
}
