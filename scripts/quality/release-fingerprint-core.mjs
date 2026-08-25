const NON_RUNTIME_REPORTS = new Set([
  "README.md",
  "docs/README.md",
  "docs/handover/HANDOVER.md",
  "docs/handover/project-status.md",
  "docs/rehabmind-current-remediation-execution-plan.md",
  "docs/quality/rehabmind-quality-remediation-register.md",
  "scripts/README.md",
  "tests/README.md",
]);

export function normalizeReleasePath(file) {
  return String(file).replaceAll("\\", "/").replace(/^\.\//, "");
}

export function isReleaseFingerprintExcluded(file, generatedReleasePath = "src/infrastructure/pilot/release/release.generated.ts") {
  const normalized = normalizeReleasePath(file);
  return normalized === normalizeReleasePath(generatedReleasePath)
    || NON_RUNTIME_REPORTS.has(normalized)
    || normalized.startsWith("docs/quality/");
}

export const RELEASE_FINGERPRINT_EXCLUDED_PATHS = Object.freeze([
  "README.md",
  "docs/README.md",
  "docs/handover/HANDOVER.md",
  "docs/handover/project-status.md",
  "docs/rehabmind-current-remediation-execution-plan.md",
  "docs/quality/rehabmind-quality-remediation-register.md",
  "docs/quality/**",
  "scripts/README.md",
  "tests/README.md",
]);
