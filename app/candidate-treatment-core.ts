/**
 * 处理候选的命名与去重核心。
 *
 * 候选对象（FullCandidate）需要在「同一区域只处理一次」的约束下生成稳定的
 * 处理标题与去重键：肌肉按标准区域归并，关节按具体对象和方向命名，髌骨滑动
 * 是纯被动辅助活动、不显示成笼统的「髌骨关节松动」。这里集中命名与去重规则，
 * 只依赖候选的结构字段与 pilot 肌肉区域知识，可独立单测。
 */

import { normalizePilotMuscleRegion } from "./pilot-motion-muscle-knowledge";

export type CandidateTreatmentInput = {
  id: string;
  title: string;
  type: string;
  tags: string[];
  siteLabel?: string;
  targetLabel?: string;
  actionLabel?: string;
  do: string;
};

export function candidateSubject(candidate: CandidateTreatmentInput) {
  return candidate.title
    .replace(/^今天先安排/, "")
    .replace(/^记录/, "")
    .replace(/^检查/, "")
    .replace(/^训练/, "")
    .trim();
}

export function candidateMuscleFocus(candidate: CandidateTreatmentInput) {
  const site = candidate.siteLabel ?? "";
  const source = `${site} ${candidate.targetLabel ?? ""} ${candidate.title} ${candidate.tags.join(" ")}`;
  const normalizedPilotRegion = normalizePilotMuscleRegion(`${source} ${candidate.do}`);
  if (normalizedPilotRegion) return { key: normalizedPilotRegion.id, label: normalizedPilotRegion.label };
  if (candidate.id.startsWith("tension-muscle:") && site) return { key: `tension-${site}`, label: site };
  if (candidate.id.startsWith("thoracic-rib") && site.includes("胸前")) return { key: "thoracic-anterior", label: "胸廓前侧肌群" };
  if (candidate.id.startsWith("shoulder") && /肩前|胸前/.test(site)) return { key: "shoulder-anterior", label: "肩前与胸前肌群" };
  const siteRules: Array<[RegExp, string, string]> = [
    [/腰部两侧/, "lumbar-lateral", "腰方肌"], [/腰背后侧/, "lumbar-posterior", "腰背后侧肌群"],
    [/髋前|大腿前侧/, "hip-anterior", "髋前侧肌群"], [/臀部|髋后外侧/, "hip-posterolateral", "臀部与髋后外侧肌群"],
    [/大腿外侧|膝外侧/, "thigh-lateral", "大腿外侧链"], [/大腿内侧|膝内侧/, "thigh-medial", "大腿内侧与鹅足周围"],
    [/大腿后侧|膝后/, "thigh-posterior", "大腿后侧与膝后两侧"], [/小腿前后侧/, "calf-front-back", "小腿前侧与后侧肌群"], [/小腿后侧/, "calf-posterior", "小腿后侧肌群"],
    [/小腿前侧/, "calf-anterior", "小腿前侧肌群"], [/小腿外侧/, "calf-lateral", "小腿外侧肌群"], [/小腿内侧/, "calf-medial", "小腿内侧肌群"],
    [/足底|足弓/, "plantar", "足底与足弓肌群"], [/颈后|枕骨下/, "neck-posterior", "颈后肌群"], [/颈部前侧|颈部侧面/, "neck-anterolateral", "颈前外侧肌群"],
    [/肩前|胸前/, "shoulder-anterior", "肩前与胸前肌群"], [/肩后|肩胛外侧/, "shoulder-posterior", "肩后侧肌群"], [/肩上方|肩外侧/, "shoulder-superolateral", "肩上方与肩袖肌群"],
    [/上背|肩胛骨之间/, "thoracic-posterior", "上背与肩胛内侧肌群"], [/胸廓前侧/, "thoracic-anterior", "胸廓前侧肌群"], [/胸廓侧面/, "thoracic-lateral", "胸廓侧面肌群"],
    [/肘前/, "elbow-anterior", "肘前侧肌群"], [/肘后/, "elbow-posterior", "肘后侧肌群"], [/肘外侧/, "forearm-lateral", "前臂外侧肌群"], [/肘内侧/, "forearm-medial", "前臂内侧肌群"],
    [/手腕背侧/, "wrist-dorsal", "前臂背侧肌群"], [/手腕掌侧/, "wrist-volar", "前臂掌侧肌群"],
  ];
  const siteMatched = siteRules.find(([pattern]) => pattern.test(site));
  if (siteMatched) return { key: siteMatched[1], label: siteMatched[2] };
  const rules: Array<[RegExp, string, string]> = [
    [/腰部两侧|腰方肌|quadratus/, "lumbar-lateral", "腰方肌"],
    [/腰背后侧|竖脊肌|多裂肌|腰背筋膜/, "lumbar-posterior", "腰背后侧肌群"],
    [/大腿外侧|股外侧肌|阔筋膜张肌|髂胫束|lateral-chain|\btfl\b/i, "thigh-lateral", "大腿外侧链"],
    [/鹅足|缝匠肌|股薄肌|半腱肌|大腿内侧|内收肌/, "thigh-medial", "大腿内侧与鹅足肌群"],
    [/大腿后侧|腘绳肌|膝后|腘肌/, "thigh-posterior", "大腿与膝后侧肌群"],
    [/髋前|腰大肌|髂肌|髋屈肌|股直肌/, "hip-anterior", "髋前侧肌群"],
    [/臀部|臀大肌|臀中肌|臀小肌|梨状肌|髋后外侧/, "hip-posterolateral", "臀部与髋后外侧肌群"],
    [/小腿前后侧/, "calf-front-back", "小腿前后侧肌群"],
    [/小腿后侧|小腿三头肌|腓肠肌|比目鱼肌/, "calf-posterior", "小腿后侧肌群"],
    [/小腿前侧|胫骨前肌|趾伸肌/, "calf-anterior", "小腿前侧肌群"],
    [/小腿外侧|腓骨长肌|腓骨短肌|腓骨肌/, "calf-lateral", "小腿外侧肌群"],
    [/小腿内侧|胫骨后肌|趾屈肌/, "calf-medial", "小腿内侧肌群"],
    [/足底|足弓/, "plantar", "足底与足弓肌群"],
    [/颈后|枕下肌|上斜方肌/, "neck-posterior", "颈后肌群"],
    [/颈部前侧|胸锁乳突肌|斜角肌|肩胛提肌/, "neck-anterolateral", "颈前外侧肌群"],
    [/肩前|胸大肌|胸小肌|三角肌前束/, "shoulder-anterior", "肩前与胸前肌群"],
    [/肩后|冈下肌|小圆肌|三角肌后束|背阔肌/, "shoulder-posterior", "肩后侧肌群"],
    [/肩上方|肩外侧|肩袖周围/, "shoulder-superolateral", "肩上方与肩袖肌群"],
    [/上背|胸椎旁肌|菱形肌/, "thoracic-posterior", "上背与肩胛内侧肌群"],
    [/胸前|胸廓前侧/, "thoracic-anterior", "胸廓前侧肌群"],
    [/胸廓侧面|肋间肌/, "thoracic-lateral", "胸廓侧面肌群"],
    [/肘前|肱二头肌|肱肌|肱桡肌/, "elbow-anterior", "肘前侧肌群"],
    [/肘后|肱三头肌/, "elbow-posterior", "肘后侧肌群"],
    [/肘外侧|腕伸肌|旋后肌/, "forearm-lateral", "前臂外侧肌群"],
    [/肘内侧|屈腕|旋前肌/, "forearm-medial", "前臂内侧肌群"],
    [/手腕背侧|前臂背面|手指伸肌/, "wrist-dorsal", "前臂背侧肌群"],
    [/手腕掌侧|前臂掌面|手指屈肌/, "wrist-volar", "前臂掌侧肌群"],
  ];
  const matched = rules.find(([pattern]) => pattern.test(source));
  if (matched) return { key: matched[1], label: matched[2] };
  const fallback = (candidate.targetLabel || candidateSubject(candidate)).split(/[、，；]|与|和/)[0].trim() || "相关肌肉";
  return { key: fallback.replace(/\s+/g, ""), label: fallback };
}

/** 关节处理标题说明具体对象和方向；髌骨滑动不显示成笼统的「髌骨关节松动」。 */
export function jointTreatmentName(candidate: CandidateTreatmentInput) {
  const source = `${candidate.id} ${candidate.title} ${candidate.actionLabel ?? ""} ${candidate.siteLabel ?? ""} ${candidate.targetLabel ?? ""}`;
  const directionalNames: Array<[RegExp, string]> = [
    [/joint-mobilization:thigh-front-length|股四头肌与股直肌拉长检查/, "膝关节屈曲方向松动"],
    [/joint-mobilization:thigh-back-length|腘绳肌拉长检查/, "膝关节伸直方向松动"],
    [/patella[^\n]*(superior|上)|髌骨[^\n]*(上|上方)/i, "髌骨向上滑动辅助"],
    [/patella[^\n]*(inferior|下)|髌骨[^\n]*(下|下方)/i, "髌骨向下滑动辅助"],
    [/patella[^\n]*(medial|内)|髌骨[^\n]*(内|内侧)/i, "髌骨向内滑动辅助"],
    [/patella[^\n]*(lateral|外)|髌骨[^\n]*(外|外侧)/i, "髌骨向外滑动辅助"],
    [/ankle[^\n]*(dorsiflex|back|背屈)|距骨[^\n]*背屈/i, "踝关节背屈方向松动"],
    [/ankle[^\n]*(plantar|跖屈)|踝[^\n]*跖屈/i, "踝关节跖屈方向松动"],
    [/ankle[^\n]*(inversion|内翻)|距下[^\n]*内翻/i, "踝足内翻方向松动"],
    [/ankle[^\n]*(eversion|外翻)|距下[^\n]*外翻/i, "踝足外翻方向松动"],
    [/knee[^\n]*(extension|伸直)|膝[^\n]*伸直/i, "膝关节伸直方向松动"],
    [/knee[^\n]*(flexion|屈曲)|膝[^\n]*屈曲/i, "膝关节屈曲方向松动"],
  ];
  const directional = directionalNames.find(([pattern]) => pattern.test(source));
  if (directional) return directional[1];
  if (/fibula|腓骨/.test(source)) return "腓骨受限方向辅助活动";
  if (/patella|髌骨/.test(source)) return "髌骨受限方向滑动辅助";
  const subject = candidateSubject(candidate);
  return `${subject || "相关关节"}受限方向关节松动`;
}

export function candidateDedupKey(candidate: CandidateTreatmentInput) {
  const normalizedRegion = candidate.type === "muscle"
    ? normalizePilotMuscleRegion(`${candidate.siteLabel ?? ""} ${candidate.targetLabel ?? ""} ${candidate.title} ${candidate.do} ${candidate.tags.join(" ")}`)
    : undefined;
  if (normalizedRegion) return `muscle:${normalizedRegion.id}`;
  if (candidate.type === "muscle" && candidate.id.startsWith("tension-muscle:") && candidate.siteLabel) {
    const location = candidate.siteLabel;
    const key = /大腿外|髋外/.test(location) ? "thigh-lateral"
      : /大腿内|腹股沟/.test(location) ? "thigh-medial"
        : /大腿后|膝后/.test(location) ? "thigh-posterior"
          : /大腿前/.test(location) ? "hip-anterior"
            : /小腿后/.test(location) ? "calf-posterior"
              : /小腿前/.test(location) ? "calf-anterior"
                : /小腿外/.test(location) ? "calf-lateral"
                  : /小腿内/.test(location) ? "calf-medial"
                    : /足底|足弓/.test(location) ? "plantar"
                      : `tension-${location}`;
    return `muscle:${key}`;
  }
  return candidate.type === "muscle" ? `muscle:${candidateMuscleFocus(candidate).key}` : candidate.id;
}

export function candidateTreatmentName(candidate: CandidateTreatmentInput) {
  const subject = candidateSubject(candidate);
  if (candidate.type === "swelling") return "肿胀管理";
  if (candidate.type === "muscle") return `${candidateMuscleFocus(candidate).label}处理单元`;
  if (candidate.id.includes("fibula") || candidate.tags.includes("response-test")) return "腓骨近端辅助反应";
  if (candidate.type === "joint") return jointTreatmentName(candidate);
  if (candidate.type === "neural") return subject.includes("滑动") ? subject : `${subject}神经滑动`;
  return candidate.title.startsWith("检查") ? `${subject}动作调整` : candidate.title;
}

export function candidateTreatmentKey(candidate: CandidateTreatmentInput, side = "") {
  const sideKey = side || "未指定侧";
  if (candidate.type === "muscle") return `${sideKey}:${candidateDedupKey(candidate)}`;
  const site = candidate.siteLabel || candidateSubject(candidate);
  const action = candidate.actionLabel || candidateTreatmentName(candidate);
  return `${sideKey}:${candidate.type}:${site}:${action}`.replace(/\s+/g, "");
}

/** 是否髌骨专项候选：有明确 patella 标识或标题/动作写出髌骨滑动方向。 */
export function isPatellaSpecificCandidate(candidate?: CandidateTreatmentInput) {
  if (!candidate || candidate.type !== "joint") return false;
  const idSource = candidate.id;
  const actionSource = `${candidate.title} ${candidate.actionLabel ?? ""}`;
  const explicitId = /(?:^|[-_:])patella(?:[-_:]|$)/i.test(idSource);
  const explicitDirection = /髌骨向(?:上|下|内|外)(?:滑动|移动|活动|辅助)|patella.*(?:superior|inferior|medial|lateral|glide|mobility|assist)/i.test(actionSource);
  return explicitId || explicitDirection;
}

/** 候选是否匹配某个紧张区域（按部位规则，回退到原文包含）。 */
export function candidateMatchesTensionLocation(candidate: CandidateTreatmentInput, location: string) {
  const source = `${candidate.siteLabel ?? ""} ${candidate.targetLabel ?? ""} ${candidate.title} ${candidate.do} ${candidate.tags.join(" ")}`;
  const rules: Array<[RegExp, RegExp]> = [
    [/小腿后/, /小腿后|腓肠|比目鱼|三头肌|calf|plantarflex/],
    [/小腿前/, /小腿前|胫骨前|趾伸|dorsiflex/],
    [/小腿外/, /小腿外|腓骨肌|evert/],
    [/小腿内/, /小腿内|胫骨后|趾屈|invert/],
    [/脚底|足弓/, /脚底|足底|足弓|plantar|intrinsic/],
    [/踝前|足背/, /踝前|足背|胫骨前|dorsiflex/],
    [/踝外|脚底外/, /踝外|小腿外|腓骨肌|evert/],
    [/踝内|足弓内/, /踝内|小腿内|胫骨后|invert/],
    [/大腿前/, /大腿前|股四头|股直肌|髋前|quadriceps|hip-flex/],
    [/大腿内|腹股沟/, /大腿内|内收|鹅足|腹股沟|adductor/],
    [/大腿后|膝后/, /大腿后|腘绳|腘肌|膝后|hamstring/],
    [/大腿外|髋外/, /大腿外|阔筋膜|髂胫束|髋外|臀中|lateral-chain|\btfl\b/],
    [/臀后/, /臀后|臀大|梨状|glute/],
    [/腰侧/, /腰侧|腰方肌|腰大肌|quadratus|psoas/],
    [/胸前|肩前/, /胸前|胸大肌|胸小肌|肩前/],
    [/肩后|腋窝后/, /肩后|腋窝后|背阔肌|冈下肌|小圆肌/],
    [/前臂背|手腕背/, /前臂背|手腕背|腕伸肌/],
    [/前臂掌|手腕掌/, /前臂掌|手腕掌|屈腕肌/],
  ];
  const rule = rules.find(([locationPattern]) => locationPattern.test(location));
  return rule ? rule[1].test(source) : source.includes(location);
}
