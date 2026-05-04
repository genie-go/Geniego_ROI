import os
import re

src_dir = 'frontend/src'
patterns = [
    'coupon.aiPredict.banner.channelKpiPage',
    'coupon.banner.channelKpiPage',
    'coupon.channelKpiPage',
    'aiPredict.banner.channelKpiPage',
    'banner.channelKpiPage',
]

results = []

for pat in patterns:
    matches = []
    for root, dirs, files in os.walk(src_dir):
        dirs[:] = [d for d in dirs if d not in ['i18n', 'node_modules']]
        for fname in files:
            if not fname.endswith(('.js', '.jsx', '.ts', '.tsx')):
                continue
            fpath = os.path.join(root, fname)
            with open(fpath, encoding='utf-8', errors='ignore') as f:
                for lineno, line in enumerate(f, 1):
                    if pat in line and ('t(' in line or "t(`" in line):
                        matches.append((fpath, lineno, line.strip()))

    results.append(f'=== {pat}.* ===')
    if not matches:
        results.append('사용 없음')
    else:
        files_used = sorted(set(m[0] for m in matches))
        results.append(f'사용 파일: {", ".join(files_used)}')
        results.append(f'사용 횟수: {len(matches)}')
        for m in matches[:3]:
            results.append(f'  [{m[1]}] {m[2][:120]}')
    results.append('')

with open('SESSION_25_L2A_RECHECK.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))
for r in results:
    print(r)
