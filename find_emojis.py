import glob
import re

directories = ['src/main/resources/templates/**/*.html', 'src/main/resources/static/js/**/*.js']
files = []
for directory in directories:
    files.extend(glob.glob(directory, recursive=True))

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    emojis = re.findall(r'[\U0001f300-\U0001f64f\U0001f680-\U0001f6ff\u2600-\u26ff\u2700-\u27bf]', content)
    if emojis:
        esc = [e.encode('unicode_escape').decode('utf-8') for e in set(emojis)]
        print('Found emojis in ' + filepath + ': ' + str(esc))
