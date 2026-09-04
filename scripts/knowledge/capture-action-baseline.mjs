const fs = require("fs");
const path = require("path");

const root = __dirname.replace(/\\/g, "/"); // scripts/knowledge
const read = (p) => fs.readFileSync(path.resolve(root, "..", "..", p), "utf8");

const PLAIN_RULES = [
  ["屈曲90度", "弯成直角"], ["屈90度", "弯成直角"], ["躯干", "上半身"], ["固定骨盆", "骨盆保持不动"],
  ["末端", "能到的位置"], ["代偿", "跟着帮忙"], ["抗阻", "对抗轻微阻力"], ["等长", "保持不动发力"],
];
const plain = (s) => PLAIN_RULES.reduce((acc, [a, b]) => acc.split(a).join(b), s);

const wsSrc = read("src/features/rehabmind/components/workbench/workbench-support.tsx");
const friendly = {};
const block = wsSrc.slice(wsSrc.indexOf("FRIENDLY_ASSESSMENT_COPY"));
for (const m of block.matchAll(/^\s{2}"([a-z0-9-]+)": \{ title: "([^"]*)", how: "([^"]*)", observe: "([^"]*)" \}/gm)) {
  friendly[m[1]] = { title: m[2], how: m[3], observe: m[4] };
  if (Object.keys(friendly).length > 300) break;
}

const A_IDS = ["knee-calf", "knee-heel-raise", "ankle-calf", "ankle-heel-raise", "calf-heel-raise-strength", "calf-heel-raise"];
const T_IDS = ["ankle-medial-control", "ankle-achilles-load"];
const X_IDS = ["knee-calf-raise", "calf-back-standing-raise", "calf-medial-arch", "calf-back-seated-raise", "ankle-achilles-isometric", "ankle-band-heelraise"];

const assess = new Map(); // id -> {kind,title,how,observe}
for (const [file, rex] of [
  ["src/knowledge/pilot/full-demo-content.ts", /(direction|strength|functional)\("([^"]+)", "([^"]+)", "([^"]*)", "([^"]*)"/g],
  ["src/knowledge/pilot/local-limb-regions.ts", /assessment\("([^"]+)", "([^"]+)", "([^"]+)", "([^"]*)", "([^"]*)"/g],
]) {
  const src = read(file);
  for (const m of src.matchAll(rex)) {
    if (file.includes("full-demo")) assess.set(m[2], { kind: m[1], title: m[3], how: m[4], observe: m[5] });
    else assess.set(m[1], { kind: m[3], title: m[2], how: m[4], observe: m[5] });
  }
}

const treat = new Map();
for (const [file, rex] of [
  ["src/knowledge/pilot/full-demo-content.ts", /candidate\("([^"]+)", "([^"]+)", "([^"]+)", "([^"]+)", "([^"]*)", "([^"]*)", "([^"]*)"/g],
  ["src/knowledge/pilot/local-limb-regions.ts", /candidate\("([^"]+)", "([^"]+)", "([^"]+)", "([^"]*)", "([^"]*)", "([^"]*)", "([^"]*)"/g],
]) {
  const src = read(file);
  for (const m of src.matchAll(rex)) treat.set(m[1], { title: m[2], type: m[3], access: m[4], do: m[5], observe: m[6], retest: m[7] });
}

const train = new Map();
for (const file of ["src/knowledge/pilot/full-demo-content.ts", "src/knowledge/pilot/local-limb-regions.ts"]) {
  const src = read(file);
  for (const m of src.matchAll(/exercise\("([^"]+)", "([^"]+)", (\d+), "([^"]+)", "([^"]+)", "([^"]*)", "([^"]*)", "([^"]*)", "([^"]*)", \[([^\]]*)\], "([^"]*)"(?:, "([^"]*)")?\)/g)) {
    train.set(m[1], {
      title: m[2], stage: m[3], sets: m[4], reps: m[5], how: m[6], observe: m[7],
      easier: m[8], harder: m[9], tags: m[10].trim(), startPosition: m[11], purpose: m[12] ?? "",
    });
  }
}

const out = [`friendly parsed: ${Object.keys(friendly).length}`];
for (const id of A_IDS) {
  const e = assess.get(id);
  const f = friendly[id];
  out.push(e ? `ASSESS ${id} [${e.kind}]\n  title=${e.title}\n  pro.how=${e.how}\n  pro.observe=${e.observe}\n  guided.how=${f ? f.how : plain(e.how)}\n  guided.observe=${f ? f.observe : plain(e.observe)}` : `ASSESS ${id} NOT FOUND`);
}
for (const id of T_IDS) {
  const e = treat.get(id);
  out.push(e ? `TREAT ${id} [${e.type}/${e.access}]\n  title=${e.title}\n  do=${e.do}\n  observe=${e.observe}\n  retest=${e.retest}` : `TREAT ${id} NOT FOUND`);
}
for (const id of X_IDS) {
  const e = train.get(id);
  out.push(e ? `TRAIN ${id}\n  title=${e.title} | stage=${e.stage} | sets=${e.sets} | reps=${e.reps} | pos=${e.startPosition}\n  how=${e.how}\n  purpose=${e.purpose}\n  observe=${e.observe}\n  easier=${e.easier}\n  harder=${e.harder}` : `TRAIN ${id} NOT FOUND`);
}

fs.writeFileSync(path.join("D:" + path.sep + "Study" + path.sep + "codex" + path.sep + "project", "baseline.tmp.txt"), out.join("\n\n"), "utf8");
console.log("captured " + out.length + " lines");
