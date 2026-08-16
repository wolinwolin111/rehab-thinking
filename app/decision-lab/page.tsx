"use client";

import { useState } from "react";
import KneeDecisionLab from "./knee-decision-lab";
import LocalLimbDecisionLab from "./local-limb-decision-lab";

export default function DecisionLabPage() {
  const [module, setModule] = useState<"knee" | "local">("knee");
  return <><div style={{ position: "fixed", zIndex: 20, right: 24, top: 18, display: "flex", gap: 6, padding: 6, borderRadius: 12, background: "#fff", boxShadow: "0 8px 30px rgba(23,52,47,.15)" }}><button type="button" onClick={() => setModule("knee")} style={{ border: 0, borderRadius: 8, padding: "9px 14px", color: module === "knee" ? "#fff" : "#17342f", background: module === "knee" ? "#17342f" : "transparent", cursor: "pointer" }}>膝关节</button><button type="button" onClick={() => setModule("local")} style={{ border: 0, borderRadius: 8, padding: "9px 14px", color: module === "local" ? "#fff" : "#17342f", background: module === "local" ? "#17342f" : "transparent", cursor: "pointer" }}>大腿 / 小腿</button></div>{module === "knee" ? <KneeDecisionLab /> : <LocalLimbDecisionLab />}</>;
}
