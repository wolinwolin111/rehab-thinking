import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

function asDataUrl(code) {
  return `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
}

/** Load a local TypeScript dependency graph without replacing its production functions. */
export async function loadTypeScriptModule(entry, { rootDir = process.cwd(), transformSource } = {}) {
  const cache = new Map();

  function localModulePath(parent, specifier) {
    const unresolved = specifier.startsWith("@/")
      ? path.join(rootDir, specifier.slice(2))
      : path.resolve(path.dirname(parent), specifier);
    if (/\.(?:[cm]?[jt]sx?|json)$/i.test(unresolved)) return unresolved;
    const candidates = [`${unresolved}.ts`, `${unresolved}.tsx`, path.join(unresolved, "index.ts")];
    return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
  }

  async function compile(file) {
    const absolute = path.resolve(file);
    if (cache.has(absolute)) return cache.get(absolute);

    const pending = (async () => {
      let source = await readFile(absolute, "utf8");
      if (transformSource) source = transformSource(absolute, source);
      const tree = ts.createSourceFile(absolute, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
      const specifiers = [];
      function collectSpecifiers(node) {
        const typeOnlyImport = ts.isImportDeclaration(node) && (node.importClause?.isTypeOnly
          || node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)
            && node.importClause.namedBindings.elements.length > 0
            && node.importClause.namedBindings.elements.every((element) => element.isTypeOnly));
        const typeOnlyExport = ts.isExportDeclaration(node) && node.isTypeOnly;
        if (!typeOnlyImport && !typeOnlyExport && (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
          && node.moduleSpecifier
          && ts.isStringLiteral(node.moduleSpecifier)) {
          specifiers.push(node.moduleSpecifier);
        }
        if (ts.isCallExpression(node)
          && node.expression.kind === ts.SyntaxKind.ImportKeyword
          && node.arguments.length === 1
          && ts.isStringLiteral(node.arguments[0])) {
          specifiers.push(node.arguments[0]);
        }
        ts.forEachChild(node, collectSpecifiers);
      }
      collectSpecifiers(tree);

      const replacements = [];
      for (const moduleSpecifier of specifiers) {
        const specifier = moduleSpecifier.text;
        const value = specifier.startsWith(".") || specifier.startsWith("@/")
          ? await compile(localModulePath(absolute, specifier))
          : specifier.startsWith("node:")
            ? specifier
            : import.meta.resolve(specifier);
        replacements.push({
          start: moduleSpecifier.getStart(tree) + 1,
          end: moduleSpecifier.getEnd() - 1,
          value,
        });
      }
      for (const replacement of replacements.sort((left, right) => right.start - left.start)) {
        source = source.slice(0, replacement.start) + replacement.value + source.slice(replacement.end);
      }
      const output = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
      }).outputText;
      return asDataUrl(output);
    })();
    cache.set(absolute, pending);
    return pending;
  }

  return import(await compile(entry));
}
