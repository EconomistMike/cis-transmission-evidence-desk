// Curated source observations, not substitutions for the colleague's chart.
// IDs are explicit so a later, differently scoped record cannot silently replace one.
(() => {
 const selections = {
  'central-west-orana': {cost:['CWO-AO-2025-MAIN-REMADE','CWO-AO-2026-ENABLING-FINAL-INC','CWO-AO-2026-EXPANSION-COST'],capacity:['CWO-AO-2025-DELIVER-4500','CWO-AO-2026-EXPANSION-CAP'],completion:['CWO-AO-2026-COMMITTED-TIMING','CWO-AO-2025-STAGED-COMPLETION','CWO-AO-2026-EXPANSION-TIMING'],caveat:'No comparable family total: Main, Enabling and Expansion have different price bases and scopes.'},
  'humelink': {cost:['HUM-AO-2024-ISP-COST','HUM-AO-2024-AER-ALLSTAGE','HUM-AO-2026-WONDALGA-COST'],capacity:['HUM-AO-2026-ISP-CAPACITY'],completion:['HUM-AO-2026-ISP-COMPLETION','HUM-AO-2026-WONDALGA-TIMING'],caveat:'The planner estimate and AER allowance use different price bases. Wondalga is separate, not automatically additive.'},
  'hunter-transmission-project': {cost:['HTP-AO-2026-COST'],capacity:['HTP-AO-2026-CAPACITY-FORWARD'],completion:['HTP-AO-2026-COMPLETION'],caveat:'AEMO’s CNSW–SNW Option 1 bundles HTP, Waratah Super Battery and related upgrades. Cost uncertainty is ±50%; dollar year is unstated.'},
  'marinus-link': {cost:['ML-AO-2026-FL-TOTAL','ML-AO-2026-STAGE2-2A'],capacity:['ML-AO-2026-CAPACITY-STAGE1','ML-AO-2026-CAPACITY-TOTAL'],completion:['ML-AO-2026-STAGE1-COMPLETION','ML-AO-2026-STAGE2-COMPLETION'],caveat:'Project Marinus includes Link and NWTD. A Link-only replacement cost is not established. The Stage 2 option is not an extra amount to add to the total.'},
  'new-england-rez': {cost:['NER-AO-2026-COST-REPORTED-NULL'],capacity:['NER-AO-2026-CAP-FWD','NER-AO-2025-CONSULT-CAP-8GW-FUTURE'],completion:['NER-AO-2026-COMPLETION'],caveat:'The final 2026 ISP leaves the NIP cost unstated. Initial 6 GW delivery and potential future 8 GW are different stages.'},
  'project-energyconnect': {cost:['PEC-AO-2026-TG-REOPENER-COST-TABLE3'],capacity:['PEC-AO-2026-CAP-POST-STAGE2'],completion:['PEC-AO-2026-TG-ENERGISATION','PEC-AO-2026-TG-NEM-INTEGRATION','PEC-AO-2026-STAGE2-COMMITTED'],caveat:'The cost is a NSW proponent forecast, not approved all-owner capex. Construction, energisation, NEM integration and capacity release are different milestones.'},
  'sydney-ring-south': {cost:['SRS-AO-2026-PADR-OPT6-TOTAL-COST','SRS-AO-2026-COMBINED-COST'],capacity:['SRS-AO-2026-PADR-OPT6-CAPACITY'],completion:['SRS-AO-2026-COMPLETION-ODP','SRS-AO-2026-PADR-OPT6-TIMING-STAGE1','SRS-AO-2026-PADR-OPT6-TIMING-STAGE2'],caveat:'Option 6 is a PADR option, not an approved outturn. The nominal PADR and 2025-dollar ISP amounts are not like-for-like.'},
  'vni-west-nsw': {cost:['VNN-AO-2026-VNIWEST-TOTAL','VNN-AO-2024-AER-CPA-APPROVED'],capacity:['VNN-AO-2026-N5-BASE','VNN-AO-2026-REZ-1800'],completion:['VNN-AO-2026-TIMING-SWNSW','VNN-AO-2026-TIMING-VICNSW'],caveat:'No current NSW-only total is established. The shared VNI total also appears in the VIC row: do not add the rows. Early works are not whole-project cost.'},
  'vni-west-victoria': {cost:['VNV-AO-2026-REPORTED-TOTAL'],capacity:['VNV-AO-2026-CAP-FORWARD','VNV-AO-2026-CAP-REVERSE'],completion:['VNV-AO-2026-COMPLETION'],caveat:'No current VIC-only total is established. This is the same shared VNI cost shown in the NSW row, not a state allocation. Transfer capacity is directional.'},
  'western-renewables-link': {cost:[],capacity:['WRL-AO-2026-CAPACITY-1460','WRL-AO-2026-ADDL-NETWORK-695','WRL-AO-2026-AUSNET-CAPABILITY'],completion:['WRL-AO-2026-COMPLETION-NOV2029'],caveat:'Standalone WRL cost is not established. The $315m modification increment is not a substitute. Proponent carrying capability and planner capacity measures differ.'}
 };
 const number = v => typeof v==='number' ? v.toLocaleString('en-AU',{maximumFractionDigits:4}) : String(v);
 const packsBySlug=Object.fromEntries(D.packs.map(p=>[p.family_slug,p]));
 function latestChart() {
  if(!window.LatestChart)throw new Error('Latest chart projection is unavailable');
  const rows=LatestChart.rows.map(row=>{
   const pack=packsBySlug[row.family];if(!pack)throw new Error('Unknown latest chart family: '+row.family);
   const obs=Object.fromEntries(pack.observations.map(o=>[o.id,o]));
   const links=row.refs.map(id=>{const o=obs[id];if(!o)throw new Error('Unknown latest chart observation: '+id);return `<span data-observation-ref="${esc(id)}" title="${esc(id)}">${sourceLink(o.source_id,o.pages)}</span>`;}).join('');
   return `<tr data-project="${esc(pack.name)}" data-latest-chart-row="${esc(row.scope)}" data-search="${esc(row.scope+' '+row.cells.join(' '))}"><th scope="row">${esc(row.scope)}</th>${row.cells.map(value=>`<td>${esc(value)}</td>`).join('')}<td>${links}</td></tr>`;
  }).join('');
  return `<div class="sheet-title latest-chart-title"><h2>Full source-backed chart</h2><span class="pill">Scopes kept separate</span></div><p class="latest-chart-note">Workbook column order, rebuilt from our evidence. “Not established” is not zero; alternative-route counts are not source-defined. Cost/km is omitted because the available figures are not comparable line-construction rates.</p><div class="table-wrap latest-chart-wrap" role="region" aria-label="Full source-backed latest evidence chart, scroll for more columns" tabindex="0"><table class="latest-full-chart"><thead><tr>${LatestChart.columns.map((c,i)=>`<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
 }
 function observation(o) {
  if (!o) throw new Error('Latest evidence selection has no observation');
  const absent = o.value == null;
  const value = absent ? (o.measure==='completion'?'See source wording':'Not reported') : number(o.value);
  const prefix = o.id==='WRL-AO-2026-AUSNET-CAPABILITY' ? 'More than ' : '';
  const unit = absent||o.unit==='date' ? '' : ' '+o.unit;
  return `<div class="latest-observation" data-observation="${esc(o.id)}" data-measure="${esc(o.measure)}">
   <strong class="latest-value${absent?' missing-evidence':''}">${esc(prefix+value+unit)}</strong>
   <div class="latest-label">${esc(o.label)}</div>
   <div class="latest-basis">Recorded ${esc(o.date||'date not stated')}${o.measure==='cost'?' · '+esc(o.price_basis||'Price basis not stated'):''}</div>
   ${o.uncertainty?`<span class="latest-qualification">${esc(o.uncertainty)}</span>`:''}
   ${sourceLink(o.source_id,o.pages)}
   <details class="latest-detail"><summary>Scope, source wording and qualifications</summary><p class="latest-boundary">${esc(o.boundary||'Scope not stated')}</p><p>${esc(o.excerpt||'No excerpt recorded')}</p><p>${esc(o.status||'')}</p><p>${esc(o.comparability||'')}</p><p>${esc(o.notes||'')}</p></details>
  </div>`;
 }
 const section=document.createElement('section');section.id='latest';section.className='mode';
 section.innerHTML=`<header class="page-head"><div><div class="kicker">Source-defined figures</div><h1>Latest recorded evidence</h1><p>Evidence through 4 September 2026. Dates, stages and price bases are not interchangeable.</p></div></header>
 <p class="latest-intro">Source figures, not workbook scores. Related scopes are separate; do not add them. Missing information is not zero.</p>
 ${latestChart()}
 <div class="sheet-title latest-detail-title"><h2>Detailed evidence</h2><span class="pill">Source observations</span></div>
 <div class="table-wrap latest-wrap" role="region" aria-label="Latest recorded evidence, scroll for more columns" tabindex="0"><table class="latest-table"><colgroup><col style="width:160px"><col style="width:380px"><col style="width:270px"><col style="width:270px"></colgroup><thead><tr><th>Project</th><th>Cost evidence</th><th>Capacity measures</th><th>Delivery milestones</th></tr></thead><tbody>${D.packs.map(p=>{
  const config=selections[p.family_slug],obs=Object.fromEntries(p.observations.map(o=>[o.id,o]));
  return `<tr data-project="${esc(p.name)}" data-search="${esc(JSON.stringify(p.summary))}"><td><h2>${esc(p.policy_chart.original_row.project)}</h2><details><summary>Project scope</summary><p>${esc(p.summary.identity)}</p><p>${esc(p.summary.delivery_status)}</p></details></td>${['cost','capacity','completion'].map(k=>`<td><h3 class="mobile-cell-label">${{cost:'Cost evidence',capacity:'Capacity measures',completion:'Delivery milestones'}[k]}</h3>${k==='cost'?`<p class="latest-caveat">${esc(config.caveat)}</p>`:''}${config[k].map(id=>observation(obs[id])).join('')||'<p class="missing-evidence">Not established in this snapshot.</p>'}</td>`).join('')}</tr>`;
 }).join('')}</tbody></table><div class="empty" style="display:none">No matching evidence. Clear the search or project filter.</div></div>`;
 document.getElementById('dashboard').before(section);
 const nav=document.querySelector('.mode-nav');
 const latestButton=document.createElement('button');latestButton.dataset.mode='latest';latestButton.textContent='Latest evidence';latestButton.onclick=()=>activateMode('latest');nav.prepend(latestButton);
 const labels={chart:'Supplied workbook',dashboard:'Comparison summary',policy:'Detailed analysis',workbook:'Evidence records',desk:'Comparison findings'};
 nav.querySelectorAll('button').forEach(b=>{if(labels[b.dataset.mode])b.textContent=labels[b.dataset.mode];});
 const toggle=document.createElement('div');toggle.className='perspective-toggle';toggle.setAttribute('role','group');toggle.setAttribute('aria-label','Evidence perspective');
 toggle.innerHTML='<button data-perspective="evidence">Latest evidence</button><button data-perspective="comparison">Workbook comparison</button>';
 document.querySelector('.workspace').prepend(toggle);
 const originalActivate=activateMode;
 const comparisonViews=['chart','dashboard','policy','desk'];
 function perspective(value) {
  document.body.dataset.evidencePerspective=value;
  document.getElementById('rail-scope').textContent=value==='evidence'?'10 project families':'Supplied workbook snapshot';
  toggle.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.perspective===value)));
  nav.querySelectorAll('button').forEach(b=>{b.hidden=value==='evidence'?comparisonViews.includes(b.dataset.mode):b.dataset.mode==='latest';});
  const u=new URL(location);u.searchParams.set('perspective',value);history.replaceState(null,'',u);
 }
 activateMode=function(id) {
  if(id==='latest')perspective('evidence');
  else if(comparisonViews.includes(id))perspective('comparison');
  const filter=document.getElementById('filter');
  filter.hidden=id==='latest';
  if(id==='latest')filter.value='';
  originalActivate(id);
 };
 toggle.querySelectorAll('button').forEach(b=>b.onclick=()=>{perspective(b.dataset.perspective);activateMode(b.dataset.perspective==='evidence'?'latest':'chart');});
 const params=new URL(location).searchParams,view=params.get('view');
 // Existing deep links to comparison views keep their meaning. A bare URL is evidence-first.
 const initial= params.get('perspective')==='comparison'||comparisonViews.includes(view)?'comparison':'evidence';
 perspective(initial);
 activateMode(view==='workbook'?'workbook':initial==='comparison'?(comparisonViews.includes(view)?view:'chart'):'latest');
})();
