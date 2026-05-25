"""SL names dumper for selected operators."""
import json, io, sys, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sl = json.load(open(r'C:\Users\yutsu\Documents\GitHub\norireco\service_lines_master.json','r',encoding='utf-8'))['service_lines']

queries = [
    ('横浜市', None),
    ('東京都', None),
    ('東日本旅客鉄道', '千葉'),
    ('東日本旅客鉄道', '新潟'),
    ('東日本旅客鉄道', '仙台'),
    ('東日本旅客鉄道', '常磐'),
    ('東日本旅客鉄道', '東北'),
    ('東日本旅客鉄道', '羽越'),
    ('東海旅客鉄道', None),
    ('近畿日本鉄道', '大阪'),
    ('北海道旅客鉄道', '千歳'),
    ('北海道旅客鉄道', '函館'),
    ('九州旅客鉄道', '大村'),
    ('九州旅客鉄道', '日豊'),
]

for op, kw in queries:
    rows = []
    for s in sl:
        if op not in (s.get('operator') or ''): continue
        nm = s.get('name', '')
        if kw and kw not in nm and kw not in (s.get('official_line') or '') and not any(kw in a for a in s.get('alias',[])):
            continue
        rows.append((s['id'], nm, s.get('official_line'), s.get('alias',[])))
    label = f'{op}{" ~ " + kw if kw else ""}'
    print(f'\n== {label} ({len(rows)}) ==')
    for r in rows[:20]:
        print(f'  {r[0]:50}  name={r[1]:25}  off={r[2]:15}  alias={r[3]}')
    if len(rows) > 20: print(f'  ... +{len(rows)-20} more')
