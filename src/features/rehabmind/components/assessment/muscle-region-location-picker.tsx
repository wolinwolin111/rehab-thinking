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
    label: "小腿后内侧",
  },
  plantar: {
    label: "足弓与足底中部",
  },
};

const REGION_ALIASES: Array<[PilotMuscleRegionId, RegExp]> = [
  ["thigh-anterior", /大腿前|股四头|股直肌/],
  ["thigh-lateral", /大腿外|外侧链|股外侧肌|阔筋膜张肌/],
  ["thigh-medial", /大腿内|内收肌/],
  ["thigh-posterior", /大腿后|腘绳肌/],
  ["calf-anterior", /小腿前|胫骨前|趾伸/],
  ["calf-posterior", /小腿后|小腿肚|腓肠|比目鱼/],
  ["calf-lateral", /小腿外|腓骨长肌|腓骨短肌|腓骨肌群/],
  ["calf-medial", /^小腿内侧$|小腿后内|胫骨后肌|后内侧定位/],
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
  anatomyLandmarks?: string[];
  assetReviewStatus?: "reviewed" | "pending";
  overlayReviewStatus?: "reviewed" | "pending";
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
    path: "M305 466 C335 448 417 447 450 464 C465 500 466 540 458 575 C451 604 440 628 425 642 C399 654 360 653 334 641 C317 620 305 594 299 561 C292 523 293 489 305 466 Z",
    assetReviewStatus: "reviewed",
    overlayReviewStatus: "pending",
  },
  "thigh-posterior": {
    view: "back",
    asset: "/rehabmind-lower-limb-back-v1.png",
    viewBox: "410 350 480 640",
    imageWidth: 1024,
    imageHeight: 1536,
    path: "M566 480 C598 458 681 458 712 478 C725 511 724 548 717 582 C710 611 700 635 687 650 C661 663 624 663 598 650 C581 630 569 604 560 570 C550 532 551 501 566 480 Z",
    assetReviewStatus: "reviewed",
    overlayReviewStatus: "pending",
  },
  "thigh-lateral": {
    view: "lateral",
    asset: "/rehabmind-lower-limb-lateral-v2.png",
    viewBox: "270 350 500 650",
    imageWidth: 1024,
    imageHeight: 1536,
    path: "M430 491 C466 465 575 466 616 493 C632 529 632 568 623 603 C615 632 603 657 588 675 C558 690 514 689 484 673 C462 646 446 614 435 578 C424 542 422 514 430 491 Z",
    anatomyLandmarks: ["右腿外侧", "外侧膝线", "外踝", "第五跖骨侧"],
    assetReviewStatus: "reviewed",
    overlayReviewStatus: "pending",
  },
  "thigh-medial": {
    view: "medial",
    asset: "/rehabmind-lower-limb-medial-v3.png",
    viewBox: "250 150 500 650",
    imageWidth: 1024,
    imageHeight: 1536,
    // 纯内侧正侧位上的内收肌群表面区：从短裤下缘向膝内侧收窄，
    // 止于膝关节线上方，不覆盖髌骨、膝关节或小腿。
    path: "M357 255 C397 232 514 235 548 266 C552 315 546 365 535 410 C525 451 507 488 481 515 C448 518 411 504 388 478 C372 434 362 386 357 334 C354 302 354 274 357 255 Z",
    anatomyLandmarks: ["右腿纯内侧正侧位", "内侧膝线", "内踝", "内侧足弓与拇趾侧"],
    assetReviewStatus: "reviewed",
    overlayReviewStatus: "pending",
  },
  "calf-anterior": {
    view: "front",
    asset: "/rehabmind-lower-limb-front-v1.png",
    viewBox: "150 650 480 640",
    imageWidth: 1024,
    imageHeight: 1536,
    path: "M326 758 C344 744 366 746 379 765 C386 812 383 864 378 919 C373 974 370 1030 365 1082 C361 1121 354 1147 344 1158 C334 1146 330 1122 330 1088 C330 1038 332 985 329 933 C326 878 318 808 326 758 Z",
    assetReviewStatus: "reviewed",
    overlayReviewStatus: "pending",
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
    assetReviewStatus: "reviewed",
    overlayReviewStatus: "pending",
  },
  "calf-lateral": {
    view: "lateral",
    asset: "/rehabmind-lower-limb-lateral-v2.png",
    viewBox: "270 650 500 700",
    imageWidth: 1024,
    imageHeight: 1536,
    path: "M500 770 C526 746 568 753 590 786 C603 832 601 883 592 934 C583 988 570 1041 561 1090 C554 1131 548 1170 533 1198 C516 1187 507 1154 506 1112 C505 1062 510 1008 506 955 C502 899 486 819 500 770 Z",
    anatomyLandmarks: ["外侧腓骨头下方", "腓骨长短肌肌腹", "外踝上方", "第五跖骨侧"],
    assetReviewStatus: "reviewed",
    overlayReviewStatus: "pending",
  },
  "calf-medial": {
    view: "medial",
    asset: "/rehabmind-lower-limb-medial-v3.png",
    viewBox: "240 560 560 760",
    imageWidth: 1024,
    imageHeight: 1536,
    // 胫骨后肌位于深后间室，因此这里只标示可用于表面定位的窄带：
    // 沿胫骨内侧缘后方下行并止于内踝后上方，不画成表浅宽大肌腹。
    path: "M360 690 C378 677 402 681 414 704 C420 764 416 834 410 910 C404 985 399 1056 396 1122 C394 1155 390 1178 384 1190 C374 1172 372 1146 374 1114 C378 1048 380 982 378 914 C376 834 361 754 360 690 Z",
    anatomyLandmarks: ["右腿纯内侧正侧位", "胫骨内侧缘后方", "内踝后上方", "内侧足弓与拇趾侧"],
    assetReviewStatus: "reviewed",
    overlayReviewStatus: "pending",
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
function mirroredViewBox(viewBox: string, imageWidth: number) {
  const [x, y, width, height] = viewBox.split(/\s+/).map(Number);
  return `${imageWidth - x - width} ${y} ${width} ${height}`;
}

function MuscleAnatomyMap({ regionId, side }: { regionId: PilotMuscleRegionId; side?: string }) {
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
  const mirrored = side?.startsWith("左") ?? false;
  const viewBox = mirrored ? mirroredViewBox(spec.viewBox, spec.imageWidth) : spec.viewBox;
  return <svg viewBox={viewBox} role="img" aria-label={`${side?.startsWith("左") ? "左侧" : side?.startsWith("右") ? "右侧" : ""}${regionId.startsWith("thigh") ? "大腿" : "小腿"}${viewLabels[spec.view as Exclude<MuscleRegionView, "sole">]}肌肉范围示意图`} focusable="false">
    <defs>
      <clipPath id={`muscle-photo-clip-${regionId}-${spec.view}`}>
        <rect x="0" y="0" width={spec.imageWidth} height={spec.imageHeight} rx="18" />
      </clipPath>
    </defs>
    <g clipPath={`url(#muscle-photo-clip-${regionId}-${spec.view})`}>
      <g transform={mirrored ? `translate(${spec.imageWidth} 0) scale(-1 1)` : undefined}>
        <image href={spec.asset} x="0" y="0" width={spec.imageWidth} height={spec.imageHeight} className="rm-muscle-location-figure__photo" preserveAspectRatio="xMidYMid meet" />
        <path d={spec.path} className="rm-muscle-location-figure__highlight" />
      </g>
    </g>
  </svg>;
}

function MuscleRegionFigure({ label, side }: { label: string; side?: string }) {
  const regionId = resolveRegionId(label);
  const display = displayForLocation(label);
  const spec = regionId ? MUSCLE_ZONE_PATHS[regionId] : undefined;
  if (!spec) return <figure className="rm-muscle-location-figure is-text-only" aria-label={`${display.label}定位范围说明`}>
    <div className="rm-muscle-location-figure__text-fallback"><span>定位范围</span><strong>{display.label}</strong></div>
    <figcaption>暂未提供匹配图</figcaption>
  </figure>;
  return <figure className={`rm-muscle-location-figure is-${spec.view}`} aria-label={`${display.label}定位范围图`} data-region-id={regionId} data-anatomy-view={spec.view} data-display-side={side?.startsWith("左") ? "left" : side?.startsWith("右") ? "right" : "reference"} data-asset-review={spec.assetReviewStatus} data-overlay-review={spec.overlayReviewStatus} data-anatomy-landmarks={spec.anatomyLandmarks?.join("|")}>
    <div className="rm-muscle-location-figure__canvas">
      {regionId ? <MuscleAnatomyMap regionId={regionId} side={side} /> : null}
    </div>
  </figure>;
}

type NormalizedLocation = { key: string; regionId: PilotMuscleRegionId; label: string; sources: string[] };

function normalizedLocations(locations: string[]): NormalizedLocation[] {
  const grouped = new Map<string, NormalizedLocation>();
  locations.filter((location) => !SENTINEL_LABELS.has(location)).forEach((location) => {
    const regionId = resolveRegionId(location);
    if (!regionId || !MUSCLE_ZONE_PATHS[regionId]) return;
    const existing = grouped.get(regionId);
    if (existing) existing.sources.push(location);
    else grouped.set(regionId, { key: regionId, regionId, label: REGION_DISPLAY[regionId].label, sources: [location] });
  });
  return [...grouped.values()];
}

function selectedForRegion(selectedLocations: string[], regionId: PilotMuscleRegionId, sidePrefix = "") {
  return selectedLocations.filter((location) => {
    const source = sidePrefix && location.startsWith(`${sidePrefix}｜`) ? location.slice(sidePrefix.length + 1) : location;
    return (!sidePrefix || location.startsWith(`${sidePrefix}｜`)) && resolveRegionId(source) === regionId;
  });
}

export function MuscleRegionTreatmentMap({ locations, side }: { locations: string[]; side?: string }) {
  const uniqueLocations = normalizedLocations(locations);
  if (!uniqueLocations.length) return null;

  return <section className="rm-muscle-treatment-map" aria-label="处理位置">
    <header>
      <strong>处理位置</strong>
    </header>
    <div className="rm-muscle-treatment-map__grid">
      {uniqueLocations.map((location) => {
        return <article key={location.key}>
          <MuscleRegionFigure label={location.label} side={side} />
          <strong>{location.label}</strong>
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
  side?: string;
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
  side,
  showSpecials = true,
  onToggle,
}: MuscleRegionLocationPickerProps) {
  const uniqueLocations = normalizedLocations(locations);
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
        const display = REGION_DISPLAY[location.regionId];
        if (!bilateral) {
          const selectedSources = selectedForRegion(selectedLocations, location.regionId);
          const selected = selectedSources.length > 0;
          return <button
            type="button"
            key={location.key}
            className={`rm-muscle-location-card${selected ? " is-selected" : ""}`}
            aria-pressed={selected}
            data-region-id={location.regionId}
            onClick={() => selected ? selectedSources.forEach(onToggle) : onToggle(location.sources[0])}
          >
            <span className="rm-muscle-location-card__copy">
              <strong>{display.label}</strong>
            </span>
            <MuscleRegionFigure label={location.label} side={side} />
          </button>;
        }
        const encoded = (selectionSide: "左侧" | "右侧") => `${selectionSide}｜${location.sources[0]}`;
        return <article key={location.key} className="rm-muscle-location-card is-bilateral-card" data-region-id={location.regionId}>
          <span className="rm-muscle-location-card__copy">
            <strong>{display.label}</strong>
          </span>
          <MuscleRegionFigure label={location.label} />
          <div className="rm-muscle-location-card__sides" aria-label={`${display.label}左右按压反应`}>
            {(["左侧", "右侧"] as const).map((selectionSide) => {
              const sideLocation = encoded(selectionSide);
              const selectedSources = selectedForRegion(selectedLocations, location.regionId, selectionSide);
              const selected = selectedSources.length > 0;
              return <button type="button" key={selectionSide} className={selected ? "is-selected" : ""} aria-pressed={selected} onClick={() => selected ? selectedSources.forEach(onToggle) : onToggle(sideLocation)}>
                {selectionSide}{selected ? "更明显" : "反应更明显"}
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
