"use client";

import { useMemo } from "react";
import {
  buildPilotTreatmentUnits,
  matchPilotRelations,
  type PilotFindingInput,
  type PilotIntakeInput,
} from "@/src/domain/rehab/shared/pilot-decision-engine";
import { buildTissuePathway } from "@/src/domain/rehab/safety/tissue-pathway-core";

export type DecisionEngineTissueInput = Parameters<typeof buildTissuePathway>[0];

/** React 只缓存投影；所有业务决定仍由 domain 纯函数拥有。 */
export function useDecisionEngine(input: {
  intake: PilotIntakeInput;
  findings: PilotFindingInput[];
  tissue: DecisionEngineTissueInput;
}) {
  return useMemo(() => ({
    relations: matchPilotRelations(input.intake),
    treatmentUnits: buildPilotTreatmentUnits(input.intake, input.findings),
    tissuePathway: buildTissuePathway(input.tissue),
  }), [input.intake, input.findings, input.tissue]);
}
