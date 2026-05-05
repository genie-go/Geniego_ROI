"""
refine_en_placeholder.py
Usage: python scripts/refine_en_placeholder.py [--write]

en.js channelKpiPage TOP-LEVEL 블록의 placeholder 값을 정제한다.
대상 범위: 26차에서 추가된 128개 신규 키 (기존 19키는 건드리지 않음).

[규칙 1] 약자 대문자화 (단어 경계 정규식)
  Ctr→CTR, Cpc→CPC, Cpa→CPA, Roas→ROAS,
  Kpis→KPIs, Kpi→KPI, Sns→SNS, Seo→SEO, Ai→AI

[규칙 2] 의미 불명 3개 키 직접 교체
  heroDesc   : "Hero Desc" → 실제 영어 설명문
  chName_    : "Ch Name_"  → 그대로 (변환 없음)
  interestConv: "Interest Conv" → "Interest Conversion Rate"

[규칙 3] lbl/hint/desc 접두사 보존 — 약자 대문자화만 적용

안전 패턴:
  --write 없으면 dry-run (파일 수정 없음)
  --write 시 백업(.backup_27_refine.js) + atomic 교체
  UTF-8 no-BOM
"""
import re
import os
import sys

WRITE_MODE = "--write" in sys.argv

EN_FILE = "frontend/src/i18n/locales/en.js"
TARGET_KEY = "channelKpiPage"

# 기존 19키 (26차 이전부터 있던 키) — 이 키들은 건드리지 않음
EXISTING_19 = {
    "tabGoals", "tabRoles", "tabSetup", "tabSns", "tabContent",
    "tabCommunity", "tabTargets", "tabMonitor", "tabGuide",
    "guideTitle", "guideSub", "guideStepsTitle", "guideTabsTitle",
    "guideTipsTitle", "guideTip1", "guideTip2", "guideTip3",
    "guideTip4", "guideTip5",
}

# [규칙 2] 직접 교체 매핑
DIRECT_MAP = {
    "heroDesc": "Manage API keys and connection status for sales, ads, and analytics channels.",
    "interestConv": "Interest Conversion Rate",
    # chName_ 는 변환 없음 → 포함 안 함
}

# [규칙 1] 약자 대문자화 (순서 중요: Kpis → KPIs 먼저, Kpi → KPI 나중)
ABBR_RULES = [
    (re.compile(r'\bKpis\b'), 'KPIs'),
    (re.compile(r'\bKpi\b'),  'KPI'),
    (re.compile(r'\bCtr\b'),  'CTR'),
    (re.compile(r'\bCpc\b'),  'CPC'),
    (re.compile(r'\bCpa\b'),  'CPA'),
    (re.compile(r'\bRoas\b'), 'ROAS'),
    (re.compile(r'\bSns\b'),  'SNS'),
    (re.compile(r'\bSeo\b'),  'SEO'),
    (re.compile(r'\bAi\b'),   'AI'),
]


def apply_rules(key, value):
    """규칙 1+2 적용. 변환된 값 반환 (변환 없으면 원본)."""
    # 규칙 2 직접 교체 (규칙 1 적용 전)
    if key in DIRECT_MAP:
        return DIRECT_MAP[key]

    # 규칙 1 약자 대문자화
    result = value
    for pat, repl in ABBR_RULES:
        result = pat.sub(repl, result)
    return result


def find_toplevel_block(lines, target):
    pattern = re.compile(r'^  "' + re.escape(target) + r'"\s*:\s*\{')
    for i, line in enumerate(lines):
        if pattern.match(line):
            depth = 0
            for j in range(i, len(lines)):
                depth += lines[j].count('{') - lines[j].count('}')
                if j > i and depth <= 0:
                    return i, j
    return None, None


KEY_PAT = re.compile(r'^(\s+"(\w+)"\s*:\s*)"(.*)"(,?\s*)$')


def main():
    print(f"=== refine_en_placeholder.py {'[WRITE]' if WRITE_MODE else '[DRY-RUN]'} ===\n")

    with open(EN_FILE, encoding="utf-8") as f:
        lines = f.readlines()

    start, end = find_toplevel_block(lines, TARGET_KEY)
    if start is None:
        print("ERROR: channelKpiPage TOP-LEVEL 블록 없음")
        sys.exit(1)

    changed = []
    unchanged = []
    new_lines = list(lines)

    for i in range(start + 1, end):
        line = lines[i]
        m = KEY_PAT.match(line)
        if not m:
            continue
        prefix, key, value, suffix = m.group(1), m.group(2), m.group(3), m.group(4)

        # 기존 19키 제외
        if key in EXISTING_19:
            continue

        new_value = apply_rules(key, value)

        if new_value != value:
            changed.append((key, value, new_value))
            new_lines[i] = f'{prefix}"{new_value}"{suffix}\n'
        else:
            unchanged.append(key)

    # dry-run 출력 (sample 제한 없음)
    print(f"변환 대상: {len(changed)}키  변환 없음: {len(unchanged)}키\n")
    print("--- 변환 목록 ---")
    for key, old, new in changed:
        print(f"  {key}")
        print(f"    전: {old}")
        print(f"    후: {new}")

    print(f"\n--- 변환 없음 목록 ({len(unchanged)}키) ---")
    for key in unchanged:
        print(f"  {key}")

    if not WRITE_MODE:
        print("\n[DRY-RUN] 파일 수정 없음. --write 옵션으로 실제 적용.")
        return

    # WRITE 모드
    backup = EN_FILE.replace(".js", ".backup_27_refine.js")
    with open(backup, "w", encoding="utf-8", newline="") as f:
        f.writelines(lines)

    tmp = EN_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="") as f:
        f.writelines(new_lines)
    os.replace(tmp, EN_FILE)

    print(f"\n[WRITE] {len(changed)}키 변환 완료.")
    print(f"  백업: {os.path.basename(backup)}")


if __name__ == "__main__":
    main()
