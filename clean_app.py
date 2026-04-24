import sys

with open('src/main/resources/static/js/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re
text = re.sub(r'// Initialize Lucide Icons on load and DOM changes.*', '', text, flags=re.DOTALL)

with open('src/main/resources/static/js/app.js', 'w', encoding='utf-8') as f:
    f.write(text.strip() + '\n')
