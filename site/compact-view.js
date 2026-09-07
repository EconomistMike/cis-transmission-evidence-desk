// Local presentation patch. Evidence payload is never changed.
(() => {
const cards=[];
const fmt=v=>typeof v==='number'?v.toLocaleString('en-AU',{maximumFractionDigits:4}):String(v??'Not stated');
const colour=s=>s==='supported'?'green':['gap','contradicted'].includes(s)?'red':'amber';
function popup(label,body,status){
 const id=cards.push({label,body})-1;
 return `<button class="compact-trigger ${status?'signal '+colour(status):'note-trigger'}" data-card="${id}" aria-haspopup="dialog" aria-controls="evidence-popup" aria-label="${esc(label+(status?': '+DeckCopy.status(status):''))}">${status?({green:'✓',amber:'!',red:'×'}[colour(status)]):esc(label)}</button>`;
}
function pinpoint(id,f){
 const raw=String(f.pages||'');
 const ids=String(f.source_ids||'').split(';').map(x=>x.trim()).filter(Boolean);
 const segment=raw.split(';').map(x=>x.trim()).find(x=>x.startsWith(id+' '));
 // Never interpret digits in source IDs or derivative line numbers as PDF pages.
 return segment?segment.slice(id.length).trim():ids.length===1&&!ids.some(x=>raw.includes(x))?raw:'';
}
function citation(id,pages=''){return sourceLink(id,pages);}
function findingBody(f,p){
 const ids=String(f.source_ids||'').split(';').map(x=>x.trim()).filter(Boolean),short=f.field==='cost_aud_billion'&&p?DeckCopy.costs[p.family_slug]:null;
 const original=f.field==='cost_aud_billion'&&typeof f.original==='number'?`$${fmt(f.original)}bn`:fmt(f.original);
 return `<p class="finding-status"><strong>${esc(DeckCopy.status(f.status))}</strong></p>${DeckCopy.note(f.evidence,short)}<p class="finding-values">Chart: ${esc(original)}${!short&&f.supported_value!=null&&String(f.supported_value)!==String(f.original)?`<br>Evidence: ${esc(f.supported_value)}`:''}</p>${ids.map(id=>citation(id,pinpoint(id,f))).join('')||'<p>No source recorded.</p>'}`;
}
function cell(p,key,value){
 const f=findingOf(p,key),formula=typeof value==='string'&&value.startsWith('=');return `<span class="compact-cell"><span title="Original: ${esc(value)}">${formula?'Original formula':esc(key==='date'?String(value??'Not stated'):fmt(value))}</span>${f?popup(p.policy_chart.original_row.project+' · '+DeckCopy.field(key),findingBody(f,p),f.status):''}</span>`;
}
const legend='<p class="compact-legend"><span class="signal green">✓</span> Supported <span class="signal amber">!</span> Qualified / derived / judgment <span class="signal red">×</span> Contradicted / gap · Hover, focus or tap an icon for evidence and source links.</p>';
document.getElementById('chart-table').innerHTML=legend+table(D.chart_columns,D.packs.map(p=>`<tr ${tag(p.name,JSON.stringify(p.policy_chart))}>${D.chart_row_keys.map((k,i)=>`<td>${i===0?`<b>${esc(p.policy_chart.original_row[k])}</b>`:cell(p,k,p.policy_chart.original_row[k])}</td>`).join('')}</tr>`).concat(D.unreviewed_rows.map(r=>`<tr data-project="__none__"><td colspan="${D.chart_columns.length}">${esc(r.project)} — not reviewed: ${esc(r.values.join(' · '))}</td></tr>`)),true);
document.querySelector('#chart .page-head p').textContent='Original workbook values with compact evidence indicators. Numbers are displayed to at most four decimal places; exact originals remain in the popups and downloads.';
// Editorial headlines summarise the existing notes; full qualifications stay in each popup.
const headlines={
 'central-west-orana':['Main + enabling + expansion','Main under construction','4.5 GW initial; 6 GW intended'],
 'humelink':['HumeLink; Wondalga separate','Committed; under delivery','+2.2 GW transfer, both ways'],
 'hunter-transmission-project':['Sydney Ring North; WSB distinct','Pre-construction assessment','Up to +5 GW network capacity'],
 'marinus-link':['Two separate stages','Stage 1 anticipated; 2 actionable','2 × 750 MW staged links'],
 'new-england-rez':['Network project, not REZ area','Anticipated; not committed','6 GW delivery; 8 GW intended'],
 'project-energyconnect':['SA + NSW; Victorian spur','Stage 1 complete; 2 building','150 → 800 MW NSW–SA'],
 'sydney-ring-south':['Flow control + 500 kV option','Draft RIT-T consultation','+3.6 GW from 500 kV option'],
 'vni-west-nsw':['NSW component; integrated VNI','Early works + studies','Stage 2: +1.89 / 1.67 GW'],
 'vni-west-victoria':['VIC component; integrated VNI','Early works + engagement','Forward 1.89 / reverse 1.67 GW'],
 'western-renewables-link':['Uprated WRL; VNI West separate','Anticipated; build unverified','1.46 GW renewables harnessed']
};
function summaryCost(p,o,f){
 const absent={'western-renewables-link':'Standalone cost not established','vni-west-nsw':'NSW total not established','vni-west-victoria':'VIC total not established','marinus-link':'Link-only cost not established','central-west-orana':'Comparable family total not established'};
 if(f?.supported_value==null&&absent[p.family_slug])return esc(absent[p.family_slug]);
 if(!o)return 'Not established';
 const scope={'humelink':'2024 planner estimate','hunter-transmission-project':'bundled Option 1','project-energyconnect':'NSW forecast only','sydney-ring-south':'nominal Option 6'}[p.family_slug]||o.label;
 return popup((o.unit==='AUD million'?'$'+fmt(o.value)+'m':fmt(o.value)+' '+o.unit)+' · '+scope,`<p>${esc(o.boundary)}</p><p>${esc(o.price_basis||'Price basis not stated')}</p>${citation(o.source_id,o.pages)}`);
}
function note(label,text,p,key){const f=p&&findingOf(p,key);return popup(label,`${DeckCopy.note(text||'Not stated')}${f?findingBody(f,p):'<p>See project records for sources.</p>'}`);}
document.getElementById('national-summary').innerHTML=legend+table(['Project family','Identity / scope','Delivery','Cost evidence','Capacity','Cost verdict'],D.packs.map(p=>{
 const f=findingOf(p,'cost_aud_billion'),o=f&&obsOf(p)[f.selected_observation],h=headlines[p.family_slug]||['Scope not summarised','Delivery not summarised','Capacity not summarised'];
 return `<tr ${tag(p.name,JSON.stringify(p.summary)+' '+JSON.stringify(f))}><td><b>${esc(p.policy_chart.original_row.project)}</b></td><td>${note(h[0],p.summary.identity)}</td><td>${note(h[1],p.summary.delivery_status,p,'date')}</td><td>${summaryCost(p,o,f)}</td><td>${note(h[2],p.summary.capacity,p,'network_capacity_gw')}</td><td>${f?popup(p.policy_chart.original_row.project+' · Cost',findingBody(f,p),f.status):'Not reviewed'}</td></tr>`;
}),true);
// Cell-review citations use the same source-specific pinpoint rules.
let reviewIndex=0;
D.packs.forEach(p=>(p.policy_chart.findings||[]).forEach(f=>{
 const row=document.querySelectorAll('#chart-review tbody tr')[reviewIndex++];
 if(row)row.cells[6].innerHTML=String(f.source_ids||'').split(';').map(x=>x.trim()).filter(Boolean).map(id=>citation(id,pinpoint(id,f))).join('')||'No source recorded';
}));
// Replace the old links everywhere with local originals and safe PDF pinpoints.
document.querySelectorAll('span.source').forEach(span=>{
 const text=span.textContent,id=Object.keys(S).find(id=>text===id||text.startsWith(id+' ·'));
 if(!id)return;
 const pages=text.includes(' · ')?text.split(' · ').slice(1).join(' · ').replace(/^p(?=\d)/,''):'';
 let next=span.nextSibling;while(next&&(next.nodeName==='BR'||next.nodeType===3||next.classList?.contains('open'))){const remove=next;next=next.nextSibling;remove.remove();}
 span.outerHTML=citation(id,pages);
});
// Keep full evidence in native disclosures, rather than clipping or deleting it.
const tableWidths={
 'national-summary':[200,205,205,165,215,90],
 'chart-table':D.chart_columns.map((_,i)=>i===0?180:i===D.chart_columns.length-1?260:130),
 'chart-evidence':D.evidence_columns.map(()=>210),
 'chart-review':[180,165,130,160,160,320,230,210],
 'supported-table':[180,245,170,290,180,220,100],
 'analysis-estimates':[240,150,280,220,280,220,100],
 'estimates':[180,240,110,180,280,220,280,220,100],
 'scope':[180,190,170,320,280,220],
 'timeline':[180,110,230,190,340,220],
 'sources':[210,200,290,180,250,165]
};
// Appended evidence includes a leading family column.
tableWidths['chart-evidence'].unshift(180);
function discloseCell(td){
 if(td.querySelector('[data-card],button'))return;
 const sources=[...td.children].filter(x=>x.classList.contains('inline-source'));
 if(sources.length){if(sources.length>2){const more=document.createElement('details');more.className='cell-more';more.innerHTML=`<summary>${sources.length-2} more sources</summary>`;sources.slice(2).forEach(s=>more.append(s));td.append(more);}return;}
 if(td.querySelector('a,details'))return;
 const preview=td.cloneNode(true);preview.querySelectorAll('br').forEach(br=>br.replaceWith(' '));const text=preview.textContent.trim().replace(/\s+/g,' ');if(text.length<=105)return;
 const original=td.innerHTML;const short=text.slice(0,85).replace(/\s+\S*$/,'');
 td.innerHTML=`<details class="cell-more"><summary><span>${esc(short)}…</span><span class="expand-hint">Read full text</span></summary><div class="cell-full">${original}</div></details>`;
}
Object.entries(tableWidths).forEach(([id,widths])=>{
 const root=document.getElementById(id),wrap=root.querySelector('.table-wrap'),t=wrap.querySelector('table');
 wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',id.replaceAll('-',' ')+' table, scroll for more columns and rows');
 t.style.tableLayout='fixed';t.style.minWidth=widths.reduce((a,b)=>a+b,0)+'px';
 const cols=document.createElement('colgroup');cols.innerHTML=widths.map(w=>`<col style="width:${w}px">`).join('');t.prepend(cols);
 t.querySelectorAll('tbody tr').forEach(tr=>{tr.dataset.search=(tr.dataset.search||'')+' '+tr.textContent;tr.querySelectorAll('td').forEach(discloseCell);});
});
const panel=document.createElement('aside');panel.id='evidence-popup';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Evidence details');panel.hidden=true;document.body.append(panel);
let active=null,timer;
function close(){panel.hidden=true;if(active)active.setAttribute('aria-expanded','false');active=null;}
function show(button){
 clearTimeout(timer);if(active)active.setAttribute('aria-expanded','false');active=button;button.setAttribute('aria-expanded','true');
 const card=cards[Number(button.dataset.card)];panel.innerHTML=`<button class="popup-close" aria-label="Close evidence details">×</button><h3>${esc(card.label)}</h3>${card.body}`;panel.hidden=false;
 const r=button.getBoundingClientRect(),below=innerHeight-r.bottom-14,above=r.top-14,useBelow=below>=Math.min(360,above);panel.style.maxHeight=Math.max(80,useBelow?below:above)+'px';panel.style.left=Math.max(8,Math.min(r.left,innerWidth-panel.offsetWidth-8))+'px';panel.style.top=(useBelow?r.bottom+6:Math.max(8,r.top-panel.offsetHeight-6))+'px';panel.querySelector('.popup-close').onclick=()=>{const b=active;close();b?.focus();close();};
}
document.querySelectorAll('[data-card]').forEach(b=>{b.setAttribute('aria-expanded','false');b.onmouseenter=()=>show(b);b.onfocus=()=>show(b);b.onmouseleave=()=>{timer=setTimeout(()=>{if(!panel.contains(document.activeElement)&&document.activeElement!==b)close();},250);};b.onclick=()=>{show(b);panel.querySelector('a,button').focus();};b.onkeydown=e=>{if(e.key==='ArrowDown'){e.preventDefault();show(b);panel.querySelector('a,button').focus();}};});
panel.onmouseenter=()=>clearTimeout(timer);panel.onmouseleave=()=>{timer=setTimeout(()=>{if(!panel.contains(document.activeElement))close();},250);};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const b=active;close();b?.focus();close();}});
document.addEventListener('pointerdown',e=>{if(!panel.contains(e.target)&&!e.target.closest('[data-card]'))close();});
document.addEventListener('focusin',e=>{if(active&&!panel.contains(e.target)&&e.target!==active)close();});
window.addEventListener('resize',close);document.addEventListener('scroll',e=>{if(active&&!panel.contains(e.target)){const r=active.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)close();else show(active);}},true);
DeckCopy.apply();
applySearch();
})();
