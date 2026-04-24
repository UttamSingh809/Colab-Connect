import os
import glob
import re

icon_map = {
    'message-square': ('message-square', 'tada-hover'),
    'layout-dashboard': ('grid-alt', 'tada-hover'),
    'users': ('group', 'tada-hover'),
    'briefcase': ('briefcase', 'tada-hover'),
    'network': ('network-chart', 'tada-hover'),
    'folder-git-2': ('folder', 'tada-hover'),
    'user-circle': ('user-circle', 'tada-hover'),
    'user': ('user', 'tada-hover'),
    'x': ('x', 'tada-hover'),
    'clipboard-list': ('clipboard', 'tada-hover'),
    'star': ('star', 'tada-hover'),
    'bell': ('bell', 'tada-hover'),
    'plus': ('plus', 'tada-hover'),
    'alert-triangle': ('error', 'tada-hover'),
    'clock': ('time', 'tada-hover'),
    'crown': ('crown', 'tada-hover'),
    'lock': ('lock', 'tada-hover'),
    'mail': ('envelope', 'tada-hover'),
    'check': ('check', 'tada-hover'),
    'zap': ('bolt', 'tada-hover'),
    'shield': ('shield', 'tada-hover'),
    'target': ('target-lock', 'tada-hover'),
    'flame': ('hot', 'tada-hover'),
    'hand': ('hand', 'tada-hover'),
    'rocket': ('rocket', 'tada-hover'),
    'laptop': ('laptop', 'tada-hover'),
    'file-text': ('file', 'tada-hover'),
    'pin': ('pin', 'tada-hover'),
    'settings': ('cog', 'spin-hover'),
    'arrow-right': ('right-arrow-alt', 'fade-right-hover'),
    'lightbulb': ('bulb', 'tada-hover'),
    'log-out': ('log-out', 'tada-hover')
}

directories = ['src/main/resources/templates/**/*.html', 'src/main/resources/static/js/**/*.js']
files = []
for directory in directories:
    files.extend(glob.glob(directory, recursive=True))

def replacer(match):
    name = match.group(1)
    style = match.group(2)
    mapped = icon_map.get(name, (name, 'tada-hover'))
    return f'<box-icon name=\"{mapped[0]}\" animation=\"{mapped[1]}\" color=\"currentColor\" style=\"{style}\"></box-icon>'

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # match <i data-lucide='name' style='width: ...'></i>
    # we have single quotes and double quotes variations
    new_content = re.sub(r'<i data-lucide=[\'"](.*?)[\'"] style=[\'"](.*?)[\'"]>.*?</i>', replacer, content)
    
    # also match without style
    def replacer_no_style(match):
        name = match.group(1)
        mapped = icon_map.get(name, (name, 'tada-hover'))
        return f'<box-icon name=\"{mapped[0]}\" animation=\"{mapped[1]}\" color=\"currentColor\"></box-icon>'
        
    new_content = re.sub(r'<i data-lucide=[\'"](.*?)[\'"]>.*?</i>', replacer_no_style, new_content)

    if content != new_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Replaced icons in {filepath}')
