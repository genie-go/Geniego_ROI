# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8')

f = open(r'd:\project\GeniegoROI\frontend\src\pages\Admin.jsx','r',encoding='utf8')
lines = f.readlines()
f.close()

# Check div balance from line 130 to 176
depth = 0
for i in range(129, 176):
    line = lines[i]
    o = line.count('<div')
    c = line.count('</div>')
    depth += o - c
    if o != 0 or c != 0:
        print(f'L{i+1}: opens={o} closes={c} depth={depth}')
