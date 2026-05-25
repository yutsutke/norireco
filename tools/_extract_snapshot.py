"""Extract the JSON snapshot embedded in the Notion parent page fetch result."""
import json, io, sys, re, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SRC = r'C:\Users\yutsu\.claude\projects\C--Users-yutsu-Documents-GitHub-norireco\7f2f9bda-4c68-493c-8764-2a880af42f34\tool-results\mcp-a640ce9c-47e1-4f86-920e-6d6bfc8fe2a3-notion-fetch-1779692467425.txt'
OUT = r'C:\Users\yutsu\Documents\GitHub\norireco\tools\_notion_db_snapshot.json'

src = open(SRC, 'r', encoding='utf-8').read()

# The file is JSON-escaped: the embedded markdown has literal \n, \", etc.
# Find the json fence: "```json\n[" ... "]\n\t```"
m = re.search(r'```json\\n(\[.*?\])\\n\\t```', src, re.DOTALL)
if not m:
    print('JSON fence not found, dumping nearby context')
    pos = src.find('```json')
    print(src[pos:pos+500])
    sys.exit(1)

js_text = m.group(1)
# Unescape JSON-string escapes carefully without touching real UTF-8 bytes.
# Order matters: \\\\ -> \\ must come last to avoid touching \\n etc.
js_text = (js_text
    .replace('\\n', '\n')
    .replace('\\t', '\t')
    .replace('\\"', '"')
    .replace('\\\\', '\\')
)

data = json.loads(js_text)
print(f'records: {len(data)}')
print(f'first: {json.dumps(data[0], ensure_ascii=False)}')
print(f'last: {json.dumps(data[-1], ensure_ascii=False)}')

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print(f'\nsaved: {OUT}')

from collections import Counter
print('\ncompany dist (top 20):')
for c, n in Counter(x['company'] for x in data).most_common(20):
    print(f'  {c}: {n}')
print('\nstatus dist:')
for c, n in Counter(x['status'] for x in data).most_common():
    print(f'  {c}: {n}')
