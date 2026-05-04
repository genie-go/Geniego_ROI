lines = open('frontend/src/i18n/locales/ko.js', encoding='utf-8').readlines()
targets = [7871, 8313, 8672, 11636, 12100]
results = []
for t in targets:
    path = []
    indent = len(lines[t-1]) - len(lines[t-1].lstrip())
    for i in range(t-2, -1, -1):
        l = lines[i]
        s = l.lstrip()
        if not s.startswith('"'):
            continue
        ci = len(l) - len(s)
        if ci < indent:
            key = s.split('"')[1]
            path.insert(0, key)
            indent = ci
            if indent == 2:
                break
    full = '.'.join(path) + '.channelKpiPage'
    results.append(f'- {t}: {full}')
results.append('- 12471: channelKpiPage (최상위, 보존 대상)')
with open('SESSION_25_L2A_paths.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))
for r in results:
    print(r)
