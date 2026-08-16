#!/usr/bin/env python3
"""Build user-facing knee and ankle/foot problem libraries from the raw-record DB.

This script only catalogs reported problems. It does not infer diagnoses,
assessment findings, or treatments from a symptom phrase.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Any


SYMPTOM_SIGNALS = (
    "疼", "痛", "不舒服", "不适", "酸", "胀", "紧", "牵扯", "拉扯", "刺",
    "麻", "电", "烧灼", "肿", "弹响", "响", "刮擦", "卡", "无力", "不稳",
    "受限", "活动差", "角度差", "做不到", "踩不下", "发不上力",
)

HYPOTHESIS_SIGNALS = ("应该是", "猜测", "怀疑", "考虑", "可能是", "说明是", "导致", "引起的")
TREATMENT_SIGNALS = (
    "松解", "松动", "激活", "处理", "超声", "理疗", "电疗", "按摩", "筋膜刀",
    "治疗后", "训练后", "如果目标", "可以先只",
)


COMMON_DIMENSIONS: list[dict[str, Any]] = [
    {
        "id": "side",
        "label": "哪一侧",
        "input": "single-choice",
        "options": ["左侧", "右侧", "双侧", "说不清"],
    },
    {
        "id": "severity",
        "label": "现在有多不舒服",
        "input": "vas-0-10",
        "options": ["0：没有不适", "1—3：轻微", "4—6：中等", "7—9：明显影响活动", "10：难以忍受"],
    },
    {
        "id": "time_course",
        "label": "什么时候开始的",
        "input": "single-choice-plus-text",
        "options": ["今天或昨天", "2—7天", "1—4周", "1个月以上", "反复出现", "记不清"],
    },
    {
        "id": "unknown_policy",
        "label": "暂时说不清的信息",
        "input": "system-rule",
        "options": ["允许选择不知道", "允许稍后补充", "不因不知道而结束流程"],
    },
]

SYMPTOM_COLLECTION = [
    {
        "question": "现在最接近哪种感觉",
        "input": "multi-choice-plus-text",
        "options": ["疼痛", "酸或发胀", "紧、扯或拉伸感", "挤压、顶住或卡住", "麻、电感或烧灼", "无力或不稳", "弹响或刮擦", "其他感觉", "说不清"],
    },
    {
        "when": "选择疼痛后再问",
        "question": "这种疼更接近哪一种",
        "input": "single-choice-plus-text",
        "options": ["酸痛或钝痛", "刺痛或某一下很尖锐", "胀痛或跳痛", "按压时痛", "发力时痛", "说不清"],
    },
    {
        "question": "现在能看到或摸到什么变化",
        "input": "multi-choice",
        "options": ["肿胀", "淤青或淤血", "局部发热", "颜色与另一侧不同", "触觉或感觉改变", "没有这些变化", "不确定"],
    },
]


KNEE_DEFINITION: dict[str, Any] = {
    "id": "knee",
    "name": "膝部问题库",
    "scope_anchors": ["膝", "髌", "腘窝", "鹅足"],
    "location_collection": [
        {
            "question": "先选最接近的位置",
            "options": ["膝盖前面", "膝盖内侧", "膝盖外侧", "膝盖后面", "膝内较深的位置", "说不清"],
        },
        {
            "when": "选择膝盖前面后再问",
            "question": "前面的哪个位置最明显",
            "options": ["髌骨上方", "髌骨周围", "髌骨下方或髌腱", "说不清"],
        },
        {
            "when": "选择膝盖内侧或外侧后再问",
            "question": "更接近关节缝，还是偏上或偏下",
            "options": ["关节缝附近", "偏上", "偏下", "范围比较大", "说不清"],
        },
        {
            "when": "选择膝盖后面后再问",
            "question": "后面的哪个位置最明显",
            "options": ["正后方腘窝", "后内侧", "后外侧", "说不清"],
        },
    ],
    "click_map": {
        "interaction_modes": [
            {"id": "localized", "label": "能用一两根手指指出", "behavior": "点击一个或多个局部区域"},
            {"id": "regional", "label": "需要用手掌覆盖一片", "behavior": "拖动或连续选择相邻区域"},
            {"id": "diffuse", "label": "整个膝盖都不舒服", "behavior": "选择整膝范围"},
            {"id": "unknown", "label": "说不清位置", "behavior": "保留位置未知"},
        ],
        "views": [
            {
                "id": "anterior",
                "label": "膝盖前面",
                "zones": [
                    {"id": "knee-anterior-superior", "label": "髌骨上方", "group": "anterior"},
                    {"id": "knee-patellar", "label": "髌骨正前方或周围", "group": "anterior"},
                    {"id": "knee-anterior-inferior", "label": "髌骨下方或髌腱", "group": "anterior"},
                    {"id": "knee-superomedial", "label": "前内侧偏上", "group": "medial"},
                    {"id": "knee-medial-joint-line", "label": "内侧关节缝", "group": "medial"},
                    {"id": "knee-inferomedial", "label": "内侧偏下或鹅足附近", "group": "medial"},
                    {"id": "knee-superolateral", "label": "前外侧偏上", "group": "lateral"},
                    {"id": "knee-lateral-joint-line", "label": "外侧关节缝", "group": "lateral"},
                    {"id": "knee-inferolateral", "label": "外侧偏下或腓骨头附近", "group": "lateral"},
                    {"id": "knee-deep", "label": "膝内较深的位置", "group": "deep"},
                ],
            },
            {
                "id": "posterior",
                "label": "膝盖后面",
                "zones": [
                    {"id": "knee-posterior-central", "label": "正后方腘窝", "group": "posterior"},
                    {"id": "knee-posteromedial", "label": "后内侧", "group": "posterior"},
                    {"id": "knee-posterolateral", "label": "后外侧", "group": "posterior"},
                    {"id": "knee-upper-calf", "label": "膝后下方或小腿上端", "group": "posterior"},
                ],
            },
        ],
        "mobile_rules": {
            "preferred_orientation": "portrait",
            "target_size": "主要触控区域至少44×44 CSS px；相邻区域无法满足时先放大或改用文字候选",
            "flow": ["选择侧别和大区域", "局部图自动放大", "点选一个区域", "显示区域名称并确认", "可继续添加相邻或其他区域"],
            "alternatives": ["文字区域列表", "说不清位置", "整个膝盖", "位置较深"],
            "error_controls": ["点击后不自动进入下一页", "始终显示撤销", "边界点击时显示2—3个候选", "继续前显示已选位置摘要"],
        },
    },
    "locations": [
        ("knee-unsure", "暂时说不清具体位置", []),
        ("knee-general", "整个膝盖或膝内较深的位置", ["膝盖", "膝关节"]),
        ("knee-front", "膝盖前面", ["膝前", "髌骨", "髌腱", "脂肪垫"]),
        ("knee-patella", "髌骨正前方或周围", ["髌骨周围", "髌骨前", "髌骨疼"]),
        ("knee-above", "膝盖上方", ["膝上", "膝盖上", "髌骨上缘"]),
        ("knee-below", "膝盖下方", ["膝下", "膝盖下", "髌骨下", "髌腱"]),
        ("knee-medial", "膝盖内侧", ["膝内侧", "膝盖内侧", "髌骨内侧", "鹅足"]),
        ("knee-medial-lower", "膝内侧偏下或鹅足附近", ["鹅足", "膝内侧下", "内侧偏下"]),
        ("knee-lateral", "膝盖外侧", ["膝外侧", "膝盖外侧", "髌骨外侧"]),
        ("knee-lateral-lower", "膝外侧偏下或腓骨头附近", ["膝外侧下", "外侧偏下", "腓骨头"]),
        ("knee-posterior", "膝盖后面或腘窝", ["膝后", "膝盖后", "腘窝"]),
    ],
    "qualities": [
        ("pain", "疼痛，但暂时说不清性质", ["疼", "痛"]),
        ("sore", "酸或酸痛", ["酸", "酸痛"]),
        ("dull", "钝痛、沉痛或隐隐作痛", ["钝痛", "沉痛", "隐痛", "隐隐作痛"]),
        ("swollen-feeling", "发胀或胀痛", ["胀", "胀痛"]),
        ("throbbing", "跳痛或搏动感", ["跳痛", "搏动"]),
        ("pulling", "紧、牵扯或拉扯", ["紧", "牵扯", "拉扯", "扯感"]),
        ("pressure", "挤压、夹住、顶住或压迫感", ["挤", "夹", "顶住", "压迫"]),
        ("stiff", "僵硬、活动不开或发僵", ["僵硬", "发僵", "活动不开"]),
        ("sharp", "刺痛或某一下很尖锐", ["刺痛", "针刺", "锐痛"]),
        ("numb-electric", "麻、电感或烧灼感", ["麻", "电感", "烧灼"]),
        ("click-catch", "弹响、刮擦或卡住", ["弹响", "刮擦", "卡住", "卡顿", "响"]),
        ("unstable", "发软、打晃或不稳", ["不稳", "发软", "打软腿", "打晃"]),
        ("weak", "无力或发不上力", ["无力", "发不上力", "力量差"]),
        ("fatigue", "容易累或很快就撑不住", ["容易累", "很快累", "撑不住", "疲劳"]),
        ("cramp", "抽筋或痉挛", ["抽筋", "痉挛"]),
        ("swelling", "看得见或摸得到的肿胀", ["肿胀", "肿起来", "积液"]),
        ("quality-unknown", "说不清是什么感觉", []),
    ],
    "observations": [
        ("visible-swelling", "肿胀", ["肿胀", "肿起来", "积液"]),
        ("bruising", "淤青或淤血", ["淤青", "淤血", "瘀青", "瘀血"]),
        ("warmth", "局部发热或比另一侧热", ["发热", "温度高", "更热"]),
        ("color-change", "颜色与另一侧不同", ["颜色异常", "发白", "发紫", "发红"]),
        ("sensation-change", "触觉或感觉与另一侧不同", ["感觉减退", "感觉异常", "触觉", "麻木"]),
        ("observation-none", "没有看到这些变化", []),
        ("observation-unknown", "不确定", []),
    ],
    "triggers": [
        ("walk", "走路", ["走路", "步行"]),
        ("stairs-up", "上楼或向上登台阶", ["上楼", "登阶", "上台阶"]),
        ("stairs-down", "下楼或下台阶", ["下楼", "下台阶"]),
        ("squat", "下蹲或蹲起", ["下蹲", "深蹲", "蹲起", "滑蹲"]),
        ("sit-to-stand", "坐下或起身", ["坐站", "起身", "坐下"]),
        ("bend-knee", "弯曲膝盖", ["屈膝", "弯膝", "膝盖弯"]),
        ("straighten-knee", "伸直膝盖或绷紧大腿", ["伸膝", "膝盖伸直", "绷直"]),
        ("weight-bearing", "单腿或双腿承重", ["承重", "负重", "单腿站", "支撑"]),
        ("run", "跑步", ["跑步", "跑起来"]),
        ("jump-land", "跳跃或落地", ["跳跃", "跳起", "侧跳", "跳时", "落地时", "跳下"]),
        ("long-sitting", "久坐或膝盖弯久后", ["久坐", "长时间屈曲", "弯久"]),
        ("kneel", "跪地或膝盖接触地面", ["跪", "膝盖着地"]),
        ("training-motion", "做某个训练动作时", ["臀桥", "鸟狗", "弓箭步", "分腿蹲"]),
        ("trigger-unknown", "目前找不到固定诱发动作", []),
    ],
    "motion_problems": [
        ("knee-flexion-small", "膝盖弯曲范围比另一侧小", ["屈膝受限", "屈曲受限", "屈膝角度", "屈曲角度"]),
        ("knee-extension-small", "膝盖伸直范围比另一侧小", ["伸膝受限", "伸直受限", "伸膝角度"]),
        ("knee-motion-pain", "膝盖活动范围可以，但活动时会不舒服", ["屈膝疼", "伸膝疼", "活动时疼"]),
        ("knee-motion-unable", "因为疼痛或肿胀暂时不敢活动", ["无法屈膝", "无法伸膝", "不敢动", "肿胀明显"]),
        ("knee-motion-unknown", "还没有比较过活动范围", []),
    ],
    "strength_control_problems": [
        ("knee-extension-weak", "伸直膝盖或绷紧大腿时力量较弱", ["伸膝无力", "股四头肌无力", "绷直无力"]),
        ("knee-flexion-weak", "弯曲膝盖时力量较弱", ["屈膝无力", "腘绳肌无力"]),
        ("single-leg-control", "单腿支撑、下蹲或落地时控制不稳", ["单腿不稳", "膝内扣", "落地不稳", "支撑不稳"]),
        ("strength-pain", "发力时会引起膝部症状", ["发力疼", "用力疼", "绷直疼"]),
        ("strength-unknown", "还没有比较过双侧发力", []),
    ],
    "mechanisms": [
        ("knee-twist", "扭到或膝盖突然内扣/外翻", ["扭伤", "扭到", "别到", "突然外翻", "突然内扣"]),
        ("knee-impact", "摔倒、撞击或膝盖着地", ["摔", "撞", "磕", "着地"]),
        ("knee-sport", "跑跳、球类或其他运动时出现", ["跑步", "跳", "羽毛球", "篮球", "足球", "冲浪"]),
        ("knee-overuse", "活动量增加后逐渐出现", ["走多", "跑多", "训练后", "活动量"]),
        ("knee-postop", "手术或固定后", ["术后", "手术", "固定"]),
        ("knee-no-clear-event", "没有明确受伤经过", ["没有受伤", "不清楚", "慢慢"]),
        ("mechanism-unknown", "记不清或不知道怎么出现的", []),
    ],
}


ANKLE_FOOT_DEFINITION: dict[str, Any] = {
    "id": "ankle-foot-calf",
    "name": "踝足与小腿问题库",
    "scope_anchors": ["踝", "脚", "足", "跟腱", "小腿", "腓骨", "距骨", "足舟骨", "骰骨"],
    "location_collection": [
        {
            "question": "先选大致区域",
            "options": ["脚踝", "小腿", "脚底或脚跟", "脚背", "前脚掌或脚趾", "跟腱", "不止一个位置", "说不清"],
        },
        {
            "when": "选择脚踝或小腿后再问",
            "question": "更接近哪一面",
            "options": ["前面", "内侧", "外侧", "后面", "说不清"],
        },
        {
            "when": "选择脚底、脚跟、脚背或前脚掌后再问",
            "question": "再选最接近的小区域",
            "options": ["脚跟底部", "脚跟后方", "足弓内侧", "脚底中间", "脚底外侧", "脚背", "前脚掌", "大拇趾", "其他脚趾", "说不清"],
        },
    ],
    "locations": [
        ("lower-leg-unsure", "暂时说不清具体位置", []),
        ("ankle-general", "整个脚踝或踝关节较深的位置", ["脚踝", "踝关节"]),
        ("ankle-front", "脚踝前面", ["踝前", "脚踝前", "踝关节前"]),
        ("ankle-medial", "脚踝内侧", ["踝内侧", "脚踝内侧", "内踝"]),
        ("ankle-lateral", "脚踝外侧", ["踝外侧", "脚踝外侧", "外踝"]),
        ("ankle-posterior", "脚踝后面", ["踝后", "脚踝后", "踝后侧"]),
        ("achilles", "跟腱或跟腱连接脚跟的位置", ["跟腱"]),
        ("heel", "脚跟或足跟", ["脚跟", "足跟"]),
        ("plantar", "脚底或足底", ["脚底", "足底"]),
        ("plantar-medial", "脚底内侧或内侧足弓", ["足底内侧", "脚底内侧", "内侧足弓"]),
        ("plantar-lateral", "脚底外侧", ["足底外侧", "脚底外侧"]),
        ("arch", "足弓", ["足弓"]),
        ("dorsum", "脚背", ["脚背", "足背"]),
        ("forefoot-toes", "前脚掌、大拇趾或其他脚趾", ["前脚掌", "大拇指", "大拇趾", "脚趾", "足趾"]),
        ("calf-front", "小腿前面", ["小腿前侧", "胫骨前"]),
        ("calf-medial", "小腿内侧", ["小腿内侧"]),
        ("calf-lateral", "小腿外侧", ["小腿外侧", "腓骨外侧"]),
        ("calf-posterior", "小腿后面", ["小腿后侧", "小腿三头肌", "腓肠肌", "比目鱼肌"]),
    ],
    "qualities": KNEE_DEFINITION["qualities"],
    "observations": KNEE_DEFINITION["observations"],
    "triggers": [
        ("walk", "走路或脚落地承重", ["走路", "步行", "承重", "负重"]),
        ("first-step", "起床后或休息后的前几步", ["第一步", "刚下床", "早上下床", "起床后"]),
        ("stairs", "上下楼或台阶", ["上楼", "下楼", "台阶", "登阶"]),
        ("squat-dorsiflex", "下蹲、弓步或膝盖向前时", ["下蹲", "深蹲", "弓步", "膝盖向前"]),
        ("dorsiflex", "勾脚或脚踝向上活动", ["勾脚", "背屈"]),
        ("plantarflex", "绷脚、踮脚或提踵", ["绷脚", "跖屈", "踮脚", "提踵"]),
        ("invert", "脚底向内翻", ["内翻"]),
        ("evert", "脚底向外翻", ["外翻"]),
        ("toe-motion", "活动脚趾或大拇趾", ["脚趾", "足趾", "大拇指", "大拇趾"]),
        ("single-leg-balance", "单腿站立或保持平衡", ["单腿站", "单腿支撑", "平衡"]),
        ("run", "跑步", ["跑步", "跑起来"]),
        ("jump-land", "跳跃或落地", ["跳跃", "跳起", "落地时", "跳下"]),
        ("shoe", "穿鞋、鞋垫或鞋子挤压时", ["穿鞋", "鞋垫", "鞋子"]),
        ("prolonged-position", "久坐、久站或保持一个姿势后", ["久坐", "久站", "坐着", "长时间"]),
        ("trigger-unknown", "目前找不到固定诱发动作", []),
    ],
    "motion_problems": [
        ("dorsiflex-small", "勾脚范围比另一侧小", ["背屈受限", "背屈角度", "勾脚受限"]),
        ("plantarflex-small", "绷脚范围比另一侧小", ["跖屈受限", "跖屈角度", "绷脚受限"]),
        ("invert-small", "脚底向内翻的范围比另一侧小", ["内翻受限", "内翻角度"]),
        ("evert-small", "脚底向外翻的范围比另一侧小", ["外翻受限", "外翻角度"]),
        ("toe-motion-small", "脚趾或大拇趾活动范围较小", ["足趾受限", "脚趾受限", "大拇指踩不下", "大拇趾受限"]),
        ("ankle-motion-pain", "活动范围可以，但活动时会不舒服", ["背屈疼", "跖屈疼", "内翻疼", "外翻疼", "勾脚疼"]),
        ("ankle-motion-unable", "因为疼痛或肿胀暂时不敢活动", ["不敢动", "无法背屈", "无法走路", "肿胀明显"]),
        ("ankle-motion-unknown", "还没有比较过四个方向", []),
    ],
    "strength_control_problems": [
        ("dorsiflex-control", "勾脚或抬起前脚掌时力量较弱", ["背屈无力", "胫骨前肌无力", "抬脚无力"]),
        ("plantarflex-control", "踮脚、提踵或走路蹬地时力量较弱", ["跖屈无力", "提踵无力", "蹬地无力"]),
        ("invert-control", "脚底向内翻时力量或控制较弱", ["内翻无力", "胫骨后肌无力"]),
        ("evert-control", "脚底向外翻时力量或控制较弱", ["外翻无力", "腓骨肌无力"]),
        ("arch-toe-control", "足弓或脚趾抓地控制较弱", ["足弓塌", "抓地无力", "大拇指踩不下"]),
        ("balance-control", "单腿站立、走路或落地时不稳", ["单腿不稳", "平衡差", "落地不稳", "走路不稳"]),
        ("strength-pain", "脚踝或小腿发力时会引起症状", ["发力疼", "提踵疼", "蹬地疼"]),
        ("strength-unknown", "还没有比较过双侧发力", []),
    ],
    "mechanisms": [
        ("ankle-sprain", "崴脚或脚踝扭伤", ["崴脚", "扭伤", "扭到"]),
        ("ankle-impact", "摔倒、撞击、踩空或落地", ["摔", "撞", "踩空", "落地"]),
        ("ankle-pull", "跑跳、冲刺或发力时拉伤", ["拉伤", "冲刺", "起跳", "蹬地"]),
        ("ankle-sport", "跑步、球类或其他运动时出现", ["跑步", "羽毛球", "篮球", "足球", "运动时"]),
        ("ankle-overuse", "走路、站立或训练量增加后逐渐出现", ["走多", "站久", "训练后", "活动量"]),
        ("ankle-postop", "手术、石膏或支具固定后", ["术后", "手术", "石膏", "支具固定", "拆石膏"]),
        ("ankle-no-clear-event", "没有明确受伤经过", ["没有受伤", "不清楚", "慢慢"]),
        ("mechanism-unknown", "记不清或不知道怎么出现的", []),
    ],
}


def normalized(text: str) -> str:
    return re.sub(r"\s+", "", text)


def build_evidence_rows(sessions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[tuple[str, str, str], dict[str, Any]] = {}
    for session in sessions:
        date = session.get("date") or session.get("date_raw") or "日期未统一记录"
        for offset, raw in enumerate(session.get("raw_lines", [])):
            full_line = raw.strip()
            if not full_line:
                continue
            # A single record line frequently contains several body regions.
            # Count only terms that share the same clause with the body anchor;
            # otherwise ankle mechanisms can be incorrectly assigned to a knee
            # symptom mentioned elsewhere on the line.
            fragments = [part.strip() for part in re.split(r"[，,。；;]", full_line) if part.strip()]
            for text in fragments:
                key = (session["patient_name"], date, normalized(text))
                record = grouped.setdefault(
                    key,
                    {
                        "patient_id": session["patient_name"],
                        "patient_name": session["patient_name"],
                        "date": date,
                        "text": text,
                        "full_line": full_line,
                        "source_refs": [],
                    },
                )
                ref = f"{session['source_file']}:L{session['line_start'] + offset + 1}"
                if ref not in record["source_refs"]:
                    record["source_refs"].append(ref)
    return list(grouped.values())


def has_any(text: str, words: list[str] | tuple[str, ...]) -> bool:
    return any(word in text for word in words)


def entry_evidence(
    rows: list[dict[str, Any]],
    scope_anchors: list[str],
    terms: list[str],
    *,
    require_symptom: bool,
    exclude_terms: tuple[str, ...] = (),
) -> dict[str, Any]:
    if not terms:
        return {"line_count": 0, "patient_count": 0, "examples": []}
    matches = []
    for row in rows:
        text = row["text"]
        if not has_any(text, scope_anchors) or not has_any(text, terms):
            continue
        if exclude_terms and has_any(text, exclude_terms):
            continue
        if require_symptom and not has_any(text, SYMPTOM_SIGNALS):
            continue
        if require_symptom and has_any(text, HYPOTHESIS_SIGNALS):
            continue
        if require_symptom and has_any(text, TREATMENT_SIGNALS):
            continue
        matches.append(row)
    examples = [
        {
            "patient": row["patient_name"],
            "date": row["date"],
            "source": row["source_refs"][0],
            "text": row["text"][:220],
        }
        for row in matches[:3]
    ]
    return {
        "line_count": len(matches),
        "patient_count": len({row["patient_name"] for row in matches}),
        "examples": examples,
    }


def build_section(
    definition: dict[str, Any],
    rows: list[dict[str, Any]],
    key: str,
    *,
    require_symptom: bool,
) -> list[dict[str, Any]]:
    result = []
    for entry_id, label, terms in definition[key]:
        exclude_terms: tuple[str, ...] = ()
        if entry_id == "knee-general":
            exclude_terms = ("膝前", "髌", "膝上", "膝下", "膝内侧", "膝外侧", "膝后", "腘窝", "鹅足")
        elif entry_id == "knee-front":
            exclude_terms = ("髌骨上缘", "髌骨上方", "髌骨下", "髌腱", "膝盖上", "膝盖下")
        elif entry_id == "ankle-general":
            exclude_terms = ("踝前", "踝内侧", "踝外侧", "踝后", "内踝", "外踝", "跟腱")
        elif entry_id == "click-catch":
            exclude_terms = ("腓骨卡住", "骰骨卡住", "距骨卡住", "足舟骨卡住", "关节卡住")
        result.append(
            {
                "id": entry_id,
                "label": label,
                "source_terms": terms,
                "evidence": entry_evidence(
                    rows,
                    definition["scope_anchors"],
                    terms,
                    require_symptom=require_symptom,
                    exclude_terms=exclude_terms,
                ),
            }
        )
    return result


def build_library(definition: dict[str, Any], rows: list[dict[str, Any]]) -> dict[str, Any]:
    scope_rows = [row for row in rows if has_any(row["text"], definition["scope_anchors"])]
    return {
        "version": "1.0",
        "module_id": definition["id"],
        "name": definition["name"],
        "purpose": "收集患者真正存在的问题；选项由原始资料、常见用户表达和产品设计共同补全，不推断诊断，不生成处理。",
        "design_basis": ["ai资料原始记录", "常见中文身体位置和症状表达", "资料所有者确认的线下流程", "允许后续继续扩展"],
        "source_summary": {
            "direct_scope_fragments": len(scope_rows),
            "patients": len({row["patient_name"] for row in scope_rows}),
            "counting_rule": "先按标点拆分同一行中的不同语义片段；同一患者、同一日期、相同片段只计一次；重复来源保留在source_refs。",
        },
        "collection_rules": [
            "位置、感觉、诱发动作均允许多选。",
            "主诉可以跨膝、踝、足底、脚背和小腿，不强迫归入单一关节。",
            "任何问题允许选择不知道；不知道不会结束流程，而是进入后续可完成的检查。",
            "用户自由描述与结构化选项同时保留，结构化结果不得覆盖原话。",
            "活动范围、活动时不适、发力强弱和发力时不适分开记录。",
        ],
        "location_collection": definition["location_collection"],
        "click_map": definition.get("click_map"),
        "symptom_collection": SYMPTOM_COLLECTION,
        "shared_dimensions": COMMON_DIMENSIONS,
        "locations": build_section(definition, rows, "locations", require_symptom=True),
        "qualities": build_section(definition, rows, "qualities", require_symptom=True),
        "observations": build_section(definition, rows, "observations", require_symptom=True),
        "triggers": build_section(definition, rows, "triggers", require_symptom=True),
        "motion_problems": build_section(definition, rows, "motion_problems", require_symptom=False),
        "strength_control_problems": build_section(definition, rows, "strength_control_problems", require_symptom=False),
        "mechanisms": build_section(definition, rows, "mechanisms", require_symptom=False),
    }


def markdown_table(headers: list[str], rows: list[list[Any]]) -> list[str]:
    output = ["| " + " | ".join(headers) + " |", "| " + " | ".join("---" for _ in headers) + " |"]
    for row in rows:
        output.append("| " + " | ".join(str(value).replace("|", "\\|").replace("\n", " ") for value in row) + " |")
    return output


def render_library(library: dict[str, Any]) -> str:
    lines = [
        f"# {library['name']}",
        "",
        "> 本问题库由线下原始记录、常见用户表达和产品设计共同补全。表中数量只表示原始资料覆盖；0条不代表该选项不需要。",
        "",
        "## 使用规则",
        "",
        *[f"- {rule}" for rule in library["collection_rules"]],
        "",
        "## 资料覆盖",
        "",
        f"- 直接涉及本区域的去重原文片段：{library['source_summary']['direct_scope_fragments']}条",
        f"- 涉及患者/匿名实体：{library['source_summary']['patients']}个",
        f"- 计数方法：{library['source_summary']['counting_rule']}",
        "",
        "## 位置怎么问",
        "",
    ]
    for step in library["location_collection"]:
        condition = f"（{step['when']}）" if step.get("when") else ""
        lines += [
            f"- **{step['question']}**{condition}：{'、'.join(step['options'])}",
        ]
    lines += [
        "",
        "> 页面不一次展示整张问题库，只展示当前所选区域对应的下一问。",
        "",
        "## 症状怎么问",
        "",
    ]
    for step in library["symptom_collection"]:
        condition = f"（{step['when']}）" if step.get("when") else ""
        lines += [f"- **{step['question']}**{condition}：{'、'.join(step['options'])}"]
    lines += [
        "",
        "> 用户可以补充自己的说法；结构化选项不要求逐字来自线下记录。",
        "",
    ]
    sections = [
        ("locations", "不舒服的位置"),
        ("qualities", "不舒服的感觉"),
        ("observations", "能看到或摸到的变化"),
        ("triggers", "什么动作或场景会出现"),
        ("motion_problems", "活动范围问题"),
        ("strength_control_problems", "发力和控制问题"),
        ("mechanisms", "怎么出现的"),
    ]
    for key, title in sections:
        lines += [f"## {title}", ""]
        table_rows = []
        for item in library[key]:
            examples = item["evidence"]["examples"]
            example = "—"
            if examples:
                first = examples[0]
                example = f"{first['source']}｜{first['text']}"
            table_rows.append([
                item["id"],
                item["label"],
                item["evidence"]["patient_count"],
                item["evidence"]["line_count"],
                example,
            ])
        lines += markdown_table(["ID", "用户能看懂的描述", "患者数", "原文片段", "来源示例"], table_rows)
        lines.append("")
    lines += [
        "## 本阶段不做的事情",
        "",
        "- 不根据疼痛位置直接判断某块肌肉或某个结构；",
        "- 不把活动受限自动解释成关节问题；",
        "- 不从处理频率推断治疗效果；",
        "- 不在问题收集阶段向用户展示检查、手法和训练。",
        "",
    ]
    return "\n".join(lines)


def render_readme(knee: dict[str, Any], ankle: dict[str, Any]) -> str:
    return f"""# 第一阶段：膝与踝足问题库

本目录完成产品建设的第一步：先定义系统能够接住哪些问题，不安排评估和处理。

## 当前模块

- [膝部问题库](./膝部问题库.md)
- [膝部点击区域设计](./膝部点击区域设计.md)
- [移动端人体定位交互规范](./移动端人体定位交互规范.md)
- [膝部点击区域视觉稿V2](./膝部点击区域视觉稿-v2.png)
- [踝足与小腿问题库](./踝足与小腿问题库.md)
- [位置与症状手动收集流程](./位置与症状手动收集流程.md)
- [问题库验收样例](./问题库验收样例.md)
- `knee-problem-library.json`：膝部机器可读规则
- `ankle-foot-problem-library.json`：踝足与小腿机器可读规则

## 当前覆盖

- 膝部直接相关去重原文片段：{knee['source_summary']['direct_scope_fragments']}条，涉及{knee['source_summary']['patients']}名患者/匿名实体；
- 踝足与小腿直接相关去重原文片段：{ankle['source_summary']['direct_scope_fragments']}条，涉及{ankle['source_summary']['patients']}名患者/匿名实体。

## 产品收集方式

1. 先让用户用自己的话描述发生经过和目前症状；
2. 当前不接入AI，用户手动选择侧别和大致区域；
3. 系统只展开所选区域的一层细分位置，不展示完整问题库；
4. 再选择最接近的感觉、可见变化和诱发动作；
5. 位置、动作和症状均可多选，“不知道”是有效答案；
6. 原话始终保留，结构化标签只是用于后续选择检查。

## 数据边界

资料中的原始词和来源示例只用于核对覆盖度，选项不受原始用词限制。问题库没有诊断结论，也没有把线下手法直接交给用户执行。
"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--database", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    database = Path(args.database)
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    sessions_file = database / "sessions.jsonl"
    sessions = [json.loads(line) for line in sessions_file.read_text(encoding="utf-8").splitlines() if line.strip()]
    evidence_rows = build_evidence_rows(sessions)
    knee = build_library(KNEE_DEFINITION, evidence_rows)
    ankle = build_library(ANKLE_FOOT_DEFINITION, evidence_rows)

    (output / "knee-problem-library.json").write_text(json.dumps(knee, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output / "ankle-foot-problem-library.json").write_text(json.dumps(ankle, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output / "膝部问题库.md").write_text(render_library(knee), encoding="utf-8")
    (output / "踝足与小腿问题库.md").write_text(render_library(ankle), encoding="utf-8")
    (output / "README.md").write_text(render_readme(knee, ankle), encoding="utf-8")
    print(json.dumps({"knee": knee["source_summary"], "ankle_foot_calf": ankle["source_summary"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
