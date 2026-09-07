"""Synchronize presentation data from corrected exports; never research new values."""
from pathlib import Path
import json
import re
import openpyxl

site=Path(__file__).resolve().parents[1]/'site'
path=site/'evidence-desk.html'
html=path.read_text()
match=re.search(r'(<script[^>]*id="evidence"[^>]*>)(.*?)(</script>)',html,re.S)
if not match: raise ValueError('Embedded evidence element missing')
old=json.loads(match[2])
pack=json.loads((site/'evidence-pack.json').read_text())
old_projects={p['family_slug']:p for p in old['packs']}
for p in pack['projects']:
    previous=old_projects.get(p['family_slug'])
    if previous and previous['policy_chart']['original_row']!=p['policy_chart']['original_row']:
        raise ValueError('Original colleague chart was changed: '+p['family_slug'])
old['packs']=[{**p,'name':p['summary']['name']} for p in pack['projects']]
old['sources']=pack['sources']
old['report']=pack['build_report']
old['build']={**old['build'],**pack['generated']}
old['link_base']=''
workbook=openpyxl.load_workbook(site/'evidence-workbook.xlsx',read_only=True,data_only=False)
rows={r[0]:r for r in workbook['Policy Paper Chart'].iter_rows(min_row=5,values_only=True)}
old['evidence_values']={p['family_slug']:[v if v is not None else '' for v in rows[p['policy_chart']['original_row']['project']][14:25]] for p in pack['projects']}
assert all(len(v)==len(old['evidence_columns']) for v in old['evidence_values'].values())
encoded=json.dumps(old,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
path.write_text(html[:match.start(2)]+encoded+html[match.end(2):])
print('Embedded corrected JSON and workbook evidence metadata; original chart inputs preserved.')
