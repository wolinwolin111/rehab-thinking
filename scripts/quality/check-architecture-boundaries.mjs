import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

function normalized(value) {
  return value.split(path.sep).join("/").replace(/^\.\//, "");
}

function isWithin(file, roots) {
  return roots.some((root) => file === root || file.startsWith(`${root}/`));
}

function projectImport(sourceFile, specifier, rootDir) {
  if (specifier.startsWith("@/")) return normalized(specifier.slice(2));
  if (!specifier.startsWith(".")) return null;
  return normalized(path.relative(rootDir, path.resolve(path.dirname(sourceFile), specifier)));
}

function packageMatches(specifier, packages) {
  return packages.some((name) => specifier === name || specifier.startsWith(`${name}/`));
}

async function sourceFiles(root) {
  const found = [];
  async function visit(directory) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (/\.(?:ts|tsx|mts)$/.test(entry.name)) found.push(target);
    }
  }
  await visit(root);
  return found;
}

function importedSpecifiers(source) {
  const values = [];
  source.forEachChild((node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      values.push({ value: node.moduleSpecifier.text, line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1 });
    }
  });
  return values;
}

function forbiddenGlobalUses(source, names) {
  const found = [];
  function visit(node) {
    if (ts.isIdentifier(node) && names.includes(node.text)) {
      const parent = node.parent;
      const isPropertyName = ts.isPropertyAccessExpression(parent) && parent.name === node
        || (ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent) || ts.isMethodDeclaration(parent)) && parent.name === node;
      const isDeclaration = ts.isVariableDeclaration(parent) && parent.name === node
        || ts.isParameter(parent) && parent.name === node
        || ts.isFunctionDeclaration(parent) && parent.name === node;
      if (!isPropertyName && !isDeclaration) {
        found.push({ value: node.text, line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1 });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return found;
}

function checkImports({ file, absoluteFile, imports, rootDir, forbiddenPackages, forbiddenProjectRoots, boundary }) {
  const violations = [];
  for (const item of imports) {
    const target = projectImport(absoluteFile, item.value, rootDir);
    if (target && isWithin(target, forbiddenProjectRoots)) {
      violations.push({ file, line: item.line, boundary, code: "forbidden-project-import", detail: item.value });
    } else if (!target && packageMatches(item.value, forbiddenPackages)) {
      violations.push({ file, line: item.line, boundary, code: "forbidden-package-import", detail: item.value });
    }
  }
  return violations;
}

export async function checkArchitectureBoundaries({ rootDir = process.cwd(), config } = {}) {
  const rules = config ?? JSON.parse(await readFile(path.join(rootDir, "scripts", "quality", "architecture-boundaries.json"), "utf8"));
  const files = await sourceFiles(path.join(rootDir, rules.sourceRoot));
  for (const owner of rules.exclusiveRuleOwners ?? []) {
    for (const forbiddenFile of owner.forbiddenFiles ?? []) {
      const absolute = path.join(rootDir, forbiddenFile);
      if (files.includes(absolute)) continue;
      try {
        await readFile(absolute, "utf8");
        files.push(absolute);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }
  }
  const violations = [];

  for (const absoluteFile of files) {
    const file = normalized(path.relative(rootDir, absoluteFile));
    const text = await readFile(absoluteFile, "utf8");
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const imports = importedSpecifiers(source);

    if (isWithin(file, rules.domainRoots)) {
      violations.push(...checkImports({
        file, absoluteFile, imports, rootDir,
        forbiddenPackages: rules.domainForbiddenPackages,
        forbiddenProjectRoots: rules.domainForbiddenProjectRoots,
        boundary: "domain",
      }));
      for (const item of forbiddenGlobalUses(source, rules.domainForbiddenGlobals)) {
        violations.push({ file, line: item.line, boundary: "domain", code: "forbidden-runtime-global", detail: item.value });
      }
    }

    if (isWithin(file, rules.stageRoots)) {
      violations.push(...checkImports({
        file, absoluteFile, imports, rootDir,
        forbiddenPackages: rules.stageForbiddenPackages,
        forbiddenProjectRoots: rules.stageForbiddenProjectRoots,
        boundary: "stage",
      }));
      for (const item of forbiddenGlobalUses(source, rules.stageForbiddenGlobals)) {
        violations.push({ file, line: item.line, boundary: "stage", code: "forbidden-runtime-global", detail: item.value });
      }
    }

    for (const owner of rules.exclusiveRuleOwners ?? []) {
      const inForbiddenRoot = isWithin(file, owner.forbiddenRoots ?? []);
      const isForbiddenFile = (owner.forbiddenFiles ?? []).includes(file);
      if (file === owner.owner || !inForbiddenRoot && !isForbiddenFile) continue;
      for (const symbol of owner.symbols ?? []) {
        if (text.includes(symbol)) violations.push({ file, line: 1, boundary: owner.ruleId, code: "duplicate-rule-owner", detail: symbol });
      }
    }

    if (rules.actionCatalogRules && isWithin(file, rules.actionCatalogRules.catalogRoot)) {
      // 目录内部禁止 import 消费方（features / infrastructure / app / db）
      violations.push(...checkImports({
        file, absoluteFile, imports, rootDir,
        forbiddenPackages: [],
        forbiddenProjectRoots: rules.actionCatalogRules.catalogForbiddenProjectRoots.filter((root) => root !== "src/domain"),
        boundary: "action-catalog",
      }));
    }

    // domain 层 import actions 目录只允许 index.ts / bridge.ts
    if (isWithin(file, rules.domainRoots) && rules.actionCatalogRules) {
      for (const item of imports) {
        if (!item.value.includes("/knowledge/actions/")) continue;
        const resolvedTarget = item.value.startsWith("@/")
          ? normalized(item.value.slice(2))
          : normalized(path.relative(rootDir, path.resolve(path.dirname(file), item.value)));
        const isAllowed = Object.keys(rules.actionCatalogRules.allowedExternalImportsFor ?? {}).some((allowedFile) =>
          resolvedTarget === allowedFile || resolvedTarget.startsWith(allowedFile + "/") || allowedFile.startsWith(resolvedTarget)
        );
        if (!isAllowed) {
          violations.push({ file, line: 1, boundary: "action-catalog", code: "domain-non-index-actions-import", detail: item.value });
        }
      }
    }

  }

  return violations;
}

async function main() {
  const violations = await checkArchitectureBoundaries();
  if (!violations.length) {
    console.log("architecture boundaries: ok");
    return;
  }
  for (const item of violations) console.error(`${item.file}:${item.line} [${item.boundary}/${item.code}] ${item.detail}`);
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
