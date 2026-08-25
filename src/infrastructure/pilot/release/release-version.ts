import type { PilotReleaseVersions } from "@/src/infrastructure/pilot/api/case-contracts";
import { PILOT_SNAPSHOT_SCHEMA_VERSION } from "@/src/infrastructure/pilot/api/case-contracts";
import { GENERATED_PILOT_RELEASE } from "./release.generated";

export const PILOT_RELEASE_MANIFEST = Object.freeze({
  ...GENERATED_PILOT_RELEASE,
  schemaVersion: PILOT_SNAPSHOT_SCHEMA_VERSION,
});

/** The build-specific release identifiers stored with every pilot case and event. */
export const PILOT_RELEASE_VERSIONS: PilotReleaseVersions = {
  appVersion: PILOT_RELEASE_MANIFEST.appVersion,
  knowledgeVersion: PILOT_RELEASE_MANIFEST.knowledgeVersion,
  decisionVersion: PILOT_RELEASE_MANIFEST.decisionVersion,
};
