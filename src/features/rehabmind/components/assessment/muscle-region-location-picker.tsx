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
const MUSCLE_ZONE_PATHS: Record<PilotMuscleRegionId, string[]> = {
  "thigh-anterior": ["M128 51 C145 40 215 40 232 53 L226 204 C216 220 198 229 180 229 C160 229 141 220 132 204 Z"],
  "thigh-posterior": ["M130 52 C149 39 210 39 230 54 L226 205 C215 221 198 229 180 229 C160 229 143 220 132 204 Z"],
  "thigh-lateral": ["M112 61 C124 48 137 45 148 49 L154 204 C145 220 132 226 122 215 L111 188 Z"],
  "thigh-medial": ["M212 50 C227 47 240 55 247 70 L238 187 C232 213 221 222 207 205 L204 93 Z"],
  "calf-anterior": ["M145 257 C158 247 202 247 216 258 L209 397 C202 423 190 437 177 437 C162 436 151 421 146 397 Z"],
  "calf-posterior": ["M145 258 C157 246 202 246 216 260 L209 398 C201 424 191 438 178 438 C163 437 151 421 146 398 Z"],
  "calf-lateral": ["M133 265 C143 252 154 251 161 260 L157 394 C153 418 145 426 137 416 L131 367 Z"],
  "calf-medial": ["M201 258 C213 252 224 258 229 270 L224 391 C219 416 211 425 202 414 L198 350 Z"],
  plantar: ["M134 77 C145 67 160 64 178 66 C195 63 214 68 226 80 L234 119 C225 135 209 145 191 149 L158 143 C142 136 130 124 126 109 Z"],
};

const MUSCLE_BASE_PATHS = {
  front: {
    upper: "M117 40 C133 24 224 24 243 43 L247 74 L233 213 C223 237 208 247 180 247 C151 247 135 236 125 213 L112 75 Z",
    lower: "M139 244 C153 232 208 232 221 246 L224 283 L215 407 C207 442 193 459 178 460 C162 459 148 442 141 409 L134 282 Z",
  },
  back: {
    upper: "M117 42 C137 24 224 24 243 43 L247 75 L233 214 C220 238 203 248 180 248 C157 248 139 237 125 214 L112 75 Z",
    lower: "M139 244 C154 232 207 232 221 246 L224 283 L215 407 C207 442 193 459 178 460 C162 459 148 442 141 409 L134 282 Z",
  },
};

function MuscleAnatomyMap({ regionId, view }: { regionId: PilotMuscleRegionId; view: MuscleRegionView }) {
  const photo = view === "front"
    ? "/rehabmind-region-calf-v1.png"
    : "/rehabmind-region-calf-atlas-v2.png";
  if (view === "sole") return <svg viewBox="0 0 360 170" role="img" aria-label="足底肌肉范围示意图" focusable="false">
    <rect width="360" height="170" rx="18" className="rm-muscle-location-figure__map-bg" />
    <path d="M103 28 C118 15 149 13 171 20 C186 14 215 16 230 30 C246 48 247 83 237 117 C229 143 212 154 190 155 L145 151 C124 146 111 129 108 104 L101 62 Z" className="rm-muscle-location-figure__map-base" />
    <path d={MUSCLE_ZONE_PATHS[regionId][0]} className="rm-muscle-location-figure__highlight" />
    <path d="M132 50 C155 65 199 67 226 50 M128 96 C153 111 204 113 237 96" className="rm-muscle-location-figure__map-line" />
    <text x="18" y="151" className="rm-muscle-location-figure__map-label">足底软组织与足弓范围</text>
  </svg>;

  return <svg viewBox="0 0 360 480" role="img" aria-label="下肢肌肉范围示意图" focusable="false">
    <defs>
      <clipPath id={`muscle-photo-clip-${regionId}-${view}`}>
        <rect width="360" height="480" rx="18" />
      </clipPath>
    </defs>
    <image href={photo} width="360" height="480" preserveAspectRatio="xMidYMid slice" clipPath={`url(#muscle-photo-clip-${regionId}-${view})`} className="rm-muscle-location-figure__photo" />
    <path d={MUSCLE_ZONE_PATHS[regionId][0]} className="rm-muscle-location-figure__highlight rm-muscle-location-figure__highlight--photo" />
    <text x="18" y="462" className="rm-muscle-location-figure__map-label">目标区已标出 · 照片示意</text>
  </svg>;
}

function MuscleRegionFigure({ label }: { label: string }) {
  const regionId = resolveRegionId(label);
  const display = displayForLocation(label);
  const spec = regionId ? MUSCLE_MAPS[regionId] : undefined;
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
