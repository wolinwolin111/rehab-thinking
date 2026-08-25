"use client";

import { PILOT_MUSCLE_REGIONS, type PilotMuscleRegionId } from "@/src/knowledge/pilot/pilot-motion-muscle-knowledge";

type MuscleRegionView = "front" | "back" | "sole";

type MuscleRegionDisplay = {
  label: string;
  landmark: string;
  avoid: string;
  view: MuscleRegionView;
};

const REGION_DISPLAY: Record<PilotMuscleRegionId, MuscleRegionDisplay> = {
  "thigh-anterior": {
    label: "大腿前侧",
    landmark: "髋前方到膝盖上缘之间的肌肉区",
    avoid: "不按髌骨、髌腱或尖锐痛点",
    view: "front",
  },
  "thigh-lateral": {
    label: "大腿外侧",
    landmark: "髋外侧下方到膝盖外侧上方之间",
    avoid: "不沿骨头或膝外侧骨点重压",
    view: "front",
  },
  "thigh-medial": {
    label: "大腿内侧",
    landmark: "两腿之间，从大腿根部到膝盖上方",
    avoid: "不按腹股沟或膝内侧尖锐痛点",
    view: "front",
  },
  "thigh-posterior": {
    label: "大腿后侧",
    landmark: "臀褶到膝后皱褶之间的肌肉区",
    avoid: "不按膝后正中或骨头",
    view: "back",
  },
  "calf-anterior": {
    label: "小腿前侧",
    landmark: "膝盖下方到脚背之间、胫骨旁边的软组织",
    avoid: "不直接按胫骨骨面",
    view: "front",
  },
  "calf-posterior": {
    label: "小腿后侧",
    landmark: "膝后到跟腱上方之间的小腿肚",
    avoid: "不按跟腱或膝后正中",
    view: "back",
  },
  "calf-lateral": {
    label: "小腿外侧",
    landmark: "小腿外侧，从膝下外侧到外踝上方",
    avoid: "不按腓骨骨面或外踝骨点",
    view: "front",
  },
  "calf-medial": {
    label: "小腿内侧",
    landmark: "小腿内侧，从膝下到内踝上方",
    avoid: "不按胫骨骨面或内踝骨点",
    view: "front",
  },
  plantar: {
    label: "足弓与足底中部",
    landmark: "脚底中部的软组织和足弓凹陷区域",
    avoid: "不按脚跟骨或明显刺痛点",
    view: "sole",
  },
};

const REGION_ALIASES: Array<[PilotMuscleRegionId, RegExp]> = [
  ["thigh-anterior", /大腿前|股四头|股直肌|髋前/],
  ["thigh-lateral", /大腿外|髋外|外侧链/],
  ["thigh-medial", /大腿内|鹅足|内收肌|腹股沟/],
  ["thigh-posterior", /大腿后|膝后|腘绳|腘肌/],
  ["calf-anterior", /小腿前|胫骨前|趾伸/],
  ["calf-posterior", /小腿后|小腿肚|腓肠|比目鱼/],
  ["calf-lateral", /小腿外|腓骨肌|外踝/],
  ["calf-medial", /小腿内|胫骨后|内踝/],
  ["plantar", /足底|足弓|脚底/],
];

const SENTINEL_LABELS = new Set(["没有明显差别", "两侧感觉接近", "暂不判断"]);

function resolveRegionId(label: string): PilotMuscleRegionId | undefined {
  const exact = PILOT_MUSCLE_REGIONS.find((region) => region.label === label);
  if (exact) return exact.id;
  return REGION_ALIASES.find(([, pattern]) => pattern.test(label))?.[0];
}

function displayForLocation(label: string): MuscleRegionDisplay {
  const regionId = resolveRegionId(label);
  if (regionId) return REGION_DISPLAY[regionId];
  return {
    label: label.replace(/肌群|链/g, "").trim(),
    landmark: "按图示范围轻触比较",
    avoid: "不按骨头、关节线或明显肿胀中心",
    view: "front",
  };
}

type MuscleMapSpec = {
  viewLabel: string;
};

const MUSCLE_MAPS: Partial<Record<PilotMuscleRegionId, MuscleMapSpec>> = {
  "thigh-anterior": { viewLabel: "大腿前侧肌肉范围示意" },
  "thigh-posterior": { viewLabel: "大腿后侧肌肉范围示意" },
  "thigh-lateral": { viewLabel: "大腿外侧肌肉范围示意" },
  "thigh-medial": { viewLabel: "大腿内侧肌肉范围示意" },
  "calf-anterior": { viewLabel: "小腿前侧肌肉范围示意" },
  "calf-posterior": { viewLabel: "小腿后侧肌肉范围示意" },
  "calf-lateral": { viewLabel: "小腿外侧肌肉范围示意" },
  "calf-medial": { viewLabel: "小腿内侧肌肉范围示意" },
  plantar: { viewLabel: "足底肌肉范围示意" },
};

/*
 * This is a dedicated muscle map, intentionally separate from the pain/body
 * location photos. It is a compact regional anatomy diagram: the base shows
 * the limb outline and the low-saturation overlay shows the usable muscle
 * range. It communicates a region, not a diagnosis or a single tender point.
 */
/* 足底示意图是纯 SVG 手绘（无照片素材），高亮区为足弓范围。 */
const PLANTAR_ZONE_PATH = "M134 77 C145 67 160 64 178 66 C195 63 214 68 226 80 L234 119 C225 135 209 145 191 149 L158 143 C142 136 130 124 126 109 Z";

/*
 * 小腿示意图使用带分区标记的照片（1536x1024），viewBox 只取左腿区域（0 0 768 1024）单腿显示，
 * 高亮色块按照片自带分区标记定位，坐标即照片像素坐标。
 */
const MUSCLE_ZONE_RECTS: Partial<Record<PilotMuscleRegionId, Array<{ x: number; y: number; width: number; height: number }>>> = {
  "calf-anterior": [
    { x: 335, y: 115, width: 205, height: 293 },
  ],
  "calf-lateral": [
    { x: 285, y: 197, width: 48, height: 348 },
  ],
  "calf-medial": [
    { x: 516, y: 197, width: 48, height: 348 },
  ],
  "calf-posterior": [
    { x: 368, y: 518, width: 132, height: 294 },
  ],
};

function MuscleAnatomyMap({ regionId, view }: { regionId: PilotMuscleRegionId; view: MuscleRegionView }) {
  if (view === "sole") return <svg viewBox="0 0 360 170" role="img" aria-label="足底肌肉范围示意图" focusable="false">
    <rect width="360" height="170" rx="18" className="rm-muscle-location-figure__map-bg" />
    <path d="M103 28 C118 15 149 13 171 20 C186 14 215 16 230 30 C246 48 247 83 237 117 C229 143 212 154 190 155 L145 151 C124 146 111 129 108 104 L101 62 Z" className="rm-muscle-location-figure__map-base" />
    <path d={PLANTAR_ZONE_PATH} className="rm-muscle-location-figure__highlight" />
    <path d="M132 50 C155 65 199 67 226 50 M128 96 C153 111 204 113 237 96" className="rm-muscle-location-figure__map-line" />
    <text x="18" y="151" className="rm-muscle-location-figure__map-label">足底软组织与足弓范围</text>
  </svg>;

  const rects = MUSCLE_ZONE_RECTS[regionId] ?? [];
  return <svg viewBox="0 0 768 1024" role="img" aria-label="小腿肌肉范围示意图" focusable="false">
    <defs>
      <clipPath id={`muscle-photo-clip-${regionId}-${view}`}>
        <rect width="768" height="1024" rx="18" />
      </clipPath>
    </defs>
    <g clipPath={`url(#muscle-photo-clip-${regionId}-${view})`}>
      <image href="/rehabmind-region-calf-atlas-v2.png" width="1536" height="1024" className="rm-muscle-location-figure__photo" />
      {rects.map((rect) => <rect key={`${rect.x}-${rect.y}`} x={rect.x} y={rect.y} width={rect.width} height={rect.height} rx="42" className="rm-muscle-location-figure__highlight rm-muscle-location-figure__highlight--photo" />)}
    </g>
    <text x="30" y="988" className="rm-muscle-location-figure__map-label">色块为该肌肉区域范围示意</text>
  </svg>;
}

function MuscleRegionFigure({ label }: { label: string }) {
  const regionId = resolveRegionId(label);
  const display = displayForLocation(label);
  // 大腿暂无专属示意照片；显示小腿照片会标错位置，先走文字卡兜底。
  const spec = regionId && !regionId.startsWith("thigh") ? MUSCLE_MAPS[regionId] : undefined;
  if (!spec) return <figure className="rm-muscle-location-figure is-text-only" aria-label={`${display.label}定位范围说明`}>
    <div className="rm-muscle-location-figure__text-fallback"><span>定位范围</span><strong>{display.label}</strong></div>
    <figcaption>暂未提供匹配图</figcaption>
  </figure>;
  return <figure className={`rm-muscle-location-figure is-${display.view}`} aria-label={`${display.label}定位范围图`}>
    <div className="rm-muscle-location-figure__canvas">
      {regionId ? <MuscleAnatomyMap regionId={regionId} view={display.view} /> : null}
    </div>
    <figcaption>{spec.viewLabel}</figcaption>
  </figure>;
}

export function MuscleRegionTreatmentMap({ locations }: { locations: string[] }) {
  const uniqueLocations = [...new Set(locations)]
    .filter((location) => !SENTINEL_LABELS.has(location))
    .filter((location) => {
      const regionId = resolveRegionId(location);
      return Boolean(regionId && MUSCLE_MAPS[regionId]);
    });
  if (!uniqueLocations.length) return null;

  return <section className="rm-muscle-treatment-map" aria-label="处理目标肌肉群定位">
    <header>
      <div><span>处理目标定位</span><strong>对应的肌肉区域</strong></div>
      <small>只说明处理目标范围，不表示需要自行按压图中位置。</small>
    </header>
    <div className="rm-muscle-treatment-map__grid">
      {uniqueLocations.map((location) => {
        const display = displayForLocation(location);
        return <article key={location}>
          <MuscleRegionFigure label={location} />
          <div><strong>{display.label}</strong><span>{display.landmark}</span></div>
        </article>;
      })}
    </div>
  </section>;
}

export type MuscleRegionLocationPickerProps = {
  locations: string[];
  selectedLocations: string[];
  comparisonLabel: string;
  uncertainLabel?: string;
  professional?: boolean;
  bilateral?: boolean;
  showSpecials?: boolean;
  onToggle: (location: string) => void;
};

export function MuscleRegionLocationPicker({
  locations,
  selectedLocations,
  comparisonLabel,
  uncertainLabel = "暂不判断",
  professional = false,
  bilateral = false,
  showSpecials = true,
  onToggle,
}: MuscleRegionLocationPickerProps) {
  const uniqueLocations = [...new Set(locations)].filter((location) => !SENTINEL_LABELS.has(location));
  const displayForComparison = comparisonLabel === "两侧感觉接近" ? "两侧感觉接近" : "没有明显差别";

  return <div className="rm-muscle-location-picker">
    <p className="rm-muscle-location-picker__hint">{professional ? "按图示肌肉区域比较两侧的张力或按压阻力；压痛不等同于肌肉张力。" : "按图示同一肌肉区域，两侧分别轻按一次，比较哪一侧按压时更酸或更胀。"}</p>
    <div className="rm-muscle-location-grid">
      {uniqueLocations.map((location) => {
        const display = displayForLocation(location);
        if (!bilateral) {
          const selected = selectedLocations.includes(location);
          return <button
            type="button"
            key={location}
            className={`rm-muscle-location-card${selected ? " is-selected" : ""}`}
            aria-pressed={selected}
            onClick={() => onToggle(location)}
          >
            <span className="rm-muscle-location-card__copy">
              <strong>{display.label}</strong>
              <small>{display.landmark}</small>
              <em>{display.avoid}</em>
            </span>
            <MuscleRegionFigure label={location} />
          </button>;
        }
        const encoded = (side: "左侧" | "右侧") => `${side}｜${location}`;
        return <article key={location} className="rm-muscle-location-card is-bilateral-card">
          <span className="rm-muscle-location-card__copy">
            <strong>{display.label}</strong>
            <small>{display.landmark}</small>
            <em>{display.avoid}</em>
          </span>
          <MuscleRegionFigure label={location} />
          <div className="rm-muscle-location-card__sides" aria-label={`${display.label}左右按压反应`}>
            {(["左侧", "右侧"] as const).map((side) => {
              const sideLocation = encoded(side);
              const selected = selectedLocations.includes(sideLocation);
              return <button type="button" key={side} className={selected ? "is-selected" : ""} aria-pressed={selected} onClick={() => onToggle(sideLocation)}>
                {side}{selected ? "更明显" : "反应更明显"}
              </button>;
            })}
          </div>
        </article>;
      })}
    </div>
    {showSpecials ? <div className="rm-muscle-location-specials">
      <button type="button" className={selectedLocations.includes(comparisonLabel) ? "is-selected" : ""} aria-pressed={selectedLocations.includes(comparisonLabel)} onClick={() => onToggle(comparisonLabel)}>
        <strong>{displayForComparison}</strong><small>没有需要特别标记的区域</small>
      </button>
      <button type="button" className={selectedLocations.includes(uncertainLabel) ? "is-selected" : ""} aria-pressed={selectedLocations.includes(uncertainLabel)} onClick={() => onToggle(uncertainLabel)}>
        <strong>{uncertainLabel}</strong><small>不确定或不方便触碰</small>
      </button>
    </div> : null}
  </div>;
}

export default MuscleRegionLocationPicker;
