/* DocPilot v0.1 — vanilla JS to keep deployment dependency-free. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const el = {
    owner: $('repo-owner'), repo: $('repo-name'), branch: $('repo-branch'), path: $('file-path'),
    files: $('file-list'), filter: $('file-filter'), count: $('files-count'), preview: $('md-preview'),
    source: $('source-editor'), diff: $('diff-view'), area: $('document-area'), empty: $('empty-state'),
    instruction: $('instruction'), run: $('run-button'), runLabel: $('run-label'),
    selection: $('selection-box'), selectionPlaceholder: $('selection-placeholder'), selectionDetails: $('selection-details'),
    selectionCaption: $('selection-caption'), selectionQuote: $('selection-quote'),
    unsaved: $('unsaved-badge'), undo: $('undo-button'), redo: $('redo-button'),
    commit: $('commit-button'), commitMessage: $('commit-message'), note: $('commit-note'),
    feedback: $('feedback-text'), lines: $('line-info'), location: $('doc-location'), stats: $('doc-stats'),
    activity: $('activity-list'), activityCount: $('activity-count'), toast: $('toast'), status: $('connection-status'),
    model: $('model-label'), passwordRow: $('password-row'), password: $('app-password'),
    passwordToggle: $('password-toggle')
  };
  const state = {
    owner:'', repo:'', branch:'', path:'', sha:null, baseContent:'', content:'', url:'',
    history:[], index:0, view:'preview', selection:null, files:[],
    busy:false, demo:false, manualBefore:null, toastTimer:null
  };
  const demo = `# European Physical AI Operations\n\nThis is an **illustrative demo**, not a GitHub file.\n\n## Architecture principles\n\nAn operations center coordinates the robot fleet. Machines use telemetry and a policy execution mechanism. The system should be secure.\n\n## Communications\n\n- **WebRTC** for interactive teleoperation.\n- **QUIC** as a transport option.\n- **PLC integration** for industrial operations.\n\n## Example\n\nA mobile robot is tasked with moving a crate from location A to location B. The operator observes the result.\n\n## Decision table\n\n| Option | Advantage | Risk |\n| --- | --- | --- |\n| WebRTC | Low latency video | Connectivity |\n| QUIC | Flexible transport | Integration complexity |\n\n> Try selecting a sentence and asking the agent to make the explanation more concrete.\n`;

  function notify(message, isError=false) {
    el.toast.textContent = message; el.toast.classList.toggle('error',isError); el.toast.hidden = false;
    if (state.toastTimer) clearTimeout(state.toastTimer);
    state.toastTimer=setTimeout(()=>{el.toast.hidden=true;},6000);
  }
  function readSettings() {
    return {owner:el.owner.value.trim(),repo:el.repo.value.trim(),branch:el.branch.value.trim(),path:el.path.value.trim()};
  }
  function draftKey(s) { return `docpilot:draft:${s.owner}/${s.repo}/${s.branch}/${s.path}`; }
  function storeDraft() {
    if (!state.sha || state.demo) return;
    const key = draftKey(state);
    if (state.baseContent === state.content) { try {localStorage.removeItem(key);} catch {} return; }
    try {localStorage.setItem(key,JSON.stringify({sha:state.sha,base:state.baseContent,content:state.content,history:state.history,index:state.index}));} catch (e) {console.warn('Draft bewaren mislukt',e);}
  }
  function savePrefs() {
    const {owner,repo,branch} = readSettings();
    try {localStorage.setItem('docpilot:prefs',JSON.stringify({owner,repo,branch}));} catch {}
  }
  function loadPrefs() {
    try {const p=JSON.parse(localStorage.getItem('docpilot:prefs')||'null');if(p){el.owner.value=p.owner||el.owner.value;el.repo.value=p.repo||el.repo.value;el.branch.value=p.branch||'main';}} catch{}
  }
  async function api(route, options={}) {
    const headers={'Accept':'application/json',...(options.body ? {'Content-Type':'application/json'} : {})};
    if (el.password.value) headers['X-App-Password']=el.password.value;
    const base = String(window.DOCPILOT_API_BASE_URL || '').replace(/\/$/, '');
    const response=await fetch(`${base}${route}`,{...options,headers:{...headers,...options.headers}});
    let result;try{result=await response.json();}catch{throw Error(`Serverfout (${response.status}).`);}
    if (!response.ok) throw Error(result.error || `HTTP ${response.status}`);
    return result;
  }
  function query(params) {return new URLSearchParams(params).toString();}
  function busy(on,verb='Aanpassen') {
    state.busy=on;el.runLabel.textContent=on?`${verb}…`:'Wijzig selectie';
    el.run.disabled=on||!state.selection||!el.instruction.value.trim();
    el.commit.disabled=on||!state.sha||state.demo||state.content===state.baseContent;
    $('load-button').disabled=on;$('files-button').disabled=on;
    document.querySelectorAll('.quick').forEach(button=>{button.disabled=on||!state.selection;});
  }
  function controlState() {
    const changed=!!state.sha && state.content !== state.baseContent;
    el.unsaved.hidden=!changed;
    el.undo.disabled=state.busy||state.index<=0;
    el.redo.disabled=state.busy||state.index>=state.history.length-1;
    el.commit.disabled=state.busy||!changed||state.demo;
    el.run.disabled=state.busy||!state.selection||!el.instruction.value.trim();
    document.querySelectorAll('.quick').forEach(b=>b.disabled=state.busy||!state.selection);
    el.commitMessage.disabled=state.busy||state.demo||!state.sha;
    el.note.textContent=state.demo?'Demo: committen naar GitHub is uitgeschakeld.':changed?'Controleer eerst de diff; één commit bevat alle conceptwijzigingen.':'Pas meerdere passages aan en commit daarna alles in één keer.';
    el.lines.textContent=state.sha?`${state.content.split('\n').length} regels`:'';
    el.stats.textContent=state.sha?`${state.content.length.toLocaleString('nl-NL')} tekens · ${state.sha.slice(0,7)}`:'—';
    renderActivity();
  }
  function loadState({content,sha,htmlUrl='',owner,repo,branch,path,restore=true,demoMode=false}) {
    state.owner=owner;state.repo=repo;state.branch=branch;state.path=path;state.sha=sha;
    state.baseContent=content;state.content=content;state.url=htmlUrl;state.demo=demoMode;
    state.history=[{content,summary:'Versie op GitHub'}];state.index=0;
    state.selection=null;state.manualBefore=null;
    if(restore&&!demoMode){
      try {
        const saved=JSON.parse(localStorage.getItem(draftKey(state))||'null');
        if (saved && saved.sha===sha && saved.base===content && Array.isArray(saved.history) && Number.isInteger(saved.index) && saved.history[saved.index]?.content===saved.content){
          state.content=saved.content;state.history=saved.history;state.index=saved.index;
          notify('Je niet-gecommitte concept is hersteld vanuit deze browser.');
        }
      } catch {}
    }
    el.owner.value=owner;el.repo.value=repo;el.branch.value=branch;el.path.value=path;
    el.location.textContent=demoMode?'LOKALE DEMO':`${owner}/${repo} · ${branch}`;
    el.commitMessage.value=`docs: improve ${path.split('/').pop()} with AI`;savePrefs();
    view('preview');
    renderFiles();renderSelection();renderDocument();controlState();
  }
  async function listFiles() {
    const s=readSettings();
    if(!s.owner||!s.repo||!s.branch){notify('Vul owner, repository en branch in.',true);return;}
    savePrefs();busy(true,'Bestanden zoeken');el.files.textContent='Bezig met ophalen…';
    try{
      const data=await api(`/api/files?${query({owner:s.owner,repo:s.repo,branch:s.branch})}`);
      state.files=data.files;renderFiles();
      if(data.truncated)notify('GitHub heeft de directorylijst afgekapt; niet alle bestanden worden getoond.',true);
    } catch(e){el.files.textContent='Geen bestanden geladen.';notify(e.message,true);}finally{busy(false);controlState();}
  }
  function renderFiles() {
    el.files.replaceChildren();
    const term=el.filter.value.toLowerCase().trim();const files=state.files.filter(file=>file.toLowerCase().includes(term));
    el.count.textContent=state.files.length?String(state.files.length):'—';
    if(!files.length){const hint=document.createElement('div');hint.className='file-empty';hint.textContent=state.files.length?'Geen match voor dit filter.':'Open een repository om .md-bestanden te zien.';el.files.append(hint);return;}
    for(const file of files.slice(0,500)){
      const b=document.createElement('button');b.className=`file ${file===state.path?'active':''}`;b.textContent=file;b.title=file;
      b.addEventListener('click',()=>{el.path.value=file;loadDocument();});el.files.append(b);
    }
  }
  async function loadDocument() {
    const s=readSettings();if(!s.path){notify('Kies een .md-bestand.',true);return;}
    if(state.content!==state.baseContent&&!confirm('Er zijn niet-gecommitte wijzigingen. Ander document openen? Je concept wordt lokaal bewaard.'))return;
    busy(true,'Laden');
    try{
      const data=await api(`/api/document?${query(s)}`);
      loadState({...data,...s});notify(`${s.path} geopend.`);
    }catch(e){notify(e.message,true);}finally{busy(false);controlState();}
  }
  function view(mode){state.view=mode;document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.view===mode));renderDocument();}
  function renderDocument(){
    if(!state.sha){el.empty.hidden=false;el.preview.hidden=true;el.diff.hidden=true;el.source.hidden=true;return;}
    el.empty.hidden=true;el.preview.hidden=state.view!=='preview';el.diff.hidden=state.view!=='diff';el.source.hidden=state.view!=='source';
    if(state.view==='preview')renderPreview();
    if(state.view==='diff')renderDiff();
    if(state.view==='source'&&document.activeElement!==el.source)el.source.value=state.content;
  }
  function htmlForToken(token,links) {
    const arr=[token];arr.links=links;
    return window.marked.parser(arr,{gfm:true,breaks:false});
  }
  function renderPreview(){
    const prevScroll=el.area.scrollTop;el.preview.replaceChildren();
    if(!window.marked||!window.DOMPurify){const p=document.createElement('pre');p.textContent=state.content;el.preview.append(p);notify('Markdown-bibliotheken konden niet via de CDN laden. Internetverbinding vereist.',true);return;}
    const tokens=window.marked.lexer(state.content,{gfm:true});
    let cursor=0;
    for(const token of tokens){
      const raw=token.raw||'';
      if (!raw) continue;
      const found=state.content.indexOf(raw,cursor);
      const start=found<0?cursor:found;const end=start+raw.length;cursor=end;
      if(token.type==='space'||token.type==='def')continue;
      const block=document.createElement('div');block.className='md-block';
      block.dataset.mdBlock='true';block.dataset.sourceStart=String(start);block.dataset.sourceEnd=String(end);
      const html=window.DOMPurify.sanitize(htmlForToken(token,tokens.links),{USE_PROFILES:{html:true}});
      block.innerHTML=html;
      if(state.selection && start>=state.selection.start && end<=state.selection.end)block.classList.add('selected-block');
      el.preview.append(block);
    }
    el.area.scrollTop=prevScroll;
  }
  function getSelectedBlocks(range){
    return [...el.preview.querySelectorAll('[data-md-block]')].filter(node=>{
      try{return range.intersectsNode(node);}catch{return false;}
    });
  }
  function selectionFromPage() {
    if(state.view!=='preview'||!state.sha||state.busy)return;
    const selection=window.getSelection();if(!selection||selection.isCollapsed||!el.preview.contains(selection.anchorNode)||!el.preview.contains(selection.focusNode))return;
    const blocks=getSelectedBlocks(selection.getRangeAt(0));if(!blocks.length)return;
    const start=Number(blocks[0].dataset.sourceStart),end=Number(blocks[blocks.length-1].dataset.sourceEnd);
    setSelection({start,end,selectedText:selection.toString().trim().slice(0,10000)});
  }
  function setSelection(value) {
    state.selection=value;renderSelection();
    el.preview.querySelectorAll('[data-md-block]').forEach(block=>{
      const start=Number(block.dataset.sourceStart),end=Number(block.dataset.sourceEnd);
      block.classList.toggle('selected-block',!!value&&start>=value.start&&end<=value.end);
    });
    controlState();
  }
  function renderSelection(){
    const s=state.selection;
    el.selection.classList.toggle('no-selection',!s);el.selectionPlaceholder.hidden=!!s;el.selectionDetails.hidden=!s;
    if(!s){el.feedback.textContent='Selecteer een alinea of markeer tekst om de agent context te geven.';return;}
    const line=state.content.slice(0,s.start).split('\n').length;
    const ends=state.content.slice(0,s.end).split('\n').length;
    el.selectionCaption.textContent=`REGELS ${line}${line!==ends?`–${ends}`:''} · ${s.end-s.start} brontekens`;
    const target=s.selectedText||state.content.slice(s.start,s.end);
    el.selectionQuote.textContent=target.length>550?target.slice(0,550)+'…':target;
    el.feedback.textContent=`Selectie: regels ${line}–${ends}. De agent vervangt alleen dit bronblok.`;
  }
  function pushChange(newContent,summary){
    if(newContent===state.content){notify('Geen tekstwijziging voorgesteld.');return;}
    const before=state.content;
    state.history=state.history.slice(0,state.index+1);
    // Manual editing can transiently differ from history; include the prior snapshot.
    if(state.history[state.index].content!==before)state.history.push({content:before,summary:'Handmatige wijzigingen'});
    state.history.push({content:newContent,summary:summary||'Tekst bijgewerkt'});
    state.index=state.history.length-1;state.content=newContent;state.selection=null;
    storeDraft();renderSelection();renderDocument();controlState();
  }
  function undo(){if(state.index<=0||state.busy)return;state.index--;state.content=state.history[state.index].content;state.selection=null;storeDraft();renderSelection();renderDocument();controlState();}
  function redo(){if(state.index>=state.history.length-1||state.busy)return;state.index++;state.content=state.history[state.index].content;state.selection=null;storeDraft();renderSelection();renderDocument();controlState();}
  async function runAgent(suggested=''){
    if(state.busy||!state.selection){notify('Selecteer eerst een passage in de gerenderde Markdown.',true);return;}
    const instruction=(suggested||el.instruction.value).trim();if(!instruction){notify('Geef een instructie.',true);return;}
    const current={...state.selection};
    busy(true,'Agent werkt');
    try{
      const data=await api('/api/edit',{method:'POST',body:JSON.stringify({content:state.content,start:current.start,end:current.end,selectedText:current.selectedText,instruction})});
      pushChange(data.content,data.summary||instruction.slice(0,90));
      el.instruction.value='';notify(data.summary||'Wijziging toegepast op je concept.');
    }catch(e){notify(`Agent: ${e.message}`,true);}finally{busy(false);controlState();}
  }
  async function commit(){
    if(state.busy||state.demo||!state.sha||state.content===state.baseContent)return;
    const message=el.commitMessage.value.trim();if(!message){notify('Vul een commitbericht in.',true);return;}
    if(!confirm(`Alle ${state.index} conceptstappen als één commit naar ${state.owner}/${state.repo} (${state.branch}) schrijven?\n\n${message}`))return;
    busy(true,'Committen');
    try{
      const result=await api('/api/commit',{method:'POST',body:JSON.stringify({owner:state.owner,repo:state.repo,branch:state.branch,path:state.path,baseSha:state.sha,content:state.content,message})});
      state.baseContent=state.content;state.sha=result.sha;
      state.history=[{content:state.content,summary:'Versie op GitHub'}];state.index=0;state.selection=null;
      try {localStorage.removeItem(draftKey(state));} catch {} renderSelection();renderDocument();
      notify(`Commit geslaagd! ${result.commitSha?.slice(0,8)||''}${result.commitUrl?' · '+result.commitUrl:''}`);
      if(result.commitUrl){el.note.replaceChildren();const a=document.createElement('a');a.href=result.commitUrl;a.target='_blank';a.rel='noopener noreferrer';a.textContent=`Bekijk commit ${result.commitSha?.slice(0,8)||''} op GitHub`;el.note.append(a);}
    }catch(e){notify(`Commit niet uitgevoerd: ${e.message}`,true);}finally{busy(false);controlState();}
  }
  // A compact line-level LCS diff. For very large files, fall back to a bounded prefix/suffix diff.
  function diffLines(a,b){
    const old=a.split('\n'),now=b.split('\n'),n=old.length,m=now.length;
    if(n*m>1_200_000){let start=0;while(start<n&&start<m&&old[start]===now[start])start++;
      let i=n-1,j=m-1;while(i>=start&&j>=start&&old[i]===now[j]){i--;j--;}
      return [...old.slice(0,start).map(text=>({kind:'same',text})),...old.slice(start,i+1).map(text=>({kind:'remove',text})),...now.slice(start,j+1).map(text=>({kind:'add',text})),...old.slice(i+1).map(text=>({kind:'same',text}))];}
    const dp=Array.from({length:n+1},()=>new Uint32Array(m+1));
    for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)dp[i][j]=old[i]===now[j]?1+dp[i+1][j+1]:Math.max(dp[i+1][j],dp[i][j+1]);
    const rows=[];let i=0,j=0;while(i<n||j<m){if(i<n&&j<m&&old[i]===now[j]){rows.push({kind:'same',text:old[i]});i++;j++;}else if(j<m&&(i===n||dp[i][j+1]>=dp[i+1][j]))rows.push({kind:'add',text:now[j++]});else rows.push({kind:'remove',text:old[i++]});}return rows;
  }
  function renderDiff(){
    el.diff.replaceChildren();
    const h=document.createElement('div');h.className='diff-head';h.textContent=`${state.path} · origineel ↔ concept`;el.diff.append(h);
    if(state.baseContent===state.content){const p=document.createElement('p');p.className='diff-empty';p.textContent='Nog geen wijzigingen. Selecteer een passage en geef de agent een opdracht.';el.diff.append(p);return;}
    const data=diffLines(state.baseContent,state.content);
    // Collapse unchanged stretches to three context lines around changes.
    const show=new Set();data.forEach((row,i)=>{if(row.kind!=='same')for(let j=Math.max(0,i-3);j<=Math.min(data.length-1,i+3);j++)show.add(j);});
    let skipped=false;
    data.forEach((row,i)=>{
      if(row.kind==='same'&&!show.has(i)){if(!skipped){const sep=document.createElement('div');sep.className='diff-line same';sep.textContent='   ··· ongewijzigde regels ···';el.diff.append(sep);}skipped=true;return;}skipped=false;
      const line=document.createElement('div');line.className=`diff-line ${row.kind}`;
      const sign=document.createElement('span');sign.className='sign';sign.textContent=row.kind==='add'?'+':row.kind==='remove'?'-':' ';
      const text=document.createElement('span');text.textContent=row.text||' ';line.append(sign,text);el.diff.append(line);
    });
  }
  function renderActivity(){
    el.activity.replaceChildren();
    const applied=state.history.slice(1,state.index+1);
    el.activityCount.textContent=String(applied.length);
    if(!applied.length){const empty=document.createElement('div');empty.className='activity-empty';empty.textContent='Je wijzigingen verschijnen hier. Je kunt ze eerst bekijken en ongedaan maken.';el.activity.append(empty);return;}
    applied.slice(-10).reverse().forEach((step,i)=>{
      const d=document.createElement('div');d.className='activity-entry';const number=document.createElement('span');number.className='num';number.textContent=String(applied.length-i).padStart(2,'0');
      const content=document.createElement('div');content.textContent=step.summary;d.append(number,content);el.activity.append(d);
    });
  }
  function manualInput(){
    if(!state.sha)return;
    state.content=el.source.value;state.selection=null;
    storeDraft();controlState();
  }
  function manualComplete(){
    if(state.manualBefore===null)return;
    const original=state.manualBefore;state.manualBefore=null;
    if(state.content!==original){const next=state.content;state.content=original;pushChange(next,'Markdown handmatig aangepast');}
  }
  function showDemo(){
    if(state.sha&&state.content!==state.baseContent&&!confirm('Concept sluiten om demo te openen? Het GitHub-concept blijft lokaal bewaard.'))return;
    loadState({content:demo,sha:'demo000000000000000000000000000000000000',owner:'demo',repo:'physical-ai',branch:'local',path:'architecture.md',demoMode:true,restore:false});
    notify('Demo geladen. Markeer tekst om de in-context selectie te proberen. AI-opdrachten vereisen een API-sleutel.');
  }
  async function health(){
    try{const d=await api('/api/health');el.status.textContent=d.githubConfigured&&d.aiConfigured?'GitHub + AI ingesteld':'Configuratie nodig (.env)';el.status.classList.toggle('warning',!(d.githubConfigured&&d.aiConfigured));el.model.textContent=d.model+' · gericht herschrijven';el.passwordToggle.hidden=!d.requiresAuth;}
    catch{el.status.textContent='Server niet bereikbaar';el.status.classList.add('warning');}
  }
  function attach(){
    $('files-button').addEventListener('click',listFiles);$('load-button').addEventListener('click',loadDocument);$('demo-button').addEventListener('click',showDemo);
    el.path.addEventListener('keydown',e=>{if(e.key==='Enter')loadDocument();});
    el.filter.addEventListener('input',renderFiles);
    for(const field of [el.owner,el.repo,el.branch])field.addEventListener('change',savePrefs);
    document.querySelectorAll('.tab').forEach(button=>button.addEventListener('click',()=>{manualComplete();view(button.dataset.view);el.area.scrollTop=0;}));
    el.preview.addEventListener('mouseup',()=>setTimeout(selectionFromPage,0));
    el.preview.addEventListener('touchend',()=>setTimeout(selectionFromPage,100));
    document.addEventListener('selectionchange',()=>{
      if(state.view==='preview'&&document.activeElement!==el.instruction&&document.activeElement!==el.source){/* intentionally do not auto-clear selection */}
    });
    el.preview.addEventListener('click',e=>{
      if(e.target.closest('a'))return;
      const sel=window.getSelection();if(sel&&!sel.isCollapsed)return;
      const block=e.target.closest('[data-md-block]');if(!block)return;
      setSelection({start:Number(block.dataset.sourceStart),end:Number(block.dataset.sourceEnd),selectedText:''});
    });
    el.instruction.addEventListener('input',controlState);
    el.instruction.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();runAgent();}});
    document.querySelectorAll('.quick[data-prompt]').forEach(button=>button.addEventListener('click',()=>runAgent(button.dataset.prompt)));
    $('custom-replace').addEventListener('click',()=>{el.instruction.value='Vervang de geselecteerde tekst door: ';el.instruction.focus();controlState();});
    el.run.addEventListener('click',()=>runAgent());el.commit.addEventListener('click',commit);
    el.undo.addEventListener('click',undo);el.redo.addEventListener('click',redo);
    el.source.addEventListener('focus',()=>{state.manualBefore=state.content;});
    el.source.addEventListener('input',manualInput);el.source.addEventListener('blur',manualComplete);
    el.passwordToggle.addEventListener('click',()=>{el.passwordRow.hidden=!el.passwordRow.hidden;});
    document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='z'&&e.target!==el.source&&e.target!==el.instruction){e.preventDefault();e.shiftKey?redo():undo();}});
  }
  loadPrefs();attach();controlState();health();
})();
