import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourceRoots = ["app", "src", "db"];
const extensions = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];

async function sourceFiles(directory) {
  const result = [];
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    const child = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await sourceFiles(child));
    else if (extensions.includes(path.extname(entry.name))) result.push(child.replaceAll("\\", "/"));
  }
  return result;
}

function resolveTarget(parent, specifier) {
  if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return null;
  const unresolved = specifier.startsWith("@/")
    ? path.join(root, specifier.slice(2))
    : path.resolve(root, path.dirname(parent), specifier);
  const candidates = path.extname(unresolved)
    ? [unresolved]
    : [...extensions.map((extension) => `${unresolved}${extension}`), ...extensions.map((extension) => path.join(unresolved, `index${extension}`))];
  const found = candidates.find(existsSync);
  return found ? path.relative(root, found).replaceAll("\\", "/") : null;
}

const files = (await Promise.all(sourceRoots.map(sourceFiles))).flat();
const graph = new Map(files.map((file) => [file, []]));
for (const file of files) {
  const source = await readFile(path.join(root, file), "utf8");
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  function visit(node) {
    const typeOnly = ts.isImportDeclaration(node) && node.importClause?.isTypeOnly;
    if (!typeOnly && (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const target = resolveTarget(file, node.moduleSpecifier.text);
      if (target && graph.has(target)) graph.get(file).push(target);
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0])) {
      const target = resolveTarget(file, node.arguments[0].text);
      if (target && graph.has(target)) graph.get(file).push(target);
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
}

const state = new Map();
const stack = [];
const cycles = new Set();
function walk(file) {
  state.set(file, 1);
  stack.push(file);
  for (const target of graph.get(file)) {
    if (!state.has(target)) walk(target);
    else if (state.get(target) === 1) {
      const start = stack.indexOf(target);
      cycles.add([...stack.slice(start), target].join(" -> "));
    }
  }
  stack.pop();
  state.set(file, 2);
}
for (const file of files) if (!state.has(file)) walk(file);

if (cycles.size) {
  console.error(`module cycles (${cycles.size}):\n${[...cycles].join("\n")}`);
  process.exit(1);
}
console.log(`module cycles: none (${files.length} files)`);
