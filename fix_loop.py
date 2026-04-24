import sys

with open('src/main/resources/static/js/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

bad_code = '''const observer = new MutationObserver(() => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
});
observer.observe(document.body, { childList: true, subtree: true });'''

good_code = '''const observer = new MutationObserver((mutations) => {
  let shouldRender = false;
  mutations.forEach(m => {
    m.addedNodes.forEach(n => {
      if (n.nodeType === 1) {
        if (n.tagName === 'I' && n.hasAttribute('data-lucide')) shouldRender = true;
        if (n.querySelector && n.querySelector('i[data-lucide]')) shouldRender = true;
      }
    });
  });
  if (shouldRender && typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});
if (document.body) observer.observe(document.body, { childList: true, subtree: true });'''

text = text.replace(bad_code, good_code)

with open('src/main/resources/static/js/app.js', 'w', encoding='utf-8') as f:
    f.write(text)
