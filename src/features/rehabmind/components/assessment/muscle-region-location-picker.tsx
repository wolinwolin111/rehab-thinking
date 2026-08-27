"use client";

import { PILOT_MUSCLE_REGIONS, type PilotMuscleRegionId } from "@/src/knowledge/pilot/pilot-motion-muscle-knowledge";

type MuscleRegionView = "front" | "back" | "medial" | "lateral" | "sole";

type MuscleRegionDisplay = {
  label: string;
};

const REGION_DISPLAY: Record<PilotMuscleRegionId, MuscleRegionDisplay> = {
  "thigh-anterior": {
    label: "大腿前侧",
  },
  "thigh-lateral": {
    label: "大腿外侧",
  },
  "thigh-medial": {
    label: "大腿内侧",
  },
  "thigh-posterior": {
    label: "大腿后侧",
  },
  "calf-anterior": {
    label: "小腿前侧",
  },
  "calf-posterior": {
    label: "小腿后侧",
  },
  "calf-lateral": {
    label: "小腿外侧",
  },
  "calf-medial": {
    label: "小腿内侧",
  },
  plantar: {
    label: "足弓与足底中部",
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
  };
}

type MuscleMapSpec = {
  view: MuscleRegionView;
  asset: string;
  viewBox: string;
  imageWidth: number;
  imageHeight: number;
  path: string;
};

/* 足底示意图是纯 SVG 手绘（无照片素材），高亮区为足弓范围。 */
const PLANTAR_ZONE_PATH = "M134 77 C145 67 160 64 178 66 C195 63 214 68 226 80 L234 119 C225 135 209 145 191 149 L158 143 C142 136 130 124 126 109 Z";

const MUSCLE_ZONE_PATHS: Partial<Record<PilotMuscleRegionId, MuscleMapSpec>> = {
  // 所有照片和路径都使用原生 1024×1536 坐标。每张卡通过 viewBox 裁切
  // 当前肢段，不再拉伸图片，也不再用正面图的边缘冒充内外侧视角。
  "thigh-anterior": {
    view: "front",
    asset: "/rehabmind-lower-limb-front-v1.png",
    viewBox: "150 350 480 640",
    imageWidth: 1024,
    imageHeight: 1536,
    path: "M302 458 C333 440 418 439 457 458 C476 492 479 541 471 590 C464 631 454 665 449 688 C432 705 407 713 379 712 C349 711 324 702 309 684 C303 646 294 608 288 566 C282 520 285 482 302 458 Z",
  },
  "thigh-posterior": {
    view: "back",
    asset: "/rehabmind-lower-limb-back-v1.png",
    viewBox: "410 350 480 640",
    imageWidth: 1024,
    imageHeight: 1536,
    path: "M563 472 C597 451 682 451 715 470 C730 505 729 548 721 591 C713 631 704 664 699 688 C682 707 659 716 631 715 C603 714 580 705 564 685 C558 649 549 608 545 568 C541 524 546 492 563 472 Z",
  },
  "thigh-lateral": {
    view: "lateral",
    asset: "/rehabmind-lower-limb-lateral-v1.png",
    viewBox: "270 350 480 640",
    imageWidth: 1024,
    imageHeight: 1536,
    path: "M425 468 C455 445 535 446 570 469 C586 504 588 548 579 590 C570 629 555 663 545 686 C526 704 501 710 474 706 C450 702 431 691 419 675 C415 632 407 590 405 550 C403 514 408 486 425 468 Z",
  },
  "thigh-medial": {
    view: "medial",
    asset: "/rehabmind-lower-limb-medial-v1.png",
    viewBox: "250 350 480 640",
    imageWidth: 1024,
    imageHeight: 1536,
    path: "M382 489 C412 463 491 458 526 480 C542 512 544 553 537 594 C530 631 520 662 511 684 C493 701 470 709 443 706 C418 703 399 692 386 675 C380 636 371 596 369 558 C367 527 372 503 382 489 Z",
  },
  "calf-anterior": {
    view: "front",
    asset: "/rehabmind-lower-limb-front-v1.png",
    viewBox: "150 650 480 640",
    imageWidth: 1024,
    imageHeight: 1536,
    path: "M320 760 C342 741 372 742 391 764 C403 812 399 866 394 919 C389 974 386 1035 382 1090 C378 1132 369 1161 356 1172 C342 1163 336 1137 335 1101 C334 1046 337 987 333 930 C329 873 315 810 320 760 Z",
  },
  "calf-posterior": {
    view: "back",
    asset: "/rehabmind-lower-limb-back-v1.png",
    viewBox: "410 650 480 640",
    imageWidth: 1024,
    imageHeight: 1536,
    // 腓肠肌和比目鱼肌作为一个连续产品区域：覆盖完整小腿肚，向
    // 下逐渐收窄并止于跟腱肌腱交界上方，不拆内外侧头或上下段。
    path: "M553 762 C583 730 680 728 714 760 C739 797 742 851 731 909 C720 966 700 1015 689 1062 C679 1105 671 1146 655 1176 C637 1159 624 1127 616 1088 C607 1046 596 1006 581 961 C562 905 538 821 553 762 Z",
  },
  "calf-lateral": {
    view: "lateral",
    asset: "/rehabmind-lower-limb-lateral-v1.png",
    viewBox: "270 650 480 640",
    imageWidth: 1024,
    imageHeight: 1536,
    path: "M500 756 C526 739 558 748 574 776 C584 825 580 878 572 932 C564 988 554 1045 548 1098 C543 1139 534 1168 520 1180 C505 1169 498 1141 497 1103 C497 1053 501 999 497 947 C493 890 482 812 500 756 Z",
  },
  "calf-medial": {
    view: "medial",
    asset: "/rehabmind-lower-limb-medial-v1.png",
    viewBox: "250 650 480 640",
    imageWidth: 1024,
    imageHeight: 1536,
    path: "M402 760 C426 740 455 746 472 774 C482 823 479 877 472 930 C464 986 454 1040 449 1093 C445 1135 437 1164 424 1177 C409 1167 401 1139 400 1102 C399 1051 402 998 398 945 C394 888 385 813 402 760 Z",
  },
  plantar: {
    view: "sole",
    asset: "",
    viewBox: "0 0 360 170",
    imageWidth: 360,
    imageHeight: 170,
    path: PLANTAR_ZONE_PATH,
  },
};

/*
 * This is a dedicated muscle map, intentionally separate from the pain/body
 * location photos. It is a compact regional anatomy diagram: the base shows
 * the limb outline and the low-saturation overlay shows the usable muscle
 * range. It communicates a region, not a diagnosis or a single tender point.
 */
function MuscleAnatomyMap({ regionId }: { regionId: PilotMuscleRegionId }) {
  const spec = MUSCLE_ZONE_PATHS[regionId];
  if (!spec) return null;
  if (spec.view === "sole") return <svg viewBox="0 0 360 170" role="img" aria-label="足底肌肉范围示意图" focusable="false">
    <rect width="360" height="170" rx="18" className="rm-muscle-location-figure__map-bg" />
    <path d="M103 28 C118 15 149 13 171 20 C186 14 215 16 230 30 C246 48 247 83 237 117 C229 143 212 154 190 155 L145 151 C124 146 111 129 108 104 L101 62 Z" className="rm-muscle-location-figure__map-base" />
    <path d={PLANTAR_ZONE_PATH} className="rm-muscle-location-figure__highlight" />
    <path d="M132 50 C155 65 199 67 226 50 M128 96 C153 111 204 113 237 96" className="rm-muscle-location-figure__map-line" />
    <text x="18" y="151" className="rm-muscle-location-figure__map-label">足底软组织与足弓范围</text>
  </svg>;

  const viewLabels: Record<Exclude<MuscleRegionView, "sole">, string> = { front: "前侧", back: "后侧", medial: "内侧", lateral: "外侧" };
  return <svg viewBox={spec.viewBox} role="img" aria-label={`${regionId.startsWith("thigh") ? "大腿" : "小腿"}${viewLabels[spec.view as Exclude<MuscleRegionView, "sole">]}肌肉范围示意图`} focusable="false">
    <defs>
      <clipPath id={`muscle-photo-clip-${regionId}-${spec.view}`}>
        <rect x="0" y="0" width={spec.imageWidth} height={spec.imageHeight} rx="18" />
      </clipPath>
    </defs>
    <g clipPath={`url(#muscle-photo-clip-${regionId}-${spec.view})`}>
      <image href={spec.asset} x="0" y="0" width={spec.imageWidth} height={spec.imageHeight} className="rm-muscle-location-figure__photo" preserveAspectRatio="xMidYMid meet" />
      <path d={spec.path} className="rm-muscle-location-figure__highlight" />
    </g>
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
  return <figure className={`rm-muscle-location-figure is-${spec.view}`} aria-label={`${display.label}定位范围图`} data-region-id={regionId} data-anatomy-view={spec.view}>
    <div className="rm-muscle-location-figure__canvas">
      {regionId ? <MuscleAnatomyMap regionId={regionId} /> : null}
    </div>
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

  return <section className="rm-muscle-treatment-map" aria-label="处理位置">
    <header>
      <strong>处理位置</strong>
    </header>
    <div className="rm-muscle-treatment-map__grid">
      {uniqueLocations.map((location) => {
        const display = displayForLocation(location);
        return <article key={location}>
          <MuscleRegionFigure label={location} />
          <strong>{display.label}</strong>
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
  const instruction = professional
    ? "左右各轻按一次，选择张力或按压阻力更明显的区域。"
    : bilateral
      ? "左右两侧各轻按一次，选择反应更明显的区域。"
      : "先轻按另一侧，再轻按不舒服的一侧，选择更酸或更胀的区域。";

  return <div className="rm-muscle-location-picker">
    <p className="rm-muscle-location-picker__hint">{instruction}</p>
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
            </span>
            <MuscleRegionFigure label={location} />
          </button>;
        }
        const encoded = (side: "左侧" | "右侧") => `${side}｜${location}`;
        return <article key={location} className="rm-muscle-location-card is-bilateral-card">
          <span className="rm-muscle-location-card__copy">
            <strong>{display.label}</strong>
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
        <strong>{displayForComparison}</strong>
      </button>
      <button type="button" className={selectedLocations.includes(uncertainLabel) ? "is-selected" : ""} aria-pressed={selectedLocations.includes(uncertainLabel)} onClick={() => onToggle(uncertainLabel)}>
        <strong>{uncertainLabel}</strong>
      </button>
    </div> : null}
    <p className="rm-muscle-location-picker__safety">避开骨头和关节；出现刺痛、麻或电感就停止。</p>
  </div>;
}

export default MuscleRegionLocationPicker;
