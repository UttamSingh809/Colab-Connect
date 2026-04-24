import os
import re

files = ['connections.html', 'profile.html']
html_dir = 'src/main/resources/templates/'
js_dir = 'src/main/resources/static/js/'

for filename in files:
    filepath = os.path.join(html_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find <script> tags that do not have src=
    matches = list(re.finditer(r'<script(?![^>]*src=)[^>]*>(.*?)</script>', content, re.DOTALL))
    if matches:
        match = matches[-1]
        js_content = match.group(1).strip()
        js_filename = filename.replace('.html', '.js')
        js_filepath = os.path.join(js_dir, js_filename)

        with open(js_filepath, 'w', encoding='utf-8') as f:
            f.write(js_content)
        
        new_script_tag = f'<script src=\"/js/{js_filename}\"></script>'
        new_content = content[:match.start()] + new_script_tag + content[match.end():]

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Extracted {filename} to {js_filename}')
    else:
        print(f'No extractable script found in {filename}')
