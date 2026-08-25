import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workbench = await readFile(new URL("../../src/features/rehabmind/components/workbench/rehabmind-workbench.tsx", import.meta.url), "utf8");
const navigation = await readFile(new URL("../../src/features/rehabmind/components/navigation/mobile-app-navigation.tsx", import.meta.url), "utf8");
const records = await readFile(new URL("../../src/features/rehabmind/components/records/rehab-records-page.tsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../../src/features/rehabmind/styles/complete-demo.css", import.meta.url), "utf8");
const theme = await readFile(new URL("../../src/features/rehabmind/styles/rm-visual-theme.css", import.meta.url), "utf8");

test("mobile shell exposes compact status, stage drawer, record entry and more menu", () => {
  assert.match(workbench, /<MobileTopActions/);
  assert.match(workbench, /<MobileStageNavigation/);
  assert.match(navigation, /className="rm-mobile-top-actions"/);
  assert.match(navigation, /className="rm-mobile-stagebar"/);
  assert.match(navigation, /aria-label="本次康复阶段"/);
  assert.match(navigation, /className="rm-mobile-more-drawer"/);
  assert.match(workbench, /<span>本次记录<\/span>/);
  assert.match(navigation, /康复记录/);
  assert.match(navigation, /问题反馈/);
  assert.match(navigation, /关于 RehabMind/);
  assert.match(navigation, /复制/);
});

test("rehab records are an independent page with case and session hierarchy", () => {
  assert.match(workbench, /<RehabRecordsPage/);
  assert.match(records, /className="rm-records-page"/);
  assert.match(records, /案例编号/);
  assert.match(records, /rm-record-session-row/);
  assert.match(records, /继续康复/);
  assert.match(records, /新建案例/);
  assert.match(workbench, /pendingNewCaseCreationRef\.current !== localCaseId/);
  assert.match(workbench, /createInitialPilotCaseRecord\(consent\)/);
  assert.doesNotMatch(records, /可同步到试用环境|清空Demo记录|同步后生成/);
});

test("a draft restores even after consent has already created its case record", () => {
  assert.match(workbench, /if \(draft && draftSnapshot\)/);
  assert.match(workbench, /storedRecord = records\.find/);
  assert.match(workbench, /preferLocalSnapshot: true/);
  assert.doesNotMatch(workbench, /Boolean\(testContext\) \|\| !records\.length/);
});

test("mobile shell uses vertical, shrinkable layouts and safe-area spacing", () => {
  const mobile = styles.slice(styles.lastIndexOf("@media (max-width: 720px)"));
  const effectiveThemeMobile = theme.slice(theme.lastIndexOf("@media (max-width: 720px)"));
  assert.match(mobile, /grid-template-columns: minmax\(0, 1fr\) auto/);
  assert.match(mobile, /grid-template-columns: 32px minmax\(0, 1fr\) auto/);
  assert.match(mobile, /padding-bottom: calc\(86px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(mobile, /bottom: calc\(8px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(mobile, /\.rm-case-aside\.is-open \{ width: 100%; height: auto; max-height: 75dvh/);
  assert.match(styles, /\.rm-records-page \{[^}]*position: fixed; inset: 0/);
  assert.doesNotMatch(mobile, /overflow-x:\s*auto/);
  assert.match(effectiveThemeMobile, /\.rm-step-rail \{ display: none; overflow-x: visible/);
  assert.match(effectiveThemeMobile, /padding: 22px 0 calc\(86px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(effectiveThemeMobile, /\.rm-context-hints \{ width: auto; margin: 8px 10px; position: static/);
  assert.match(effectiveThemeMobile, /\.rm-problem-strip > div,[\s\S]*\.rm-score-history > div \{[^}]*grid-template-columns: minmax\(0, 1fr\); overflow-x: visible/);
  assert.doesNotMatch(effectiveThemeMobile, /overflow-x:\s*auto/);
});
