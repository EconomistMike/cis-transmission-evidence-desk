// Presentation copy only. Original research remains in Full note and downloads.
const DeckCopy = (() => {
 const fields={date:'Completion',cost_aud_billion:'Cost (AUD bn)',network_capacity_gw:'Capacity (GW)',trunk_km:'Trunk length (km)',millions_per_trunk_km:'Cost per trunk km',circuits:'Circuits',lines:'Lines',alt_routes:'Alternative routes',syncons_mva:'Syncons (MVA)',hubs:'Hubs',transformers_mva:'Transformers (MVA)',feeder_lines_km:'Feeder lines (km)'};
 const costs={
 'central-west-orana':'The chart’s $6.787bn sum mixes Main ($5,526.1m, nominal), Enabling ($406m, real 2025–26) and Expansion ($855m, price year unstated). No source publishes this total. Different scopes and price bases make it non-additive; it also excludes H2P, system strength, finance and Barigan Creek. Do not publish as a project total.',
 'humelink':'$4.9bn rounds AEMO’s 2024 estimate of $4,892m (June 2023 dollars, Class 3: −5%/+12%). It is not the AER allowance of $4,573.5m (real 2022–23, excluding equity raising). The intended cost scope is unresolved, including whether to add the separate $220m Wondalga project.',
 'hunter-transmission-project':'AEMO 2026 gives $1,364m for CNSW–SNW Option 1: $1.36bn rounded. Class 5b, ±50%; price year unstated. Earlier estimates use different bases and are not comparable.',
 'marinus-link':'The $5.5bn chart figure is not established. AEMO’s $7.57bn is a Project Marinus feedback-loop total in 2023 dollars, including Link and NWTD scope, not a like-for-like Link-only replacement. Stage 2 options differ. The separate $3.8bn CEFC figure is Stage 1 debt funding, not project cost.',
 'new-england-rez':'The chart sums three options from an unarchived draft. The final 2026 ISP reports no New England cost. The superseded 2024 amounts have different scope and must not be added as a replacement. The chart total remains unverified.',
 'project-energyconnect':'$4.1bn is a social-benefit estimate, not construction cost. Transgrid’s 2026 forecast is $3.628bn (real 2022–23), NSW only. It is a proponent application, not an AER-approved amount, and does not state that it includes the SA component.',
 'sydney-ring-south':'The chart’s $3.5bn is consistent with rounding the PADR’s $3.519bn nominal Option 6 estimate. There is no demonstrated transcription error. AEMO’s separate $2.621bn uses 2025 dollars; the older 114 km route is not a like-for-like denominator for the later option.',
 'vni-west-nsw':'No archived whole-project cost is NSW-only. The chart’s $3.7bn split cannot be reconstructed. Current whole-VNI cost is $7.6bn (2025 dollars); half is $3.8bn, with no published state allocation. The approved $948.8m (real 2022–23) covers NSW Stage 1 early works only.',
 'vni-west-victoria':'No source gives a current VIC-only cost of $3.7bn. AEMO’s $7.6bn total (2025 dollars, Class 4: −30%/+50%) has no state allocation. Half is $3.8bn. Older PADR/PACR state splits use different scopes and price bases; they do not establish a current VIC total.',
 'western-renewables-link':'No archived source gives a standalone WRL cost of $1.6bn. The $315m figure (2020–21 dollars) is only the WRL modification cost included in VNI West, not total WRL cost. AEMO leaves WRL’s cost blank.'
 };
 function tighten(value){return String(value??'').replace(/No archived source states/g,'No archived source gives').replace(/No archived source reports/g,'No archived source gives').replace(/The chart's own boundary/g,'The chart scope').replace(/separately stated observations/g,'separate estimates').replace(/as reported by /g,'per ').replace(/in order to /g,'to ').replace(/at this point in time/g,'currently').replace(/has not yet been/g,'has not been').replace(/a total project cost of /g,'a project cost of ').replace(/The original workbook rows exactly as written/g,'Original workbook values').replace(/is expressed in/g,'is in');}
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function note(value,override){
  const original=String(value??'');if(!original)return '';
  const edited=tighten(original);
  // A lead sentence is a preview, not a replacement for the full finding.
  const sentences=[...new Intl.Segmenter('en',{granularity:'sentence'}).segment(edited)].map(x=>x.segment.trim());
  const preview=override||(edited.length>360?sentences.slice(0,sentences[0].length<160?2:1).join(' '):edited);
  return `<p class="brief-note">${escape(preview)}</p>${preview!==original?`<details class="full-note"><summary>Full note</summary><p>${escape(original)}</p></details>`:''}`;
 }
 function field(key){return fields[key]||key.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());}
 function status(value){return String(value||'').replaceAll('_',' ');}
 function apply(){
  const text={
   '#dashboard .kicker':'Project evidence','#dashboard .page-head p':'Select a project to filter all views.',
   '#dashboard .sheet-title h2':'Projects',
   '#chart .kicker':'Original chart','#chart .page-head p':'Original values, checked against sources. Display rounded to four decimals; full values retained.',
   '#chart .sheet-title h2':'Chart and evidence',
   '#policy .kicker':'Source-backed records','#policy .page-head p':'Published figures, scope and caveats. Missing evidence stays blank.',
   '#policy .sheet-title h2':'Non-cost records',
   '#workbook .kicker':'Source records','#workbook .page-head p':'Figures, scope, dates and sources. Expand a note for detail.',
   '#desk .kicker':'Publication checks','#desk .page-head p':'Resolve these findings before publication. Read-only.',
   '#project-filter option:first-child':'All projects',
   '#dl-json':'JSON','#dl-xlsx':'Excel',
   '#chart-unreviewed':'All 10 chart rows reviewed.'
  };
  Object.entries(text).forEach(([selector,value])=>{const node=document.querySelector(selector);if(node)node.textContent=value;});
  document.querySelector('#search').placeholder='Search evidence…';
  const subtitles=document.querySelectorAll('#chart .sheet-title h2');if(subtitles[1])subtitles[1].textContent='Scope and assumptions';if(subtitles[2])subtitles[2].textContent='Cell review';
  document.querySelectorAll('#chart .sheet-title .pill').forEach((n,i)=>n.textContent=['Original values','Evidence notes','Findings and sources'][i]||n.textContent);
  document.querySelectorAll('.compact-legend').forEach(n=>n.innerHTML='<span class="signal green">✓</span> Supported <span class="signal amber">!</span> Qualified <span class="signal red">×</span> Conflict / gap · Hover or tap for detail.');
  document.querySelectorAll('.family-brief .prose>p,.family-brief .verdict>p').forEach(p=>{p.outerHTML=note(p.textContent);});
  document.querySelectorAll('.family-brief .fact dd').forEach(dd=>{if(dd.textContent.length>240)dd.innerHTML=note(dd.textContent);});
  const headers={'Project family':'Project','Family':'Project','Identity / scope':'Scope','Cost verdict':'Cost check','Published value':'Value','Boundary':'Scope','Comparability':'Comparison','Source / pinpoint':'Sources','Selected observation':'Record','Original value':'Chart value','Supported value':'Evidence value','Evidence finding':'Finding','Archive verification':'Archive','Publication':'Document','Millions/trunk KM':'AUD m/trunk km','Cost ($ AUD billion)':'Cost (AUD bn)','Network Capacity (GW)':'Capacity (GW)','Notes / Sources':'Notes'};
  document.querySelectorAll('thead th').forEach(th=>{if(headers[th.textContent])th.textContent=headers[th.textContent];});
  document.querySelectorAll('#sources tbody tr').forEach((tr,i)=>{const summary=tr.cells[4]?.querySelector('.cell-more>summary');if(summary)summary.textContent='SHA-256: '+(D.sources[i]?.hash_status||'not checked');});
  document.querySelectorAll('.label').forEach(n=>{if(n.textContent==='Evidence record')n.textContent='Record';});
  document.querySelectorAll('.verdict h2').forEach(n=>n.textContent='Before publication');
  document.querySelectorAll('.expand-hint').forEach(n=>n.textContent='More');
  document.querySelectorAll('.source-meta>summary').forEach(n=>n.textContent='Source info');
  document.querySelectorAll('#chart-review tbody tr').forEach(tr=>{const td=tr.cells[1];if(td)td.textContent=field(td.textContent.trim());});
 }
 return {field,status,note,tighten,costs,apply};
})();
