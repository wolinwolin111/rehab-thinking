import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

const releaseDir = path.resolve(process.argv[2] ?? process.cwd());
const baseUrl = (process.argv[3] ?? "https://66.154.101.204").replace(/\/$/, "");
const env = {};
for (const line of readFileSync(path.join(releaseDir, ".env"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z0-9_]+)=(.*)\s*$/);
  if (match) env[match[1]] = match[2];
}
for (const required of ["PILOT_ADMIN_KEY"]) {
  if (!env[required]) throw new Error(`required production verification setting is missing: ${required}`);
}
const releaseSource = readFileSync(path.join(releaseDir, "src", "infrastructure", "pilot", "release", "release.generated.ts"), "utf8");
const releaseMatch = releaseSource.match(/Object\.freeze\((\{[\s\S]*?\}) as const\)/);
if (!releaseMatch) throw new Error("deployed release identity is unreadable");
const release = JSON.parse(releaseMatch[1]);
const fixture = JSON.parse(readFileSync(path.join(releaseDir, "tests", "fixtures", "workflow", "p0-minimal-case.json"), "utf8"));
const runId = `vps-health-${Date.now()}-${randomUUID().slice(0, 8)}`;
let created = null;

async function request(urlPath, { method = "GET", headers = {}, body } = {}) {
  const response = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers: body === undefined ? headers : { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

function expectStatus(result, expected, step) {
  if (result.status !== expected) throw new Error(`${step} returned ${result.status}, expected ${expected}, code=${result.body?.code ?? "unknown"}`);
}

const snapshot = {
  ...fixture.case.snapshot,
  intake: { ...fixture.case.snapshot.intake, description: `A7 deployment verification ${runId}` },
};
const payload = {
  clientCreationId: runId,
  accessToken: `${runId}-${randomUUID()}`,
  initialSnapshot: snapshot,
  currentStage: "症状信息",
  isBilateral: false,
  hasSafetyStop: false,
  source: { channel: "studio", detail: null },
  consent: snapshot.consent,
};

try {
  expectStatus(await request("/api/pilot/cases", { method: "POST", body: { ...payload, consent: null } }), 400, "consent boundary");
  const create = await request("/api/pilot/cases", {
    method: "POST",
    body: payload,
  });
  expectStatus(create, 201, "case create");
  created = create.body?.case;
  if (!created?.caseId || !created?.accessToken) throw new Error("case create omitted access identity");
  const authorization = { authorization: `Bearer ${created.accessToken}` };

  expectStatus(await request(`/api/pilot/cases/${created.caseId}`, { headers: authorization }), 200, "case read");
  const eventId = `${runId}-save`;
  expectStatus(await request(`/api/pilot/cases/${created.caseId}/progress`, {
    method: "POST",
    headers: authorization,
    body: {
      expectedRevision: 0,
      snapshot: { ...snapshot, step: 1 },
      eventType: "session_saved",
      eventId,
      eventPayload: { raw: {}, parsed: { source: "deployment-verification" }, inferred: {} },
      currentStage: "关键确认",
      sessionCount: 1,
    },
  }), 200, "progress save");
  expectStatus(await request(`/api/pilot/cases/${created.caseId}/feedback`, {
    method: "POST",
    headers: authorization,
    body: {
      eventId,
      sessionNumber: 1,
      stage: "关键确认",
      kind: "发布验证",
      message: "Automated deployment verification",
      sourceSessionNumber: 1,
      sourceStage: "关键确认",
      sourceEventId: eventId,
    },
  }), 201, "feedback create");
  const admin = await request(`/api/pilot/admin/cases/${created.caseId}`, {
    headers: { "x-pilot-admin-key": env.PILOT_ADMIN_KEY },
  });
  expectStatus(admin, 200, "admin case read");
  const adminEvidence = JSON.stringify(admin.body);
  for (const version of [release.appVersion, release.knowledgeVersion, release.decisionVersion]) {
    if (!adminEvidence.includes(version)) throw new Error(`admin case evidence omitted deployed version ${version}`);
  }
  if (!admin.body?.case?.events?.some((event) => event.type === "feedback_submitted")) {
    throw new Error("admin case evidence omitted submitted feedback event");
  }
  console.log(`production_http=passed build=${release.buildId}`);
} finally {
  if (created?.caseId && created?.accessToken) {
    const deleted = await request(`/api/pilot/cases/${created.caseId}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${created.accessToken}` },
    });
    expectStatus(deleted, 200, "verification case cleanup");
  }
}
