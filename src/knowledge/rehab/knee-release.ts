import { buildOwnerConfirmedRelease } from "./knowledge-builders.ts";
import { KNEE_KNOWLEDGE_REVIEW_PACKAGE } from "./knee-review-package.ts";

export const KNEE_OWNER_CONFIRMED_KNOWLEDGE_RELEASE = buildOwnerConfirmedRelease(
  KNEE_KNOWLEDGE_REVIEW_PACKAGE,
);
