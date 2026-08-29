import {
  actionIdFromFinding,
  anyMotionIdFromFinding,
  canonicalActionIdFromAssessmentId,
  dedupeAssessmentIdsByAction,
  dedupeRetestFindingsByAction,
  motionIdFromFinding,
  motionWasSymptomatic,
  samePhysicalAction,
} from "@/src/domain/rehab/intake/action-identity-core";
import {
  candidateDirectionChain,
  directionChain,
  includesAny,
  orderCandidatesByChain,
  pilotTreatmentMatchesCandidate,
} from "@/src/domain/rehab/treatment/candidate-order-core";
import {
  candidateDedupKey,
  candidateMatchesTensionLocation,
  isPatellaSpecificCandidate,
  selectTreatmentChainCandidates,
} from "@/src/domain/rehab/treatment/candidate-treatment-core";
import { candidateAllowedInSharpPath, candidateIsAvailable } from "@/src/domain/rehab/treatment/candidate-safety-core";
import { candidatePilotMotionIds } from "@/src/domain/rehab/treatment/candidate-action-core";
import { candidateRelevance } from "@/src/domain/rehab/treatment/candidate-scoring-core";
import {
  chiefActionLabel,
  chiefMotionDirectionId,
  hasClearChiefAction,
  isAcuteTrauma,
  assessmentSymptomCanDriveRetest,
} from "@/src/domain/rehab/intake/chief-action-core";
import { strengthFindingAnswer } from "@/src/domain/rehab/assessment/assessment-answer-core";
import { functionEvidenceFromRecord } from "@/src/domain/rehab/retest/function-evidence-core";
import {
  filterPatellaFindingsToLimited,
  isPatellaDirectionId,
  limitedPatellaDirections,
  patellaMobilityUnitTitle,
} from "@/src/domain/rehab/assessment/patella-mobility-core";
import { consolidateTrialTargetsByTreatment } from "@/src/domain/rehab/treatment/trial-target-core";
import {
  normalizePilotMuscleRegion,
  pilotMotionKnowledge,
  primaryRetestMotionIdsForRegion,
  professionalAssessmentTitle,
} from "@/src/knowledge/pilot/pilot-motion-muscle-knowledge";
import {
  KNEE_CORE_CANDIDATE_IDS,
  kneeCandidateAllowedInTreatmentQueue,
  kneeCandidateBelongsToCurrentDecision,
  kneeLegacyCandidateIdsForUnit,
  kneeRetestInstruction,
  kneeTreatmentInstruction,
} from "@/src/domain/rehab/shared/knee-workflow-adapter";
import { type DecisionContext, type FindingInput, type FullCandidateInput, type TrialTargetOutput } from "@/src/domain/rehab/treatment/trial-target-types";
import { kneeP0LineageFromAssessmentRecord, kneeP0UnitIdForTreatmentCandidate } from "@/src/knowledge/rehab/knee-p0-runtime";
import { ankleP0LineageForTreatment, ankleP0RecordsAfterRangeOutcomes, isAnkleP0CandidateId } from "@/src/knowledge/rehab/ankle-p0-runtime";
import { p0AssessmentEvidenceForDecision, p0JointCheckAllowed } from "@/src/knowledge/rehab/p0-assessment-access";
import {
  isKneeP1StandaloneTreatmentCandidateId,
  KNEE_P1_SCAR_TREATMENT_ID,
  kneeP1LineageForTreatment,
  kneeP1PatellaLineage,
} from "@/src/knowledge/rehab/p1-runtime";

export function buildTrialTargets(ctx: DecisionContext): TrialTargetOutput[] {
  const { region, findings, assessmentResults: storedAssessmentResults, intake, trialRecords, tissuePathway, kneeDecision, localLimbDecision, matchedPilotRelations, pilotRelationsByAssessmentId, pilotTreatmentUnits, matchedCandidateGroups, canAssessPassive, canMobilizeJoint, swellingGuidance, assessments, workflowProfile } = ctx;
  const candidateAccess = workflowProfile ?? intake.userRole;
  const canRunProfessionalUnit = workflowProfile ? workflowProfile.operationTarget === "other" : intake.userRole === "rehab";
  const SHARED_TENSION_ASSESSMENT_ID = ctx.sharedTensionId;
  const assessmentResults = workflowProfile
    ? Object.fromEntries(Object.entries(storedAssessmentResults).map(([id, record]) => [
      id,
      p0AssessmentEvidenceForDecision(id, record, workflowProfile),
    ])) as typeof storedAssessmentResults
    : storedAssessmentResults;
  if (workflowProfile?.palpationMode === "none" && assessmentResults[SHARED_TENSION_ASSESSMENT_ID]) {
    assessmentResults[SHARED_TENSION_ASSESSMENT_ID] = {
      ...assessmentResults[SHARED_TENSION_ASSESSMENT_ID],
      tensionLocations: [],
      tensionChecked: false,
    };
  }
  const assessmentTitle = ctx.assessmentTitle;
  const sharedTensionLocationsForMotion = ctx.sharedTensionLocationsForMotion;
  const chiefFunctionAssessmentId = ctx.chiefFunctionAssessmentId;
    const kneeLineage = (candidateId: string) => {
      const unitId = kneeP0UnitIdForTreatmentCandidate(candidateId);
      return unitId ? kneeP0LineageFromAssessmentRecord(unitId, assessmentResults["motion:knee-extension"]) : undefined;
    };
    // Several legacy pure-core harnesses concatenate this file without its
    // imported knowledge modules. Production always loads the runtime; the
    // guard keeps those harnesses on their legacy branch instead of throwing.
    const ankleP0RuntimeLoaded = typeof ankleP0RecordsAfterRangeOutcomes === "function"
      && typeof ankleP0LineageForTreatment === "function"
      && typeof isAnkleP0CandidateId === "function";
    const isReleasedAnkleCandidate = (candidateId: string) => ankleP0RuntimeLoaded && isAnkleP0CandidateId(candidateId);
    const ankleLineage = (candidateId: string) => ankleP0RuntimeLoaded
      ? ankleP0LineageForTreatment(candidateId, ankleP0AssessmentRecords)
      : undefined;
    if (!region || !findings.length) return [];
    const conservativeSharpPath = intake.stabbingPalpation === "sharp" || findings.some((finding) => finding.tags.includes("assessment-sharp"));
    const abnormalPilotMotionIds = findings
      .filter((finding) => finding.priority === "support" && finding.id.startsWith("motion:"))
      .map(motionIdFromFinding)
      .filter((directionId) => Boolean(pilotMotionKnowledge(directionId)));
    const ankleP0AssessmentRecords = region.id === "ankle-foot" && ankleP0RuntimeLoaded
      ? ankleP0RecordsAfterRangeOutcomes(assessmentResults, trialRecords.map((trial) => trial.rangeOutcomes))
      : assessmentResults;
    const sourceCandidatePool = [...(region.mobilityInterventions ?? []), ...region.candidateGroups.flatMap((group) => group.candidates)];
    const completedMuscleTrialDirections = new Set(trialRecords.flatMap((record) => {
      if (record.reviewOnly || record.retestOnly) return [];
      const sourceCandidate = sourceCandidatePool.find((candidate) => candidate.id === record.candidateId)
        ?? sourceCandidatePool.find((candidate) => pilotTreatmentMatchesCandidate(record.candidateId, candidate.id));
      if (sourceCandidate?.type !== "muscle" && !record.candidateId.startsWith("tension-muscle:")) return [];
      return [
        ...Object.keys(record.rangeOutcomes ?? {}),
        ...(record.targetId.startsWith("target:motion:") ? [record.targetId.replace("target:motion:", "")] : []),
        ...(sourceCandidate ? candidatePilotMotionIds(sourceCandidate) : []),
      ];
    }));
    const relatedMuscleTrialCompleted = (unit: (typeof pilotTreatmentUnits)[number]) => {
      const directionIds = unit.retestIds.map((id) => id.replace(/^(motion|function|strength):/, ""));
      return directionIds.some((directionId) => [...completedMuscleTrialDirections].some((completedId) => samePhysicalAction(completedId, directionId)));
    };
    // 髌腱/髌骨下方主诉如果同时出现在下蹲、台阶等负荷动作中，仍然要先
    // 走膝关节已经确认的高相关肌肉反应实验。肌腱负荷路径负责限制负荷
    // 和安排训练，不应把普通用户的首轮股直肌/股四头肌处理整个过滤掉。
    const allowKneeTendonMusclePath = region.id === "knee" && tissuePathway.id === "tendon-load";
    const allCandidates = sourceCandidatePool
      .map((candidate) => {
        const sourceUnits = pilotTreatmentUnits.filter((unit) => pilotTreatmentMatchesCandidate(unit.id, candidate.id));
        if (!sourceUnits.length) return candidate;
        return {
          ...candidate,
          retestIds: Array.from(new Set([
            ...(candidate.retestIds ?? []),
            ...sourceUnits.flatMap((unit) => unit.retestIds.map((id) => id.replace(/^(motion|function|strength):/, ""))),
          ])),
        };
      })
      .map((candidate) => {
        const currentUnit = region.id === "knee" ? kneeDecision?.currentTreatment : undefined;
        const mappedIds = kneeLegacyCandidateIdsForUnit(currentUnit?.id);
        if (!currentUnit || !mappedIds.includes(candidate.id)) return candidate;
        const knowledgeEvidence = kneeP0LineageFromAssessmentRecord(
          currentUnit.id,
          assessmentResults["motion:knee-extension"],
        );
        return {
          ...candidate,
          id: currentUnit.id,
          tags: [...candidate.tags, `knee-core:${currentUnit.id}`, `legacy-candidate:${candidate.id}`],
          // Released P0 branches own their exact retest contract.  Legacy
          // candidate metadata must not broaden an extension treatment into
          // unrelated knee directions.
          retestIds: knowledgeEvidence
            ? knowledgeEvidence.retestAssessmentIds.map((id) => id.replace(/^motion:/, ""))
            : Array.from(new Set([
                ...(candidate.retestIds ?? []),
                ...currentUnit.relatedActionIds.filter((actionId) => ["knee-extension", "knee-flexion"].includes(actionId)),
              ])),
          knowledgeEvidence,
          siteLabel: currentUnit.site,
          targetLabel: "",
          actionLabel: currentUnit.action,
          do: kneeTreatmentInstruction(currentUnit),
          retest: kneeRetestInstruction(currentUnit),
        };
      })
      .map((candidate) => {
        if (candidate.type !== "muscle") return candidate;
        const normalizedRegion = normalizePilotMuscleRegion(`${candidate.siteLabel ?? ""} ${candidate.targetLabel ?? ""} ${candidate.title} ${candidate.do} ${candidate.tags.join(" ")}`);
        const declaredMotionIds = candidatePilotMotionIds(candidate);
        const relatedAbnormalMotionIds = normalizedRegion && !declaredMotionIds.length
          ? abnormalPilotMotionIds.filter((directionId) => primaryRetestMotionIdsForRegion(normalizedRegion.id).some((motionId) => samePhysicalAction(motionId, directionId)))
          : [];
        const motionIds = [...new Set([...declaredMotionIds, ...relatedAbnormalMotionIds])];
        return motionIds.length
          ? { ...candidate, retestIds: Array.from(new Set([...(candidate.retestIds ?? []), ...motionIds])) }
          : candidate;
      })
      .flatMap((candidate) => {
        if (region.id !== "ankle-foot" || !isReleasedAnkleCandidate(candidate.id)) return [candidate];
        const knowledgeEvidence = ankleLineage(candidate.id);
        if (!knowledgeEvidence) return [];
        return [{
          ...candidate,
          knowledgeEvidence,
          retestIds: knowledgeEvidence.retestAssessmentIds.map((id) => id.replace(/^motion:/, "")),
        }];
      })
      .flatMap((candidate) => {
        const p0UnitId = region.id === "knee" ? kneeP0UnitIdForTreatmentCandidate(candidate.id) : undefined;
        if (!p0UnitId) return [candidate];
        const knowledgeEvidence = candidate.knowledgeEvidence ?? kneeLineage(candidate.id);
        return knowledgeEvidence ? [{
          ...candidate,
          knowledgeEvidence,
          retestIds: knowledgeEvidence.retestAssessmentIds.map((id) => id.replace(/^motion:/, "")),
        }] : [];
      })
      .flatMap((candidate) => {
        if (region.id !== "knee") return [candidate];
        const knowledgeEvidence = kneeP1LineageForTreatment(candidate.id, assessmentResults, candidate.knowledgeEvidence);
        if (candidate.id === KNEE_P1_SCAR_TREATMENT_ID && !knowledgeEvidence) return [];
        return [{
          ...candidate,
          knowledgeEvidence,
          retestIds: knowledgeEvidence
            ? knowledgeEvidence.retestAssessmentIds.map((id) => id.replace(/^motion:/, ""))
            : candidate.retestIds,
        }];
      })
      .filter((candidate) => candidateIsAvailable(candidate, candidateAccess))
      .filter((candidate) => candidate.id !== "knee-proximal-fibula"
        || !workflowProfile
        || p0JointCheckAllowed("K-P0-07", workflowProfile))
      .filter((candidate) => !pilotTreatmentUnits.some((unit) => pilotTreatmentMatchesCandidate(unit.id, candidate.id)
        && unit.requiresProfessional && !canRunProfessionalUnit))
      .filter((candidate) => !pilotTreatmentUnits.some((unit) => pilotTreatmentMatchesCandidate(unit.id, candidate.id)
        && unit.requiresPriorMuscleTrial && !relatedMuscleTrialCompleted(unit)))
      .filter((candidate) => tissuePathway.id !== "bone-stress-suspected" || candidate.type !== "muscle")
      .filter((candidate) => tissuePathway.id !== "tendon-load"
        || candidate.type === "swelling"
        || (allowKneeTendonMusclePath && ["muscle", "joint"].includes(candidate.type)))
      .filter((candidate) => tissuePathway.id !== "muscle-contusion" || candidate.type !== "muscle")
      .filter((candidate) => !localLimbDecision || localLimbDecision.treatmentIds.includes(candidate.id))
      .filter((candidate) => canMobilizeJoint || (candidate.type !== "joint" && candidate.type !== "neural"))
      .filter((candidate) => !(["thigh-local", "calf-local"].includes(region.id) && isAcuteTrauma(intake) && candidate.type === "muscle"))
      .filter((candidate) => candidateAllowedInSharpPath(candidate, conservativeSharpPath))
      .filter((candidate) => region.id !== "knee"
        || isKneeP1StandaloneTreatmentCandidateId(candidate.id)
        || kneeCandidateBelongsToCurrentDecision(candidate.id, kneeDecision))
      .filter((candidate, index, list) => list.findIndex((item) => item.id === candidate.id) === index);

    // 大腿/小腿局部模块使用独立决策结果，不再继续进入膝踝通用的
    // “按每个异常 finding 扩展候选”流程。这样一个局部只生成一次处理，
    // 急性拉伤和单纯无力也不会被通用规则重新塞入肌肉松解。
    if (localLimbDecision) {
      const completedLocalCandidateIds = new Set(trialRecords
        .filter((record) => !record.reviewOnly && !record.retestOnly && !record.timeBased)
        .map((record) => record.candidateId));
      const localCandidates = allCandidates
        .filter((candidate) => candidate.type === "muscle" && localLimbDecision.treatmentIds.includes(candidate.id))
        // 本次已完成的局部来源从动态队列移除；若它的反应只解决一部分，
        // 新开放的下一来源会占据原位置继续验证。历史康复记录不在这里移除。
        .filter((candidate) => !completedLocalCandidateIds.has(candidate.id))
        .map((candidate) => {
          const ownActionIds = new Set((candidate.retestIds ?? []).map(canonicalActionIdFromAssessmentId));
          const relevantRetestIds = localLimbDecision.retestIds.filter((id) => ownActionIds.has(canonicalActionIdFromAssessmentId(id)));
          return { ...candidate, retestIds: dedupeAssessmentIdsByAction(relevantRetestIds) };
        });
      const localTargets: TrialTargetOutput[] = [];
      if (swellingGuidance) {
        const swellingFinding = findings.find((finding) => finding.id === "track:swelling");
        if (swellingFinding) localTargets.push({ id: "target:swelling", finding: swellingFinding, candidates: [swellingGuidance], chain: "肿胀管理" });
      }
      if (localCandidates.length) {
        const retestActionIds = new Set(localCandidates.flatMap((candidate) => candidate.retestIds ?? []).map(canonicalActionIdFromAssessmentId));
        const retestFindings = dedupeRetestFindingsByAction(findings.filter((finding) => finding.id.startsWith("motion:") && retestActionIds.has(actionIdFromFinding(finding))));
        localTargets.push({
          id: "target:local-limb",
          finding: retestFindings[0] ?? findings[0],
          retestFindings,
          candidates: localCandidates,
          chain: "局部症状",
          retestLabel: chiefActionLabel(intake),
        });
      }
      // 局部大腿/小腿路径也必须承接专业被动活动结果。此前这里早早
      // return 了局部肌肉目标，导致 PROM 明确受限时永远没有后续关节
      // 处理，即使使用者已经勾选“被动活动度”和“关节处理”。
      const locallyLimitedPassiveFindings = canAssessPassive
        ? dedupeRetestFindingsByAction(findings.filter((finding) => {
          if (!finding.id.startsWith("motion:")) return false;
          const record = assessmentResults[finding.id];
          return record?.passive === "limited";
        }))
        : [];
      if (canMobilizeJoint && locallyLimitedPassiveFindings.length) {
        const locallyLimitedDirections = locallyLimitedPassiveFindings.map(motionIdFromFinding);
        const localJointCandidates = allCandidates
          .filter((candidate) => candidate.type === "joint")
          .filter((candidate) => (candidate.retestIds ?? []).some((candidateDirection) => locallyLimitedDirections.some((directionId) => samePhysicalAction(candidateDirection, directionId))));
        const fallbackJointCandidates = locallyLimitedDirections
          .filter((directionId) => !localJointCandidates.some((candidate) => (candidate.retestIds ?? []).some((candidateDirection) => samePhysicalAction(candidateDirection, directionId))))
          .map((directionId) => ({
            id: `joint-mobilization:${directionId}`,
            title: `${professionalAssessmentTitle(`motion:${directionId}`, "受限方向")}关节松动`,
            type: "joint" as const,
            access: "therapist" as const,
            do: `由专业人员根据${professionalAssessmentTitle(`motion:${directionId}`, "受限方向")}的受限方向完成低刺激关节松动。`,
            observe: "只记录活动范围和原动作反应；出现锐痛、硬性阻挡或症状加重时停止。",
            retest: `先复测${professionalAssessmentTitle(`motion:${directionId}`, "受限方向")}，再复测原来的不适动作。`,
            tags: ["local-limb", "joint-mobility", "professional-fallback"],
            retestIds: [directionId],
          } satisfies FullCandidateInput));
        const jointCandidates = [...localJointCandidates, ...fallbackJointCandidates]
          .filter((candidate, index, list) => list.findIndex((item) => candidateDedupKey(item) === candidateDedupKey(candidate)) === index);
        if (jointCandidates.length) localTargets.push({
          id: "target:local-limb-joint",
          finding: locallyLimitedPassiveFindings[0],
          retestFindings: locallyLimitedPassiveFindings,
          candidates: jointCandidates,
          chain: "关节处理",
          retestLabel: locallyLimitedPassiveFindings.map((finding) => finding.title).join("、"),
        });
      }
      return localTargets;
    }
    // 非标准组织路径不进入通用的“没有候选就补温和活动”兜底。
    // 否则疑似骨应力或肌腱负荷即使已过滤普通候选，仍会被重新生成
    // 即时处理并要求当场复测。只有用户确实记录了肿胀时保留一次管理。
    if (tissuePathway.id !== "standard" && !allowKneeTendonMusclePath) {
      const swellingFinding = findings.find((finding) => finding.id === "track:swelling");
      return swellingGuidance && swellingFinding
        ? [{ id: "target:swelling", finding: swellingFinding, candidates: [swellingGuidance], chain: "肿胀管理" }]
        : [];
    }
    const pilotSourceCaseIds = Array.from(new Set(matchedPilotRelations.flatMap(({ relation }) => relation.sourceCases)));
    const relationsForFinding = (finding: FindingInput) => {
      const assessmentId = finding.id.replace(/^symptom:|^control:/, "");
      return pilotRelationsByAssessmentId.get(assessmentId) ?? matchedPilotRelations;
    };
    const sourceCaseIdsForFinding = (finding: FindingInput) => Array.from(new Set(relationsForFinding(finding).flatMap(({ relation }) => relation.sourceCases)));
    const pilotCandidateScore = (candidate: FullCandidateInput, relationEntries = matchedPilotRelations) => {
      const identity = `${candidate.id} ${candidate.title} ${candidate.siteLabel ?? ""} ${candidate.targetLabel ?? ""} ${candidate.actionLabel ?? ""} ${candidate.tags.join(" ")}`;
      const currentKneeCandidateIds = kneeDecision?.currentTreatment
        ? [kneeDecision.currentTreatment.id, ...(KNEE_CORE_CANDIDATE_IDS[kneeDecision.currentTreatment.id] ?? [])]
        : [];
      const availableKneeCandidateIds = kneeDecision
        ? new Set(kneeDecision.treatmentUnits.flatMap((unit) => KNEE_CORE_CANDIDATE_IDS[unit.id] ?? []))
        : new Set<string>();
      const kneeCoreScore = region.id === "knee"
        ? currentKneeCandidateIds.includes(candidate.id) ? 5000 : availableKneeCandidateIds.has(candidate.id) ? 1200 : 0
        : 0;
      const supportedFindingScore = pilotTreatmentUnits.reduce((total, hint) => {
        const exactSourceMatch = pilotTreatmentMatchesCandidate(hint.id, candidate.id);
        const sameKind = hint.kind === candidate.type || hint.kind === "symptom-management" && candidate.type === "swelling";
        const hintRetestIds = hint.retestIds.map((id) => id.replace(/^(motion|function|strength):/, ""));
        const sameRetest = (candidate.retestIds ?? []).some((id) => hintRetestIds.some((hintId) => samePhysicalAction(id, hintId)));
        const siteTokens = hint.site.split(/[、，与和/\s]+/).filter((token) => token.length >= 2);
        const siteMatch = siteTokens.some((token) => identity.includes(token));
        return total + (exactSourceMatch ? 600 : sameKind && sameRetest && siteMatch ? 180 : sameKind && sameRetest ? 120 : 0);
      }, 0);
      const relationScore = relationEntries.reduce((total, { relation, score }) => total + relation.treatmentCandidates.reduce((candidateTotal, hint) => {
        const exactSourceMatch = pilotTreatmentMatchesCandidate(hint.id, candidate.id);
        const sameKind = hint.kind === candidate.type || hint.kind === "symptom-management" && candidate.type === "swelling";
        const hintRetestIds = hint.retestIds.map((id) => id.replace(/^(motion|function|strength):/, ""));
        const sameRetest = (candidate.retestIds ?? []).some((id) => hintRetestIds.some((hintId) => samePhysicalAction(id, hintId)));
        const siteTokens = hint.site.split(/[、，与和/\s]+/).filter((token) => token.length >= 2);
        const siteMatch = siteTokens.some((token) => identity.includes(token));
        return candidateTotal + (exactSourceMatch ? score * 30 : sameKind && sameRetest ? score * 12 : sameKind && siteMatch ? score * 8 : sameRetest ? score * 4 : 0);
      }, 0), 0);
      return kneeCoreScore + supportedFindingScore + relationScore;
    };
    const supportTags = new Set(findings.filter((finding) => finding.priority === "support").flatMap((finding) => finding.tags));
    const matchedChiefCandidateIds = new Set(matchedCandidateGroups.flatMap((group) => group.candidates.map((candidate) => candidate.id)));
    const abnormalMotionFindings = findings.filter((finding) => finding.priority === "support" && finding.id.startsWith("motion:"));
    const abnormalMotionIds = abnormalMotionFindings.map(motionIdFromFinding);
    const selectedTensionLocations = [...new Set((assessmentResults[SHARED_TENSION_ASSESSMENT_ID]?.tensionLocations ?? [])
      .filter((location) => !["没有明显差别", "两侧感觉接近"].includes(location)))];
    // 处理单位按区域建立，而不是按“区域 × 每个受限方向”建立。
    // 同一区域只出现一次，并只携带该区域直接影响的异常活动平面。
    const directTensionCandidates: FullCandidateInput[] = selectedTensionLocations.flatMap((location) => {
      const normalizedRegion = normalizePilotMuscleRegion(location);
      const candidateId = `tension-muscle:${normalizedRegion?.id ?? location}`;
      const relatedMotionIds = normalizedRegion
        ? abnormalMotionIds.filter((directionId) => primaryRetestMotionIdsForRegion(normalizedRegion.id).some((motionId) => samePhysicalAction(motionId, directionId)))
        : [];
      const knowledgeEvidence = region.id === "ankle-foot"
        ? ankleLineage(candidateId)
        : region.id === "knee" ? kneeLineage(candidateId) : undefined;
      if (region.id === "ankle-foot" && normalizedRegion?.id.startsWith("calf-") && !knowledgeEvidence) return [];
      if (region.id === "knee" && kneeP0UnitIdForTreatmentCandidate(candidateId) && !knowledgeEvidence) return [];
      const exactMotionIds = knowledgeEvidence
        ? knowledgeEvidence.retestAssessmentIds.map((id) => id.replace(/^motion:/, ""))
        : relatedMotionIds;
      return exactMotionIds.length ? [{
          id: candidateId,
          title: `${location}轻柔松解`,
          type: "muscle",
          access: "self",
          do: `按图示在${location}两侧轻按一次，以按压时更酸或更胀的一侧为重点，轻柔处理30～60秒。`,
          observe: "只做轻柔按压；出现明显刺痛、麻或电感就停止。",
          retest: "处理后只比较该区域直接影响的活动方向和原来的不适动作。",
          tags: [...new Set(exactMotionIds.flatMap((directionId) => abnormalMotionFindings.find((finding) => samePhysicalAction(motionIdFromFinding(finding), directionId))?.tags ?? [])), `tension:${location}`],
          retestIds: exactMotionIds,
          knowledgeEvidence,
          siteLabel: location,
          targetLabel: `${location}紧张区域`,
          actionLabel: "轻柔肌肉松解",
        } satisfies FullCandidateInput] : [];
      });
    const chiefCandidateScore = (candidate: FullCandidateInput) => candidateRelevance(candidate, intake, supportTags) + pilotCandidateScore(candidate) + (matchedChiefCandidateIds.has(candidate.id) ? 30 : 0) + (candidate.id.startsWith("tension-muscle:") ? 1000 : 0);
    const typeOrder: FullCandidateInput["type"][] = includesAny(intake.symptomType, ["麻", "电"])
      ? ["neural", "muscle", "control", "joint", "swelling"]
      : intake.provocationTypes.includes("用力或对抗阻力") || intake.symptoms.includes("力量不足") || includesAny(intake.symptomType, ["无力", "不稳"])
        ? ["muscle", "control", "joint", "neural", "swelling"]
        : includesAny(intake.symptomType, ["刺", "胀"])
          ? ["swelling", "muscle", "joint", "control", "neural"]
          : ["muscle", "control", "joint", "neural", "swelling"];
    const sourceBackedCandidates = allCandidates.filter((candidate) => pilotTreatmentUnits.some((unit) => pilotTreatmentMatchesCandidate(unit.id, candidate.id)));
    const orderedChiefCandidates = [...directTensionCandidates, ...sourceBackedCandidates, ...matchedCandidateGroups.flatMap((group) => group.candidates), ...allCandidates.filter((candidate) => candidate.tags.some((tag) => supportTags.has(tag)))]
      .filter((candidate) => region.id !== "ankle-foot" || !isReleasedAnkleCandidate(candidate.id) || allCandidates.some((eligible) => eligible.id === candidate.id))
      .filter((candidate) => region.id !== "knee" || kneeCandidateAllowedInTreatmentQueue(candidate.id, kneeDecision))
      .filter((candidate) => candidateIsAvailable(candidate, candidateAccess))
      .filter((candidate) => canMobilizeJoint || (candidate.type !== "joint" && candidate.type !== "neural"))
      .filter((candidate) => candidateAllowedInSharpPath(candidate, conservativeSharpPath))
      // 现场处理只保留能立刻复测的松解、关节或专业神经处理；肿胀单独跟踪，控制训练放到训练阶段。
      .filter((candidate) => !["swelling", "control"].includes(candidate.type))
      .filter((candidate, index, list) => list.findIndex((item) => candidateDedupKey(item) === candidateDedupKey(candidate)) === index)
      .sort((a, b) => {
        const relevanceDifference = chiefCandidateScore(b) - chiefCandidateScore(a);
        return relevanceDifference || typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
      });
    const chiefCandidates = orderedChiefCandidates.slice(0, 3);
    const chiefOptionalCandidates = orderedChiefCandidates.slice(3, 6);
    const chiefDirection = chiefMotionDirectionId(intake, region.id);
    const spinalRegion = ["neck", "thoracic-rib", "lumbar-pelvis"].includes(region.id);
    const motionFindings = findings
      .filter((finding) => finding.priority === "support" && finding.id.startsWith("motion:"))
      // 脊柱以症状动作和功能影响为处理入口；无不适的单纯角度差先记录，不自动追着角度处理。
      .filter((finding) => !spinalRegion
        || samePhysicalAction(motionIdFromFinding(finding), chiefDirection)
        || motionWasSymptomatic(motionIdFromFinding(finding), assessmentResults, chiefDirection));
    const painfulStrengthTargets = findings
      // 配对力量结果显示在活动度卡片里，finding 本身没有独立的
      // assessmentResults 键；不能因为查不到该键就把“发力会痛”丢掉。
      .filter((finding) => finding.id.startsWith("strength:") && strengthFindingAnswer(finding, assessmentResults) === "painful")
      // 配对力量已合并到同一个活动动作；独立力量检查仍保留单独处理入口。
      .filter((finding) => !finding.relatedMotionId)
      .filter((finding) => {
        const record = assessmentResults[finding.id];
        return record ? assessmentSymptomCanDriveRetest(record, intake) : true;
      })
      .map((finding): TrialTargetOutput | null => {
        const direct = allCandidates
          .filter((candidate) => !["joint", "swelling", "control"].includes(candidate.type))
          .filter((candidate) => candidate.tags.some((tag) => finding.tags.includes(tag)))
          .sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type));
        const relationEntries = relationsForFinding(finding);
        const ordered = orderCandidatesByChain(direct
          .filter((candidate, index, list) => list.findIndex((item) => candidateDedupKey(item) === candidateDedupKey(candidate)) === index));
        ordered.sort((a, b) => pilotCandidateScore(b, relationEntries) - pilotCandidateScore(a, relationEntries));
        return ordered.length ? { id: `target:${finding.id}`, finding, candidates: ordered.slice(0, 3), optionalCandidates: ordered.slice(3), chain: directionChain(anyMotionIdFromFinding(finding) ?? finding.id.replace(/^strength:/, "")), retestLabel: assessments.find((item) => item.id === finding.id)?.title ?? finding.title.split("：")[0], sourceCaseIds: sourceCaseIdsForFinding(finding) } : null;
      })
      .filter((target): target is TrialTargetOutput => Boolean(target));
    const painfulFunctionTargets = findings
      .filter((finding) => finding.id.startsWith("function:") && ["painful", "unable"].includes(assessmentResults[finding.id]?.simple ?? ""))
      .filter((finding) => assessmentSymptomCanDriveRetest(assessmentResults[finding.id], intake))
      .map((finding): TrialTargetOutput | null => {
      const pool = allCandidates.filter((candidate) => candidate.tags.some((tag) => finding.tags.includes(tag)) && !["swelling", "control"].includes(candidate.type));
      const relationEntries = relationsForFinding(finding);
      const ordered = orderCandidatesByChain(pool).sort((a, b) => pilotCandidateScore(b, relationEntries) - pilotCandidateScore(a, relationEntries));
      const evidence = functionEvidenceFromRecord(finding.id, assessmentResults[finding.id]);
      const label = assessments.find((item) => item.id === finding.id)?.title ?? finding.title.split(/因为|不稳定|会引起/)[0];
      const obligation = evidence.channels.retest && (evidence.completion === "complete" || evidence.completion === "unable") && evidence.retestMode !== "none"
        ? [{
            assessmentId: finding.id,
            label,
            baselineCompletion: evidence.completion,
            mode: evidence.retestMode,
            ...(typeof assessmentResults[finding.id]?.symptomScore === "number" ? { baselineScore: assessmentResults[finding.id]?.symptomScore } : {}),
            ...(intake.side === "双侧/中间" ? { sides: ["左侧", "右侧"] as Array<"左侧" | "右侧"> } : {}),
          }]
        : [];
      return ordered.length ? { id: `target:${finding.id}`, finding, candidates: ordered.slice(0, 3), optionalCandidates: ordered.slice(3), functionRetestObligations: obligation, chain: directionChain(anyMotionIdFromFinding(finding) ?? ""), retestLabel: label, sourceCaseIds: sourceCaseIdsForFinding(finding) } : null;
    }).filter((target): target is TrialTargetOutput => Boolean(target));

    const painfulMotionOnlyTargets = findings
      .filter((finding) => finding.id.startsWith("symptom:motion:"))
      .filter((finding) => !findings.some((entry) => entry.id === finding.id.replace(/^symptom:/, "")))
      .filter((finding) => assessmentSymptomCanDriveRetest(assessmentResults[finding.id.replace(/^symptom:/, "")], intake))
      .map((finding): TrialTargetOutput | null => {
        const assessmentId = finding.id.replace(/^symptom:/, "");
        const pool = allCandidates
          .filter((candidate) => !["swelling", "control"].includes(candidate.type))
          .filter((candidate) => candidate.tags.some((tag) => finding.tags.includes(tag)));
        const relationEntries = relationsForFinding(finding);
        const ordered = orderCandidatesByChain(pool)
          .filter((candidate, index, list) => list.findIndex((item) => candidateDedupKey(item) === candidateDedupKey(candidate)) === index);
        ordered.sort((a, b) => pilotCandidateScore(b, relationEntries) - pilotCandidateScore(a, relationEntries));
        return ordered.length ? {
          id: `target:${finding.id}`,
          finding,
          candidates: ordered.slice(0, 3),
          optionalCandidates: ordered.slice(3, 6),
          chain: directionChain(assessmentId.replace(/^motion:/, "")),
          retestLabel: assessments.find((item) => item.id === assessmentId)?.title ?? finding.title.split("会引起")[0],
          sourceCaseIds: sourceCaseIdsForFinding(finding),
        } : null;
      })
      .filter((target): target is TrialTargetOutput => Boolean(target));

    const buildMotionTarget = (finding: FindingInput): TrialTargetOutput | null => {
      const record = assessmentResults[finding.id];
      const directionId = motionIdFromFinding(finding);
      const selectedTension = sharedTensionLocationsForMotion(finding.id, record ?? {}, assessmentResults[SHARED_TENSION_ASSESSMENT_ID]).filter((location) => location !== "没有明显差别");
      const patellaDirection = isPatellaDirectionId(`motion:${directionId}`);
      const ankleP0Direction = region.id === "ankle-foot" && [
        "ankle-dorsiflexion",
        "ankle-dorsiflexion-knee-flexed",
        "ankle-eversion",
        "ankle-cuboid-mobility",
        "ankle-toe-flexion",
      ].includes(directionId);
      const releasedP0Direction = ankleP0Direction
        || region.id === "knee" && ["knee-extension", "knee-scar-mobility"].includes(directionId);
      const directionCandidates = allCandidates
        .filter((candidate) => (candidate.retestIds ?? []).some((candidateDirection) => samePhysicalAction(candidateDirection, directionId)) || candidate.tags.some((tag) => finding.tags.includes(tag)))
        .filter((candidate) => !ankleP0Direction || !ankleP0RuntimeLoaded || isReleasedAnkleCandidate(candidate.id))
        // 髌骨方向只使用明确的髌骨处理候选；不能把“膝关节伸直方向松动”
        // 这种泛化候选因为带有 patella 标签，误合并成髌骨处理单元。
        .filter((candidate) => !patellaDirection || isPatellaSpecificCandidate(candidate));
      const muscleCandidates = directionCandidates
        .filter((candidate) => candidate.type === "muscle")
        .filter((candidate) => !selectedTension.length || selectedTension.some((location) => candidateMatchesTensionLocation(candidate, location)));
      // 只看当前处理序列的最新被动结果。初始评估的 PROM 受限不能在
      // 肌肉处理后已经恢复时继续把通用关节候选抢到队列前面。
      const directionRetestRecords = trialRecords.filter((trial) =>
        !trial.reviewOnly && !trial.retestOnly
        && Object.keys(trial.rangeOutcomes ?? {}).some((id) => samePhysicalAction(id, directionId)));
      const latestDirectionOutcome = [...trialRecords].reverse()
        .flatMap((trial) => Object.entries(trial.rangeOutcomes ?? {}))
        .find(([id]) => samePhysicalAction(id, directionId))?.[1];
      const postTreatmentPassiveLimited = ["better-passive-limited", "passive-limited"].includes(latestDirectionOutcome ?? "");
      // 关节路径只由“被动活动仍小于对侧”触发。终末感继续记录用于
      // 选择更谨慎的手法和安全提示，但不再作为必须命中的硬门槛。
      const jointEvidence = canAssessPassive
        && (postTreatmentPassiveLimited || (!directionRetestRecords.length && record?.passive === "limited"));
      const declaredJointCandidates = jointEvidence
        ? directionCandidates.filter((candidate) => candidate.type === "joint")
        : [];
      // Keep a guaranteed professional exit for a confirmed PROM limitation.
      // Some older library entries describe a joint by structure tags only and
      // therefore do not match a direction-specific finding (notably ankle
      // eversion). The fallback is never available to self-guided users.
      const jointCandidates = jointEvidence && canMobilizeJoint && !declaredJointCandidates.length && !releasedP0Direction
        ? [{
          id: `joint-mobilization:${directionId}`,
          title: `${professionalAssessmentTitle(`motion:${directionId}`, "受限方向")}关节松动`,
          type: "joint" as const,
          access: "therapist" as const,
          do: `由专业人员根据${professionalAssessmentTitle(`motion:${directionId}`, "受限方向")}的受限方向完成低刺激关节松动。`,
          observe: "只记录活动范围和原动作反应；出现锐痛、硬性阻挡或症状加重时停止。",
          retest: `先复测${professionalAssessmentTitle(`motion:${directionId}`, "受限方向")}，再复测原来的不适动作。`,
          tags: [...finding.tags, "joint-mobility", "professional-fallback"],
          retestIds: [directionId],
        } satisfies FullCandidateInput]
        : declaredJointCandidates;
      const controlCandidates = directionCandidates.filter((candidate) => candidate.type === "control");
      let pool: FullCandidateInput[] = [];
      if (selectedTension.length) {
        const explicitTensionCandidates: FullCandidateInput[] = selectedTension.flatMap((location) => {
          const normalizedRegion = normalizePilotMuscleRegion(location);
          const candidateId = `tension-muscle:${normalizedRegion?.id ?? location}`;
          const relatedMotionIds = normalizedRegion
            ? abnormalMotionIds.filter((motionId) => primaryRetestMotionIdsForRegion(normalizedRegion.id).some((primaryMotionId) => samePhysicalAction(primaryMotionId, motionId)))
            : [directionId];
          const knowledgeEvidence = region.id === "ankle-foot"
            ? ankleLineage(candidateId)
            : region.id === "knee" ? kneeLineage(candidateId) : undefined;
          const exactMotionIds = knowledgeEvidence
            ? knowledgeEvidence.retestAssessmentIds.map((id) => id.replace(/^motion:/, ""))
            : relatedMotionIds;
          if (region.id === "ankle-foot" && normalizedRegion?.id.startsWith("calf-") && !knowledgeEvidence) return [];
          if (region.id === "knee" && kneeP0UnitIdForTreatmentCandidate(candidateId) && !knowledgeEvidence) return [];
          return [({
          id: candidateId,
          title: `${location}轻柔松解`,
          type: "muscle",
          access: "self",
          do: `按图示在${location}两侧轻按一次，以按压时更酸或更胀的一侧为重点，轻柔处理30～60秒。`,
          observe: "只做轻柔按压；出现明显刺痛、麻或电感就停止。",
          retest: `重新比较${assessmentTitle(directionId, finding.title)}的活动范围和不适。`,
          tags: [...finding.tags, `tension:${location}`],
          retestIds: exactMotionIds.length ? exactMotionIds : [directionId],
          knowledgeEvidence,
          siteLabel: location,
          targetLabel: `${location}紧张区域`,
          actionLabel: "轻柔肌肉松解",
        })]; });
        pool = [...explicitTensionCandidates, ...muscleCandidates, ...jointCandidates, ...controlCandidates];
      }
      else {
        const localMuscleCheck = ["thigh-local", "calf-local"].includes(region.id) && !isAcuteTrauma(intake);
        pool = [...(localMuscleCheck ? muscleCandidates : []), ...controlCandidates, ...jointCandidates];
      }
      if (!pool.length && releasedP0Direction) return null;
      if (!pool.length) pool = [{
          id: `gentle-motion:${directionId}`,
          title: `${assessmentTitle(directionId, finding.title)}温和活动`,
          type: "control",
          access: "self",
          do: `在不明显增加不适的范围内，缓慢完成${assessmentTitle(directionId, finding.title)}5～8次。`,
          observe: "动作保持轻柔，不追求一次做到最大范围。",
          retest: `重新比较${assessmentTitle(directionId, finding.title)}的活动范围和不适。`,
          tags: [...finding.tags, "gentle-motion"],
          retestIds: [directionId],
          siteLabel: region.shortName,
          actionLabel: "温和活动",
        }];
      const relationEntries = relationsForFinding(finding);
      const ordered = pool
        .filter((candidate, index, list) => list.findIndex((item) => candidateDedupKey(item) === candidateDedupKey(candidate)) === index)
        .sort((a, b) => {
          const chainDifference = Number(candidateDirectionChain(a, directionChain(directionId)) !== directionChain(directionId)) - Number(candidateDirectionChain(b, directionChain(directionId)) !== directionChain(directionId));
          return chainDifference || (candidateRelevance(b, intake, new Set(finding.tags)) + pilotCandidateScore(b, relationEntries)) - (candidateRelevance(a, intake, new Set(finding.tags)) + pilotCandidateScore(a, relationEntries));
        });
      const selected = selectTreatmentChainCandidates(ordered).map((candidate) => ({
        ...candidate,
        // 该处理候选既然是为当前异常方向生成，就必须把当前方向保留
        // 到复测计划中。候选知识条目遗漏 retestIds 时也不能丢掉它。
        retestIds: candidate.knowledgeEvidence
          ? candidate.knowledgeEvidence.retestAssessmentIds.map((id) => id.replace(/^motion:/, ""))
          : Array.from(new Set([...(candidate.retestIds ?? []), directionId])),
      }));
      const selectedRetestIds = new Set(selected.flatMap((candidate) => candidate.retestIds ?? []));
      const retestFindings = motionFindings.filter((motionFinding) => [...selectedRetestIds].some((id) => samePhysicalAction(id, motionIdFromFinding(motionFinding))));
      return selected.length ? { id: `target:${finding.id}`, finding, retestFindings, candidates: selected, optionalCandidates: ordered.filter((candidate) => !selected.some((chosen) => candidateDedupKey(chosen) === candidateDedupKey(candidate))).slice(0, 3), chain: directionChain(directionId), retestLabel: assessments.find((item) => item.id === finding.id)?.title ?? finding.title.split(/范围偏小|会引起/)[0], sourceCaseIds: sourceCaseIdsForFinding(finding) } : null;
    };

    const patellaMotionFindings = motionFindings.filter((finding) => isPatellaDirectionId(`motion:${motionIdFromFinding(finding)}`));
    // 髌骨四方向是一个稳定处理单元：一张处理卡列出所有受限方向，一张复测卡
    // 统一记录；后台仍按方向保存，达到比较目标的方向由复测引擎退出后续队列。
    // 只有具备关节松动能力的专业操作才进入合并单元；不能松动时仍走原有
    // 按方向生成候选的路径，保留“需要专业人员协助”等既有出口。
    const limitedPatellaIds = limitedPatellaDirections(assessmentResults);
    const useCombinedPatellaUnit = canMobilizeJoint && limitedPatellaIds.length > 0 && patellaMotionFindings.length > 0;
    const nonPatellaMotionFindings = useCombinedPatellaUnit
      ? motionFindings.filter((finding) => !isPatellaDirectionId(`motion:${motionIdFromFinding(finding)}`))
      : motionFindings;
    const patellaMobilityTarget: TrialTargetOutput | null = (() => {
      if (!useCombinedPatellaUnit) return null;
      const title = patellaMobilityUnitTitle(limitedPatellaIds);
      const candidate: FullCandidateInput = {
        id: "patella-mobility-unit",
        title,
        type: "joint",
        access: "therapist",
        do: "由专业人员让膝盖完全放松，逐一轻柔比较并处理刚才受限的髌骨方向；每个方向只做一次，出现锐痛或硬性阻挡时立即停止。",
        observe: "与对侧相比的被动活动幅度、末端感觉和被动不适；只记录真正受限的方向。",
        retest: "统一复测刚才受限的髌骨方向，记录被动活动幅度和被动不适。",
        tags: ["patella", "joint-mobility", "patella-mobility-unit"],
        retestIds: [...limitedPatellaIds],
        siteLabel: "髌骨",
        targetLabel: "",
        actionLabel: title,
        knowledgeEvidence: kneeP1PatellaLineage(limitedPatellaIds),
      };
      return {
        id: "target:patella-mobility-unit",
        finding: patellaMotionFindings[0],
        retestFindings: filterPatellaFindingsToLimited(patellaMotionFindings, limitedPatellaIds),
        candidates: [candidate],
        chain: "髌骨活动",
        retestLabel: title,
        sourceCaseIds: [...new Set(patellaMotionFindings.flatMap((finding) => sourceCaseIdsForFinding(finding)))],
      };
    })();
    const motionTargets = [patellaMobilityTarget, ...nonPatellaMotionFindings.map(buildMotionTarget)].filter((target): target is TrialTargetOutput => Boolean(target));
    const collapseEmbeddedControls = (target: TrialTargetOutput): TrialTargetOutput => {
      const embeddedDirectionIds = new Set(target.candidates
        .filter((candidate) => candidate.type === "muscle")
        .flatMap(candidatePilotMotionIds));
      if (!embeddedDirectionIds.size) return target;
      const keep = (candidate: FullCandidateInput) => candidate.type !== "control"
        || !candidatePilotMotionIds(candidate).some((directionId) => embeddedDirectionIds.has(directionId));
      return {
        ...target,
        candidates: target.candidates.filter(keep),
        optionalCandidates: target.optionalCandidates?.filter(keep),
      };
    };
    const sameDirectionMotionTarget = chiefDirection ? motionTargets.find((target) => samePhysicalAction(motionIdFromFinding(target.finding), chiefDirection)) : undefined;
    const chiefFunctionTarget = painfulFunctionTargets.find((target) => target.finding.id === chiefFunctionAssessmentId(intake, region.id));
    const remainingMotionTargets = sameDirectionMotionTarget ? motionTargets.filter((target) => target !== sameDirectionMotionTarget) : motionTargets;
    const targets: TrialTargetOutput[] = [];
    if (hasClearChiefAction(intake)) {
      // S-06：target:chief 的侧别只跟随主诉明确声明的优先侧；无优先侧时保留
      // 首条发现原值（不清空、也不用评估更差侧覆写）——与 bilateral-flow-core
      // 「评估更差侧只能提醒、不得静默替换主诉」的承诺一致。
      const chiefComplaintSide = intake.prioritySide;
      const combinedChiefCandidates = [...(sameDirectionMotionTarget?.candidates ?? []), ...chiefCandidates]
        .filter((candidate, index, list) => list.findIndex((item) => candidateDedupKey(item) === candidateDedupKey(candidate)) === index);
      const combinedOptional = [...(sameDirectionMotionTarget?.optionalCandidates ?? []), ...chiefOptionalCandidates]
        .filter((candidate, index, list) => list.findIndex((item) => candidateDedupKey(item) === candidateDedupKey(candidate)) === index)
        .filter((candidate) => !combinedChiefCandidates.some((chosen) => candidateDedupKey(chosen) === candidateDedupKey(candidate)));
      // The chief route may start with several highly related muscles, but it
      // must not lose the later joint/control branch simply because of slicing.
      // 用户在统一触诊中明确选出的区域都属于本次检查证据。全阳性时不能
      // 被固定的“三项上限”截掉第4个区域；这些候选仍按区域逐个验证，
      // 相关方向若提前恢复，后续候选会由 directionNeedsCandidate 自动跳过。
      const explicitChiefMuscleLimit = Math.max(3, directTensionCandidates.length);
      const selectedChiefCandidates = selectTreatmentChainCandidates(combinedChiefCandidates, explicitChiefMuscleLimit);
      const chiefCandidateRetestIds = new Set(selectedChiefCandidates.flatMap((candidate) => candidate.retestIds ?? []));
      const chiefRetestFindings = motionFindings.filter((finding) => [...chiefCandidateRetestIds].some((id) => samePhysicalAction(id, motionIdFromFinding(finding))));
      if (selectedChiefCandidates.length) targets.push({ id: "target:chief", finding: chiefComplaintSide ? { ...findings[0], side: chiefComplaintSide } : findings[0], retestFindings: chiefRetestFindings, functionRetestObligations: chiefFunctionTarget?.functionRetestObligations, candidates: selectedChiefCandidates, optionalCandidates: [...combinedChiefCandidates.filter((candidate) => !selectedChiefCandidates.some((chosen) => candidateDedupKey(chosen) === candidateDedupKey(candidate))), ...combinedOptional].filter((candidate, index, list) => list.findIndex((item) => candidateDedupKey(item) === candidateDedupKey(candidate)) === index).slice(0, 3), chain: chiefDirection ? directionChain(chiefDirection) : "主诉相关", retestLabel: chiefActionLabel(intake), sourceCaseIds: pilotSourceCaseIds });
    }
    const provisionalSymptomTargets = [...painfulMotionOnlyTargets, ...painfulStrengthTargets, ...painfulFunctionTargets];
    if (!hasClearChiefAction(intake)) targets.push(...provisionalSymptomTargets, ...remainingMotionTargets);
    else targets.push(
      ...remainingMotionTargets,
      ...painfulStrengthTargets,
      // The assessment that reproduced the chief action is already merged
      // into target:chief and must not become a second treatment target.
      ...painfulFunctionTargets.filter((target) => target.finding.id !== chiefFunctionAssessmentId(intake, region.id)),
    );
    const currentKneeSwellingCandidate = region.id === "knee" && kneeDecision?.currentTreatment?.kind === "symptom-management"
      ? allCandidates.find((candidate) => candidate.id === kneeDecision.currentTreatment?.id)
      : undefined;
    if (swellingGuidance && (region.id !== "knee" || currentKneeSwellingCandidate)) {
      const swellingFinding = findings.find((finding) => finding.id === "track:swelling");
      if (swellingFinding) targets.unshift({ id: "target:swelling", finding: swellingFinding, candidates: [currentKneeSwellingCandidate ?? swellingGuidance], chain: "肿胀管理" });
    }
    return consolidateTrialTargetsByTreatment(targets.map(collapseEmbeddedControls));
}
