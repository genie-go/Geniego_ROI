"""
verify_ko_pattern.py
ko.js channelKpiPage 블록(11865~12013) 정규식 매칭 커버리지 확인.

출력:
  - 매칭 라인 수
  - 매칭 안 되는 비공백 라인 (repr)
  - 마지막 5개 비공백 라인 (trailing comma 확인용)
파일 수정 없음.
"""
import re

KO_FILE = "frontend/src/i18n/locales/ko.js"

with open(KO_FILE, encoding="utf-8") as f:
    all_lines = f.readlines()

block = all_lines[11864:12013]  # 라인 11865~12013 (0-based 슬라이스)

pat = re.compile(r'^\s+"(\w+)"\s*:\s*"(.*)",?\s*$')

matched = []
unmatched_nonempty = []
nonempty = []

for line in block:
    if line.strip():
        nonempty.append(line.rstrip())
        if pat.match(line):
            matched.append(line.rstrip())
        else:
            unmatched_nonempty.append(line.rstrip())

print(f"매칭 라인 수: {len(matched)}")
print(f"비매칭 비공백 라인 수: {len(unmatched_nonempty)}")

if unmatched_nonempty:
    print("\n[비매칭 비공백 라인 전체 repr]")
    for u in unmatched_nonempty:
        print(repr(u))
else:
    print("\n(비매칭 비공백 라인 없음)")

print("\n[마지막 5개 비공백 라인]")
for line in nonempty[-5:]:
    print(repr(line))
