"""
fill_mirrors_with_en.py
Usage: python scripts/fill_mirrors_with_en.py [--write]

13개 미러(ar,de,es,fr,hi,id,ja,pt,ru,th,vi,zh-TW,zh)의
channelKpiPage TOP-LEVEL 블록 값을 en.js 영어 번역 값으로 교체.

동작:
  - en.js TOP-LEVEL channelKpiPage 147키 → {key: en_value} 추출
  - 각 미러 TOP-LEVEL channelKpiPage 블록에서 키 순회
  - 값이 en_value와 다른 키만 교체 (기존 19키는 이미 영어라 변화 없음)

안전 패턴:
  - --write 없으면 dry-run (파일 수정 없음)
  - --write 시 백업(.backup_27_fill.js) + atomic 교체
  - UTF-8 no-BOM
"""
import re
import os
import sys

WRITE_MODE = "--write" in sys.argv

LOCALE_DIR = "frontend/src/i18n/locales"
EN_FILE = os.path.join(LOCALE_DIR, "en.js")
TARGET_KEY = "channelKpiPage"

MIRRORS = ["ar", "de", "es", "fr", "hi", "id", "ja", "pt", "ru", "th", "vi", "zh-TW", "zh"]

KEY_PAT = re.compile(r'^(\s+"(\w+)"\s*:\s*)"(.*)"(,?\s*)$')


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


def extract_en_values(lines, start, end):
    """{key: en_value} 딕셔너리 반환."""
    result = {}
    for i in range(start + 1, end):
        m = KEY_PAT.match(lines[i])
        if m:
            result[m.group(2)] = m.group(3)
    return result


def process_mirror(filepath, en_values):
    with open(filepath, "rb") as f:
        raw = f.read()
    lines = raw.decode("utf-8").splitlines(keepends=True)

    start, end = find_toplevel_block(lines, TARGET_KEY)
    if start is None:
        return None, "channelKpiPage TOP-LEVEL 블록 없음"

    changed = []
    new_lines = list(lines)

    for i in range(start + 1, end):
        m = KEY_PAT.match(lines[i])
        if not m:
            continue
        prefix, key, old_val, suffix = m.group(1), m.group(2), m.group(3), m.group(4)

        if key not in en_values:
            continue
        new_val = en_values[key]

        if new_val != old_val:
            changed.append((key, old_val, new_val))
            new_lines[i] = f'{prefix}"{new_val}"{suffix}\n'

    return changed, new_lines


def main():
    print(f"=== fill_mirrors_with_en.py {'[WRITE]' if WRITE_MODE else '[DRY-RUN]'} ===\n")

    # en.js 값 추출
    with open(EN_FILE, encoding="utf-8") as f:
        en_lines = f.readlines()
    en_start, en_end = find_toplevel_block(en_lines, TARGET_KEY)
    if en_start is None:
        print("ERROR: en.js channelKpiPage TOP-LEVEL 블록 없음")
        sys.exit(1)
    en_values = extract_en_values(en_lines, en_start, en_end)
    print(f"en.js 추출: {len(en_values)}키\n")

    total_changed = 0

    for lang in MIRRORS:
        filepath = os.path.join(LOCALE_DIR, f"{lang}.js")
        result, payload = process_mirror(filepath, en_values)

        if result is None:
            print(f"[{lang}.js] SKIP: {payload}")
            continue

        changed, new_lines = result, payload
        total_changed += len(changed)

        print(f"[{lang}.js] 변환 대상: {len(changed)}키")
        for key, old, new in changed:
            print(f"    {key}")
            print(f"      전: {old[:50]}")
            print(f"      후: {new[:50]}")

        if WRITE_MODE and changed:
            backup = filepath.replace(".js", ".backup_27_fill.js")
            with open(backup, "wb") as f:
                with open(filepath, "rb") as src:
                    f.write(src.read())
            tmp = filepath + ".tmp"
            with open(tmp, "w", encoding="utf-8", newline="") as f:
                f.writelines(new_lines)
            os.replace(tmp, filepath)
            print(f"    → WRITE 완료 (백업: {os.path.basename(backup)})")
        elif not WRITE_MODE and changed:
            print(f"    → [DRY-RUN] 파일 수정 없음")
        print()

    print(f"총 {total_changed}키 변환{'(예정)' if not WRITE_MODE else ' 완료'}.")
    if not WRITE_MODE:
        print("실제 적용: --write 옵션 추가")


if __name__ == "__main__":
    main()
