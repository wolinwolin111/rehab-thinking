import type { RegionId } from "./rehab-library";

export type DirectionRule = {
  id: string;
  regionId: RegionId;
  resultId: string;
  finding: string;
  firstChecks: string[];
  muscleCandidates: string[];
  jointCandidates: string[];
  retest: string;
  keep: string;
  train: string;
  source: "record" | "clinical";
};

const rule = (value: DirectionRule) => value;

export const DIRECTION_RULES: DirectionRule[] = [
  rule({
    id: "knee-extension", regionId: "knee", resultId: "knee-ext", finding: "膝伸直末端受限",
    firstChecks: ["先看肿胀是否挡住伸直", "比较髌骨上下、左右活动", "触诊腘窝、外侧链和小腿后侧", "同时看腓骨近端、踝背屈和站立时骨盆位置"],
    muscleCandidates: ["股外侧肌、阔筋膜张肌与髂胫束周围", "腘肌", "腓肠肌与比目鱼肌", "腘绳肌", "必要时比较股直肌和胫骨前肌"],
    jointCandidates: ["膝关节伸直方向松动", "髌骨活动松动", "腓骨近端松动", "踝背屈松动", "骨盆位置调整"],
    retest: "仰卧垫高脚跟，再看膝后能否更接近床面；随后站立看膝能否自然伸直。",
    keep: "只保留能让伸直角度或站立伸膝马上改善的处理方向。",
    train: "股四头肌绷紧或终末伸膝：3组，每组10个；走路时练习患侧稳定伸膝。",
    source: "record",
  }),
  rule({
    id: "knee-flexion", regionId: "knee", resultId: "knee-flex", finding: "膝屈曲受限",
    firstChecks: ["先看肿胀和腘窝是否有阻挡", "比较髌骨向下活动", "检查前侧紧张和腘窝压痛", "比较踝、髋屈曲是否同时受限"],
    muscleCandidates: ["股直肌", "股外侧肌与阔筋膜张肌", "股四头肌其余部分", "腘肌和小腿三头肌", "腘绳肌与腘窝周围"],
    jointCandidates: ["髌骨向下活动松动", "胫股关节屈曲方向松动", "腓骨近端活动", "存在瘢痕时检查瘢痕滑动"],
    retest: "仰卧脚跟沿床面滑向臀部，比较脚跟距离和腘窝/前膝反应。",
    keep: "屈膝更顺或脚跟更靠近臀部时，保留对应肌肉或关节方向。",
    train: "脚跟滑动：3组，每组10个；新获得的角度内主动屈伸。",
    source: "record",
  }),
  rule({
    id: "knee-load-flex", regionId: "knee", resultId: "knee-load-flex", finding: "负重屈膝疼痛或受限",
    firstChecks: ["固定同一深蹲或台阶高度", "看膝伸屈、踝背屈和髋旋转", "观察膝盖轨迹、足弓和骨盆", "区分前侧、内侧、外侧或后侧疼痛"],
    muscleCandidates: ["股外侧肌与下肢外侧链", "股直肌", "胫骨前肌和小腿外侧肌群", "小腿三头肌", "臀中肌与腰方肌"],
    jointCandidates: ["髌骨或膝关节松动", "腓骨近端松动", "踝背屈松动", "髋关节或骨盆调整"],
    retest: "使用完全相同的站距、深度、速度和支撑重复原动作。",
    keep: "疼痛下降或动作更顺，才把该方向带入后续处理和训练。",
    train: "从可完成深度坐站或浅蹲开始：3组，每组8个。",
    source: "record",
  }),
  rule({
    id: "ankle-df", regionId: "ankle", resultId: "ankle-df", finding: "踝背屈受限",
    firstChecks: ["比较膝伸直与屈曲时的背屈", "触诊小腿后侧与踝前方", "看距骨、腓骨和足部活动", "检查肿胀是否限制前移"],
    muscleCandidates: ["腓肠肌", "比目鱼肌", "腓骨肌群", "胫骨前肌和趾长伸肌", "足底肌群"],
    jointCandidates: ["距骨后向松动", "踝关节分离", "腓骨近端或远端活动", "骰骨/中足活动"],
    retest: "同一站距做膝触墙，脚跟不离地，比较膝盖前移位置。",
    keep: "膝触墙距离增加，才保留对应处理。",
    train: "膝触墙主动活动：2组，每组10个；随后练习走路和下蹲。",
    source: "record",
  }),
  rule({
    id: "ankle-ev", regionId: "ankle", resultId: "ankle-ev", finding: "踝外翻受限或无力",
    firstChecks: ["比较主动活动和轻阻力", "检查外踝、腓骨肌群和骰骨", "看足弓与承重时足部控制"],
    muscleCandidates: ["腓骨长肌与短肌", "趾长伸肌", "小腿三头肌外侧", "足底外侧肌群"],
    jointCandidates: ["腓骨活动", "距下关节活动", "骰骨活动"],
    retest: "坐姿主动外翻，再做站立重心向外侧移动。",
    keep: "外翻角度或承重信心改善时保留。",
    train: "弹力带外翻：3组，每组12个；足外翻激活后练习单腿站。",
    source: "record",
  }),
  rule({
    id: "shoulder-flex", regionId: "shoulder", resultId: "shoulder-flex", finding: "肩向前举受限",
    firstChecks: ["比较主动与辅助上举", "观察肩胛上旋和耸肩", "检查胸椎伸展和颈部影响"],
    muscleCandidates: ["背阔肌", "胸大肌与胸小肌", "大圆肌", "肩袖后侧", "上斜方肌和提肩胛肌"],
    jointCandidates: ["盂肱关节下向/后向松动", "肩胛辅助", "胸椎伸展活动", "第一肋骨活动"],
    retest: "保持拇指朝上，用相同速度再次举手。",
    keep: "高度增加或疼痛弧缩小才保留。",
    train: "墙面滑手：3组，每组8个。",
    source: "clinical",
  }),
  rule({
    id: "shoulder-abd", regionId: "shoulder", resultId: "shoulder-abd", finding: "肩侧举受限",
    firstChecks: ["记录疼痛弧", "观察肩胛上旋", "比较外旋后再侧举"],
    muscleCandidates: ["胸小肌", "背阔肌", "肩胛下肌", "冈下肌与小圆肌", "上斜方肌"],
    jointCandidates: ["盂肱关节下向松动", "肩胛上旋辅助", "胸椎活动"],
    retest: "手掌向前，以相同路径重复侧举。",
    keep: "疼痛下降或侧举高度增加才保留。",
    train: "肩胛平面举手：3组，每组8个。",
    source: "clinical",
  }),
  rule({
    id: "shoulder-er", regionId: "shoulder", resultId: "shoulder-er", finding: "肩外旋受限",
    firstChecks: ["肘贴身体比较两侧", "区分前侧夹挤与后侧牵拉", "检查肩胛位置"],
    muscleCandidates: ["肩胛下肌", "胸大肌", "大圆肌", "背阔肌"],
    jointCandidates: ["盂肱关节后向松动", "肩胛位置调整", "第一肋骨和胸椎活动"],
    retest: "肘贴身体，重复相同外旋动作。",
    keep: "外旋角度增加且前肩不顶出才保留。",
    train: "弹力带外旋：3组，每组10个。",
    source: "clinical",
  }),
  rule({
    id: "shoulder-ir", regionId: "shoulder", resultId: "shoulder-ir", finding: "手摸背或肩内旋受限",
    firstChecks: ["记录手能摸到的脊柱位置", "检查肩后侧紧张", "观察肩胛是否过度前倾"],
    muscleCandidates: ["冈下肌", "小圆肌", "后三角肌", "肩后侧软组织"],
    jointCandidates: ["盂肱关节后向松动", "肩胛位置调整"],
    retest: "用同一只手再次摸背，记录最高位置。",
    keep: "手的位置上移或前肩夹挤下降才保留。",
    train: "毛巾辅助摸背：2组，每组8个。",
    source: "clinical",
  }),
  rule({
    id: "hip-flex", regionId: "hip", resultId: "hip-flex", finding: "髋屈曲受限",
    firstChecks: ["比较屈髋时腹股沟与后侧牵拉", "检查骨盆是否提前后倾", "比较髋内外旋"],
    muscleCandidates: ["臀大肌", "髋后侧关节囊周围", "腘绳肌", "内收肌"],
    jointCandidates: ["髋关节后向松动", "髋关节牵引", "骨盆位置调整"],
    retest: "仰卧抱膝，比较大腿靠近腹部的位置。",
    keep: "夹挤下降或屈髋范围增加才保留。",
    train: "仰卧滑脚或主动抱膝：2组，每组10个。",
    source: "clinical",
  }),
  rule({
    id: "hip-ir", regionId: "hip", resultId: "hip-ir", finding: "髋内旋受限",
    firstChecks: ["骨盆保持稳定比较两侧", "检查臀深层肌群、阔筋膜张肌和关节囊", "观察下蹲时足膝方向"],
    muscleCandidates: ["梨状肌与臀深层外旋肌", "臀大肌后侧", "阔筋膜张肌", "内收肌后部"],
    jointCandidates: ["髋关节后外侧松动", "骨盆旋转调整"],
    retest: "仰卧屈髋屈膝，保持骨盆不动重复内旋。",
    keep: "内旋范围和下蹲方向改善才保留。",
    train: "坐姿主动髋内旋：3组，每组10个。",
    source: "record",
  }),
];

const GENERIC_CANDIDATES: Record<RegionId, { muscles: string[]; joints: string[]; train: string }> = {
  neck: { muscles: ["上斜方肌", "提肩胛肌", "颈椎旁肌"], joints: ["颈胸交界活动", "胸椎活动"], train: "舒适范围主动活动：2组，每组8个。" },
  shoulder: { muscles: ["肩袖", "胸肌", "背阔肌"], joints: ["盂肱关节活动", "肩胛活动", "胸椎活动"], train: "舒适范围举手：2组，每组8个。" },
  elbow: { muscles: ["肱二头肌/肱肌", "肱桡肌", "前臂屈伸肌"], joints: ["肱尺关节活动", "桡尺关节活动"], train: "主动屈伸和旋转：2组，每组10个。" },
  wrist: { muscles: ["前臂屈肌群", "前臂伸肌群", "旋前/旋后肌群"], joints: ["桡腕关节活动", "腕骨活动"], train: "四向主动活动：2组，每方向8个。" },
  thoracic: { muscles: ["胸椎旁肌", "背阔肌", "胸肌"], joints: ["胸椎伸展与旋转活动", "肋椎关节活动"], train: "胸椎旋转：2组，每侧8个。" },
  back: { muscles: ["腰方肌", "竖脊肌", "髂腰肌", "臀肌"], joints: ["腰椎分节活动", "髋关节活动", "骨盆位置调整"], train: "舒适方向活动和髋铰链：2组，每组8个。" },
  hip: { muscles: ["髂腰肌", "阔筋膜张肌", "臀肌", "内收肌"], joints: ["髋关节活动", "骨盆位置调整"], train: "主动髋活动：2组，每方向8个。" },
  knee: { muscles: ["股四头肌", "下肢外侧链", "腘肌", "小腿三头肌"], joints: ["膝关节活动", "髌骨活动", "腓骨活动"], train: "主动屈伸：2组，每组10个。" },
  ankle: { muscles: ["小腿三头肌", "腓骨肌群", "胫骨前/后肌", "足底肌群"], joints: ["距小腿关节活动", "距下关节活动", "腓骨和中足活动"], train: "踝四向主动活动：2组，每方向10个。" },
  foot: { muscles: ["足底肌群", "趾屈伸肌", "小腿肌群"], joints: ["跖趾关节活动", "中足活动", "踝关节活动"], train: "脚趾与足弓主动练习：2组，每组10个。" },
};

export function getDirectionRule(regionId: RegionId, resultId: string, movementName: string): DirectionRule {
  const exact = DIRECTION_RULES.find((item) => item.regionId === regionId && item.resultId === resultId);
  if (exact) return exact;
  const generic = GENERIC_CANDIDATES[regionId];
  return {
    id: `${regionId}-${resultId}`,
    regionId,
    resultId,
    finding: `${movementName}受限或疼痛`,
    firstChecks: ["先确认肿胀是否影响检查", "比较健侧与患侧", "触诊可能限制该方向的肌肉", "观察相邻关节是否一起受限"],
    muscleCandidates: generic.muscles,
    jointCandidates: generic.joints,
    retest: `使用完全相同姿势和速度重复“${movementName}”。`,
    keep: "当场更顺、范围增加或疼痛下降，才保留该处理方向。",
    train: generic.train,
    source: "clinical",
  };
}
