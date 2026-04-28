import re

path = 'D:/project/GeniegoROI/frontend/src/pages/OrderHub.jsx'

with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('{tab === "overview"   && <OverviewTab />}')
if idx != -1:
    res = text[:idx] + '</div>\n                ' + text[idx:]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(res)
    print("OrderHub tabs closed")
else:
    print("Tabs not found")
