import type { ModuleId, TreatmentCandidate } from "@/src/knowledge/pilot/first-batch-modules";

export type ChiefComplaintPlan = {
  title: string;
  matchedBy: string[];
  candidates: TreatmentCandidate[];
  trainingTags: string[];
  profile: "muscle-load" | "irritable" | "neural" | "mixed";
  assessmentFocus: string;
};

export type HomeCare = {
  id: string;
  name: string;
  groups: string;
  reps: string;
  how: string;
  observe: string;
};

const candidate = (
  id: string,
  type: TreatmentCandidate["type"],
  title: string,
  doText: string,
  watch: string,
): TreatmentCandidate => ({ id, type, title, do: doText, watch });

const knee = {
  lateralChain: candidate("chief-knee-lateral-chain", "muscle", "大腿外侧链", "依次比较股外侧肌、阔筋膜张肌和髂胫束周围；一次只处理一个区域。", "立刻重复主诉动作，观察膝内外侧疼痛是否下降或出现得更晚。"),
  pes: candidate("chief-knee-pes", "muscle", "鹅足肌群", "比较缝匠肌、股薄肌、半腱肌及其止点周围；避免在明显炎症点上反复重压。", "重复主诉动作，观察膝内下方牵扯或刺痛是否变化。"),
  adductor: candidate("chief-knee-adductor", "muscle", "内收肌与内侧链", "比较内收长肌、内收大肌和股薄肌张力；轻柔处理后重做主诉动作。", "膝内侧压力、骨盆和膝轨迹是否改变。"),
  tibialis: candidate("chief-knee-tibialis", "muscle", "胫骨前肌、胫骨后肌与足部支撑", "分别比较小腿前内侧、后内侧和足弓参与；可先用徒手屏蔽或足弓提示做反应测试。", "下楼、走路或承重时膝内侧症状是否改变。"),
  anteriorThigh: candidate("chief-knee-anterior-thigh", "muscle", "股直肌与股四头肌", "比较大腿前侧和髌骨上方张力；处理后保持相同台阶高度或下蹲深度复测。", "疼痛阶段、膝屈曲幅度和离心控制是否改变。"),
  posterior: candidate("chief-knee-posterior", "muscle", "腘肌、内外侧腘绳肌与小腿三头肌", "按疼痛位置分别比较腘肌、半膜/半腱肌、股二头肌和小腿后侧；一次只选一处。", "膝伸直、屈曲及主诉动作是否更顺。"),
  lowerLegLateral: candidate("chief-knee-lower-leg", "muscle", "小腿外侧与趾伸肌", "比较腓骨肌群、趾长伸肌和小腿外侧；处理后复测承重动作。", "足部落地和膝部疼痛是否改变。"),
  patella: candidate("chief-knee-patella", "joint", "髌骨活动与对位", "由受训人员根据受限方向轻柔调整髌骨，再重复主诉动作。", "疼痛位置、程度和动作幅度是否出现可重复改善。"),
  kneeJoint: candidate("chief-knee-joint", "joint", "膝关节屈伸方向松动", "肌肉候选反应不明显且被动活动受限时，由受训人员选择对应胫股关节方向。", "主诉动作是否改善，而不只看关节角度。"),
  fibula: candidate("chief-knee-fibula", "joint", "腓骨近端与远端", "由受训人员比较腓骨近、远端活动；一次只调整一端。", "膝伸直、承重和主诉动作是否改变。"),
  ankleFoot: candidate("chief-knee-ankle-foot", "joint", "踝背屈、距骨与足部关节", "用膝碰墙、脚跟垫高或足弓提示先做低风险比较；有反应再由受训人员处理距骨、骰骨等相关方向。", "相同台阶、下蹲或走路时主诉是否改善。"),
  hipPelvis: candidate("chief-knee-hip-pelvis", "joint", "髋关节与骨盆位置", "用骨盆稳定、髋旋转提示或髋关节位置调整做一次比较，不直接把腿长变化当诊断。", "主诉动作中的膝轨迹、承重和疼痛是否改变。"),
  quadControl: candidate("chief-knee-quad-control", "control", "股内斜肌与伸膝控制", "在可用范围做末端伸膝或小幅台阶离心控制。", "主动控制能否使用刚获得的范围，主诉动作是否更稳。"),
  hipFootControl: candidate("chief-knee-hip-foot-control", "control", "臀肌、足弓与下肢力线控制", "用侧向推墙、足弓三点支撑或小幅单腿动作做提示。", "主诉动作是否更稳，膝内外摆是否减少。"),
  neural: candidate("chief-knee-neural", "neural", "下肢神经分布与滑动", "先比较麻电范围、左右感觉和股四头肌/勾脚/脚趾力量；由受训人员根据分布选择股神经、隐神经、腓总神经或胫神经的轻柔滑动。", "症状是否向近端收缩、力量是否稳定；不反复拉到麻电末端。"),
  irritability: candidate("chief-knee-irritability", "irritability", "局部刺激与负荷管理", "存在急性外伤、肿胀、皮温升高或反复碰撞摩擦线索时，先减少诱发负荷并处理肿胀；需要药物或理疗时转由有资质人员决定。", "肿胀轮廓、皮温和日常负重反应是否逐日下降。"),
};

const ankle = {
  peroneal: candidate("chief-ankle-peroneal", "muscle", "腓骨长短肌与小腿外侧", "比较腓骨肌群、小腿外侧和外踝后方；轻柔处理后复测主诉动作。", "外踝疼痛、外翻控制和落地信心是否改变。"),
  extensors: candidate("chief-ankle-extensors", "muscle", "胫骨前肌与趾长伸肌", "比较小腿前侧、踝前和足背肌腱区域；一次只处理一处。", "勾脚、走路摆动期及主诉动作是否改变。"),
  posteriorTibial: candidate("chief-ankle-posterior-tibial", "muscle", "胫骨后肌与足弓内侧", "比较小腿后内侧、内踝后方和足弓；用足弓提示或徒手屏蔽先做反应测试。", "足底、内踝或膝内侧牵扯是否改变。"),
  calf: candidate("chief-ankle-calf", "muscle", "腓肠肌、比目鱼肌与跟腱肌肉端", "分别在膝伸直和屈曲位比较小腿后侧，不直接重压急性跟腱痛点。", "背屈、提踵、走路推蹬和主诉是否改变。"),
  plantar: candidate("chief-ankle-plantar", "muscle", "足底内外侧肌肉与拇趾肌腱", "根据疼痛位置比较足底、拇趾屈肌和足弓肌肉；轻柔处理后走相同路线。", "第一步、推蹬或站立疼痛是否改变。"),
  talus: candidate("chief-ankle-talus", "joint", "踝关节分离与距骨", "肌肉候选后背屈或负重仍受限时，由受训人员处理踝关节分离或距骨方向。", "膝碰墙和主诉动作是否同时改善。"),
  fibula: candidate("chief-ankle-fibula", "joint", "腓骨近端与远端", "由受训人员比较并分别调整腓骨近、远端。", "外翻、背屈和走路承重是否改变。"),
  midfoot: candidate("chief-ankle-midfoot", "joint", "骰骨、舟骨与中足", "用足弓或前足支撑提示先比较；有反应再由受训人员处理对应中足方向。", "足底压力、推蹬及主诉动作是否改变。"),
  toe: candidate("chief-ankle-toe", "joint", "第一跖趾关节", "比较大脚趾背伸；受限且影响推蹬时，由受训人员轻柔处理。", "走路末端推蹬和足底症状是否改变。"),
  control: candidate("chief-ankle-control", "control", "足外翻、足弓与小腿控制", "在当前可用范围练足外翻、短足和提踵，随后走相同路线。", "足弓、外踝稳定和步态是否改善。"),
  neural: candidate("chief-ankle-neural", "neural", "小腿与足部神经分布", "记录麻电从哪里到哪里，比较足背/足底感觉、勾脚、外翻和脚趾力量；由受训人员选择对应神经轻柔滑动。", "麻电范围是否缩小、力量是否稳定，不追求强烈牵拉感。"),
  irritability: candidate("chief-ankle-irritability", "irritability", "急性肿胀与局部刺激管理", "急性外伤或明显肿胀时先调整负重、抬高和适度加压；药物与理疗由有资质人员决定。", "肿胀轮廓、皮温、淤血范围和走路反应是否逐日改善。"),
};

const lumbarHip = {
  psoas: candidate("chief-back-psoas", "muscle", "腰大肌、髂肌与股直肌", "按主诉位置比较髋前和大腿前侧；处理后复测原弯腰、起身或抬腿动作。", "腰髋疼痛和动作幅度是否改变。"),
  ql: candidate("chief-back-ql", "muscle", "腰方肌与竖脊肌", "比较主诉侧腰方肌、竖脊肌和胸腰筋膜；一次只处理一侧一处。", "原动作、站立承重和两侧差异是否改变。"),
  lateral: candidate("chief-back-lateral", "muscle", "阔筋膜张肌、髂胫束周围与臀中肌", "比较髋外侧链和臀中肌，区分紧张与控制不足。", "腰、臀或髋外侧主诉是否改变。"),
  glute: candidate("chief-back-glute", "muscle", "臀大肌、臀中肌与梨状肌", "根据臀部具体位置分别比较，不深压放射症状路径。", "坐站、走路或单腿承重时主诉是否改变。"),
  adductor: candidate("chief-back-adductor", "muscle", "内收肌与髋内侧链", "腹股沟或髋内侧症状时比较内收肌群和股薄肌。", "髋内收、深蹲或走路症状是否改变。"),
  posterior: candidate("chief-back-posterior", "muscle", "腘绳肌与小腿后侧", "比较后侧链，但不把神经牵拉简单当作肌肉紧。", "弯腰、直腿抬高和主诉动作是否改变。"),
  neural: candidate("chief-back-neural", "neural", "相关神经滑动", "有麻、电、放射时，由受训人员选择轻柔神经滑动，不拉到症状末端。", "症状范围是否向近端收缩，力量是否稳定。"),
  hipJoint: candidate("chief-back-hip-joint", "joint", "髋关节囊与髋活动", "肌肉处理后髋被动活动仍受限时，由受训人员选择对应髋关节方向。", "髋活动和原主诉动作是否同时改善。"),
  pelvis: candidate("chief-back-pelvis", "joint", "骨盆与骶髂区域反应测试", "用骨盆稳定或轻柔方向调整比较；只有能重复改变主诉才保留。", "原动作是否立即且可重复改善。"),
  lumbar: candidate("chief-back-lumbar", "joint", "腰椎或胸椎相关节段", "由受训人员在神经安全确认后检查相关节段活动，并选择轻柔方向。", "主诉动作是否改善，而不是只追求节段活动。"),
  control: candidate("chief-back-control", "control", "呼吸、骨盆与髋控制", "用呼吸、卷骨盆、臀桥或髋铰链重新使用改善后的范围。", "主诉动作能否更稳定地完成。"),
  irritability: candidate("chief-back-irritability", "irritability", "局部刺激与活动调整", "急性外伤或局部反应明显时，先减少反复诱发动作，保持可接受范围的轻活动；药物与理疗由有资质人员决定。", "静息反应、活动耐受和次日反应是否逐步稳定。"),
};

function unique(items: TreatmentCandidate[]) {
  const seen = new Set<string>();
  return items.filter((item) => !seen.has(item.id) && seen.add(item.id));
}

export function buildChiefComplaintPlan(moduleId: ModuleId, location: string, painAction: string, description: string, painType = "", mechanism = "", symptoms: string[] = [], onset = "", side = ""): ChiefComplaintPlan {
  const text = `${location} ${painAction} ${description} ${painType} ${mechanism} ${onset}`;
  const matchedBy: string[] = [];
  const candidates: TreatmentCandidate[] = [];
  const trainingTags: string[] = [];
  const neuralProfile = /麻|电感|电击|放射|窜|针刺/.test(`${painType} ${description}`);
  const muscleProfile = /酸痛|牵拉痛|牵扯|拉扯|紧/.test(`${painType} ${description}`);
  const recentInjury = /今天|昨天|2—7天/.test(onset) && !/没有明确受伤|逐渐出现/.test(mechanism);
  const irritableProfile = /刺痛|胀痛/.test(painType) || symptoms.includes("swelling") || recentInjury || /肿|皮温|外伤|撞|扭|崴|拉伤/.test(`${description} ${mechanism}`);
  const profile: ChiefComplaintPlan["profile"] = neuralProfile ? "neural" : irritableProfile ? "irritable" : muscleProfile ? "muscle-load" : "mixed";

  if (moduleId === "knee") {
    const medial = /内侧|内缘|内下|鹅足/.test(text);
    const lateral = /外侧|外缘|髂胫束/.test(text);
    const anterior = /前侧|髌|膝下|下缘|脂肪垫/.test(text);
    const posterior = /后侧|腘窝|膝后/.test(text);
    const downstairs = /下楼|下台阶|下阶梯/.test(text);
    const squat = /蹲|起身|坐站/.test(text);
    const extension = /伸直|绷直|锁膝/.test(text);
    const gait = /走路|承重|站立/.test(text);
    const runJump = /跑|跳|落地|球/.test(text);
    if (medial) { matchedBy.push("膝内侧"); candidates.push(knee.lateralChain, knee.pes, knee.adductor, knee.tibialis, knee.patella, knee.ankleFoot, knee.hipFootControl); trainingTags.push("quad", "glute", "single-leg"); }
    if (lateral) { matchedBy.push("膝外侧"); candidates.push(knee.lateralChain, knee.posterior, knee.lowerLegLateral, knee.fibula, knee.ankleFoot, knee.hipPelvis); trainingTags.push("glute", "single-leg", "gait"); }
    if (anterior) { matchedBy.push("膝前/髌骨周围"); candidates.push(knee.anteriorThigh, knee.lateralChain, knee.posterior, knee.patella, knee.kneeJoint, knee.ankleFoot, knee.quadControl); trainingTags.push("quad", "knee-extension"); }
    if (posterior) { matchedBy.push("膝后侧"); candidates.push(knee.posterior, knee.lateralChain, knee.fibula, knee.kneeJoint, knee.hipPelvis); trainingTags.push("hamstring", "knee-extension"); }
    if (downstairs) { matchedBy.push("下楼/下台阶"); candidates.push(knee.lateralChain, knee.anteriorThigh, knee.pes, knee.ankleFoot, knee.patella, knee.hipPelvis, knee.quadControl); trainingTags.push("step", "quad", "calf"); }
    if (squat) { matchedBy.push("下蹲/起身"); candidates.push(knee.anteriorThigh, knee.lateralChain, knee.posterior, knee.ankleFoot, knee.hipPelvis, knee.kneeJoint); trainingTags.push("squat", "glute", "quad"); }
    if (extension) { matchedBy.push("膝伸直"); candidates.push(knee.lateralChain, knee.posterior, knee.tibialis, knee.fibula, knee.patella, knee.kneeJoint, knee.quadControl); trainingTags.push("knee-extension", "quad"); }
    if (gait) { matchedBy.push("走路/承重"); candidates.push(knee.tibialis, knee.lowerLegLateral, knee.ankleFoot, knee.hipPelvis, knee.hipFootControl); trainingTags.push("gait", "calf"); }
    if (runJump) { matchedBy.push("跑跳/落地"); candidates.push(knee.lateralChain, knee.ankleFoot, knee.hipPelvis, knee.hipFootControl); trainingTags.push("single-leg", "return"); }
    if (!candidates.length) candidates.push(knee.lateralChain, knee.posterior, knee.anteriorThigh, knee.patella, knee.kneeJoint, knee.ankleFoot, knee.hipPelvis);
    if (profile === "neural") candidates.unshift(knee.neural);
    if (profile === "irritable") candidates.unshift(knee.irritability);
  }

  if (moduleId === "ankle-foot") {
    const outer = /外侧|外踝|外缘/.test(text);
    const inner = /内侧|内踝|内缘|足弓/.test(text);
    const front = /前侧|踝前|足背/.test(text);
    const back = /后侧|跟腱/.test(text);
    const sole = /足底|脚底|脚跟|足跟/.test(text);
    if (outer) { matchedBy.push("踝足外侧"); candidates.push(ankle.peroneal, ankle.extensors, ankle.calf, ankle.fibula, ankle.talus, ankle.midfoot, ankle.control); trainingTags.push("eversion", "balance", "gait"); }
    if (inner) { matchedBy.push("踝足内侧"); candidates.push(ankle.posteriorTibial, ankle.calf, ankle.plantar, ankle.talus, ankle.midfoot, ankle.control); trainingTags.push("arch", "calf", "gait"); }
    if (front) { matchedBy.push("踝前/足背"); candidates.push(ankle.extensors, ankle.calf, ankle.talus, ankle.fibula, ankle.midfoot); trainingTags.push("dorsiflexion", "gait"); }
    if (back) { matchedBy.push("跟腱/后侧"); candidates.push(ankle.calf, ankle.posteriorTibial, ankle.talus, ankle.midfoot, ankle.control); trainingTags.push("calf", "gait"); }
    if (sole) { matchedBy.push("足底/足跟"); candidates.push(ankle.posteriorTibial, ankle.plantar, ankle.calf, ankle.midfoot, ankle.talus, ankle.toe, ankle.control); trainingTags.push("arch", "toe", "calf"); }
    if (/走路|承重|下楼|蹬地|第一步/.test(text)) { matchedBy.push("负重动作"); candidates.push(ankle.talus, ankle.midfoot, ankle.control); trainingTags.push("gait", "balance"); }
    if (!candidates.length) candidates.push(ankle.peroneal, ankle.extensors, ankle.posteriorTibial, ankle.calf, ankle.talus, ankle.fibula, ankle.midfoot, ankle.control);
    if (profile === "neural") candidates.unshift(ankle.neural);
    if (profile === "irritable") candidates.unshift(ankle.irritability);
  }

  if (moduleId === "lumbar-hip") {
    const groin = /腹股沟|髋前|大腿根|髋内侧/.test(text);
    const lateral = /髋外侧|大腿外侧|外侧/.test(text);
    const glute = /臀|屁股|骶髂/.test(text);
    const neural = /麻|电|放射|窜|到小腿|到脚/.test(text);
    if (groin) { matchedBy.push("髋前/腹股沟"); candidates.push(lumbarHip.psoas, lumbarHip.adductor, lumbarHip.lateral, lumbarHip.hipJoint, lumbarHip.pelvis, lumbarHip.control); trainingTags.push("hip-flexion", "glute"); }
    if (lateral) { matchedBy.push("髋外侧"); candidates.push(lumbarHip.lateral, lumbarHip.glute, lumbarHip.ql, lumbarHip.hipJoint, lumbarHip.pelvis); trainingTags.push("glute", "single-leg"); }
    if (glute) { matchedBy.push("臀/骶髂区域"); candidates.push(lumbarHip.glute, lumbarHip.ql, lumbarHip.psoas, lumbarHip.hipJoint, lumbarHip.pelvis, lumbarHip.control); trainingTags.push("glute", "core"); }
    if (neural) { matchedBy.push("神经样症状"); candidates.push(lumbarHip.neural, lumbarHip.psoas, lumbarHip.ql, lumbarHip.posterior, lumbarHip.hipJoint); trainingTags.push("core", "gait"); }
    if (/弯腰|起身|久坐|后仰|侧屈/.test(text)) { matchedBy.push("腰背动作"); candidates.push(lumbarHip.ql, lumbarHip.psoas, lumbarHip.lateral, lumbarHip.hipJoint, lumbarHip.pelvis, lumbarHip.lumbar, lumbarHip.control); trainingTags.push("core", "hinge"); }
    if (!candidates.length) candidates.push(lumbarHip.ql, lumbarHip.psoas, lumbarHip.lateral, lumbarHip.glute, lumbarHip.hipJoint, lumbarHip.pelvis, lumbarHip.control);
    if (profile === "neural") candidates.unshift(lumbarHip.neural);
    if (profile === "irritable") candidates.unshift(lumbarHip.irritability);
  }

  if (profile === "muscle-load") matchedBy.unshift("酸痛/牵扯：优先肌肉张力与力量");
  if (profile === "irritable") matchedBy.unshift("刺痛/胀痛或肿胀：先看局部刺激程度与原因");
  if (profile === "neural") matchedBy.unshift("麻/电感：优先神经分布、感觉与力量");
  if (recentInjury) matchedBy.unshift("近期明确受伤：先控制刺激与负荷");

  const assessmentFocus = profile === "muscle-load"
    ? "重点比较相关肌肉的张力、压痛、主动发力和健侧力量；仍需用动作和关节检查确认，不凭痛感直接认定肌肉来源。"
    : profile === "irritable"
      ? "先看外伤时间、肿胀、皮温、静息反应和负荷规律，再找过度牵拉、关节轨迹或重复摩擦等可能原因；刺痛/胀痛本身不能直接证明炎症。"
      : profile === "neural"
        ? "先画清麻电分布，比较感觉、肌力和神经相关动作；不反复拉到症状末端，进行性无力或大小便/会阴异常走医学评估。"
        : "结合位置、诱发动作、局部反应、活动度和力量共同判断。";

  return {
    title: `${side ? `${side} ` : ""}${location || "当前部位"} · ${painAction || "原主诉动作"}`,
    matchedBy: matchedBy.length ? matchedBy : ["通用主诉路径"],
    candidates: unique(candidates).slice(0, 12),
    trainingTags: [...new Set(trainingTags)],
    profile,
    assessmentFocus,
  };
}

export function buildHomeCare(item: TreatmentCandidate): HomeCare {
  const title = item.title;
  if (/外侧链|股外侧|阔筋膜|髂胫束/.test(title)) return { id: item.id, name: "大腿外侧与髋前外侧放松", groups: "2组", reps: "每组45秒", how: "用泡沫轴或手轻柔处理股外侧肌和髋前外侧，避开膝外侧骨点，不追求强痛。", observe: "做完走路或台阶更轻松，第二天没有明显加重。" };
  if (/鹅足|缝匠|股薄|半腱|内收/.test(title)) return { id: item.id, name: "大腿内侧与鹅足肌群活动", groups: "2组", reps: "每组8个", how: "四点跪姿把一侧腿伸向侧方，臀部缓慢后坐再回来；只到轻微牵拉。", observe: "膝内侧不出现锐痛，动作后主诉不加重。" };
  if (/胫骨前|胫骨后|足弓/.test(title)) return { id: item.id, name: "小腿前后内侧与足弓放松", groups: "2组", reps: "每组45秒", how: "用手或小球轻柔处理小腿前内侧、后内侧和足弓，一次选择一个区域。", observe: "走路落脚和足弓支撑更自然，不压出麻电感。" };
  if (/股直|股四头/.test(title)) return { id: item.id, name: "大腿前侧拉伸", groups: "2组", reps: "每组30秒", how: "扶稳屈膝，保持骨盆不过度前倾；术后或屈膝受限时改用小幅度。", observe: "只出现大腿前侧牵拉，膝前不被挤压。" };
  if (/腘肌|腘绳|小腿三头|腓肠|比目鱼/.test(title)) return { id: item.id, name: "后侧链分段活动", groups: "2组", reps: "每组8个", how: "分别做小幅腿后侧动态拉伸和膝碰墙活动，不把两处同时拉到末端。", observe: "膝后或小腿只有轻微牵拉，不诱发刺痛或麻电。" };
  if (/腓骨长|腓骨肌|小腿外侧|趾长伸/.test(title)) return { id: item.id, name: "小腿外侧放松", groups: "2组", reps: "每组45秒", how: "用手或泡沫轴轻柔处理小腿外侧肌腹，避开外踝和腓骨头骨点。", observe: "踝外翻和走路更顺，不出现麻电。" };
  if (/腰大肌|髂肌|髋前/.test(title)) return { id: item.id, name: "髋前侧活动", groups: "2组", reps: "每侧8个", how: "半跪位轻收骨盆后前移，保持腰不过度后仰。", observe: "牵拉集中在髋前，不挤压腰或腹股沟。" };
  if (/腰方|竖脊/.test(title)) return { id: item.id, name: "腰背呼吸活动", groups: "2组", reps: "每组6次呼吸", how: "侧卧或婴儿式，用缓慢呼吸让主诉侧腰背扩张，不强压末端。", observe: "呼吸和起身更轻松，不出现向腿部扩散。" };
  if (/臀|梨状/.test(title)) return { id: item.id, name: "臀部轻柔活动", groups: "2组", reps: "每侧8个", how: "仰卧做小幅抱膝或臀部动态拉伸，不压到麻电路径。", observe: "臀部轻微牵拉，腿部症状不向远端扩散。" };
  return { id: item.id, name: `${title}居家放松`, groups: "2组", reps: "每组30秒", how: "只在肌腹做轻柔自我放松或舒适范围拉伸，避开肿胀、骨点和明显压痛中心。", observe: "完成后主诉不加重，第二天反应稳定。" };
}

export function candidateStrengthTags(item: TreatmentCandidate): string[] {
  const title = item.title;
  if (/外侧链|股外侧|阔筋膜|髂胫束/.test(title)) return ["quad", "glute"];
  if (/鹅足|缝匠|股薄|半腱|内收/.test(title)) return ["adductor", "hamstring"];
  if (/胫骨前|趾长伸/.test(title)) return ["dorsiflexion"];
  if (/胫骨后|足弓/.test(title)) return ["arch"];
  if (/股直|股四头/.test(title)) return ["quad"];
  if (/腘肌|腘绳/.test(title)) return ["hamstring"];
  if (/小腿三头|腓肠|比目鱼|跟腱/.test(title)) return ["calf"];
  if (/腓骨长|腓骨肌|小腿外侧/.test(title)) return ["eversion"];
  if (/腰大肌|髂肌|髋前/.test(title)) return ["hip-flexion", "core"];
  if (/腰方|竖脊/.test(title)) return ["core"];
  if (/臀/.test(title)) return ["glute"];
  return [];
}
