import { useMemo, useState } from "react";

export type LowerLimbSide = "左侧" | "右侧" | "双侧/中间";
export type LowerLimbAreaId = "thigh" | "knee" | "calf" | "ankle" | "foot";
type AtlasView = "front" | "back" | "medial" | "lateral";

export type LowerLimbLocationSelection = {
  id: string;
  side: LowerLimbSide;
  areaId: LowerLimbAreaId;
  areaLabel: string;
  location: string;
  regionId: "thigh-local" | "knee" | "calf-local" | "ankle-foot";
  view: AtlasView;
};

type AreaDefinition = {
  id: LowerLimbAreaId;
  label: string;
  asset: string;
  regionId: LowerLimbLocationSelection["regionId"];
  views: [string, string];
};

type AtlasZone = {
  id: string;
  view: AtlasView;
  location: string;
  path: string;
};

type AtlasPanel = {
  view: AtlasView;
  label: string;
  asset: string;
  imageHalf: "front" | "back";
  viewBox?: string;
  mirrorWidth?: number;
  bakedZones?: boolean;
};

const AREAS: AreaDefinition[] = [
  { id: "thigh", label: "大腿", asset: "/rehabmind-region-thigh-atlas-v2.png", regionId: "thigh-local", views: ["正面", "背面"] },
  { id: "knee", label: "膝盖", asset: "/rehabmind-region-knee-atlas-v2.png", regionId: "knee", views: ["正面", "背面"] },
  { id: "calf", label: "小腿", asset: "/rehabmind-region-calf-atlas-v2.png", regionId: "calf-local", views: ["正面", "背面"] },
  { id: "ankle", label: "脚踝", asset: "/rehabmind-region-ankle-atlas-v2.png", regionId: "ankle-foot", views: ["正面", "背面"] },
  { id: "foot", label: "足部", asset: "/rehabmind-region-foot-atlas-v2.png", regionId: "ankle-foot", views: ["足背", "足底"] },
];

const AREA_BY_ID = Object.fromEntries(AREAS.map((area) => [area.id, area])) as Record<LowerLimbAreaId, AreaDefinition>;

const ATLAS_ZONES: Record<LowerLimbAreaId, AtlasZone[]> = {
  thigh: [
    { id: "thigh-front-lateral", view: "front", location: "大腿前外侧", path: "M199 171 L178 195 L178 245 L232 532 L241 646 L252 665 L263 666 L282 653 L291 629 L277 413 L239 223 L221 179 Z" },
    { id: "thigh-front-upper", view: "front", location: "大腿前侧上段", path: "M263 145 L253 164 L255 198 L286 329 L301 353 L336 363 L445 364 L475 349 L510 195 L508 167 L497 151 L458 133 L386 123 L313 126 Z" },
    { id: "thigh-front-lower", view: "front", location: "大腿前侧下段", path: "M324 392 L308 407 L302 431 L308 552 L324 633 L356 658 L431 656 L453 638 L467 592 L473 501 L468 413 L455 396 L430 388 Z" },
    { id: "thigh-front-medial", view: "front", location: "大腿前内侧", path: "M565 180 L549 184 L532 212 L499 372 L488 622 L494 649 L516 666 L538 655 L588 243 L586 199 Z" },
    { id: "thigh-back-medial", view: "back", location: "大腿后内侧", path: "M208 179 L180 199 L173 241 L205 468 L216 662 L225 692 L248 704 L269 683 L281 624 L276 356 L255 217 L232 183 Z" },
    { id: "thigh-back-upper", view: "back", location: "大腿后侧上段", path: "M324 168 L301 187 L292 225 L295 348 L304 401 L333 434 L431 434 L456 412 L467 374 L473 253 L467 191 L452 173 L426 164 Z" },
    { id: "thigh-back-lower", view: "back", location: "大腿后侧下段", path: "M335 469 L318 481 L306 512 L302 680 L307 701 L323 718 L347 725 L436 721 L454 708 L463 687 L454 492 L440 474 L414 465 Z" },
    { id: "thigh-back-lateral", view: "back", location: "大腿后外侧", path: "M556 173 L529 182 L509 216 L488 367 L484 629 L495 682 L518 704 L536 695 L547 661 L554 487 L592 238 L584 191 Z" },
  ],
  knee: [
    { id: "knee-front-upper", view: "front", location: "髌骨上方", path: "M219 164 L222 190 L256 256 L271 268 L360 245 L411 247 L470 266 L485 265 L529 174 L521 151 L489 132 L407 116 L324 118 L281 126 L234 146 Z" },
    { id: "knee-front-lateral-upper", view: "front", location: "膝前外上方", path: "M202 194 L185 200 L167 221 L149 276 L152 402 L157 421 L167 428 L225 416 L257 295 L252 273 L222 214 Z" },
    { id: "knee-front-medial-upper", view: "front", location: "膝前内上方", path: "M548 190 L534 202 L509 252 L502 291 L527 344 L537 413 L549 420 L609 425 L620 413 L626 323 L618 271 L589 212 L569 195 Z" },
    { id: "knee-front-patella", view: "front", location: "髌骨周围", path: "M359 271 L304 285 L271 311 L246 366 L243 433 L264 527 L299 588 L319 605 L343 615 L406 618 L451 601 L486 554 L514 461 L522 376 L505 322 L479 294 L427 274 Z" },
    { id: "knee-front-lateral-line", view: "front", location: "膝外侧关节线", path: "M165 443 L158 454 L157 480 L174 560 L187 573 L214 585 L253 586 L261 561 L233 444 L223 435 Z" },
    { id: "knee-front-medial-line", view: "front", location: "膝内侧关节线", path: "M618 443 L556 435 L533 441 L495 576 L502 600 L555 598 L598 579 L624 492 L626 457 Z" },
    { id: "knee-front-lateral-below", view: "front", location: "膝外侧偏下", path: "M174 584 L164 598 L162 634 L170 720 L183 770 L219 823 L261 851 L276 851 L283 836 L284 784 L270 627 L252 609 Z" },
    { id: "knee-front-tendon", view: "front", location: "髌骨下方 / 髌腱", path: "M305 622 L292 644 L300 905 L311 927 L334 944 L364 950 L399 946 L429 927 L443 895 L456 636 L445 624 L360 632 Z" },
    { id: "knee-front-medial-below", view: "front", location: "膝内侧偏下", path: "M589 606 L502 621 L477 643 L461 808 L463 842 L472 854 L490 853 L515 837 L540 809 L558 777 L593 648 L596 617 Z" },
    { id: "knee-back-medial", view: "back", location: "膝后内侧", path: "M120 276 L109 280 L100 296 L116 436 L173 636 L183 650 L201 652 L264 620 L286 587 L270 371 L249 331 L215 302 L168 282 Z" },
    { id: "knee-back-center", view: "back", location: "膝后侧 / 腘窝", path: "M346 359 L305 377 L289 408 L288 473 L303 563 L314 587 L337 604 L362 610 L421 605 L449 586 L464 550 L478 459 L475 398 L460 375 L435 362 L404 356 Z" },
    { id: "knee-back-lateral", view: "back", location: "膝后外侧", path: "M631 278 L586 286 L536 312 L507 341 L492 377 L492 456 L477 570 L480 592 L488 606 L511 623 L588 649 L606 647 L617 632 L627 528 L650 406 L652 303 L646 287 Z" },
    { id: "knee-back-below", view: "back", location: "膝后下方", path: "M250 677 L228 712 L221 768 L225 931 L237 1023 L566 1023 L579 937 L589 799 L587 726 L570 685 L548 668 L514 655 L443 644 L316 651 L279 661 Z" },
  ],
  calf: [
    { id: "calf-front-lateral", view: "front", location: "小腿前外侧", path: "M316 199 L299 214 L290 235 L284 329 L308 498 L319 536 L332 542 L361 522 L369 489 L364 433 L331 288 L326 212 Z" },
    { id: "calf-front-shin-upper", view: "front", location: "胫骨前侧上段", path: "M428 116 L370 123 L353 132 L346 150 L351 279 L368 364 L387 399 L420 408 L454 403 L476 379 L498 204 L497 148 L490 131 L467 120 Z" },
    { id: "calf-front-shin-lower", view: "front", location: "胫骨前侧下段", path: "M411 519 L383 528 L370 548 L372 652 L380 730 L395 790 L412 807 L439 811 L470 796 L480 768 L484 556 L468 525 Z" },
    { id: "calf-front-medial", view: "front", location: "小腿前内侧", path: "M531 198 L521 210 L516 297 L485 464 L488 514 L519 540 L531 534 L539 509 L563 354 L557 241 L544 208 Z" },
    { id: "calf-back-medial", view: "back", location: "小腿后内侧", path: "M227 211 L211 229 L200 269 L189 412 L207 531 L219 556 L235 562 L259 542 L264 508 L251 390 L258 251 L248 223 Z" },
    { id: "calf-back-center", view: "back", location: "腓肠肌中部", path: "M339 185 L302 193 L285 217 L275 410 L283 485 L299 539 L320 555 L359 559 L393 548 L412 514 L430 415 L431 316 L414 199 L391 187 Z" },
    { id: "calf-back-lateral", view: "back", location: "小腿后外侧", path: "M485 224 L461 231 L448 256 L452 407 L433 535 L440 550 L463 565 L483 561 L501 531 L523 395 L518 282 L503 239 Z" },
    { id: "calf-back-lower", view: "back", location: "小腿后侧下段", path: "M295 598 L269 615 L262 639 L265 702 L287 826 L298 848 L317 862 L375 864 L401 849 L417 815 L440 691 L443 626 L430 605 L412 597 Z" },
  ],
  ankle: [
    { id: "ankle-front-above", view: "front", location: "踝前上方", path: "M273 329 L283 381 L307 422 L369 406 L408 407 L467 421 L481 396 L496 340 L492 326 L468 309 L400 295 L316 302 L284 316 Z" },
    { id: "ankle-front-lateral", view: "front", location: "外踝 / 前外侧", path: "M255 400 L246 408 L220 550 L221 586 L242 657 L245 704 L273 679 L283 661 L292 571 L291 450 L278 421 Z" },
    { id: "ankle-front-center", view: "front", location: "踝前方", path: "M345 433 L325 447 L315 470 L314 668 L346 680 L433 679 L467 671 L477 659 L479 638 L455 452 L416 429 L379 426 Z" },
    { id: "ankle-front-medial", view: "front", location: "内踝 / 前内侧", path: "M514 403 L499 415 L487 442 L490 556 L506 648 L545 690 L548 623 L563 563 L564 528 L527 416 Z" },
    { id: "ankle-front-foot-junction", view: "front", location: "踝与足背交界", path: "M558 749 L538 716 L505 694 L288 703 L261 720 L233 756 L211 837 L225 841 L319 813 L436 810 L546 844 L563 826 Z" },
    { id: "ankle-back-medial", view: "back", location: "内踝后侧", path: "M271 242 L243 245 L225 264 L222 400 L182 542 L186 586 L204 627 L276 598 L298 567 L309 526 L317 440 L312 328 L296 268 Z" },
    { id: "ankle-back-achilles", view: "back", location: "跟腱", path: "M362 245 L338 252 L326 271 L335 462 L308 640 L325 658 L380 661 L397 656 L406 640 L393 488 L416 270 L399 250 Z" },
    { id: "ankle-back-lateral", view: "back", location: "外踝后侧", path: "M485 251 L452 278 L429 336 L414 550 L422 587 L443 613 L517 649 L538 578 L510 422 L520 273 L510 258 Z" },
    { id: "ankle-back-heel", view: "back", location: "足跟后方", path: "M289 694 L253 730 L214 835 L207 904 L225 964 L262 993 L321 1007 L417 1004 L473 985 L507 944 L516 883 L470 729 L439 698 L399 685 L339 683 Z" },
  ],
  foot: [
    { id: "foot-dorsum-ankle", view: "front", location: "足背靠近踝部", path: "M310 109 L301 126 L288 229 L291 271 L300 291 L325 300 L371 285 L427 282 L484 292 L498 268 L504 231 L491 111 L471 99 L421 92 L348 95 Z" },
    { id: "foot-dorsum-medial", view: "front", location: "足背内侧", path: "M323 330 L308 342 L288 423 L272 639 L283 645 L306 642 L314 620 L318 505 L333 357 L330 336 Z" },
    { id: "foot-dorsum-center", view: "front", location: "足背中部", path: "M421 305 L392 307 L369 320 L352 371 L337 597 L347 633 L373 647 L446 641 L460 624 L467 596 L472 465 L465 360 L452 321 Z" },
    { id: "foot-dorsum-lateral", view: "front", location: "足背外侧", path: "M492 325 L485 340 L492 608 L502 637 L525 640 L543 633 L546 605 L514 380 L503 336 Z" },
    { id: "foot-dorsum-forefoot", view: "front", location: "前脚掌 / 足趾根部", path: "M554 690 L548 667 L537 659 L419 671 L278 664 L260 679 L254 727 L268 739 L327 745 L445 742 L537 721 L550 711 Z" },
    { id: "foot-dorsum-great-toe", view: "front", location: "大拇趾", path: "M266 760 L257 772 L260 849 L254 898 L260 927 L275 958 L288 972 L304 979 L328 978 L345 968 L353 944 L333 779 L319 764 Z" },
    { id: "foot-dorsum-second-toe", view: "front", location: "第二足趾", path: "M377 765 L363 773 L360 785 L371 940 L380 966 L399 970 L415 957 L401 781 L394 767 Z" },
    { id: "foot-dorsum-small-toes", view: "front", location: "第3至5足趾", path: "M542 745 L440 762 L423 775 L423 857 L433 935 L442 951 L455 950 L466 941 L475 911 L494 916 L512 904 L520 885 L521 862 L535 857 L551 833 L561 784 L555 758 Z" },
    { id: "foot-sole-heel", view: "back", location: "足跟底部", path: "M398 61 L370 52 L341 57 L317 71 L286 108 L269 142 L255 201 L258 244 L274 266 L331 278 L387 279 L445 268 L467 250 L474 204 L460 148 L429 90 Z" },
    { id: "foot-sole-lateral", view: "back", location: "足底外侧", path: "M272 289 L261 299 L254 418 L225 612 L235 620 L251 615 L269 590 L297 489 L299 315 L294 299 Z" },
    { id: "foot-sole-center", view: "back", location: "足底中部", path: "M334 301 L319 318 L316 508 L294 603 L314 625 L396 632 L423 618 L438 567 L435 324 L418 302 Z" },
    { id: "foot-sole-arch", view: "back", location: "足弓内侧", path: "M467 294 L454 316 L459 541 L444 638 L459 657 L520 690 L526 646 L499 385 L483 305 Z" },
    { id: "foot-sole-forefoot", view: "back", location: "前脚掌底部", path: "M212 655 L207 701 L216 729 L296 796 L341 820 L391 826 L492 800 L509 779 L515 720 L454 678 L382 655 L288 641 L231 641 Z" },
    { id: "foot-sole-small-toe", view: "back", location: "小拇趾底部", path: "M215 749 L210 752 L207 763 L207 796 L217 823 L227 834 L233 836 L241 832 L249 820 L252 791 L249 780 L239 764 Z" },
    { id: "foot-sole-other-toes", view: "back", location: "其余足趾底部", path: "M266 797 L244 869 L261 896 L290 896 L287 921 L299 937 L335 940 L341 956 L360 968 L380 967 L399 954 L412 972 L439 984 L464 979 L485 960 L514 891 L502 825 L485 821 L410 843 L349 848 Z" },
    { id: "foot-medial-malleolus", view: "medial", location: "内踝", path: "M132 356 L101 358 L93 366 L88 383 L79 523 L83 536 L102 543 L133 541 L163 531 L181 517 L191 500 L190 452 L177 392 L159 368 Z" },
    { id: "foot-medial-heel", view: "medial", location: "足跟内侧", path: "M69 578 L54 600 L44 645 L47 692 L60 721 L80 735 L101 740 L140 742 L180 735 L187 726 L181 688 L171 660 L149 622 L107 586 L82 576 Z" },
    { id: "foot-medial-navicular", view: "medial", location: "舟骨附近", path: "M247 538 L244 552 L257 573 L279 588 L349 619 L360 618 L369 610 L381 589 L382 578 L374 569 L302 514 L288 512 L258 526 Z" },
    { id: "foot-medial-arch", view: "medial", location: "内侧足弓", path: "M200 635 L199 677 L215 705 L317 701 L389 719 L456 745 L472 740 L457 714 L415 685 L257 602 L226 603 Z" },
    { id: "foot-medial-forefoot", view: "medial", location: "第一跖骨附近", path: "M391 626 L388 636 L398 648 L453 683 L532 724 L545 726 L550 722 L561 691 L561 681 L555 673 L424 601 L406 608 Z" },
    { id: "foot-medial-great-toe", view: "medial", location: "大拇趾内侧", path: "M573 731 L582 741 L609 745 L647 745 L670 740 L686 733 L701 719 L704 698 L694 695 L673 701 L654 701 L600 689 L589 690 L580 703 Z" },
    { id: "foot-lateral-malleolus", view: "lateral", location: "外踝", path: "M634 358 L617 370 L598 403 L583 458 L582 493 L589 508 L616 528 L654 539 L679 539 L690 533 L695 517 L685 383 L678 367 L668 359 Z" },
    { id: "foot-lateral-heel", view: "lateral", location: "足跟外侧", path: "M700 569 L678 565 L654 572 L607 609 L589 638 L578 670 L571 713 L574 737 L609 742 L664 740 L693 734 L707 723 L721 691 L724 643 L715 593 Z" },
    { id: "foot-lateral-fifth-base", view: "lateral", location: "第五跖骨基底附近", path: "M579 590 L477 554 L450 550 L373 591 L360 603 L357 622 L370 662 L385 665 L538 629 L566 613 Z" },
    { id: "foot-lateral-midfoot", view: "lateral", location: "足外侧中部", path: "M558 657 L549 650 L521 653 L382 688 L270 734 L265 744 L269 760 L276 766 L320 765 L541 737 L552 711 Z" },
    { id: "foot-lateral-forefoot", view: "lateral", location: "前脚掌外侧", path: "M345 669 L334 641 L321 632 L249 666 L198 684 L194 690 L219 715 L234 719 L248 718 L339 683 L344 678 Z" },
    { id: "foot-lateral-small-toe", view: "lateral", location: "小拇趾外侧", path: "M250 759 L241 740 L222 737 L193 747 L184 754 L180 763 L181 767 L188 771 L214 773 L246 768 L250 764 Z" },
  ],
};

function atlasPanelsFor(area: AreaDefinition): AtlasPanel[] {
  if (area.id === "foot") {
    return [
      { view: "front", label: "足背", asset: area.asset, imageHalf: "front", viewBox: "0 0 768 1024", mirrorWidth: 768, bakedZones: true },
      { view: "back", label: "足底", asset: area.asset, imageHalf: "back", viewBox: "0 0 768 1024", mirrorWidth: 768, bakedZones: true },
      { view: "medial", label: "内侧", asset: "/rehabmind-region-foot-side-atlas-v2.png", imageHalf: "front", viewBox: "0 0 768 1024", mirrorWidth: 768, bakedZones: true },
      { view: "lateral", label: "外侧", asset: "/rehabmind-region-foot-side-atlas-v2.png", imageHalf: "back", viewBox: "0 0 768 1024", mirrorWidth: 768, bakedZones: true },
    ];
  }
  return [
    { view: "front", label: area.views[0], asset: area.asset, imageHalf: "front", viewBox: "0 0 768 1024", mirrorWidth: 768, bakedZones: true },
    { view: "back", label: area.views[1], asset: area.asset, imageHalf: "back", viewBox: "0 0 768 1024", mirrorWidth: 768, bakedZones: true },
  ];
}

export function lowerLimbAreaFromLocation(location: string): LowerLimbAreaId {
  if (/大腿/.test(location)) return "thigh";
  if (/膝|髌骨|关节线|腘窝/.test(location)) return "knee";
  if (/小腿|胫骨|腓肠肌/.test(location)) return "calf";
  if (/踝|跟腱/.test(location)) return "ankle";
  return "foot";
}

export function makeLowerLimbLocationSelection(side: string, location: string, regionId: string): LowerLimbLocationSelection | null {
  if (!side || !location || !["thigh-local", "knee", "calf-local", "ankle-foot"].includes(regionId)) return null;
  const areaId = lowerLimbAreaFromLocation(location);
  const area = AREA_BY_ID[areaId];
  const safeSide: LowerLimbSide = side === "左侧" || side === "右侧" ? side : "双侧/中间";
  const inferredView: AtlasView = /舟骨|内侧足弓|大拇趾内侧|第一跖骨/.test(location)
      ? "medial"
      : /足外侧中部|第五跖骨|前脚掌外侧|小拇趾外侧/.test(location)
        ? "lateral"
        : /后|腘窝|跟腱|足底|足跟|足弓/.test(location)
          ? "back"
          : "front";
  return {
    id: `${safeSide}:${areaId}:${location}`,
    side: safeSide,
    areaId,
    areaLabel: area.label,
    location,
    regionId: area.regionId,
    view: inferredView,
  };
}

type Props = {
  value: LowerLimbLocationSelection[];
  initialRegionId?: string;
  initialSide?: string;
  initialLocation?: string;
  mode?: "complaint" | "swelling" | "tenderness" | "sensory" | "assessment";
  /** 检查过程中只显示当前动作可能涉及的邻近区域，避免再次打开完整定位工作台。 */
  compact?: boolean;
  /** 专业模式使用更大的单视图图谱，避免总览图和多张细分图同时挤压。 */
  professional?: boolean;
  allowedAreaIds?: LowerLimbAreaId[];
  maxSelections?: number;
  onChange: (next: LowerLimbLocationSelection[], meta?: { preservedSelections?: LowerLimbLocationSelection[]; removedPreservedId?: string }) => void;
};

export default function LowerLimbLocationPicker({ value, initialRegionId, initialSide, initialLocation, mode = "complaint", compact = false, professional = false, allowedAreaIds, maxSelections, onChange }: Props) {
  const inferredSide = initialSide === "左侧" || initialSide === "右侧" ? initialSide : value.find((item) => item.side === "左侧" || item.side === "右侧")?.side;
  const suggestedArea = initialLocation && /大腿|膝|髌骨|关节线|腘窝|小腿|胫骨|腓肠肌|踝|跟腱|足|脚/.test(initialLocation)
    ? lowerLimbAreaFromLocation(initialLocation)
    : initialRegionId === "thigh-local"
      ? "thigh"
      : initialRegionId === "knee"
      ? "knee"
      : initialRegionId === "calf-local"
        ? "calf"
      : initialRegionId === "ankle-foot"
        ? "ankle"
        : null;
  const [activeSide, setActiveSide] = useState<"左侧" | "右侧" | "">(inferredSide === "左侧" || inferredSide === "右侧" ? inferredSide : "");
  const visibleAreas = useMemo(() => allowedAreaIds?.length ? AREAS.filter((item) => allowedAreaIds.includes(item.id)) : AREAS, [allowedAreaIds]);
  const initialArea = suggestedArea && visibleAreas.some((item) => item.id === suggestedArea) ? suggestedArea : visibleAreas[0]?.id ?? "knee";
  const [activeArea, setActiveArea] = useState<LowerLimbAreaId>(initialArea);
  const [selectionNotice, setSelectionNotice] = useState("");
  const selectedIds = useMemo(() => new Set(value.map((item) => item.id)), [value]);
  const [retainedSelections, setRetainedSelections] = useState<LowerLimbLocationSelection[]>([]);
  const displayedSelections = useMemo(() => {
    const currentIds = new Set(value.map((item) => item.id));
    return [...retainedSelections.filter((item) => !currentIds.has(item.id)), ...value];
  }, [retainedSelections, value]);
  const area = AREA_BY_ID[activeArea];
  const atlasPanels = atlasPanelsFor(area);
  const [activePanelView, setActivePanelView] = useState<AtlasView>(atlasPanels[0]?.view ?? "front");
  const selectedPanelView = atlasPanels.some((panel) => panel.view === activePanelView) ? activePanelView : atlasPanels[0]?.view ?? "front";
  const copy = mode === "swelling"
    ? { eyebrow: "先选择左右和部位，再点肿胀或淤青区域", title: "哪里肿胀或有淤青？", selected: "已标记的肿胀或淤青", empty: "先在图上标出肿胀或淤青的位置。" }
    : mode === "tenderness"
      ? { eyebrow: "先选择左右和部位，再点轻按会痛的区域", title: "轻按哪里会痛？", selected: "已标记的按压痛", empty: "先轻按确认，再在图上标出按压会痛的位置。" }
      : mode === "sensory"
        ? { eyebrow: "先选择左右和部位，再点麻、电或感觉变化的区域", title: "感觉变化到哪里？", selected: "已标记的感觉变化", empty: "先在图上标出麻、电或感觉变化的范围。" }
        : mode === "assessment"
          ? { eyebrow: "直接点图上的位置", title: "刚才哪里不舒服？", selected: "这次动作出现不适的位置", empty: "请在图上点出刚才出现不适的位置。" }
      : { eyebrow: "一次只评估一个大部位，同一部位可以标记多个具体位置", title: "这次最想解决哪里？", selected: "本次主要问题", empty: "先选择左腿或右腿和部位，再点击图上的具体位置。" };

  const toggleZone = (zone: AtlasZone) => {
    if (!activeSide) return;
    const id = `${activeSide}:${activeArea}:${zone.location}`;
    const nextItem: LowerLimbLocationSelection = {
      id,
      side: activeSide,
      areaId: activeArea,
      areaLabel: area.label,
      location: zone.location,
      regionId: area.regionId,
      view: zone.view,
    };
    if (selectedIds.has(id)) {
      setSelectionNotice("");
      onChange(value.filter((item) => item.id !== id));
      return;
    }
    // 位置数量不是流程数量的上限。后续决策会按处理单元去重，不能在输入层
    // 把双侧或多个精确位置截掉。保留可选 prop 只是兼容旧调用方，默认不设硬上限。
    const selectionLimit = maxSelections ?? Number.POSITIVE_INFINITY;
    const retained = retainedSelections.find((item) => item.id === id);
    if (mode === "complaint" && retained) {
      setRetainedSelections((current) => [
        ...current.filter((item) => item.id !== id),
        ...value.filter((item) => !current.some((entry) => entry.id === item.id)),
      ]);
      setSelectionNotice("已切回这个大部位；刚才的问题位置已保留，仍可明确清理。");
      onChange([nextItem], { preservedSelections: value, removedPreservedId: id });
      return;
    }
    const mixesMainAreas = value.some((item) => item.regionId !== nextItem.regionId);
    if (mode === "complaint") {
      if (mixesMainAreas) {
        const preservedSelections = value.filter((item) => item.regionId !== nextItem.regionId);
        setRetainedSelections((current) => [...current, ...preservedSelections.filter((item) => !current.some((entry) => entry.id === item.id))]);
        setSelectionNotice("已保留原大部位标记；当前问题只记录新部位。不同大部位请另建问题，如需清理请点击对应位置的“删除”。");
        onChange([nextItem], { preservedSelections });
        return;
      }
      if (value.length >= selectionLimit) {
        setSelectionNotice(`同一大部位最多标记${selectionLimit}个具体位置；需要更换时，先删除一个。`);
        return;
      }
      setSelectionNotice("");
      onChange([...value, nextItem]);
      return;
    }
    if (mixesMainAreas) {
      setSelectionNotice("同一项检查不能混入不同主要大部位，请先删除其他大部位的位置。");
      return;
    }
    if (value.length >= selectionLimit) {
      setSelectionNotice(`最多标记${selectionLimit}个位置；需要更换时，先删除一个已选位置。`);
      return;
    }
    setSelectionNotice("");
    onChange([...value, nextItem]);
  };

  return <section className={`rm-lower-limb-picker rm-atlas-picker is-${mode} ${compact ? "is-compact" : ""} ${professional ? "is-professional" : ""}`}>
    <header className="rm-location-picker-head">
      <div><span>{copy.eyebrow}</span><strong>{copy.title}</strong></div>
      <b>{activeSide ? `${activeSide} · ${area.label}` : "先选择左腿或右腿"}</b>
    </header>

    <nav className="rm-compact-atlas-nav" aria-label="选择左右侧和部位">
      <div className="rm-atlas-nav-row"><span className="rm-atlas-nav-label">哪一侧？</span><div>{(["左侧", "右侧"] as const).map((side) => <button type="button" key={side} className={activeSide === side ? "is-active" : ""} onClick={() => setActiveSide(side)}>{side}</button>)}</div></div>
      <div className="rm-atlas-nav-row"><span className="rm-atlas-nav-label">哪个部位？</span><div>{visibleAreas.map((item) => <button type="button" key={item.id} className={activeArea === item.id ? "is-active" : ""} onClick={() => setActiveArea(item.id)}>{item.label}</button>)}</div></div>
    </nav>

    <div className="rm-atlas-workbench">
      <section className={`rm-region-atlas ${activeSide ? "" : "is-waiting"}`}>
        <header><span>{activeSide || "未选择侧别"}</span><strong>{area.label}细分区域</strong></header>
        {professional ? <nav className="rm-atlas-view-tabs" aria-label="切换细分图视图">
          {atlasPanels.map((panel) => <button type="button" key={panel.view} className={selectedPanelView === panel.view ? "is-active" : ""} onClick={() => setActivePanelView(panel.view)}>{panel.label}</button>)}
        </nav> : null}
        <div className={`rm-region-atlas-panels ${activeArea === "foot" ? "is-foot" : ""} ${professional ? "is-single" : ""}`}>
          {atlasPanels.filter((panel) => !professional || panel.view === selectedPanelView).map((panel) => <section key={panel.view}>
            <b>{panel.label}</b>
            <div className={`rm-region-panel ${panel.bakedZones ? "has-baked-zones" : ""}`}>
              <svg viewBox={panel.viewBox ?? "0 0 90 120"} preserveAspectRatio="xMidYMid meet" role="group" aria-label={`${activeSide || "未选择侧别"}${area.label}${panel.label}细分区域`}>
                <g transform={activeSide === "左侧" ? `translate(${panel.mirrorWidth ?? 90} 0) scale(-1 1)` : undefined}>
                  <title>{`${area.label}${panel.label}局部图`}</title>
                  <image href={panel.asset} x={panel.imageHalf === "front" ? 0 : -(panel.mirrorWidth ?? 90)} y="0" width={(panel.mirrorWidth ?? 90) * 2} height="1024" preserveAspectRatio="none" aria-hidden="true" />
                  {ATLAS_ZONES[activeArea].filter((zone) => zone.view === panel.view).map((zone) => {
                    const id = `${activeSide}:${activeArea}:${zone.location}`;
                    return <path
                      key={zone.id}
                      d={zone.path}
                      className={selectedIds.has(id) ? "is-selected" : ""}
                      onClick={() => toggleZone(zone)}
                      role="button"
                      tabIndex={activeSide ? 0 : -1}
                      aria-label={`${activeSide || "请先选择侧别"} · ${zone.location}`}
                      aria-pressed={selectedIds.has(id)}
                      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") toggleZone(zone); }}
                    ><title>{activeSide ? `${activeSide} · ${zone.location}` : "请先在左侧人体图选择左腿或右腿"}</title></path>;
                  })}
                </g>
              </svg>
            </div>
          </section>)}
        </div>
        {!activeSide ? <p>先选择左腿或右腿，再点击具体位置。</p> : <p>{mode === "tenderness" ? "每处只轻按一次，再点击对应区域。" : "点击图上的区域即可记录具体位置。"}</p>}
      </section>
    </div>

    {displayedSelections.length ? <section className="rm-location-selection-list">
      <header><span>{copy.selected}</span><strong>{displayedSelections.length}个位置</strong></header>
      <div>{displayedSelections.map((item, index) => {
        const retained = retainedSelections.some((entry) => entry.id === item.id);
        return <article key={item.id} className={retained ? "is-retained" : undefined}>
        <i>{retained ? "已保留" : index === 0 ? "主要" : index + 1}</i>
        <span><strong>{item.side} · {item.location}</strong><small>{item.areaLabel}</small></span>
        <button type="button" onClick={() => {
          if (retained) {
            setRetainedSelections((current) => current.filter((entry) => entry.id !== item.id));
            setSelectionNotice("已清理保留位置；当前问题的标记没有改变。");
            onChange(value, { removedPreservedId: item.id });
          } else {
            onChange(value.filter((entry) => entry.id !== item.id));
          }
        }} aria-label={`删除${item.side}${item.location}`}>删除</button>
      </article>;
      })}</div>
    </section> : <p className="rm-location-empty">{copy.empty}</p>}
    {selectionNotice ? <p className="rm-location-limit" role="status">{selectionNotice}</p> : null}

    {!compact ? <footer>目前开放大腿、膝盖、小腿、脚踝和足部；骨盆、臀部、腹股沟和髋关节暂未开放。</footer> : null}
  </section>;
}
