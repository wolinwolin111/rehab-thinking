import { useState } from "react";

export function useTreatmentFlow() {
  const [treatmentFinalRetestScore, setTreatmentFinalRetestScore] = useState(0);
  const [treatmentFinalRetestConfirmed, setTreatmentFinalRetestConfirmed] = useState(false);
  return { treatmentFinalRetestScore, setTreatmentFinalRetestScore, treatmentFinalRetestConfirmed, setTreatmentFinalRetestConfirmed };
}