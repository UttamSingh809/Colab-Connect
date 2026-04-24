import glob
import re

html_files = glob.glob('src/main/resources/templates/**/*.html', recursive=True)

for filepath in html_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'boxicons' not in content:
        # insert before </head>
        new_content = content.replace('</head>', '  <script src="https://unpkg.com/boxicons@2.1.4/dist/boxicons.js"></script>\n</head>')
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print('Injected boxicons into ' + filepath)
