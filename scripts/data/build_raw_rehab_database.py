#!/usr/bin/env python3
"""Build a traceable patient/session database from the original RehabMind TXT corpus.

The script never treats an automated category as a clinical conclusion. It preserves
the original text, source filename and line range so every extracted item can be
checked against the source.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Iterable


KNOWLEDGE_FILES = {
    "TFCC.txt",
    "关节受限判断.txt",
    "问题解决记录.txt",
    "足底筋膜炎，跟腱末端疼康复.txt",
}

# Confirmed by the corpus owner. The value is the canonical display name;
# original spellings remain available on every Session as patient_name_raw.
PATIENT_ALIASES = {
    "巫统": "巫彤",
    "邱婧雯": "邱靖雯",
    "梁平": "梁萍",
    "潘浚尧": "潘骏尧",
    "夏佳豪": "夏家豪",
}

# Confirmed duplicate-source pairs. The raw files are never removed. Sessions
# are merged only for the same canonical patient and only when their own text
# has high overlap; both source references are retained on the episode.
APPROVED_DUPLICATE_SOURCE_PAIRS = {
    frozenset(("2024.12.25治疗记录.txt", "2025.12.25（二）治疗记录.txt")),
    frozenset(("2025.1.12治疗记录.txt", "2025.1.15治疗记录.txt")),
    frozenset(("5.13治疗反馈.txt", "苏珊康复记录.txt")),
    frozenset(("5.20治疗反馈.txt", "苏珊康复记录.txt")),
    frozenset(("5.9治疗反馈.txt", "丁璐康复记录.txt")),
}

NAME_STOP_EXACT = {
    "评估",
    "治疗",
    "训练",
    "复盘",
    "总结",
    "主诉",
    "处理",
    "检查",
    "治疗处理",
    "治疗问诊",
}

NAME_STOP_PARTS = (
    "应该",
    "怎么",
    "是否",
    "为什么",
    "疼痛",
    "活动度",
    "松解",
    "松动",
    "激活",
    "训练",
    "治疗",
    "处理",
    "问诊",
    "检查",
    "核磁",
    "膝关节",
    "踝关节",
    "腰突",
    "韧带",
    "半月板",
    "关节",
    "按压",
    "复测",
    "回家",
    "小时",
    "记录",
    "没有判断对",
    "消息必须",
    "及时回复",
    "时间控制",
    "选择不合理",
    "动作教",
)

ANNOTATION_RE = re.compile(r"[（(].*?[）)]")
NUMBERED_RE = re.compile(r"^\s*(\d{1,2})[\.、]\s*(\S.*)$")
DATE_FILE_RE = re.compile(r"^(\d{4})\.(\d{1,2})\.(\d{1,2}).*治疗记录")
FEEDBACK_FILE_RE = re.compile(r"^(\d{1,2})\.(\d{1,2}).*治疗反馈")
DATE_SECTION_RE = re.compile(
    r"^\s*(?:(\d{4})[.年/-])?(\d{1,2})[.月/-](\d{1,2})日?\s*(.*(?:评估|治疗|反馈|第[一二三四五六七八九十]+次|第一次|复查).*)?[：:]?\s*$"
)

SOURCE_LEVEL_MARKERS = (
    "腰突误区",
    "今天治疗",
    "各种损伤人群",
    "1.每天消息必须",
)

REGION_KEYWORDS = {
    "颈部": ("颈", "脖子", "枕下"),
    "肩部": ("肩", "肩胛", "锁骨", "肩袖"),
    "肘部": ("肘",),
    "腕手": ("腕", "手腕", "手指", "拇指", "尺侧", "桡侧", "TFCC"),
    "胸椎/胸廓": ("胸椎", "胸廓", "肋骨", "胸大肌", "胸小肌"),
    "腰骶": ("腰", "骶", "尾骨", "腰椎"),
    "骨盆/髋": ("骨盆", "髋", "腹股沟", "臀", "屁股", "梨状肌"),
    "大腿": ("大腿", "股四", "股直肌", "股外侧肌", "股内侧肌", "内收肌", "腘绳肌", "髂胫束", "阔筋膜张肌"),
    "膝": ("膝", "髌", "鹅足", "腘窝", "半月板", "前叉", "后叉"),
    "小腿": ("小腿", "胫骨前肌", "胫骨后肌", "腓骨肌", "腓肠肌", "小腿三头肌"),
    "踝": ("踝", "距骨", "内踝", "外踝"),
    "足": ("足底", "脚底", "足弓", "脚背", "足背", "足跟", "脚跟", "足趾", "脚趾", "跖骨", "骰骨", "足舟骨"),
}

CATEGORY_KEYWORDS = {
    "症状与功能": (
        "疼",
        "痛",
        "不舒服",
        "不适",
        "酸",
        "胀",
        "紧",
        "麻",
        "电",
        "烧灼",
        "牵扯",
        "拉扯",
        "卡压",
        "挤压",
        "弹响",
        "刮擦",
        "肿",
        "无力",
        "不稳",
        "受限",
        "无法",
        "影响",
    ),
    "评估检查": (
        "检查",
        "评估",
        "触诊",
        "按压",
        "阳性",
        "阴性",
        "测试",
        "活动度",
        "角度",
        "受限",
        "正常",
        "无力",
        "萎缩",
        "稳定性",
        "卡旋",
        "腿长",
        "张力高",
        "过紧",
    ),
    "处理": (
        "松解",
        "松动",
        "激活",
        "促进",
        "拉伸",
        "超声",
        "TENS",
        "compex",
        "筋膜刀",
        "MET",
        "回流",
        "消肿贴",
        "肌贴",
        "理疗",
        "屏蔽",
        "按住",
        "抵着",
        "调整",
    ),
    "训练": (
        "臀桥",
        "死虫",
        "鸟狗",
        "蚌式",
        "屈髋",
        "提踵",
        "深蹲",
        "下蹲",
        "分腿蹲",
        "单腿站",
        "单立",
        "硬拉",
        "平板支撑",
        "猫式",
        "步态练习",
        "落地",
        "跳跃",
        "弓箭步",
        "登阶",
        "侧移",
        "呼吸",
        "锻炼",
    ),
    "反应与复测": (
        "处理后",
        "治疗后",
        "做完后",
        "做完之后",
        "松动后",
        "松解后",
        "激活后",
        "促进后",
        "调整后",
        "屏蔽掉",
        "屏蔽后",
        "按住后",
        "抵着",
        "再次",
        "复测",
        "缓解",
        "改善",
        "减轻",
        "消失",
        "没有变化",
        "无缓解",
        "加重",
        "正常了",
        "不疼",
        "没啥感觉",
        "舒服了",
        "一致",
    ),
    "影像与医学信息": (
        "核磁",
        "MRI",
        "CT",
        "X光",
        "片子",
        "影像",
        "手术",
        "术后",
        "骨折",
        "医生",
        "医院",
        "积液",
        "撕裂",
        "韧带损伤",
        "骨髓水肿",
    ),
    "推测与未知": (
        "怀疑",
        "可能",
        "猜测",
        "应该是",
        "考虑",
        "不确定",
        "不知道",
        "没记录",
        "未记录",
        "说不清",
        "反推",
    ),
}

SYMPTOM_TERMS = (
    "疼痛", "不舒服", "不适", "酸", "胀", "紧", "牵扯", "拉扯", "刺痛", "麻", "电感", "烧灼", "肿胀", "弹响", "刮擦感", "卡压感", "无力", "不稳"
)

FUNCTION_TERMS = (
    "走路", "久坐", "站立", "上下楼", "上楼", "下楼", "下蹲", "起身", "弯腰", "后仰", "屈髋", "跑步", "打球", "跳跃", "落地", "单腿站", "提踵", "睡觉", "翻身"
)

TREATMENT_TARGET_TERMS = (
    "腰大肌", "腰方肌", "竖脊肌", "多裂肌", "背阔肌", "腹横肌", "臀大肌", "臀中肌", "梨状肌", "阔筋膜张肌", "髂胫束", "股直肌", "股外侧肌", "股内侧肌", "股内斜肌", "内收肌", "腘绳肌", "半腱肌", "腘肌", "小腿三头肌", "腓肠肌", "比目鱼肌", "胫骨前肌", "胫骨后肌", "趾长伸肌", "腓骨长肌", "足底筋膜", "肩胛下肌", "菱形肌", "前锯肌", "斜方肌", "胸大肌", "胸小肌", "肩袖", "肱桡肌", "肱二头肌", "第一肋骨", "骨盆", "骶骨", "髋关节囊", "膝关节", "髌骨", "腓骨近端", "腓骨远端", "距骨", "骰骨", "足舟骨", "踝关节", "腕关节", "桡骨", "尺骨", "胫神经", "腓肠神经", "股神经", "正中神经", "尺神经"
)

EXERCISE_TERMS = (
    "呼吸", "臀桥", "单腿臀桥", "死虫", "鸟狗", "蚌式开合", "屈髋", "站立屈髋", "单腿屈髋", "分腿蹲", "下蹲", "深蹲", "单腿站", "提踵", "离心提踵", "硬拉", "登阶", "下台阶", "弓箭步", "平板支撑", "侧平板", "猫式伸展", "后侧伸展", "胸椎伸展", "足外翻", "缩足", "步态练习", "跳跃", "落地", "侧跳"
)


@dataclass
class Session:
    session_id: str
    patient_name: str
    patient_name_raw: str
    patient_confidence: str
    date: str | None
    date_raw: str | None
    source_file: str
    source_kind: str
    line_start: int
    line_end: int
    raw_header: str
    raw_lines: list[str]
    shared_or_ambiguous: bool
    categories: dict[str, list[dict]]
    regions: list[str]


def sha(text: str, n: int = 10) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:n]


def clean_annotation(text: str) -> str:
    return ANNOTATION_RE.sub("", text).strip().rstrip("：:")


def clean_patient_name(text: str) -> str:
    value = clean_annotation(text)
    value = re.sub(r"^(?:姓名|患者)[:：]\s*", "", value)
    value = re.sub(r"\s+", "", value)
    return value.strip("-—：:")


def is_name_like(text: str) -> bool:
    base = clean_patient_name(text)
    if base in NAME_STOP_EXACT or not base:
        return False
    if len(base) < 2 or len(base) > 8:
        return False
    if re.search(r"\d|[，。！？?：:；;、]", base):
        return False
    if any(part in base for part in NAME_STOP_PARTS):
        return False
    return bool(re.fullmatch(r"[\u3400-\u9fffA-Za-z·/]+", base))


def filename_patient_label(path: Path) -> str | None:
    stem = path.stem
    if path.name in KNOWLEDGE_FILES:
        return None
    if DATE_FILE_RE.match(path.name) or FEEDBACK_FILE_RE.match(path.name) or "治疗学习总结" in path.name:
        return None
    for suffix in ("评估、治疗记录", "评估记录", "康复记录", "评估思路", "评估", "治疗记录"):
        stem = stem.replace(suffix, "")
    stem = re.sub(r"^\d+(?:\.\d+)+", "", stem)
    stem = re.sub(r"后叉受伤后$", "", stem)
    stem = re.sub(r"的$", "", stem)
    stem = stem.strip(" _：:")
    if not stem:
        return None
    return stem


def parse_file_date(name: str) -> tuple[str | None, str | None]:
    match = DATE_FILE_RE.match(name)
    if match:
        y, m, d = map(int, match.groups())
        try:
            return datetime(y, m, d).date().isoformat(), f"{y}.{m}.{d}"
        except ValueError:
            return None, f"{y}.{m}.{d}"
    match = FEEDBACK_FILE_RE.match(name)
    if match:
        m, d = map(int, match.groups())
        return None, f"{m}.{d}（年份未写）"
    return None, None


def categorize_lines(lines: list[str], line_start: int) -> tuple[dict[str, list[dict]], list[str]]:
    categories: dict[str, list[dict]] = defaultdict(list)
    regions: set[str] = set()
    for offset, raw in enumerate(lines):
        text = raw.strip()
        if not text:
            continue
        # `line_start` points to the patient/session header; `lines` starts on
        # the following source line.
        line_no = line_start + offset + 1
        for category, keywords in CATEGORY_KEYWORDS.items():
            if any(keyword.lower() in text.lower() for keyword in keywords):
                categories[category].append({"line": line_no, "text": text})
        regions.update(detect_regions(text))
    return dict(categories), sorted(regions)


def detect_regions(text: str) -> set[str]:
    return {
        region
        for region, keywords in REGION_KEYWORDS.items()
        if any(keyword in text for keyword in keywords)
    }


def redact_nonclinical_text(text: str) -> str:
    text = re.sub(r"https?://\S+", "[非康复URL已从患者数据库移除]", text)
    text = re.sub(r"(?m)^卡号：.*$", "卡号：[已从患者数据库移除]", text)
    return text


def classify_response_evidence(text: str) -> str:
    positive = any(word in text for word in ("缓解", "改善", "减轻", "消失", "正常", "不疼", "舒服", "一致", "好很多", "没啥感觉"))
    negative = any(word in text for word in ("无缓解", "没有改善", "无改善", "没变化", "无变化", "加重", "更疼", "反而"))
    modification = any(word in text for word in ("屏蔽", "按住", "抵着", "辅助", "促进", "固定", "推", "压住", "调整"))
    treatment_after = bool(re.search(r"(?:处理|治疗|松动|松解|激活|拉伸|训练|做完|调整).{0,12}(?:后|完)", text))
    delayed = any(word in text for word in ("上次", "回去后", "第二天", "隔天", "这几天", "最近", "一周后"))
    if negative and (modification or treatment_after):
        return "direct-no-change-or-worse"
    if positive and modification:
        return "direct-localization"
    if positive and treatment_after:
        return "direct-after-treatment"
    if delayed and (positive or negative):
        return "delayed-follow-up"
    return "context-only-or-needs-review"


def count_terms(text: str, terms: Iterable[str]) -> Counter:
    counts: Counter = Counter()
    for term in terms:
        count = text.count(term)
        if count:
            counts[term] = count
    return counts


def make_session(
    patient_name: str,
    confidence: str,
    date: str | None,
    date_raw: str | None,
    source: Path,
    source_kind: str,
    start: int,
    end: int,
    header: str,
    lines: list[str],
    ambiguous: bool = False,
) -> Session:
    categories, regions = categorize_lines(lines, start)
    key = f"{source.name}|{start}|{end}|{patient_name}"
    return Session(
        session_id=f"S-{sha(key)}",
        patient_name=patient_name,
        patient_name_raw=patient_name,
        patient_confidence=confidence,
        date=date,
        date_raw=date_raw,
        source_file=source.name,
        source_kind=source_kind,
        line_start=start,
        line_end=end,
        raw_header=header,
        raw_lines=lines,
        shared_or_ambiguous=ambiguous,
        categories=categories,
        regions=regions,
    )


def harvest_known_names(files: list[Path]) -> set[str]:
    names: set[str] = set()
    for path in files:
        label = filename_patient_label(path)
        if label:
            for part in re.split(r"[_，,/]", label):
                if is_name_like(part):
                    names.add(clean_patient_name(part))
        if DATE_FILE_RE.match(path.name) or FEEDBACK_FILE_RE.match(path.name) or "治疗记录" in path.name:
            lines = path.read_text(encoding="utf-8").splitlines()
            for line in lines:
                match = NUMBERED_RE.match(line)
                if match and is_name_like(match.group(2)):
                    for part in re.split(r"[/]", clean_patient_name(match.group(2))):
                        if is_name_like(part):
                            names.add(part)
    return names


def identify_header(text: str, known_names: set[str], anon_key: str) -> tuple[str, str, str, bool] | None:
    raw = text.strip()
    cleaned = clean_patient_name(raw)
    if cleaned in NAME_STOP_EXACT:
        return f"匿名患者@{anon_key}", "low", "", True
    if "评估" in raw and ("ACL" in raw or "术后" in raw) and len(raw) <= 30:
        return f"匿名患者@{anon_key}", "low", "", True
    slash_parts = [clean_patient_name(part) for part in raw.split("/")]
    if len(slash_parts) > 1 and all(part in known_names for part in slash_parts):
        return "/".join(slash_parts), "medium", "", True
    if cleaned in known_names or is_name_like(raw):
        return cleaned, "high", "", False
    for name in sorted(known_names, key=len, reverse=True):
        if raw.startswith(name) and len(raw) > len(name):
            remainder = raw[len(name) :].lstrip("：:，,。 ")
            if remainder:
                return name, "medium", remainder, False
    return None


def parse_numbered_source(path: Path, known_names: set[str], source_kind: str) -> tuple[list[Session], list[dict]]:
    lines = path.read_text(encoding="utf-8").splitlines()
    date, date_raw = parse_file_date(path.name)
    headers: list[tuple[int, str, str, str, bool, str, str | None]] = []
    for idx, line in enumerate(lines):
        match = NUMBERED_RE.match(line)
        if not match:
            continue
        identified = identify_header(match.group(2), known_names, f"{path.stem}#{match.group(1)}")
        if identified:
            name, confidence, inline, ambiguous = identified
            headers.append((idx, name, confidence, inline, ambiguous, match.group(2).strip(), None))
            continue
        dated_name = re.match(r"^\s*(\d{1,2}\.\d{1,2})([^：:]+)[：:]\s*$", line)
        if dated_name:
            candidate_name = clean_patient_name(dated_name.group(2))
            if candidate_name in known_names:
                headers.append((idx, candidate_name, "high", "", False, line.strip(), f"{dated_name.group(1)}（年份未写）"))
    headers = sorted({item[0]: item for item in headers}.values(), key=lambda item: item[0])
    tail_start = None
    if headers:
        last_header_index = headers[-1][0]
        for idx in range(last_header_index + 1, len(lines)):
            stripped = lines[idx].strip()
            if any(stripped.startswith(marker) for marker in SOURCE_LEVEL_MARKERS):
                tail_start = idx
                break
    sessions: list[Session] = []
    unassigned: list[dict] = []
    if not headers:
        unassigned.append(
            {
                "source_file": path.name,
                "line_start": 1,
                "line_end": len(lines),
                "reason": "未识别患者标题",
                "text": "\n".join(lines),
            }
        )
        return sessions, unassigned
    first_idx = headers[0][0]
    preamble = [
        line
        for line in lines[:first_idx]
        if line.strip()
        and "治疗记录" not in line
        and "治疗反馈" not in line
        and not re.fullmatch(r"\d{4}\.\d{1,2}\.\d{1,2}", line.strip())
    ]
    if preamble:
        unassigned.append(
            {
                "source_file": path.name,
                "line_start": 1,
                "line_end": first_idx,
                "reason": "首个患者标题前的内容",
                "text": "\n".join(preamble),
            }
        )
    for pos, (idx, name, confidence, inline, ambiguous, raw_header, local_date_raw) in enumerate(headers):
        end_idx = headers[pos + 1][0] if pos + 1 < len(headers) else (tail_start if tail_start is not None else len(lines))
        body = lines[idx + 1 : end_idx]
        body_start = idx + 2
        if inline:
            body = [inline] + body
            body_start = idx + 1
        sessions.append(
            make_session(
                name,
                confidence,
                date,
                local_date_raw or date_raw,
                path,
                source_kind,
                idx + 1,
                end_idx,
                raw_header,
                body,
                ambiguous,
            )
        )
    if tail_start is not None:
        unassigned.append(
            {
                "source_file": path.name,
                "line_start": tail_start + 1,
                "line_end": len(lines),
                "reason": "非患者知识、治疗复盘或管理信息，已从患者记录移出",
                "text": redact_nonclinical_text("\n".join(lines[tail_start:])),
            }
        )
    return sessions, unassigned


def split_multi_label(label: str) -> list[str]:
    return [clean_patient_name(part) for part in re.split(r"[_，,/]", label) if clean_patient_name(part)]


def split_named_source(path: Path, known_names: set[str]) -> tuple[list[Session], list[dict]]:
    lines = path.read_text(encoding="utf-8").splitlines()
    label = filename_patient_label(path) or f"匿名患者@{path.stem}"
    names = split_multi_label(label)
    if len(names) > 1:
        positions: list[tuple[int, str]] = []
        for idx, line in enumerate(lines):
            cleaned = clean_patient_name(line)
            if cleaned in names:
                positions.append((idx, cleaned))
        if len(positions) >= 2:
            sessions: list[Session] = []
            for pos, (idx, name) in enumerate(positions):
                end = positions[pos + 1][0] if pos + 1 < len(positions) else len(lines)
                sessions.append(
                    make_session(name, "high", None, None, path, "patient-record", idx + 1, end, line_or_name(lines, idx, name), lines[idx + 1 : end])
                )
            return sessions, []
        group_name = "/".join(names)
        return [make_session(group_name, "medium", None, None, path, "patient-record", 1, len(lines), lines[0] if lines else group_name, lines[1:], True)], []

    patient = names[0] if names else f"匿名患者@{path.stem}"
    section_positions: list[int] = []
    for idx, line in enumerate(lines[1:], start=1):
        if DATE_SECTION_RE.match(line.strip()) or re.match(r"^第[一二三四五六七八九十]+次[：:]?", line.strip()):
            section_positions.append(idx)
    if not section_positions:
        return [make_session(patient, "high" if names else "low", None, None, path, "patient-record", 1, len(lines), lines[0] if lines else patient, lines[1:])], []
    sessions: list[Session] = []
    if any(line.strip() for line in lines[1 : section_positions[0]]):
        sessions.append(make_session(patient, "high", None, None, path, "patient-record", 1, section_positions[0], lines[0], lines[1 : section_positions[0]]))
    for pos, idx in enumerate(section_positions):
        end = section_positions[pos + 1] if pos + 1 < len(section_positions) else len(lines)
        marker = lines[idx].strip()
        match = DATE_SECTION_RE.match(marker)
        date = None
        date_raw = marker.rstrip("：:")
        if match:
            year_raw, month_raw, day_raw, _ = match.groups()
            if year_raw:
                try:
                    date = datetime(int(year_raw), int(month_raw), int(day_raw)).date().isoformat()
                except ValueError:
                    date = None
        sessions.append(make_session(patient, "high", date, date_raw, path, "patient-record", idx + 1, end, marker, lines[idx + 1 : end]))
    return sessions, []


def line_or_name(lines: list[str], idx: int, fallback: str) -> str:
    return lines[idx].strip() if idx < len(lines) and lines[idx].strip() else fallback


def safe_filename(value: str) -> str:
    # `#` is legal on Windows but Markdown treats it as an anchor delimiter,
    # so keeping it in generated filenames creates broken local links.
    value = re.sub(r"[<>:\"/\\|?*#]", "_", value)
    return value[:80]


def edit_distance(left: str, right: str) -> int:
    previous = list(range(len(right) + 1))
    for i, char_left in enumerate(left, start=1):
        current = [i]
        for j, char_right in enumerate(right, start=1):
            current.append(min(current[-1] + 1, previous[j] + 1, previous[j - 1] + (char_left != char_right)))
        previous = current
    return previous[-1]


def patient_id(name: str) -> str:
    return f"P-{sha(name, 8).upper()}"


def source_sort_key(session: Session) -> tuple:
    return (session.date or "9999", session.date_raw or "", session.source_file, session.line_start)


def session_day_key(session: Session) -> str | None:
    if session.date:
        return session.date[5:]
    if session.date_raw:
        match = re.search(r"(\d{1,2})[.月/-](\d{1,2})", session.date_raw)
        if match:
            return f"{int(match.group(1)):02d}-{int(match.group(2)):02d}"
    return None


def normalized_line_set(session: Session) -> set[str]:
    return {
        re.sub(r"\s+", "", line)
        for line in session.raw_lines
        if re.sub(r"\s+", "", line) and not re.fullmatch(r"\d+[.、].*", re.sub(r"\s+", "", line))
    }


def build_episode_groups(sessions: list[Session]) -> list[dict]:
    by_patient: dict[str, list[Session]] = defaultdict(list)
    for session in sessions:
        by_patient[session.patient_name].append(session)
    episodes = []
    for patient_name, person_sessions in by_patient.items():
        parent = list(range(len(person_sessions)))

        def find(index: int) -> int:
            while parent[index] != index:
                parent[index] = parent[parent[index]]
                index = parent[index]
            return index

        def union(left: int, right: int) -> None:
            root_left, root_right = find(left), find(right)
            if root_left != root_right:
                parent[root_right] = root_left

        line_sets = [normalized_line_set(session) for session in person_sessions]
        for left in range(len(person_sessions)):
            for right in range(left + 1, len(person_sessions)):
                left_session = person_sessions[left]
                right_session = person_sessions[right]
                same_day = bool(session_day_key(left_session)) and session_day_key(left_session) == session_day_key(right_session)
                approved_source_pair = frozenset((left_session.source_file, right_session.source_file)) in APPROVED_DUPLICATE_SOURCE_PAIRS
                if not same_day and not approved_source_pair:
                    continue
                if min(len(line_sets[left]), len(line_sets[right])) < 3:
                    continue
                overlap = len(line_sets[left].intersection(line_sets[right]))
                containment = overlap / min(len(line_sets[left]), len(line_sets[right]))
                if overlap >= 3 and containment >= 0.7:
                    union(left, right)
        groups: dict[int, list[Session]] = defaultdict(list)
        for index, session in enumerate(person_sessions):
            groups[find(index)].append(session)
        for group in groups.values():
            primary = sorted(group, key=lambda session: (session.source_kind != "daily-treatment", session.source_kind != "feedback", -len(session.raw_lines)))[0]
            episodes.append(
                {
                    "episode_id": f"E-{sha('|'.join(sorted(session.session_id for session in group)), 10).upper()}",
                    "patient_id": patient_id(patient_name),
                    "patient_name": patient_name,
                    "date": primary.date,
                    "date_raw": primary.date_raw,
                    "primary_session_id": primary.session_id,
                    "session_ids": [session.session_id for session in group],
                    "source_refs": [f"{session.source_file}:{session.line_start}-{session.line_end}" for session in group],
                    "duplicate_source_count": len(group),
                }
            )
    return episodes


def write_patient_markdown(path: Path, pid: str, name: str, sessions: list[Session]) -> None:
    region_counts = Counter(region for session in sessions for region in session.regions)
    response_count = sum(len(session.categories.get("反应与复测", [])) for session in sessions)
    source_count = len({session.source_file for session in sessions})
    all_text = "\n".join(line for session in sessions for line in session.raw_lines)
    symptom_counts = count_terms(all_text, SYMPTOM_TERMS)
    function_counts = count_terms(all_text, FUNCTION_TERMS)
    target_counts = count_terms(all_text, TREATMENT_TARGET_TERMS)
    exercise_counts = count_terms(all_text, EXERCISE_TERMS)
    direct_evidence = []
    aliases = sorted({session.patient_name_raw for session in sessions if session.patient_name_raw != name})
    for session in sessions:
        for item in session.categories.get("反应与复测", []):
            evidence_type = classify_response_evidence(item["text"])
            if evidence_type != "context-only-or-needs-review":
                direct_evidence.append((session, item, evidence_type))
    lines = [
        f"# {pid}｜{name}",
        "",
        "> 本文件从 `ai资料` 原始 TXT 自动拆分并按原文分类。分类标签不是诊断；所有结论必须回到来源行核对。",
        "",
        "## 数据概况",
        "",
        f"- 会话/记录段：{len(sessions)}",
        f"- 原始文件：{source_count}",
        f"- 已确认原始别名：{'、'.join(aliases) if aliases else '无'}",
        f"- 含处理后反应原文：{response_count} 条",
        f"- 涉及区域：{'、'.join(region for region, _ in region_counts.most_common()) or '未自动识别'}",
        f"- 是否含归属待确认记录：{'是' if any(s.shared_or_ambiguous or s.patient_confidence != 'high' for s in sessions) else '否'}",
        "",
        "## 纵向检索摘要",
        "",
        f"- 反复出现的症状词：{'、'.join(f'{term}×{count}' for term, count in symptom_counts.most_common(10)) or '未自动识别'}",
        f"- 反复出现的功能任务：{'、'.join(f'{term}×{count}' for term, count in function_counts.most_common(10)) or '未自动识别'}",
        f"- 记录中常见处理目标：{'、'.join(f'{term}×{count}' for term, count in target_counts.most_common(12)) or '未自动识别'}",
        f"- 记录中常见训练动作：{'、'.join(f'{term}×{count}' for term, count in exercise_counts.most_common(12)) or '未自动识别'}",
        "",
        "> 上述频次只说明原文出现次数，不等于该部位异常、处理有效或训练适合其他患者。",
        "",
        "## 直接反应证据初筛",
        "",
    ]
    if direct_evidence:
        for session, item, evidence_type in direct_evidence:
            lines.append(f"- `{evidence_type}`｜{session.source_file}:L{item['line']}｜{item['text']}")
    else:
        lines.append("- 未找到明确的直接反应句；不能从处理项目反推有效性。")
    lines += [
        "",
        "## 记录时间线",
        "",
    ]
    for session in sorted(sessions, key=source_sort_key):
        date_label = session.date or session.date_raw or "日期未单独记录"
        ambiguity = "；患者归属待确认" if session.shared_or_ambiguous or session.patient_confidence != "high" else ""
        lines += [
            f"### {date_label}｜{session.source_file}:{session.line_start}-{session.line_end}",
            "",
            f"- 原标题：{session.raw_header}",
            f"- 来源类型：{session.source_kind}{ambiguity}",
            f"- 自动识别区域：{'、'.join(session.regions) or '未识别'}",
            "",
        ]
        for category in ("症状与功能", "评估检查", "处理", "反应与复测", "训练", "影像与医学信息", "推测与未知"):
            items = session.categories.get(category, [])
            if items:
                lines.append(f"#### {category}")
                lines.append("")
                for item in items:
                    lines.append(f"- L{item['line']}：{item['text']}")
                lines.append("")
        lines += ["#### 本段原文", "", "```text", *session.raw_lines, "```", ""]
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def write_markdown_table(path: Path, headers: list[str], rows: Iterable[list[str]], intro: list[str] | None = None) -> None:
    lines = list(intro or [])
    if lines:
        lines.append("")
    lines.append("| " + " | ".join(headers) + " |")
    lines.append("| " + " | ".join("---" for _ in headers) + " |")
    for row in rows:
        escaped = [str(value).replace("|", "\\|").replace("\n", " ") for value in row]
        lines.append("| " + " | ".join(escaped) + " |")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    source = Path(args.source)
    output = Path(args.output)
    patients_dir = output / "患者"
    db_dir = output / "数据库"
    review_dir = output / "审核"
    knowledge_dir = output / "知识笔记"
    analysis_dir = output / "分析"
    for directory in (output, patients_dir, db_dir, review_dir, knowledge_dir, analysis_dir):
        directory.mkdir(parents=True, exist_ok=True)

    files = sorted(source.glob("*.txt"), key=lambda p: p.name)
    known_names = harvest_known_names(files)
    sessions: list[Session] = []
    unassigned: list[dict] = []
    knowledge_notes: list[dict] = []
    manifest: list[dict] = []

    for path in files:
        raw = path.read_bytes()
        text = raw.decode("utf-8")
        digest = hashlib.sha256(raw).hexdigest()
        if path.name in KNOWLEDGE_FILES or "治疗学习总结" in path.name:
            kind = "knowledge-note" if path.name in KNOWLEDGE_FILES else "anonymous-learning-note"
        elif DATE_FILE_RE.match(path.name):
            kind = "daily-treatment"
        elif FEEDBACK_FILE_RE.match(path.name):
            kind = "feedback"
        else:
            kind = "patient-record"

        before_sessions = len(sessions)
        before_unassigned = len(unassigned)
        if kind == "knowledge-note":
            knowledge_notes.append({"source_file": path.name, "text": text})
        elif kind in {"daily-treatment", "feedback"}:
            parsed, pending = parse_numbered_source(path, known_names, kind)
            sessions.extend(parsed)
            unassigned.extend(pending)
        elif kind == "anonymous-learning-note":
            anon = f"匿名患者@{path.stem}"
            lines = text.splitlines()
            sessions.append(make_session(anon, "low", None, None, path, kind, 1, len(lines), lines[0] if lines else path.stem, lines[1:], True))
        else:
            parsed, pending = split_named_source(path, known_names)
            sessions.extend(parsed)
            unassigned.extend(pending)

        manifest.append(
            {
                "file": path.name,
                "bytes": len(raw),
                "lines": len(text.splitlines()),
                "sha256": digest,
                "kind": kind,
                "sessions": len(sessions) - before_sessions,
                "unassigned_blocks": len(unassigned) - before_unassigned,
            }
        )

    for session in sessions:
        session.patient_name_raw = session.patient_name
        session.patient_name = PATIENT_ALIASES.get(session.patient_name, session.patient_name)

    by_patient: dict[str, list[Session]] = defaultdict(list)
    for session in sessions:
        by_patient[session.patient_name].append(session)

    episodes = build_episode_groups(sessions)
    episodes_by_patient: dict[str, list[dict]] = defaultdict(list)
    for episode in episodes:
        episodes_by_patient[episode["patient_name"]].append(episode)

    sessions_by_file: dict[str, list[Session]] = defaultdict(list)
    for session in sessions:
        sessions_by_file[session.source_file].append(session)
    unassigned_by_file: dict[str, list[dict]] = defaultdict(list)
    for block in unassigned:
        unassigned_by_file[block["source_file"]].append(block)
    uncovered_records = []
    for item in manifest:
        path = source / item["file"]
        source_lines = path.read_text(encoding="utf-8").splitlines()
        covered: set[int] = set()
        if item["kind"] == "knowledge-note":
            covered.update(range(1, len(source_lines) + 1))
        for session in sessions_by_file[item["file"]]:
            covered.update(range(session.line_start, session.line_end + 1))
        for block in unassigned_by_file[item["file"]]:
            covered.update(range(block["line_start"], block["line_end"] + 1))
        missing = []
        for line_no, text in enumerate(source_lines, start=1):
            if not text.strip() or line_no in covered:
                continue
            is_title_metadata = line_no <= 2 and (
                text.strip() == path.stem
                or "治疗记录" in text
                or "治疗反馈" in text
                or (line_no == 1 and text.strip().endswith("记录"))
                or re.fullmatch(r"\d{4}\.\d{1,2}\.\d{1,2}", text.strip())
            )
            if not is_title_metadata:
                missing.append({"line": line_no, "text": text})
        item["uncovered_nonempty_lines"] = len(missing)
        if missing:
            uncovered_records.append({"source_file": item["file"], "lines": missing})

    patient_rows: list[dict] = []
    for name in sorted(by_patient):
        pid = patient_id(name)
        person_sessions = by_patient[name]
        filename = f"{pid}_{safe_filename(name)}.md"
        write_patient_markdown(patients_dir / filename, pid, name, person_sessions)
        region_counts = Counter(region for session in person_sessions for region in session.regions)
        patient_rows.append(
            {
                "patient_id": pid,
                "name": name,
                "aliases": sorted({session.patient_name_raw for session in person_sessions if session.patient_name_raw != name}),
                "sessions": len(person_sessions),
                "episodes": len(episodes_by_patient[name]),
                "source_files": len({session.source_file for session in person_sessions}),
                "first_date": min((s.date for s in person_sessions if s.date), default=""),
                "last_date": max((s.date for s in person_sessions if s.date), default=""),
                "regions": "、".join(region for region, _ in region_counts.most_common()),
                "response_lines": sum(len(s.categories.get("反应与复测", [])) for s in person_sessions),
                "needs_identity_review": any(s.shared_or_ambiguous or s.patient_confidence != "high" for s in person_sessions),
                "file": f"患者/{filename}",
            }
        )

    with (db_dir / "source_manifest.json").open("w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=2)
    with (db_dir / "uncovered_lines.json").open("w", encoding="utf-8") as fh:
        json.dump(uncovered_records, fh, ensure_ascii=False, indent=2)
    with (db_dir / "sessions.jsonl").open("w", encoding="utf-8") as fh:
        for session in sessions:
            fh.write(json.dumps(asdict(session), ensure_ascii=False) + "\n")
    with (db_dir / "episodes.json").open("w", encoding="utf-8") as fh:
        json.dump(episodes, fh, ensure_ascii=False, indent=2)
    with (db_dir / "patients.json").open("w", encoding="utf-8") as fh:
        json.dump(patient_rows, fh, ensure_ascii=False, indent=2)
    with (db_dir / "patient_aliases.json").open("w", encoding="utf-8") as fh:
        json.dump(PATIENT_ALIASES, fh, ensure_ascii=False, indent=2)
    with (db_dir / "unassigned.json").open("w", encoding="utf-8") as fh:
        json.dump(unassigned, fh, ensure_ascii=False, indent=2)

    with (db_dir / "patients.csv").open("w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(patient_rows[0].keys()) if patient_rows else [])
        if patient_rows:
            writer.writeheader()
            writer.writerows(patient_rows)

    patient_table_rows = []
    for row in sorted(patient_rows, key=lambda item: (-item["sessions"], item["name"])):
        patient_table_rows.append(
            [
                row["patient_id"],
                f"[{row['name']}](./{row['file']})",
                "、".join(row["aliases"]) or "—",
                row["episodes"],
                row["sessions"],
                row["source_files"],
                row["first_date"] or "未统一记录",
                row["last_date"] or "未统一记录",
                row["regions"] or "未识别",
                row["response_lines"],
                "是" if row["needs_identity_review"] else "否",
            ]
        )
    write_markdown_table(
        output / "患者索引.md",
        ["ID", "患者", "已确认别名", "去重会话", "原始记录段", "来源文件", "最早", "最晚", "区域", "反应原文", "待确认"],
        patient_table_rows,
        ["# 患者索引", "", "> 数据全部来自 `ai资料` 原始 TXT；姓名仅用于本地记录归并。"],
    )

    region_rows = []
    all_regions = sorted({region for session in sessions for region in session.regions})
    for region in all_regions:
        region_sessions = [session for session in sessions if region in session.regions]
        region_patients = {session.patient_name for session in region_sessions}
        direct_lines = sum(
            1
            for session in region_sessions
            for item in session.categories.get("反应与复测", [])
            if classify_response_evidence(item["text"]) != "context-only-or-needs-review"
        )
        region_rows.append([region, len(region_patients), len(region_sessions), direct_lines])
    write_markdown_table(
        analysis_dir / "区域覆盖矩阵.md",
        ["区域", "患者/匿名实体", "记录段", "直接反应初筛"],
        region_rows,
        ["# 区域覆盖矩阵", "", "> 同一记录可涉及多个区域，因此各区域数量不能相加为总数。"],
    )

    for report_name, report_regions in (("膝相关患者", {"膝"}), ("踝足相关患者", {"踝", "足", "小腿"})):
        rows = []
        for row in sorted(patient_rows, key=lambda item: (-item["sessions"], item["name"])):
            person_sessions = by_patient[row["name"]]
            if not any(report_regions.intersection(session.regions) for session in person_sessions):
                continue
            response_refs = []
            for session in person_sessions:
                if not report_regions.intersection(session.regions):
                    continue
                for item in session.categories.get("反应与复测", []):
                    if classify_response_evidence(item["text"]) != "context-only-or-needs-review":
                        response_refs.append(f"{session.source_file}:L{item['line']}")
            rows.append(
                [
                    row["patient_id"],
                    f"[{row['name']}](../{row['file']})",
                    row["sessions"],
                    row["regions"] or "未识别",
                    "；".join(response_refs[:6]) or "无",
                ]
            )
        write_markdown_table(
            analysis_dir / f"{report_name}.md",
            ["ID", "患者", "全部记录段", "涉及区域", "直接反应来源（最多6条）"],
            rows,
            [f"# {report_name}", "", "> 仅用于确定后续精读优先级，不代表所有列入者的主要主诉都在该区域。"],
        )

    coverage_rows = [
        [item["file"], item["kind"], item["lines"], item["sessions"], item["unassigned_blocks"], item["uncovered_nonempty_lines"], item["sha256"][:12]]
        for item in manifest
    ]
    write_markdown_table(
        review_dir / "来源覆盖报告.md",
        ["原文件", "类型", "行数", "患者记录段", "非患者/未归属块", "未覆盖非空行", "SHA256"],
        coverage_rows,
        ["# 来源覆盖报告", "", f"共读取 {len(files)} 份原始 TXT。"],
    )

    high_value_rows = []
    evidence_rows = []
    evidence_records = []
    for session in sessions:
        for item in session.categories.get("反应与复测", []):
            evidence_type = classify_response_evidence(item["text"])
            high_value_rows.append(
                [
                    patient_id(session.patient_name),
                    session.patient_name,
                    session.date or session.date_raw or "日期未单独记录",
                    f"{session.source_file}:L{item['line']}",
                    item["text"],
                ]
            )
            if evidence_type != "context-only-or-needs-review":
                evidence_rows.append(
                    [
                        evidence_type,
                        patient_id(session.patient_name),
                        session.patient_name,
                        session.date or session.date_raw or "日期未单独记录",
                        f"{session.source_file}:L{item['line']}",
                        item["text"],
                    ]
                )
                evidence_records.append(
                    {
                        "evidence_type": evidence_type,
                        "patient_id": patient_id(session.patient_name),
                        "patient_name": session.patient_name,
                        "date": session.date,
                        "date_raw": session.date_raw,
                        "source_file": session.source_file,
                        "line": item["line"],
                        "text": item["text"],
                        "regions": session.regions,
                        "line_regions": sorted(detect_regions(item["text"])),
                    }
                )
    write_markdown_table(
        review_dir / "处理复测候选索引.md",
        ["患者ID", "患者", "日期", "来源", "反应原文"],
        high_value_rows,
        ["# 处理—复测候选索引", "", "> 这是关键词召回结果，需逐条人工判断是否真的存在处理前后闭环。"],
    )
    write_markdown_table(
        review_dir / "直接反应证据初筛.md",
        ["初筛类型", "患者ID", "患者", "日期", "来源", "原文"],
        evidence_rows,
        ["# 直接反应证据初筛", "", "> 已排除只含一般症状词的多数文本，但仍需人工判断主要目标、配合处理和真实复测对象。"],
    )
    with (db_dir / "response_evidence.jsonl").open("w", encoding="utf-8") as fh:
        for record in evidence_records:
            fh.write(json.dumps(record, ensure_ascii=False) + "\n")
    for report_name, report_regions in (("膝直接反应证据", {"膝"}), ("踝足直接反应证据", {"踝", "足", "小腿"})):
        rows = []
        for record in evidence_records:
            if not report_regions.intersection(record["line_regions"]):
                continue
            rows.append(
                [
                    record["evidence_type"],
                    record["patient_name"],
                    record["date"] or record["date_raw"] or "日期未单独记录",
                    f"{record['source_file']}:L{record['line']}",
                    record["text"],
                ]
            )
        write_markdown_table(
            analysis_dir / f"{report_name}.md",
            ["初筛类型", "患者", "日期", "来源", "原文"],
            rows,
            [f"# {report_name}", "", "> 仅依据该记录段涉及区域筛选，需人工确认这条反应是否确实针对该区域。"],
        )

    unassigned_lines = [
        "# 待确认归属",
        "",
        "> 以下内容已读取但没有可靠识别到患者，不能静默丢弃，也不能强行合并。",
        "",
    ]
    for item in unassigned:
        unassigned_lines += [
            f"## {item['source_file']}:{item['line_start']}-{item['line_end']}",
            "",
            f"- 原因：{item['reason']}",
            "",
            "```text",
            item["text"],
            "```",
            "",
        ]
    (review_dir / "待确认归属.md").write_text("\n".join(unassigned_lines), encoding="utf-8")

    alias_rows = []
    patient_names = sorted(by_patient)
    for idx, left in enumerate(patient_names):
        if left.startswith("匿名患者@") or "/" in left:
            continue
        for right in patient_names[idx + 1 :]:
            if right.startswith("匿名患者@") or "/" in right:
                continue
            normalized_left = re.sub(r"(老公|老婆|妈妈|婆婆|外婆|阿姨|姐妹|朋友)$", "", left)
            normalized_right = re.sub(r"(老公|老婆|妈妈|婆婆|外婆|阿姨|姐妹|朋友)$", "", right)
            relation_variant = normalized_left == normalized_right and left != right
            typo_variant = (
                len(left) == len(right)
                and 2 <= len(left) <= 4
                and left[0] == right[0]
                and edit_distance(left, right) == 1
            )
            if relation_variant or typo_variant:
                alias_rows.append(
                    [
                        left,
                        right,
                        "亲属/称呼后缀相同，不应自动合并" if relation_variant else "疑似一字误差，需对照日期与症状",
                        len(by_patient[left]),
                        len(by_patient[right]),
                    ]
                )
    write_markdown_table(
        review_dir / "疑似同名或别名.md",
        ["名称A", "名称B", "原因", "A记录段", "B记录段"],
        alias_rows,
        ["# 疑似同名或别名", "", "> 本表只提示，不自动合并。亲属称呼通常代表不同患者。"],
    )

    for note in knowledge_notes:
        target = knowledge_dir / f"{safe_filename(Path(note['source_file']).stem)}.md"
        target.write_text(f"# {Path(note['source_file']).stem}\n\n- 原始来源：`{note['source_file']}`\n\n```text\n{note['text'].rstrip()}\n```\n", encoding="utf-8")

    duplicate_groups: dict[str, list[str]] = defaultdict(list)
    for item in manifest:
        duplicate_groups[item["sha256"]].append(item["file"])
    duplicates = [names for names in duplicate_groups.values() if len(names) > 1]

    source_line_sets: dict[str, set[str]] = {}
    for path in files:
        source_line_sets[path.name] = {
            re.sub(r"\s+", "", line)
            for line in path.read_text(encoding="utf-8").splitlines()
            if re.sub(r"\s+", "", line) and "治疗记录" not in line
        }
    near_duplicate_rows = []
    for index, left in enumerate(files):
        for right in files[index + 1 :]:
            left_lines, right_lines = source_line_sets[left.name], source_line_sets[right.name]
            if min(len(left_lines), len(right_lines)) < 5:
                continue
            overlap = len(left_lines.intersection(right_lines))
            containment = overlap / min(len(left_lines), len(right_lines))
            if overlap >= 5 and containment >= 0.8:
                near_duplicate_rows.append([left.name, right.name, f"{containment:.0%}", overlap, len(left_lines), len(right_lines)])
    write_markdown_table(
        review_dir / "疑似重复来源文件.md",
        ["文件A", "文件B", "较短文件被覆盖比例", "相同行", "A有效行", "B有效行"],
        near_duplicate_rows,
        ["# 已确认重复来源文件", "", "> 以下来源已获资料所有者确认。保留全部原文件；同一患者且记录段高度重合时，在会话层合并为一次，并保留全部来源引用。"],
    )

    stats = {
        "source_files": len(files),
        "manifest_files": len(manifest),
        "patient_entities": len(by_patient),
        "session_blocks": len(sessions),
        "deduplicated_episodes": len(episodes),
        "unassigned_blocks": len(unassigned),
        "knowledge_notes": len(knowledge_notes),
        "response_candidate_lines": len(high_value_rows),
        "direct_response_screened_lines": len(evidence_rows),
        "duplicate_file_groups": duplicates,
        "near_duplicate_file_pairs": len(near_duplicate_rows),
        "files_with_uncovered_lines": len(uncovered_records),
        "uncovered_nonempty_lines": sum(len(item["lines"]) for item in uncovered_records),
        "patient_confidence": Counter(session.patient_confidence for session in sessions),
        "source_kinds": Counter(item["kind"] for item in manifest),
    }
    stats["patient_confidence"] = dict(stats["patient_confidence"])
    stats["source_kinds"] = dict(stats["source_kinds"])
    (db_dir / "stats.json").write_text(json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8")

    corpus_text = "\n".join(line for session in sessions for line in session.raw_lines)
    corpus_symptoms = count_terms(corpus_text, SYMPTOM_TERMS)
    corpus_functions = count_terms(corpus_text, FUNCTION_TERMS)
    corpus_targets = count_terms(corpus_text, TREATMENT_TARGET_TERMS)
    corpus_exercises = count_terms(corpus_text, EXERCISE_TERMS)
    longitudinal_patients = sum(1 for person_sessions in by_patient.values() if len(person_sessions) >= 3)
    analysis_lines = [
        "# 全量原始资料分析",
        "",
        "## 数据规模",
        "",
        f"- 原始TXT：{len(files)}份",
        f"- 患者/匿名实体：{len(by_patient)}个",
        f"- 患者记录段：{len(sessions)}段",
        f"- 去重后会话：{len(episodes)}次",
        f"- 至少3段记录的纵向患者：{longitudinal_patients}个",
        f"- 处理—复测关键词候选：{len(high_value_rows)}条",
        f"- 直接反应证据初筛：{len(evidence_rows)}条",
        f"- 归属或非患者内容待确认：{len(unassigned)}块",
        "",
        "## 原文中高频内容",
        "",
        f"- 症状词：{'、'.join(f'{term}×{count}' for term, count in corpus_symptoms.most_common(15))}",
        f"- 功能任务：{'、'.join(f'{term}×{count}' for term, count in corpus_functions.most_common(15))}",
        f"- 处理目标：{'、'.join(f'{term}×{count}' for term, count in corpus_targets.most_common(20))}",
        f"- 训练动作：{'、'.join(f'{term}×{count}' for term, count in corpus_exercises.most_common(20))}",
        "",
        "> 高频只说明记录习惯和出现次数，不能直接转换成产品优先级或有效性排名。",
        "",
        "## 当前资料的主要优势",
        "",
        "- 存在大量按日期连续记录，可观察症状、负荷、处理与训练的变化；",
        "- 多份记录包含按住、屏蔽、促进、松解或关节调整后的即时反应；",
        "- 资料覆盖主诉、评估、手法、训练和随访，而不只是动作清单；",
        "- 同一患者常出现多个区域和新问题，适合建立多问题而非单关节固定流程。",
        "",
        "## 需要谨慎的地方",
        "",
        "- 一条记录常连续写多项处理，主要目标与配合处理未必明确；",
        "- 大量内容没有统一疼痛分数、活动范围或标准复测；",
        "- 部分治疗者解释写得很确定，但实际只属于当时假设；",
        "- 个别同名、错别字、亲属称呼和匿名评估需要人工确认；",
        "- 反馈文件没有写年份，数据库保持原样，不自行补年份；",
        "- 非患者知识、治疗复盘和管理信息已从患者记录中分离。",
    ]
    (analysis_dir / "全量原始资料分析.md").write_text("\n".join(analysis_lines) + "\n", encoding="utf-8")

    readme = f"""# GPT康复记录整理

本数据库只使用原始目录：`{source}`。

## 当前覆盖

- 原始TXT：{len(files)}份
- 识别患者/匿名实体：{len(by_patient)}个
- 患者记录段：{len(sessions)}段
- 按同一患者、同一天和高文本重合去重后的会话：{len(episodes)}次
- 未可靠归属内容：{len(unassigned)}块
- 处理—复测关键词候选：{len(high_value_rows)}条
- 直接反应证据初筛：{len(evidence_rows)}条

## 目录

- [患者索引](./患者索引.md)
- `患者/`：按患者聚合的原文、来源行和自动分类
- `数据库/sessions.jsonl`：逐记录段结构化数据
- `数据库/episodes.json`：同一会话在反馈文件与个人记录中重复出现时的来源归并层
- `数据库/patients.json`、`patients.csv`：患者级索引
- `数据库/patient_aliases.json`：已确认姓名别名到统一姓名的映射
- [全量原始资料分析](./分析/全量原始资料分析.md)
- [区域覆盖矩阵](./分析/区域覆盖矩阵.md)
- [膝相关患者](./分析/膝相关患者.md)
- [踝足相关患者](./分析/踝足相关患者.md)
- [膝直接反应证据](./分析/膝直接反应证据.md)
- [踝足直接反应证据](./分析/踝足直接反应证据.md)
- [来源覆盖报告](./审核/来源覆盖报告.md)
- [处理—复测候选索引](./审核/处理复测候选索引.md)
- [直接反应证据初筛](./审核/直接反应证据初筛.md)
- [待确认归属](./审核/待确认归属.md)
- [疑似同名或别名](./审核/疑似同名或别名.md)
- [疑似重复来源文件](./审核/疑似重复来源文件.md)
- [首轮人工复核结论](./人工审核/首轮人工复核结论.md)
- [患者归并建议](./人工审核/患者归并建议.md)
- [膝关节直接反应人工审核](./人工审核/膝关节直接反应人工审核.md)
- [踝足直接反应人工审核](./人工审核/踝足直接反应人工审核.md)
- [线下记录转产品指导规则](./人工审核/线下记录转产品指导规则.md)
- [线下即时调整术语确认](./人工审核/线下即时调整术语确认.md)
- [第一阶段：膝与踝足问题库](./产品规则/01-问题库/README.md)
- `知识笔记/`：不属于具体患者的规则或学习材料

## 使用边界

- 自动分类只用于检索，不代表临床诊断或有效性结论；
- 原始记录中“可能、应该是、怀疑”等内容仍属于治疗者假设；
- 一串处理后的改善不能自动归因给每一项；
- 患者归属不确定的内容保留待确认，不强行合并；
- 后续人工精读结果继续写入审核层，不改写原文层。
"""
    (output / "README.md").write_text(readme, encoding="utf-8")
    print(json.dumps(stats, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
