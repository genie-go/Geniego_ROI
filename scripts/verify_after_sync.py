"""
verify_after_sync.py
26차 [L]2-B 사후 검증.

검증 1: channelKpiPage 최상위 직접 자식 키 수 = 147
검증 2: 간이 문법 검사 (export default 시작 / {} 균형 / "" 균형 / UTF-8)

파일 수정 없음.
"""
import re
import sys

LOCALE_DIR = "frontend/src/i18n/locales"
TARGET_KEY = "channelKpiPage"
EXPECTED_KEYS = 147

FILES = ["en", "ar", "de", "es", "fr", "hi", "id", "ja", "pt", "ru", "th", "vi", "zh-TW", "zh"]

KEY_PAT = re.compile(r'^\s+"(\w+)"\s*:\s*"(.*)",?\s*$')
BLOCK_PAT = re.compile(r'^  "' + re.escape(TARGET_KEY) + r'"\s*:\s*\{')


def check_key_count(lines):
    """channelKpiPage 최상위 블록 직접 자식 키 수 반환. 블록 없으면 None."""
    start = None
    for i, line in enumerate(lines):
        if BLOCK_PAT.match(line):
            start = i
            break
    if start is None:
        return None

    depth = 0
    end = None
    for j in range(start, len(lines)):
        depth += lines[j].count('{') - lines[j].count('}')
        if j > start and depth <= 0:
            end = j
            break
    if end is None:
        return None

    count = 0
    inner_depth = 0
    for i in range(start + 1, end):
        line = lines[i]
        inner_depth += line.count('{') - line.count('}')
        if inner_depth == 0 and KEY_PAT.match(line):
            count += 1
    return count


def check_syntax(lines, raw_bytes):
    """간이 문법 검사. (ok: bool, reason: str) 반환."""
    # export default 시작 확인
    first = lines[0].rstrip() if lines else ""
    if not first.startswith("export default {"):
        return False, f"첫 줄이 'export default {{' 아님: {repr(first)}"

    # UTF-8 인코딩 확인 (이미 읽혔으면 통과, 단 BOM 체크)
    if raw_bytes[:3] == b'\xef\xbb\xbf':
        return False, "UTF-8 BOM 감지"

    # { } 균형
    depth = 0
    for line in lines:
        depth += line.count('{') - line.count('}')
    if depth != 0:
        return False, f"중괄호 불균형 (depth={depth})"

    # " 짝 균형 — 줄 단위로 이스케이프된 \" 제거 후 카운트
    total_quotes = 0
    for line in lines:
        cleaned = line.replace('\\"', '')
        total_quotes += cleaned.count('"')
    if total_quotes % 2 != 0:
        return False, f"큰따옴표 홀수 (count={total_quotes})"

    return True, "OK"


def main():
    print(f"=== verify_after_sync.py ===")
    print(f"대상: {len(FILES)}개 파일  기대 키 수: {EXPECTED_KEYS}\n")

    key_fails = 0
    syn_fails = 0

    for lang in FILES:
        filepath = f"{LOCALE_DIR}/{lang}.js"

        # UTF-8 읽기
        try:
            with open(filepath, "rb") as f:
                raw = f.read()
            text = raw.decode("utf-8")
            lines = text.splitlines(keepends=True)
        except UnicodeDecodeError as e:
            print(f"[{lang}.js]")
            print(f"  키 카운트: - [FAIL]")
            print(f"  문법 검사: FAIL (UTF-8 디코딩 오류: {e})")
            key_fails += 1
            syn_fails += 1
            continue

        # 검증 1: 키 카운트
        count = check_key_count(lines)
        if count is None:
            key_result = "- [FAIL] channelKpiPage 블록 없음"
            key_fails += 1
        elif count == EXPECTED_KEYS:
            key_result = f"{count} [PASS]"
        else:
            key_result = f"{count} [FAIL] (기대={EXPECTED_KEYS})"
            key_fails += 1

        # 검증 2: 간이 문법
        ok, reason = check_syntax(lines, raw)
        if ok:
            syn_result = "PASS"
        else:
            syn_result = f"FAIL ({reason})"
            syn_fails += 1

        print(f"[{lang}.js]")
        print(f"  키 카운트: {key_result}")
        print(f"  문법 검사: {syn_result}")

    total_fails = key_fails + syn_fails
    print(f"\n--- 종합 ---")
    print(f"키 카운트 FAIL: {key_fails}건")
    print(f"문법 검사 FAIL: {syn_fails}건")

    if total_fails == 0:
        print("전체 검증 PASS ✓")
    else:
        print("FAIL 항목 확인 필요 ✗")
        sys.exit(1)


if __name__ == "__main__":
    main()
