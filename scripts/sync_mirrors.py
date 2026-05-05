"""
sync_mirrors.py
Usage: python scripts/sync_mirrors.py [--dry-run]

ko.js의 최상위 channelKpiPage 147키를 기준으로
en.js + 13개 미러 파일에 누락 키를 추가한다.

번역 정책:
  - en.js: camelCase 키 → Title Case 영어 placeholder
  - 13개 미러: ko.js 값 그대로 복사 (임시)

안전 패턴:
  - 백업: <file>.backup_26_L2B.js
  - 실제 교체: os.replace (atomic)
  - UTF-8 no-BOM
"""
import sys
import re
import os

DRY_RUN = "--dry-run" in sys.argv

LOCALE_DIR = "frontend/src/i18n/locales"
KO_FILE = os.path.join(LOCALE_DIR, "ko.js")
EN_FILE = os.path.join(LOCALE_DIR, "en.js")
MIRROR_FILES = [
    "ar", "de", "es", "fr", "hi", "id", "ja", "pt", "ru", "th", "vi", "zh-TW", "zh"
]

TARGET_KEY = "channelKpiPage"


def read_utf8(path):
    with open(path, encoding="utf-8") as f:
        return f.readlines()


def write_utf8(path, lines):
    utf8_no_bom = open(path, "w", encoding="utf-8", newline="")
    utf8_no_bom.writelines(lines)
    utf8_no_bom.close()


def to_english_placeholder(key):
    """camelCase → Title Case 영어 문자열."""
    s = re.sub(r'([A-Z])', r' \1', key)
    return s.strip().title()


def find_toplevel_block(lines, target):
    """최상위(인덴트 2) target 블록의 (start_idx, end_idx) 반환 (0-based)."""
    pattern = re.compile(r'^  "' + re.escape(target) + r'"\s*:\s*\{')
    for i, line in enumerate(lines):
        if pattern.match(line):
            depth = 0
            for j in range(i, len(lines)):
                depth += lines[j].count('{') - lines[j].count('}')
                if j > i and depth <= 0:
                    return i, j
    return None, None


def extract_keys_in_order(lines, start, end):
    """블록 직접 자식 키를 순서대로 [(key, raw_line)] 반환."""
    result = []
    depth = 0
    for i in range(start + 1, end):
        line = lines[i]
        depth += line.count('{') - line.count('}')
        if depth == 0:
            m = re.match(r'\s+"(\w+)"\s*:\s*"(.*)"', line)
            if m:
                result.append((m.group(1), line))
    return result


def sync_file(filepath, ko_keys_ordered, ko_values, is_en):
    lines = read_utf8(filepath)
    start, end = find_toplevel_block(lines, TARGET_KEY)
    if start is None:
        print(f"  [SKIP] {filepath}: channelKpiPage 최상위 블록 없음")
        return 0

    existing = extract_keys_in_order(lines, start, end)
    existing_set = {k for k, _ in existing}
    missing = [k for k in ko_keys_ordered if k not in existing_set]

    if not missing:
        print(f"  [OK]   {filepath}: 누락 키 없음 (이미 {len(existing_set)}키)")
        return 0

    # 삽입할 라인 생성
    new_lines = []
    for key in missing:
        if is_en:
            val = to_english_placeholder(key)
        else:
            val = ko_values[key]
        new_lines.append(f'    "{key}": "{val}",\n')

    # 옵션 A: 기존 마지막 키 라인에 trailing comma 보정 (메모리 처리)
    # 닫는 } 직전 마지막 비공백 라인을 찾아 콤마가 없으면 추가
    updated = list(lines)
    last_key_idx = None
    for i in range(end - 1, start, -1):
        if updated[i].strip():
            last_key_idx = i
            break
    if last_key_idx is not None and not updated[last_key_idx].rstrip().endswith(','):
        updated[last_key_idx] = updated[last_key_idx].rstrip() + ',\n'
        comma_fixed = True
    else:
        comma_fixed = False

    # end 라인(닫는 }) 직전에 삽입
    updated = updated[:end] + new_lines + updated[end:]

    if DRY_RUN:
        print(f"  [DRY]  {filepath}: {len(missing)}키 추가 예정, trailing comma 보정={'YES' if comma_fixed else 'NO'}")
        for k in missing:
            val = to_english_placeholder(k) if is_en else ko_values[k]
            print(f"         + {k} → {val[:30]}")
        print()
        return len(missing)

    # 백업
    backup = filepath.replace(".js", ".backup_26_L2B.js")
    write_utf8(backup, lines)

    # 임시 파일 → atomic 교체
    tmp = filepath + ".tmp"
    write_utf8(tmp, updated)
    os.replace(tmp, filepath)

    print(f"  [DONE] {filepath}: {len(missing)}키 추가 (백업: {os.path.basename(backup)})")
    return len(missing)


def main():
    print(f"=== sync_mirrors.py {'[DRY-RUN]' if DRY_RUN else '[WRITE]'} ===\n")

    # ko.js에서 147키 순서·값 추출
    ko_lines = read_utf8(KO_FILE)
    ko_start, ko_end = find_toplevel_block(ko_lines, TARGET_KEY)
    if ko_start is None:
        print("ERROR: ko.js channelKpiPage 최상위 블록을 찾지 못했습니다.")
        sys.exit(1)

    ko_pairs = extract_keys_in_order(ko_lines, ko_start, ko_end)
    ko_keys_ordered = [k for k, _ in ko_pairs]
    ko_values = {}
    for i in range(ko_start + 1, ko_end):
        m = re.match(r'\s+"(\w+)"\s*:\s*"(.*)"', ko_lines[i])
        if m:
            ko_values[m.group(1)] = m.group(2)

    print(f"ko.js channelKpiPage: {len(ko_keys_ordered)}키 추출\n")

    total = 0

    # en.js (영어 placeholder)
    print("--- en.js (영어 placeholder) ---")
    total += sync_file(EN_FILE, ko_keys_ordered, ko_values, is_en=True)

    # 13개 미러 (ko 값 임시복사)
    print("\n--- 13개 미러 (ko 임시복사) ---")
    for lang in MIRROR_FILES:
        path = os.path.join(LOCALE_DIR, f"{lang}.js")
        total += sync_file(path, ko_keys_ordered, ko_values, is_en=False)

    print(f"\n총 {total}키 추가{'(예정)' if DRY_RUN else ' 완료'}.")


if __name__ == "__main__":
    main()
