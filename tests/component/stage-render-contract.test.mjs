// L4 渲染行为合同（批次 1.5）：用 react-dom/server 对真实 TSX 组件做服务端渲染，
// 断言「给定视图状态下 DOM 必须出现/必须不出现什么」，弥补源码字符串合同看不见渲染产物的盲区。
// Oracle 来源：
// - ONBOARD-01：拒绝同意必须阻断使用，仅提供重新查看出口
// - 来源渠道先于数据说明；未选择来源不得继续
// - 移动顶栏八种同步状态各有可见文案（idle=未保存、进行中=··、完成=✓、仅本机/冲突/失败为完整词）
// - 阶段抽屉：6 个阶段按钮，超过 maxUnlocked 的阶段禁用；随访模式只允许回看
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { closeTsxLoader, loadTsxModule } from "../support/load-tsx-module.mjs";

const { PilotConsentGate } = await loadTsxModule("/src/features/rehabmind/components/onboarding/pilot-consent-gate.tsx");
const { PilotSourceGate } = await loadTsxModule("/src/features/rehabmind/components/onboarding/pilot-source-gate.tsx");
const { GuideCards } = await loadTsxModule("/src/features/rehabmind/components/onboarding/guide-cards.tsx");
const navigation = await loadTsxModule("/src/features/rehabmind/components/navigation/mobile-app-navigation.tsx");
const support = await loadTsxModule("/src/features/rehabmind/components/workbench/workbench-support.tsx");
const sourceChannel = await loadTsxModule("/src/infrastructure/pilot/onboarding/source-channel.ts");

after(async () => {
  await closeTsxLoader();
});

function render(element) {
  // SSR 会在动态文本节点间插入 <!-- --> 分隔注释，统一剥离后再做内容断言。
  return renderToStaticMarkup(element).replace(/<!--[\s\S]*?-->/g, "");
}

test("同意门：关闭态不渲染；正常态含五条说明且未勾选时同意禁用", () => {
  const closed = render(h(PilotConsentGate, { open: false, declined: false, onAgree: () => {}, onDecline: () => {}, onReconsider: () => {} }));
  assert.equal(closed, "");
  const html = render(h(PilotConsentGate, { open: true, declined: false, onAgree: () => {}, onDecline: () => {}, onReconsider: () => {} }));
  assert.ok(html.includes("开始前，请确认数据使用方式"), "缺少主标题");
  assert.ok(html.includes("我已了解并同意以上内容"), "缺少同意勾选文案");
  assert.equal((html.match(/<li/g) || []).length, 5, "五条数据说明点必须完整");
  assert.ok(html.includes('data-rehabmind-tutorial="consent-checkbox"'), "缺少勾选锚点");
  const agreeTag = html.match(/<button[^>]*consent-agree[^>]*>/);
  assert.ok(agreeTag, "缺少同意按钮");
  assert.ok(
    agreeTag[0].includes("disabled"),
    `未勾选时同意按钮必须禁用：${agreeTag[0]}`,
  );
  assert.ok(html.includes("暂不使用"), "拒绝出口缺失");
});

test("同意门：拒绝后进入阻断态——只剩重新查看出口，不再提供任何同意入口", () => {
  const html = render(h(PilotConsentGate, { open: true, declined: true, onAgree: () => {}, onDecline: () => {}, onReconsider: () => {} }));
  assert.ok(html.includes("暂未开始使用"), "阻断标题缺失");
  assert.ok(html.includes("重新查看说明"), "重新查看出口缺失");
  assert.ok(!html.includes("consent-checkbox"), "阻断态不得再出现勾选框");
  assert.ok(!html.includes("consent-agree"), "阻断态不得再出现同意按钮");
  assert.ok(!html.includes("暂不使用"), "阻断态不得再出现拒绝按钮");
});

test("来源门：关闭态不渲染；打开态列出全部渠道且未选择时继续禁用", () => {
  assert.equal(render(h(PilotSourceGate, { open: false, onContinue: () => {} })), "");
  const html = render(h(PilotSourceGate, { open: true, onContinue: () => {} }));
  const options = sourceChannel.PILOT_SOURCE_OPTIONS;
  assert.ok(options.length >= 4, "来源渠道选项不应缺失");
  for (const option of options) {
    assert.ok(html.includes(`value="${option.value}"`), `缺少渠道 ${option.value}`);
    assert.ok(html.includes(option.label), `缺少渠道文案 ${option.label}`);
  }
  assert.ok(html.includes("你从哪里了解到我们？"), "来源门标题缺失");
  assert.match(html, /<button[^>]*disabled/s, "未选择渠道时继续按钮必须禁用");
});

test("引导卡：初始第一张、无上一页、有跳过入口；关闭态不渲染", () => {
  assert.equal(render(h(GuideCards, { open: false, onComplete: () => {}, onSkip: () => {} })), "");
  const html = render(h(GuideCards, { open: true, onComplete: () => {}, onSkip: () => {} }));
  assert.match(html, /第\s*1\s*步，\s*共\s*3\s*步/, "进度文案应为第 1/3 步");
  assert.ok(html.includes("跳过引导"), "跳过入口缺失");
  assert.ok(!html.includes('rm-guide-cards-back"'), "第一张卡不应有上一页按钮");
});

test("阶段抽屉：6 档齐全、未解锁禁用、当前与可回看标注正确", () => {
  const html = render(h(navigation.MobileStageNavigation, {
    open: true,
    railStep: 2,
    currentStep: 2,
    maxUnlocked: 2,
    followupMode: false,
    onOpen: () => {},
    onClose: () => {},
    onSelect: () => {},
  }));
  assert.ok(html.includes("查看阶段"), "抽屉入口缺失");
  assert.ok(html.includes("rm-mobile-stage-drawer"), "抽屉未渲染");
  assert.ok(html.includes("本次康复"), "抽屉标题缺失");
  const buttons = html.match(/<nav>[\s\S]*?<\/nav>/)[0].match(/<button/g).length;
  assert.equal(buttons, support.STEPS.length, "阶段按钮数量必须等于六步");
  for (const label of support.STEPS) assert.ok(html.includes(label), `缺少阶段 ${label}`);
  assert.ok(html.includes("当前"), "当前标注缺失");
  assert.equal((html.match(/未开始/g) || []).length, 3, "超过 maxUnlocked 的三档必须标注未开始");
  assert.equal((html.match(/可回看/g) || []).length, 2, "已完成两档必须标注可回看");
});

test("阶段抽屉：随访模式只允许回看，即使 maxUnlocked 更高", () => {
  const html = render(h(navigation.MobileStageNavigation, {
    open: true,
    railStep: 2,
    currentStep: 2,
    maxUnlocked: 5,
    followupMode: true,
    onOpen: () => {},
    onClose: () => {},
    onSelect: () => {},
  }));
  assert.equal((html.match(/disabled/g) || []).length, 3, "随访模式下超过 railStep 的三档必须禁用");
});

test("阶段抽屉：关闭态只保留入口，不渲染抽屉本体", () => {
  const html = render(h(navigation.MobileStageNavigation, {
    open: false,
    railStep: 2,
    currentStep: 2,
    maxUnlocked: 2,
    followupMode: false,
    onOpen: () => {},
    onClose: () => {},
    onSelect: () => {},
  }));
  assert.ok(html.includes("查看阶段"), "关闭态仍应显示入口");
  assert.ok(!html.includes("rm-mobile-stage-drawer"), "关闭态不得渲染抽屉");
});

test("更多菜单：关闭态不渲染；打开时展示案例编号与复制；无编号时不展示编号区", () => {
  const closed = render(h(navigation.MobileMoreMenu, {
    open: false, sessionNumber: 1, record: undefined,
    onClose: () => {}, onCopyCaseCode: () => {}, onOpenRecords: () => {}, onOpenFeedback: () => {}, onOpenHelp: () => {}, onSave: () => {},
  }));
  assert.equal(closed, "");
  const withCode = render(h(navigation.MobileMoreMenu, {
    open: true, sessionNumber: 3, record: { pilotPublicCode: "RM-TEST-001" },
    onClose: () => {}, onCopyCaseCode: () => {}, onOpenRecords: () => {}, onOpenFeedback: () => {}, onOpenHelp: () => {}, onSave: () => {},
  }));
  assert.ok(withCode.includes("RM-TEST-001"), "案例编号必须可见");
  assert.ok(withCode.includes("案例编号") && withCode.includes("复制"), "编号区与复制入口缺失");
  const withoutCode = render(h(navigation.MobileMoreMenu, {
    open: true, sessionNumber: 3, record: {},
    onClose: () => {}, onCopyCaseCode: () => {}, onOpenRecords: () => {}, onOpenFeedback: () => {}, onOpenHelp: () => {}, onSave: () => {},
  }));
  assert.ok(!withoutCode.includes("RM-TEST"), "无编号时不得渲染编号占位");
});

const SYNC_STATES = [
  ["idle", "未保存"],
  ["local-saving", "··"],
  ["syncing", "··"],
  ["local-saved", "✓"],
  ["synced", "✓"],
  ["offline", "仅保存在本机"],
  ["conflict", "保存待处理"],
  ["error", "保存失败"],
];
for (const [state, label] of SYNC_STATES) {
  test(`移动顶栏同步状态 ${state} 渲染可见文案「${label}」`, () => {
    const html = render(h(navigation.MobileTopActions, {
      sessionNumber: 2,
      syncState: state,
      moreOpen: false,
      onToggleMore: () => {},
    }));
    assert.ok(html.includes(label), `状态 ${state} 的文案「${label}」未出现在渲染产物`);
    assert.ok(html.includes("第2"), "康复次数缺失");
    assert.ok(html.includes('aria-label="更多"'), "更多按钮缺失");
  });
}
