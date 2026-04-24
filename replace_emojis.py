import os
import glob
import re

emoji_map = {
    '\u2715': ('x', 'tada-hover'),
    '\u2705': ('check-circle', 'tada-hover', 'solid'),
    '\U0001f310': ('globe', 'tada-hover'),
    '\U0001f3c6': ('trophy', 'tada-hover'),
    '\U0001f4e4': ('upload', 'tada-hover'),
    '\U0001f465': ('group', 'tada-hover'),
    '\U0001f535': ('circle', 'tada-hover', 'solid'),
    '\U0001f4c2': ('folder-open', 'tada-hover'),
    '\u2606': ('star', 'tada-hover'),
    '\U0001f4e7': ('envelope', 'tada-hover'),
    '\U0001f419': ('github', 'tada-hover', 'logo'),
    '\u270f': ('pencil', 'tada-hover'),
    '\U0001f513': ('lock-open', 'tada-hover'),
    '\U0001f4e8': ('envelope-open', 'tada-hover'),
    '\U0001f4ed': ('envelope', 'tada-hover')
}

directories = ['src/main/resources/templates/**/*.html', 'src/main/resources/static/js/**/*.js']
files = []
for directory in directories:
    files.extend(glob.glob(directory, recursive=True))

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    for emoji, mapped in emoji_map.items():
        name = mapped[0]
        animation = mapped[1]
        category = ''
        if len(mapped) > 2:
            category = f' type="{mapped[2]}"'
        
        box_icon = f'<box-icon name="{name}" animation="{animation}" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"{category}></box-icon>'
        content = content.replace(emoji, box_icon)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print('Replaced emojis in ' + filepath)
