export type PilotConsentState = "missing" | "confirmed" | "declined";
export type PilotFirstUseOverlay = "tutorial" | "source" | "consent" | "blocked" | "workspace";
export type PilotFirstUseEvent = "tutorial-finished" | "source-selected" | "consent-confirmed" | "consent-declined" | "consent-reconsidered";

export function resolvePilotFirstUseOverlay(input: {
  tutorialSeen: boolean;
  sourceSelected: boolean;
  consent: PilotConsentState;
}): PilotFirstUseOverlay {
  if (!input.tutorialSeen) return "tutorial";
  if (!input.sourceSelected) return "source";
  if (input.consent === "declined") return "blocked";
  return input.consent === "missing" ? "consent" : "workspace";
}

export function reducePilotFirstUseOverlay(
  current: PilotFirstUseOverlay,
  event: PilotFirstUseEvent,
  facts: { sourceSelected: boolean; consent: PilotConsentState },
): PilotFirstUseOverlay {
  if (current === "tutorial" && event === "tutorial-finished") {
    return facts.sourceSelected ? (facts.consent === "confirmed" ? "workspace" : facts.consent === "declined" ? "blocked" : "consent") : "source";
  }
  if (current === "source" && event === "source-selected") return facts.consent === "confirmed" ? "workspace" : facts.consent === "declined" ? "blocked" : "consent";
  if (current === "consent" && event === "consent-confirmed") return "workspace";
  if (current === "consent" && event === "consent-declined") return "blocked";
  if (current === "blocked" && event === "consent-reconsidered") return "consent";
  return current;
}

export function applyPilotTutorialOutcome<T extends {
  tutorialSeen: boolean;
  consent: PilotConsentState;
  businessState: unknown;
}>(state: T, outcome: "completed" | "skipped"): T {
  const tutorialSeen = outcome === "completed" || outcome === "skipped";
  return { ...state, tutorialSeen };
}
