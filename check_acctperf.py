# -*- coding: utf-8 -*-
"""Check div balance in AccountPerformance.jsx return statement"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = r'd:\project\GeniegoROI\frontend\src\pages\AccountPerformance.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

depth = 0
for i in range(298, len(lines)):
    line = lines[i]
    o = line.count('<div')
    c = line.count('</div>')
    depth += o - c
    if o != 0 or c != 0:
        print(f'L{i+1}: +{o} -{c} depth={depth}')
    if i >= 566:
        break

print(f'\nFinal div depth: {depth}')
