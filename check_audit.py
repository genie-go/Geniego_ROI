# -*- coding: utf-8 -*-
"""Analyze div balance in the return statement of Audit component"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = r'd:\project\GeniegoROI\frontend\src\pages\Audit.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# return starts at line 330, function ends at 573
depth = 0
for i in range(329, len(lines)):
    line = lines[i]
    o = line.count('<div')
    c = line.count('</div>')
    depth += o - c
    if o != 0 or c != 0 or depth < 0:
        print(f'L{i+1}: +{o} -{c} depth={depth}')
    if i >= 572:
        break

print(f'\nFinal div depth: {depth}')

# Also check brace balance
depth2 = 0
for i in range(257, len(lines)):  # function starts at 258
    for ch in lines[i]:
        if ch == '{': depth2 += 1
        elif ch == '}': depth2 -= 1

print(f'Brace depth: {depth2}')
