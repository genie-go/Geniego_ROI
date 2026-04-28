import re

path = 'D:/project/GeniegoROI/frontend/src/pages/OrderHub.jsx'

with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the mangled ending of the main OrderHub component
idx = text.find('{tab === "guide"      && <GuideTab />}\n')
if idx != -1:
    idx += len('{tab === "guide"      && <GuideTab />}\n')
    
    clean_tail = """                </div>
            </div>
        </div>
    );
}
"""
    new_text = text[:idx] + clean_tail
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("OrderHub ending fixed!")
else:
    print("GuideTab line not found!")
