import os

log_path = 'C:/Users/user00/.gemini/antigravity/brain/d5039a35-2f92-440e-8cc2-ba65b3c40066/.system_generated/logs/overview.txt'

with open(log_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '@@ -1192,816 +1192,230 @@' in line:
        print('Found diff at', i)
        out = []
        for j in range(i+1, min(i+1000, len(lines))):
            if lines[j].startswith('[diff_block_end]'):
                break
            if lines[j].startswith('-'):
                out.append(lines[j][1:])
            
        with open('D:/project/GeniegoROI/frontend/coupon_mgmt.txt', 'w', encoding='utf-8') as out_f:
            out_f.writelines(out)
        print('Wrote', len(out), 'lines to coupon_mgmt.txt')
        break
