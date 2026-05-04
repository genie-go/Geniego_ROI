"""
analyze_i18n_namespaces.py
Usage: python3 scripts/analyze_i18n_namespaces.py <locale_file.js>

Read-only. locale JS 파일에서 TARGET_KEY 블록의
부모 네임스페이스, 시작/종료 라인, 키 개수를 stdout 출력.
파일 수정 없음.
"""
import sys
import re

TARGET_KEY = "channelKpiPage"


def get_indent(line):
    """줄의 선행 공백 수 반환."""
    return len(line) - len(line.lstrip())


def find_block_end(lines, start_idx):
    """start_idx 줄의 여는 { 에 brace-matching 되는 } 의 0-based 인덱스 반환."""
    depth = 0
    for i in range(start_idx, len(lines)):
        depth += lines[i].count('{') - lines[i].count('}')
        if i > start_idx and depth <= 0:
            return i
    return len(lines) - 1


def count_keys(lines, start_idx, end_idx):
    """블록 직접 자식 키 개수. 서브블록 내부 키는 제외 (depth 추적)."""
    indent_base = get_indent(lines[start_idx]) + 2
    count = 0
    depth = 0
    for i in range(start_idx + 1, end_idx):
        line = lines[i]
        depth += line.count('{') - line.count('}')
        if depth == 0 and get_indent(line) == indent_base:
            if re.search(r'^\s+"[\w]+"\s*:', line):
                count += 1
    return count


def find_parents(lines, target_idx, target_indent):
    """target_idx 위로 역순 탐색, 인덴트가 줄어드는 'key': { 패턴 수집 → 경로 반환."""
    parents = []
    current_indent = target_indent
    for i in range(target_idx - 1, -1, -1):
        line = lines[i]
        ind = get_indent(line)
        m = re.match(r'\s+"([\w]+)"\s*:\s*\{', line)
        if m and ind < current_indent:
            parents.append(m.group(1))
            current_indent = ind
            if ind == 0:
                break
    parents.reverse()
    return parents


def main():
    """엔트리포인트. argv[1] = 분석할 locale JS 파일 경로."""
    if len(sys.argv) < 2:
        print("Usage: python3 analyze_i18n_namespaces.py <locale_file.js>")
        sys.exit(1)

    filepath = sys.argv[1]
    with open(filepath, encoding='utf-8') as f:
        lines = f.readlines()

    pattern = re.compile(r'^\s+"' + re.escape(TARGET_KEY) + r'"\s*:\s*\{')
    hits = [(i, lines[i]) for i in range(len(lines)) if pattern.match(lines[i])]

    print(f"파일: {filepath}")
    print(f"'{TARGET_KEY}' 블록 총 {len(hits)}개 발견\n")
    print(f"{'#':<3} {'시작L':>6} {'종료L':>6} {'키수':>5}  {'인덴트':>6}  부모 네임스페이스")
    print("-" * 70)

    for idx, (line_i, raw_line) in enumerate(hits, 1):
        indent = get_indent(raw_line)
        end_i = find_block_end(lines, line_i)
        keys = count_keys(lines, line_i, end_i)
        parents = find_parents(lines, line_i, indent)
        ns_path = ".".join(parents) + "." + TARGET_KEY if parents else TARGET_KEY
        print(f"{idx:<3} {line_i+1:>6} {end_i+1:>6} {keys:>5}  {indent:>6}  {ns_path}")


if __name__ == "__main__":
    main()
