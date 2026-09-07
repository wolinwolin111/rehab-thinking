const NON_RUNTIME_REPORTS = new Set([
  "README.md",
  "docs/README.md",
  "scripts/README.md",
  "tests/README.md",
]);
const NON_RUNTIME_PREFIXES = ["docs/quality/", "docs/archive/", "docs/handover/"];

export function normalizeReleasePath(file) {
  return String(file).replaceAll("\\", "/").replace(/^\.\//, "");
}

export function isReleaseFingerprintExcluded(file, generatedReleasePath = "src/infrastructure/pilot/release/release.generated.ts") {
  const normalized = normalizeReleasePath(file);
  return normalized === normalizeReleasePath(generatedReleasePath)
    || NON_RUNTIME_REPORTS.has(normalized)
    || NON_RUNTIME_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export const RELEASE_FINGERPRINT_EXCLUDED_PATHS = Object.freeze([
  "README.md",
  "docs/README.md",
  "scripts/README.md",
  "tests/README.md",
  "docs/quality/**",
  "docs/archive/**",
  "docs/handover/**",
]);
