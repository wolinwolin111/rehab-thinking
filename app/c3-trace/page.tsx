"use client";

// C-3 描摹工作台（临时工具页，验证后删除）：owner 在照片上直接刷出
// 肌肉高亮笔画（颜色/透明度/笔宽自选），实时输出 SVG stroke path，
// 用于写回 MUSCLE_ZONE_PATHS。验证后删除。
import { useCallback, useEffect, useRef, useState } from "react";

type ViewSpec = { id: string; label: string; asset: string; viewBox: string; w: number; h: number };

const VIEWS: ViewSpec[] = [
  { id: "front", label: "小腿前侧", asset: "/rehabmind-lower-limb-front-v1.png", viewBox: "150 650 480 640", w: 1024, h: 1536 },
  { id: "back", label: "小腿后侧", asset: "/rehabmind-lower-limb-back-v1.png", viewBox: "410 650 480 640", w: 1024, h: 1536 },
  { id: "medial", label: "小腿后内侧", asset: "/rehabmind-lower-limb-medial-v3.png", viewBox: "240 560 560 760", w: 1024, h: 1536 },
  { id: "lateral", label: "小腿外侧", asset: "/rehabmind-lower-limb-lateral-v2.png", viewBox: "270 650 500 700", w: 1024, h: 1536 },
];

type Stroke = { d: string; width: number; color: string; opacity: number };

const PRESETS = [
  { name: "青绿", hex: "#2b8a78" },
  { name: "湖蓝", hex: "#3565c4" },
  { name: "琥珀", hex: "#d69b2d" },
  { name: "绯红", hex: "#c8504f" },
  { name: "紫", hex: "#7047b8" },
  { name: "灰绿", hex: "#6d9c8f" },
];

/** 屏幕坐标 → viewBox 坐标（用 getScreenCTM，自动兼容 meet 缩放与裁切）。 */
function toViewBox(clientX: number, clientY: number, svg: SVGSVGElement) {
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
  return { x: pt.x, y: pt.y };
}

export default function C3TracePage() {
  const [viewId, setViewId] = useState(VIEWS[1].id);
  const spec = VIEWS.find((v) => v.id === viewId) ?? VIEWS[0];
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [brush, setBrush] = useState(90);
  const [color, setColor] = useState("#2b8a78");
  const [opacity, setOpacity] = useState(0.45);
  const drawing = useRef(false);
  const current = useRef<string>("");

  const pointFromEvent = useCallback((e: React.PointerEvent): string => {
    const svg = svgRef.current;
    if (!svg) return "";
    const { x, y } = toViewBox(e.clientX, e.clientY, svg);
    return `${x.toFixed(0)} ${y.toFixed(0)}`;
  }, []);

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    drawing.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    current.current = `M${pointFromEvent(e)}`;
    setStrokes((s) => { s.push({ d: "@live" + current.current, width: brush, color, opacity }); return [...s]; });
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    current.current += ` L${pointFromEvent(e)}`;
    setStrokes((s) => { const live = s[s.length - 1]; if (live) live.d = "@live" + current.current; return [...s]; });
  };
  const onUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    current.current = "";
    setStrokes((s) => s.map((st) => ({ ...st, d: st.d.replace(/^@live/, "") })));
  };

  const exportSnippet = `// ${spec.label}（${spec.asset}，viewBox "${spec.viewBox}"）\n${strokes.map((st) => `<path d="${st.d}" fill="none" stroke="${st.color}" stroke-opacity="${st.opacity}" stroke-width="${st.width}" stroke-linecap="round" filter="url(#fb)"/>`).join("\n")}`;

  return <main style={{ display: "flex", gap: 18, padding: 18, background: "#f4f7f5", minHeight: "100vh", flexWrap: "wrap" }}>
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {VIEWS.map((v) => <button key={v.id} type="button" onClick={() => { setViewId(v.id); setStrokes([]); }}
          style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #c8d6d2", background: v.id === viewId ? "#2e7d32" : "#fff", color: v.id === viewId ? "#fff" : "#333", fontWeight: 700, cursor: "pointer" }}>{v.label}</button>)}
      </div>
      <svg ref={svgRef} viewBox={spec.viewBox} style={{ width: 460, height: "auto", display: "block", background: "#fff", touchAction: "none", cursor: "crosshair" }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
        <defs>
          <clipPath id={`trace-clip-${spec.id}`}><rect x="0" y="0" width={spec.w} height={spec.h} rx="14" /></clipPath>
          <filter id="trace-blur" filterUnits="userSpaceOnUse" x="0" y="0" width={spec.w} height={spec.h}><feGaussianBlur stdDeviation="15" /></filter>
        </defs>
        <g clipPath={`url(#trace-clip-${spec.id})`}>
          <image href={spec.asset} x="0" y="0" width={spec.w} height={spec.h} preserveAspectRatio="xMidYMid meet" />
          {strokes.map((st, i) => <path key={i} d={st.d.replace(/^@live/, "")} fill="none"
            stroke={st.color} strokeOpacity={st.opacity} strokeWidth={st.width} strokeLinecap="round" filter="url(#trace-blur)" />)}
        </g>
      </svg>
      <div style={{ display: "flex", gap: 12, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ fontSize: 13 }}>笔宽 <input type="range" min={40} max={160} value={brush} onChange={(e) => setBrush(Number(e.target.value))} /></label>
        <span style={{ font: "800 14px monospace" }}>{brush}</span>
        <button type="button" onClick={() => setStrokes((s) => s.slice(0, -1))} style={{ padding: "6px 10px", cursor: "pointer" }}>撤销一笔</button>
        <button type="button" onClick={() => setStrokes([])} style={{ padding: "6px 10px", cursor: "pointer" }}>清空</button>
      </div>
    </div>
    <div style={{ flex: "1 1 320px", minWidth: 320 }}>
      <h2 style={{ fontSize: 15, margin: "0 0 8px" }}>颜色</h2>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        {PRESETS.map((p) => <button key={p.hex} type="button" title={p.name} onClick={() => setColor(p.hex)}
          style={{ width: 30, height: 30, borderRadius: "50%", background: p.hex, border: color === p.hex ? "3px solid #173e31" : "1px solid #ccc", cursor: "pointer" }} />)}
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 34, height: 30, cursor: "pointer", border: "1px solid #ccc", borderRadius: 6, padding: 0 }} />
        <span style={{ font: "700 13px monospace", color: "#333" }}>{color}</span>
      </div>
      <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, marginBottom: 14 }}>
        不透明度 <input type="range" min={0.2} max={0.8} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} />
        <span style={{ font: "800 13px monospace" }}>{opacity.toFixed(2)}</span>
      </label>
      <h2 style={{ fontSize: 15, margin: "0 0 8px" }}>输出（画完点复制，发给 dev）</h2>
      <pre style={{ background: "#0f172a", color: "#a5f3d0", padding: 12, borderRadius: 10, fontSize: 12, whiteSpace: "pre-wrap", maxHeight: 420, overflow: "auto" }}>{strokes.length ? exportSnippet : "（在左侧照片上按住拖动来画）"}</pre>
      <button type="button" disabled={!strokes.length}
        onClick={() => { void navigator.clipboard.writeText(exportSnippet); }}
        style={{ padding: "8px 14px", borderRadius: 8, border: 0, background: "#2e7d32", color: "#fff", fontWeight: 800, cursor: "pointer" }}>复制 SVG 代码</button>
      <p style={{ fontSize: 12, color: "#666", lineHeight: 1.6 }}>
        用法：选底图 → 挑颜色/透明度/笔宽 → 在照片上按肌肉走向刷（可多笔叠层次）→ 复制代码发给 dev。<br />
        注意：不同部位可以用不同颜色；每个笔画的颜色都会保留在导出代码里。
      </p>
    </div>
  </main>;
}
