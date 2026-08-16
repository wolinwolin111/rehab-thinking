"""Normalize a two-view region atlas and trace its baked cyan region outlines."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np


PANEL_WIDTH = 768
PANEL_HEIGHT = 1024


def normalize_two_panel(source: Path) -> np.ndarray:
    image = cv2.imread(str(source), cv2.IMREAD_COLOR)
    if image is None:
        raise FileNotFoundError(source)

    height, width = image.shape[:2]
    if (width, height) == (PANEL_WIDTH * 2, PANEL_HEIGHT):
        return image

    midpoint = width // 2
    halves = (image[:, :midpoint], image[:, width - midpoint :])
    crop_width = round(height * PANEL_WIDTH / PANEL_HEIGHT)
    normalized: list[np.ndarray] = []
    for half in halves:
        half_width = half.shape[1]
        if crop_width > half_width:
            raise ValueError(f"Panel is too narrow to normalize: {source}")
        left = (half_width - crop_width) // 2
        cropped = half[:, left : left + crop_width]
        normalized.append(cv2.resize(cropped, (PANEL_WIDTH, PANEL_HEIGHT), interpolation=cv2.INTER_LANCZOS4))
    return np.concatenate(normalized, axis=1)


def path_from_contour(contour: np.ndarray) -> str:
    perimeter = cv2.arcLength(contour, True)
    polygon = cv2.approxPolyDP(contour, max(2.0, perimeter * 0.006), True).reshape(-1, 2)
    commands = [f"M{int(polygon[0][0])} {int(polygon[0][1])}"]
    commands.extend(f"L{int(x)} {int(y)}" for x, y in polygon[1:])
    commands.append("Z")
    return " ".join(commands)


def trace_panel(panel: np.ndarray) -> list[dict[str, object]]:
    hsv = cv2.cvtColor(panel, cv2.COLOR_BGR2HSV)
    hue, saturation, value = cv2.split(hsv)
    # Use the cyan outline as a wall, then recover each enclosed blue-gray fill.
    # This keeps adjacent toe regions separate even when their translucent fills
    # visually touch at a narrow seam.
    cool_fill = (hue > 90) & (saturation < 70) & (value < 238)
    outline = cv2.inRange(hsv, np.array((82, 55, 100)), np.array((112, 255, 255)))
    walls = cv2.dilate(outline, np.ones((3, 3), np.uint8), iterations=1)
    open_space = cv2.bitwise_not(walls)
    count, labels, stats, centroids = cv2.connectedComponentsWithStats(open_space, connectivity=8)

    regions: list[dict[str, object]] = []
    for label in range(1, count):
        x, y, width, height, pixel_area = stats[label]
        if pixel_area < 1800 or x == 0 or y == 0 or x + width == PANEL_WIDTH or y + height == PANEL_HEIGHT:
            continue
        component = labels == label
        if float(cool_fill[component].mean()) < 0.46:
            continue
        component_mask = component.astype(np.uint8) * 255
        contours, _ = cv2.findContours(component_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        contour = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(contour)
        moments = cv2.moments(contour)
        if moments["m00"] == 0:
            continue
        regions.append(
            {
                "cx": round(moments["m10"] / moments["m00"]),
                "cy": round(moments["m01"] / moments["m00"]),
                "area": round(area),
                "path": path_from_contour(contour),
            }
        )
    return sorted(regions, key=lambda item: (item["cy"], item["cx"]))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    normalized = normalize_two_panel(args.source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(args.output), normalized):
        raise OSError(f"Unable to write {args.output}")

    panels = {
        "front": trace_panel(normalized[:, :PANEL_WIDTH]),
        "back": trace_panel(normalized[:, PANEL_WIDTH:]),
    }
    print(json.dumps(panels, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
