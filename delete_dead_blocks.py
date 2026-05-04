import os
import sys

LOCALES_PATH = 'frontend/src/i18n/locales/ko.js'
TMP_PATH = 'frontend/src/i18n/locales/ko.js.tmp'

with open(LOCALES_PATH, encoding='utf-8') as f:
    lines = f.readlines()

orig_count = len(lines)
print(f'원본 라인 수: {orig_count}')

target_starts = [7871, 8313, 8672, 11636, 12100]

def find_block_end(lines, start_1idx):
    start_0 = start_1idx - 1
    opening_line = lines[start_0]
    indent = len(opening_line) - len(opening_line.lstrip())
    indent_str = ' ' * indent
    for i in range(start_0 + 1, len(lines)):
        stripped = lines[i].rstrip('\n\r')
        if stripped == indent_str + '}' or stripped == indent_str + '},':
            return i + 1  # 1-indexed
    return None

ranges = []
for s in target_starts:
    e = find_block_end(lines, s)
    if e is None:
        print(f'ERROR: 블록 끝 찾기 실패 - 시작 라인 {s}')
        sys.exit(1)
    ranges.append((s, e))
    print(f'블록: {s} ~ {e} (삭제 라인 수: {e - s + 1})')

# Overlap check
for i in range(len(ranges)):
    for j in range(i + 1, len(ranges)):
        s1, e1 = ranges[i]
        s2, e2 = ranges[j]
        if s1 <= e2 and s2 <= e1:
            print(f'ERROR: 블록 겹침 - ({s1},{e1}) vs ({s2},{e2})')
            sys.exit(1)
print('겹침 없음 확인.')

to_delete = set()
for s, e in ranges:
    for i in range(s - 1, e):
        to_delete.add(i)

new_lines = [l for i, l in enumerate(lines) if i not in to_delete]
new_count = len(new_lines)

with open(TMP_PATH, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f'임시 파일 라인 수: {new_count}')
print(f'삭제된 라인 수: {orig_count - new_count}')

# Verify
with open(TMP_PATH, encoding='utf-8') as f:
    tmp_lines = f.readlines()

occurrences = [(i + 1, l) for i, l in enumerate(tmp_lines) if '"channelKpiPage"' in l]
print(f'"channelKpiPage" 출현 횟수: {len(occurrences)} (expected: 1)')
if len(occurrences) != 1:
    os.remove(TMP_PATH)
    print('FAIL: 출현 횟수 불일치. ko.js.tmp 삭제. 원본 보존.')
    sys.exit(1)

lineno, line = occurrences[0]
indent = len(line) - len(line.lstrip())
print(f'최상위 channelKpiPage: 라인 {lineno}, 들여쓰기 {indent}칸')
if indent != 2:
    os.remove(TMP_PATH)
    print(f'FAIL: 들여쓰기 {indent}칸 (expected 2). ko.js.tmp 삭제. 원본 보존.')
    sys.exit(1)

print('검증 PASS. ko.js.tmp -> ko.js 교체.')
os.replace(TMP_PATH, LOCALES_PATH)
print('교체 완료.')

# Post-verify: count keys in top-level channelKpiPage block
with open(LOCALES_PATH, encoding='utf-8') as f:
    final_lines = f.readlines()

start_0 = lineno - 1
indent_str = ' ' * indent
key_count = 0
for i in range(start_0 + 1, len(final_lines)):
    stripped = final_lines[i].rstrip('\n\r')
    if stripped == indent_str + '}' or stripped == indent_str + '},':
        break
    if final_lines[i].lstrip().startswith('"'):
        key_count += 1

print(f'최상위 channelKpiPage 키 개수: {key_count} (expected: 147)')

report_lines = [
    '=== SESSION_25_L2A 삭제 결과 보고 ===',
    f'백업 파일: frontend/src/i18n/locales/ko.backup_25_L2A.js',
    f'삭제 전 라인 수: {orig_count}',
    f'삭제 후 라인 수: {new_count}',
    f'차이: {orig_count - new_count}',
    '',
    '삭제된 블록:',
]
for (s, e) in ranges:
    report_lines.append(f'  시작 {s} ~ 끝 {e} ({e - s + 1}라인)')
report_lines += [
    '',
    f'최상위 channelKpiPage 라인: {lineno}',
    f'최상위 channelKpiPage 키 개수: {key_count}',
    f'검증 결과: {"PASS" if key_count == 147 else "FAIL (키 수 불일치)"}',
]

with open('SESSION_25_L2A_DELETE_REPORT.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(report_lines))

for r in report_lines:
    print(r)
