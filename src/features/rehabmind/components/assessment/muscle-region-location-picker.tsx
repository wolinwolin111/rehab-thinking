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
  asset: string;
  path: string;
};

/* 足底示意图是纯 SVG 手绘（无照片素材），高亮区为足弓范围。 */
const PLANTAR_ZONE_PATH = "M134 77 C145 67 160 64 178 66 C195 63 214 68 226 80 L234 119 C225 135 209 145 191 149 L158 143 C142 136 130 124 126 109 Z";

const MUSCLE_ZONE_PATHS: Partial<Record<PilotMuscleRegionId, MuscleMapSpec>> = {
  // 一张卡只呈现当前目标肌群。路径按干净人体底图的轮廓绘制，不再把
  // 大腿、小腿机械拆成上中下矩形；同一功能肌群保持为一个连续区域。
  "thigh-anterior": {
    viewLabel: "大腿前侧肌肉范围示意",
    asset: "/rehabmind-region-thigh-v1.png",
    path: "M284 119 C323 95 427 92 472 116 C493 146 497 201 486 261 C474 330 460 391 457 458 C453 535 462 604 446 668 C432 716 407 744 374 748 C336 744 311 716 298 666 C282 604 292 535 287 459 C284 390 267 326 258 259 C249 199 254 148 284 119 Z",
  },
  "thigh-posterior": {
    viewLabel: "大腿后侧肌肉范围示意",
    asset: "/rehabmind-region-thigh-v1.png",
    path: "M291 126 C326 103 424 101 463 124 C484 166 486 224 477 286 C468 348 461 414 458 482 C455 553 465 623 447 683 C432 730 405 758 374 761 C339 757 312 730 297 682 C279 620 290 551 286 481 C282 410 269 347 261 282 C254 222 260 163 291 126 Z",
  },
  "thigh-lateral": {
    viewLabel: "大腿外侧肌肉范围示意",
    asset: "/rehabmind-region-thigh-v1.png",
    path: "M213 153 C235 135 255 137 270 157 C279 205 282 259 287 315 C294 391 305 477 307 554 C308 620 299 680 278 714 C260 734 240 724 231 696 C222 640 220 575 214 511 C206 429 190 348 185 275 C181 222 189 177 213 153 Z",
  },
  "thigh-medial": {
    viewLabel: "大腿内侧肌肉范围示意",
    asset: "/rehabmind-region-thigh-v1.png",
    path: "M489 152 C510 134 537 139 552 164 C566 211 564 265 555 321 C544 389 531 468 525 545 C520 610 519 674 502 711 C488 735 469 727 459 699 C452 647 454 584 456 523 C458 447 464 368 469 297 C473 237 472 181 489 152 Z",
  },
  "calf-anterior": {
    viewLabel: "小腿前侧肌肉范围示意",
    asset: "/rehabmind-region-calf-v1.png",
    path: "M365 126 C389 108 431 111 452 133 C465 181 462 239 454 302 C446 371 440 440 441 511 C442 590 454 672 448 751 C444 796 429 826 408 831 C386 822 376 791 374 747 C372 676 377 603 374 531 C372 459 361 386 354 316 C348 248 348 175 365 126 Z",
  },
  "calf-posterior": {
    viewLabel: "小腿三头肌整体范围示意",
    asset: "/rehabmind-region-calf-v1.png",
    // 腓肠肌与比目鱼肌按产品处理单元合并为一块：上方覆盖小腿肚，
    // 下方向跟腱上方自然收窄，不拆内外侧头，也不拆上中下三段。
    path: "M287 142 C320 111 418 106 458 139 C493 178 505 242 497 315 C489 386 469 446 457 512 C444 582 439 653 425 716 C415 765 398 806 376 838 C352 807 336 766 327 716 C316 654 311 581 297 513 C284 446 263 385 256 315 C248 242 258 181 287 142 Z",
  },
  "calf-lateral": {
    viewLabel: "小腿外侧肌肉范围示意",
    asset: "/rehabmind-region-calf-v1.png",
    path: "M285 171 C306 151 327 157 340 184 C347 235 345 292 351 350 C358 418 370 485 369 551 C368 620 359 692 344 749 C334 787 319 806 303 797 C288 775 284 737 282 692 C279 628 271 564 265 500 C259 433 251 365 253 302 C254 246 262 198 285 171 Z",
  },
  "calf-medial": {
    viewLabel: "小腿内侧肌肉范围示意",
    asset: "/rehabmind-region-calf-v1.png",
    path: "M471 170 C490 151 514 158 526 185 C536 234 536 290 530 350 C524 417 511 486 508 552 C505 620 511 686 499 744 C491 782 477 803 461 797 C446 778 442 742 442 697 C442 631 449 565 452 500 C456 431 457 365 457 302 C457 245 458 198 471 170 Z",
  },
  plantar: {
    viewLabel: "足底肌肉范围示意",
    asset: "",
    path: PLANTAR_ZONE_PATH,
  },
};

/*
 * This is a dedicated muscle map, intentionally separate from the pain/body
 * location photos. It is a compact regional anatomy diagram: the base shows
 * the limb outline and the low-saturation overlay shows the usable muscle
 * range. It communicates a region, not a diagnosis or a single tender point.
 */
function MuscleAnatomyMap({ regionId, view }: { regionId: PilotMuscleRegionId; view: MuscleRegionView }) {
  if (view === "sole") return <svg viewBox="0 0 360 170" role="img" aria-label="足底肌肉范围示意图" focusable="false">
    <rect width="360" height="170" rx="18" className="rm-muscle-location-figure__map-bg" />
    <path d="M103 28 C118 15 149 13 171 20 C186 14 215 16 230 30 C246 48 247 83 237 117 C229 143 212 154 190 155 L145 151 C124 146 111 129 108 104 L101 62 Z" className="rm-muscle-location-figure__map-base" />
    <path d={PLANTAR_ZONE_PATH} className="rm-muscle-location-figure__highlight" />
    <path d="M132 50 C155 65 199 67 226 50 M128 96 C153 111 204 113 237 96" className="rm-muscle-location-figure__map-line" />
    <text x="18" y="151" className="rm-muscle-location-figure__map-label">足底软组织与足弓范围</text>
  </svg>;

  const spec = MUSCLE_ZONE_PATHS[regionId];
  if (!spec) return null;
  const showBack = view === "back";
  return <svg viewBox="0 0 768 1024" role="img" aria-label={`${regionId.startsWith("thigh") ? "大腿" : "小腿"}${showBack ? "背面" : "正面"}肌肉范围示意图`} focusable="false">
    <defs>
      <clipPath id={`muscle-photo-clip-${regionId}-${view}`}>
        <rect width="768" height="1024" rx="18" />
      </clipPath>
    </defs>
    <g clipPath={`url(#muscle-photo-clip-${regionId}-${view})`}>
      <image href={spec.asset} x={showBack ? -768 : 0} y="0" width="1536" height="1024" className="rm-muscle-location-figure__photo" preserveAspectRatio="none" />
      <path d={spec.path} className="rm-muscle-location-figure__highlight" />
    </g>
    <text x="30" y="988" className="rm-muscle-location-figure__map-label">青绿色为当前肌群范围示意</text>
  </svg>;
}

function MuscleRegionFigure({ label }: { label: string }) {
  const regionId = resolveRegionId(label);
  const display = displayForLocation(label);
  const spec = regionId ? MUSCLE_ZONE_PATHS[regionId] : undefined;
  if (!spec) return <figure className="rm-muscle-location-figure is-text-only" aria-label={`${display.label}定位范围说明`}>
    <div className="rm-muscle-location-figure__text-fallback"><span>定位范围</span><strong>{display.label}</strong></div>
    <figcaption>暂未提供匹配图</figcaption>
  </figure>;
  return <figure className={`rm-muscle-location-figure is-${display.view}`} aria-label={`${display.label}定位范围图`} data-region-id={regionId}>
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
      return Boolean(regionId && MUSCLE_ZONE_PATHS[regionId]);
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
