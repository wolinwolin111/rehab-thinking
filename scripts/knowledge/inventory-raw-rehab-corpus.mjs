import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const kneePattern = /膝|髌|腘|鹅足|半月板|前叉|后叉/;
const abnormalPattern = /疼|痛|不适|受限|紧|弱|差|肿|响|刮|卡|麻|胀|不稳|偏|歪|不能|异常/;
const responsePattern = /(?:处理|松解|激活|促进|调整|按压|抵住|松动|训练|练习|做完|再次|再做|复测).{0,36}(?:改善|缓解|减轻|消失|不疼|更大|增加|正常|无变化|没变化|加重|更疼)|(?:改善|缓解|减轻|消失|不疼|更大|增加|无变化|没变化|加重|更疼).{0,36}(?:处理|松解|激活|促进|调整|按压|抵住|松动|训练|练习|复测)/;
const headingPattern = /^\s*\d{1,3}[.、．]\s*\S.{0,30}$/;

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function listTextFiles(root) {
  const files = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".txt")) files.push(target);
    }
  }
  await visit(root);
  return files.sort((left, right) => left.localeCompare(right, "zh-CN"));
}

function splitSegments(text) {
  const lines = text.replaceAll("\r\n", "\n").split("\n");
  const headings = lines.flatMap((line, index) => headingPattern.test(line) ? [index] : []);
  if (headings.length < 2) return [{ startLine: 1, endLine: lines.length, lines }];
  return headings.map((start, index) => {
    const end = headings[index + 1] ?? lines.length;
    return { startLine: start + 1, endLine: end, lines: lines.slice(start, end) };
  });
}

function anonymousId(relativePath, startLine) {
  const digest = createHash("sha256").update(`${relativePath}:${startLine}`).digest("hex").slice(0, 12).toUpperCase();
  return `RAW-KNEE-${digest}`;
}

function matchedLines(lines, pattern) {
  return lines
    .map((line) => line.trim())
    .filter((line) => line && kneePattern.test(line) && pattern.test(line))
    .slice(0, 8);
}

const sourceRoot = argumentValue("--source") ?? process.argv[2];
if (!sourceRoot) throw new Error("Usage: node inventory-raw-rehab-corpus.mjs --source <raw-txt-directory> [--output <json-file>]");
const outputPath = argumentValue("--output") ?? process.argv[3];
const files = await listTextFiles(path.resolve(sourceRoot));
const candidates = [];
let segmentCount = 0;

for (const file of files) {
  const relativePath = path.relative(path.resolve(sourceRoot), file).replaceAll("\\", "/");
  const text = await readFile(file, "utf8");
  for (const segment of splitSegments(text)) {
    segmentCount += 1;
    const body = segment.lines.join("\n");
    if (!kneePattern.test(body)) continue;
    const abnormalLines = matchedLines(segment.lines, abnormalPattern);
    const responseLines = segment.lines.map((line) => line.trim()).filter((line) => responsePattern.test(line)).slice(0, 8);
    candidates.push({
      candidateId: anonymousId(relativePath, segment.startLine),
      sourceLocator: `${relativePath}:${segment.startLine}-${segment.endLine}`,
      hasExplicitAbnormalLanguage: abnormalLines.length > 0,
      hasTreatmentResponseLanguage: responseLines.length > 0,
      abnormalLines,
      responseLines,
    });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  sourceFileCount: files.length,
  segmentCount,
  kneeCandidateCount: candidates.length,
  explicitAbnormalCandidateCount: candidates.filter((candidate) => candidate.hasExplicitAbnormalLanguage).length,
  treatmentResponseCandidateCount: candidates.filter((candidate) => candidate.hasTreatmentResponseLanguage).length,
  candidates,
};

if (outputPath) {
  const absoluteOutput = path.resolve(outputPath);
  await mkdir(path.dirname(absoluteOutput), { recursive: true });
  await writeFile(absoluteOutput, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

console.log(`raw corpus inventory: files=${report.sourceFileCount}, segments=${report.segmentCount}, kneeCandidates=${report.kneeCandidateCount}, abnormalCandidates=${report.explicitAbnormalCandidateCount}, responseCandidates=${report.treatmentResponseCandidateCount}`);
if (outputPath) console.log(`local review output: ${path.resolve(outputPath)}`);
