const CURRENT_WORDS = ["现在", "目前", "这次", "最近", "仍", "一直", "还会", "开始"];
const HISTORY_WORDS = ["以前", "曾经", "过去", "之前", "当时"];
const SYMPTOM_WORDS = ["疼", "痛", "酸", "胀", "麻", "电", "肿", "淤青", "无力", "不稳", "受限", "紧", "扯", "卡", "不舒服", "难受", "没好"];

export function splitComplaintSegments(text: string) {
  return text
    .replace(/(但是|但|不过|只是|这次|现在|目前)/g, "。$1")
    .split(/[，。；！？\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasNonNegatedSymptom(segment: string) {
  return SYMPTOM_WORDS.some((word) => {
    let index = segment.indexOf(word);
    while (index >= 0) {
      const prefix = segment.slice(Math.max(0, index - 4), index);
      if (!/(?:不|没|没有|并无|无|未)(?:再|会|是|有)?$/.test(prefix)) return true;
      index = segment.indexOf(word, index + word.length);
    }
    return false;
  });
}

export function currentComplaintSegments(text: string) {
  const segments = splitComplaintSegments(text);
  return segments.filter((segment) => {
    const historical = HISTORY_WORDS.some((word) => segment.includes(word));
    const current = CURRENT_WORDS.some((word) => segment.includes(word));
    if (!hasNonNegatedSymptom(segment)) return false;
    if (historical && !current && !/(一直|仍然|还没|没有恢复|反复)/.test(segment)) return false;
    return true;
  });
}

export function currentComplaintText(text: string) {
  const segments = currentComplaintSegments(text);
  return segments.length ? segments.join("；") : text.trim();
}

export function hasNegatedTerm(text: string, terms: string[]) {
  return terms.some((term) => new RegExp(`(?:不|没|没有|并无|无|未)(?:再|会|是|有)?[^，。；]{0,2}${term}`).test(text));
}
