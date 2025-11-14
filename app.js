// ===== Utils =====
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const todayStr = () => new Date().toISOString().slice(0,10);
const nowTs = () => Date.now();

const STORAGE_SESSION = 'mototrap_session';
function userKey(username){ return `mototrap_user_${username}`; }

// === Bootstrap Sync com config Firebase ===
(function bootstrapSync(){
  try{
    const sess = JSON.parse(localStorage.getItem(STORAGE_SESSION) || 'null');
    if(!sess?.username) return;
    const key = userKey(sess.username);
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    data.settings = data.settings || {};
    data.settings.goals = data.settings.goals || { daily:{earn:null,km:null,hours:null}, weekly:{earn:null,km:null,hours:null}, monthly:{earn:null,km:null,hours:null} };
    data.settings.sync = { enabled: true, useAuth: true, provider: 'firebase', firebaseConfig: {"apiKey": "AIzaSyAMKbphUhMV7a1OMqjebbwQzRKttdGMgFc", "authDomain": "mototrap-930a0.firebaseapp.com", "projectId": "mototrap-930a0", "storageBucket": "mototrap-930a0.firebasestorage.app", "messagingSenderId": "404418752322", "appId": "1:404418752322:web:e4ffad63a0c882e54f22db"}, lastSync: null, uid: null };
    data.meta = data.meta || {}; data.meta.updatedAt = data.meta.updatedAt || 0;
    localStorage.setItem(key, JSON.stringify(data));
  }catch(e){ console.warn('Bootstrap Sync falhou:', e); }
})();

// ===== Data layer =====
function loadUserData(username){
  const base = {
    earnings:{uber:[], ninetynine:[]},
    expenses:[],
    work:[],
    settings:{
      goals:{ daily:{earn:null,km:null,hours:null}, weekly:{earn:null,km:null,hours:null}, monthly:{earn:null,km:null,hours:null} },
      sync:{ enabled:false, useAuth:false, provider:'firebase', firebaseConfig:null, lastSync:null, uid:null }
    },
    meta:{ updatedAt: 0 }
  };
  try { return Object.assign(base, JSON.parse(localStorage.getItem(userKey(username))||'{}')); }
  catch { return base; }
}
function saveUserData(username, data){ localStorage.setItem(userKey(username), JSON.stringify(data)); }

let currentUser = null; let currentGainTab = 'uber';
function ensureSession(){ const sess = JSON.parse(localStorage.getItem(STORAGE_SESSION) || 'null'); if(!sess?.username){ window.location.href='login.html'; return null; } return sess.username; }
function showApp(){ $('#currentUser').textContent='@'+currentUser; }
function logout(){ localStorage.removeItem(STORAGE_SESSION); window.location.href='login.html'; }

// ===== UI Tabs =====
function switchTab(name){ $$('.tab').forEach(t=> t.classList.toggle('active', t.dataset.tab===name)); $$('.tab-content').forEach(c=> c.classList.toggle('visible', c.id===`tab-${name}`)); if(name==='dashboard') drawChart(); if(name==='metas') loadGoalsToForm(); if(name==='config') refreshSyncUi(); }
function switchGainTab(name){ currentGainTab=name; $$('.subtab').forEach(b=> b.classList.toggle('active', b.dataset.gain===name)); $('#gainTabName').textContent = name==='uber'? 'Uber':'99'; refreshEarnTable(); }

// ===== Helpers =====
function getData(){ return loadUserData(currentUser); }
function setData(updater){ const data=getData(); const newData=updater(data)||data; newData.meta=newData.meta||{}; newData.meta.updatedAt=nowTs(); saveUserData(currentUser,newData); refreshAll(); schedulePush(); }
function refreshAll(){ refreshStats(); refreshEarnTable(); refreshExpTable(); refreshWorkTable(); drawChart(); renderGoalsProgress(); renderGoalsLive(); }

// ===== Stats =====
function refreshStats(){ const data=getData(); const month=$('#filterMonth').value||new Date().toISOString().slice(0,7); const sum=arr=>arr.reduce((s,x)=>s+Number(x.amount||0),0); const inMonth=d=>(d.date||'').startsWith(month); const eUber=sum(data.earnings.uber.filter(inMonth)); const e99=sum(data.earnings.ninetynine.filter(inMonth)); const exp=sum(data.expenses.filter(inMonth)); $('#statEarnings').textContent=brl(eUber+e99); $('#statExpenses').textContent=brl(exp); $('#statProfit').textContent=brl(eUber+e99-exp); }

// ===== Tables =====
function refreshEarnTable(){ const data=getData(); const tbody=$('#earnTable tbody'); tbody.innerHTML=''; const rows=(currentGainTab==='uber'? data.earnings.uber: data.earnings.ninetynine).slice().sort((a,b)=>(a.date||'').localeCompare(b.date)); let total=0; for(const item of rows){ total+=Number(item.amount||0); const tr=document.createElement('tr'); tr.innerHTML=`<td>${item.date}</td><td>${brl(Number(item.amount||0))}</td><td class="actions"><button class="icon-btn danger">Excluir</button></td>`; $('button',tr).addEventListener('click',()=>{ setData(data=>{ const list=currentGainTab==='uber'? data.earnings.uber: data.earnings.ninetynine; const idx=list.findIndex(x=>x===item); if(idx>=0) list.splice(idx,1); }); }); tbody.appendChild(tr); } $('#earnTotal').textContent=brl(total); }
function refreshExpTable(){ const data=getData(); const tbody=$('#expTable tbody'); tbody.innerHTML=''; const rows=data.expenses.slice().sort((a,b)=>(a.date||'').localeCompare(b.date)); let total=0; for(const item of rows){ total+=Number(item.amount||0); const tr=document.createElement('tr'); tr.innerHTML=`<td>${item.date}</td><td>${item.title||''}</td><td>${brl(Number(item.amount||0))}</td><td class="actions"><button class="icon-btn danger">Excluir</button></td>`; $('button',tr).addEventListener('click',()=>{ setData(data=>{ const idx=data.expenses.findIndex(x=>x===item); if(idx>=0) data.expenses.splice(idx,1); }); }); tbody.appendChild(tr); } $('#expTotal').textContent=brl(total); }
function refreshWorkTable(){ const data=getData(); const tbody=$('#workTable tbody'); tbody.innerHTML=''; const rows=data.work.slice().sort((a,b)=>(a.date||'').localeCompare(b.date)); let sumKm=0,sumH=0; for(const item of rows){ sumKm+=Number(item.km||0); sumH+=Number(item.hours||0); const tr=document.createElement('tr'); tr.innerHTML=`<td>${item.date}</td><td>${Number(item.km||0)}</td><td>${Number(item.hours||0)}</td><td class="actions"><button class="icon-btn danger">Excluir</button></td>`; $('button',tr).addEventListener('click',()=>{ setData(data=>{ const idx=data.work.findIndex(x=>x===item); if(idx>=0) data.work.splice(idx,1); }); }); tbody.appendChild(tr); } const n=rows.length||1; $('#avgKm').textContent=(sumKm/n).toFixed(1); $('#avgHours').textContent=(sumH/n).toFixed(1); }

// ===== Chart =====
function drawChart(){ const canvas=$('#chartCanvas'); const ctx=canvas.getContext('2d'); const W=canvas.width=canvas.clientWidth*devicePixelRatio; const H=canvas.height=220*devicePixelRatio; ctx.scale(devicePixelRatio,devicePixelRatio); ctx.clearRect(0,0,W,H); const data=getData(); const month=$('#filterMonth').value||new Date().toISOString().slice(0,7); const days={}; const add=(k,v)=>days[k]=(days[k]||0)+v; for(const e of data.earnings.uber){ if(e.date?.startsWith(month)) add(e.date+':earn', Number(e.amount||0)); } for(const e of data.earnings.ninetynine){ if(e.date?.startsWith(month)) add(e.date+':earn', Number(e.amount||0)); } for(const d of data.expenses){ if(d.date?.startsWith(month)) add(d.date+':exp', Number(d.amount||0)); } const labels=Array.from(new Set(Object.keys(days).map(k=>k.split(':')[0]))).sort(); const earnVals=labels.map(day=>days[day+':earn']||0); const expVals=labels.map(day=>days[day+':exp']||0); const pad={ l:40, r:12, t:10, b:26 }; const innerW=canvas.clientWidth-pad.l-pad.r; const innerH=(H/devicePixelRatio)-pad.t-pad.b; ctx.translate(pad.l,pad.t); const maxVal=Math.max(1,...earnVals,...expVals); const yStep=Math.max(1, Math.pow(10, Math.floor(Math.log10(maxVal)) - 1)); const yMax=Math.ceil(maxVal / yStep) * yStep; ctx.strokeStyle='rgba(255,255,255,.08)'; ctx.lineWidth=1; const gridLines=4; for(let i=0;i<=gridLines;i++){ const y=innerH - (i/gridLines)*innerH; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(innerW,y); ctx.stroke(); const label=(yMax * i / gridLines); ctx.fillStyle='rgba(200,210,240,.85)'; ctx.font='12px system-ui'; ctx.fillText(label.toLocaleString('pt-BR'), -36, y+4); } const n=labels.length; const groupW=Math.max(20, innerW/Math.max(n,1)); const barW=Math.min(16,(groupW-10)/2); const yScale=v=> innerH - (v/yMax)*innerH; for(let i=0;i<n;i++){ const x0=i*groupW+10; ctx.fillStyle='#5b8cff'; const h1=innerH - yScale(earnVals[i]); ctx.fillRect(x0, yScale(earnVals[i]), barW, h1); ctx.fillStyle='#ff6b9b'; const h2=innerH - yScale(expVals[i]); ctx.fillRect(x0+barW+6, yScale(expVals[i]), barW, h2); ctx.fillStyle='rgba(200,210,240,.9)'; ctx.font='11px system-ui'; const d=labels[i].slice(-2); ctx.fillText(d, x0, innerH + 16); } ctx.fillStyle='#5b8cff'; ctx.fillRect(innerW - 140, 4, 10, 10); ctx.fillStyle='rgba(220,230,255,.9)'; ctx.font='12px system-ui'; ctx.fillText('Ganhos', innerW - 124, 13); ctx.fillStyle='#ff6b9b'; ctx.fillRect(innerW - 80, 4, 10, 10); ctx.fillStyle='rgba(220,230,255,.9)'; ctx.fillText('Despesas', innerW - 64, 13); ctx.setTransform(1,0,0,1,0,0); }

// ===== Goals =====
function loadGoalsToForm(){ const {settings:{goals}} = getData(); $('#gDailyEarn').value = goals.daily.earn ?? ''; $('#gDailyKm').value = goals.daily.km ?? ''; $('#gDailyHours').value = goals.daily.hours ?? ''; $('#gWeeklyEarn').value = goals.weekly.earn ?? ''; $('#gWeeklyKm').value = goals.weekly.km ?? ''; $('#gWeeklyHours').value = goals.weekly.hours ?? ''; $('#gMonthlyEarn').value = goals.monthly.earn ?? ''; $('#gMonthlyKm').value = goals.monthly.km ?? ''; $('#gMonthlyHours').value = goals.monthly.hours ?? ''; }
function renderGoalsProgress(){ const data=getData(); const month=$('#filterMonth').value || new Date().toISOString().slice(0,7); const sum=arr=>arr.reduce((s,x)=>s+Number(x.amount||0),0); const inMonth=d=>(d.date||'').startsWith(month); const earn=sum(data.earnings.uber.filter(inMonth))+sum(data.earnings.ninetynine.filter(inMonth)); const workM=data.work.filter(w=>w.date?.startsWith(month)); const km=workM.reduce((s,w)=>s+Number(w.km||0),0); const horas=workM.reduce((s,w)=>s+Number(w.hours||0),0); const {goals}=data.settings; const rows=[ {label:'Ganhos (mês)', value:earn, goal:goals.monthly.earn}, {label:'KM (mês)', value:km, goal:goals.monthly.km}, {label:'Horas (mês)', value:horas, goal:goals.monthly.hours} ]; $('#goalsProgress').innerHTML = rows.map(r=>progressRow(r.label, r.value, r.goal)).join(''); }
function renderGoalsLive(){ const data=getData(); const today=todayStr(); const sum=arr=>arr.reduce((s,x)=>s+Number(x.amount||0),0); const earn=sum(data.earnings.uber.filter(e=>e.date===today))+sum(data.earnings.ninetynine.filter(e=>e.date===today)); const workD=data.work.find(w=>w.date===today)||{km:0,hours:0}; const {goals}=data.settings; const rows=[ {label:'Ganhos (hoje)', value:earn, goal:goals.daily.earn}, {label:'KM (hoje)', value:workD.km||0, goal:goals.daily.km}, {label:'Horas (hoje)', value:workD.hours||0, goal:goals.daily.hours} ]; $('#goalsLive').innerHTML = rows.map(r=>progressRow(r.label, r.value, r.goal)).join(''); }
function progressRow(label, value, goal){ const pct = goal? Math.min(100, Math.round((value/goal)*100)) : 0; const cls = goal? (pct<50? 'danger' : (pct<90? 'warn':'') ) : ''; return `<div style="margin:10px 16px 12px"><div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:6px"><span>${label}</span><span>${goal? `${value.toLocaleString('pt-BR')} / ${goal.toLocaleString('pt-BR')}` : value.toLocaleString('pt-BR')}</span></div><div class="progress"><div class="bar ${cls}" style="width:${pct}%"></div></div></div>`; }
function handleSaveGoals(e){ e.preventDefault(); setData(data=>{ const g=data.settings.goals; g.daily.earn = numOrNull($('#gDailyEarn').value); g.daily.km = numOrNull($('#gDailyKm').value); g.daily.hours = numOrNull($('#gDailyHours').value); g.weekly.earn = numOrNull($('#gWeeklyEarn').value); g.weekly.km = numOrNull($('#gWeeklyKm').value); g.weekly.hours = numOrNull($('#gWeeklyHours').value); g.monthly.earn = numOrNull($('#gMonthlyEarn').value); g.monthly.km = numOrNull($('#gMonthlyKm').value); g.monthly.hours = numOrNull($('#gMonthlyHours').value); }); }
function numOrNull(v){ const n=Number(v); return isNaN(n) || v==='' ? null : n; }

// ===== Backup manual =====
function exportJson(){ const data=getData(); const blob=new Blob([JSON.stringify(data,null,2)], {type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`mototrap_${currentUser}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 1000); }
function importJson(file){ const reader=new FileReader(); reader.onload=()=>{ try{ const obj=JSON.parse(reader.result); saveUserData(currentUser, obj); refreshAll(); alert('Importado com sucesso!'); } catch(e){ alert('Arquivo inválido.'); } }; reader.readAsText(file); }

// ===== Sync (Firebase Firestore) =====
let fb = { app:null, db:null, auth:null, ready:false, pushing:false, timer:null };
function refreshSyncUi(){ const data=getData(); const st = data.settings.sync?.enabled? `Ativo. Último sync: ${data.settings.sync.lastSync? new Date(data.settings.sync.lastSync).toLocaleString('pt-BR') : '—'}` : 'Sincronização desativada.'; $('#syncStatus').textContent = st; }
function schedulePush(){ clearTimeout(fb.timer); fb.timer = setTimeout(()=> pushAll().catch(console.error), 1500); }
async function ensureFirebase(){ const data=getData(); const cfg=data.settings.sync?.firebaseConfig; if(!data.settings.sync?.enabled || !cfg) return false; if(fb.ready) return true; await loadScript('https://www.gstatic.com/firebasejs/10.13.1/firebase-app-compat.js'); await loadScript('https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore-compat.js'); await loadScript('https://www.gstatic.com/firebasejs/10.13.1/firebase-auth-compat.js'); fb.app = firebase.initializeApp(cfg); fb.db = firebase.firestore(); fb.auth = firebase.auth(); try{ await fb.auth.setPersistence('local'); }catch(e){} fb.ready = true; return true; }
function loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=()=>res(); s.onerror=()=>rej(new Error('Falha ao carregar '+src)); document.head.appendChild(s); }); }
async function pullAll(){ const data=getData(); if(!(await ensureFirebase())) return false; try{
    let docRef, remote;
    if(data.settings.sync.useAuth && fb.auth.currentUser){ const uid = fb.auth.currentUser.uid; data.settings.sync.uid = uid; docRef = fb.db.collection('mototrap').doc('users').collection('data').doc(uid); }
    else { docRef = fb.db.collection('mototrap_public').doc(currentUser); }
    const snap = await docRef.get();
    if(snap.exists){ remote = snap.data(); const local = data;
      if((remote.meta?.updatedAt||0) > (local.meta?.updatedAt||0)){ saveUserData(currentUser, remote); $('#syncStatus').textContent = 'Dados atualizados do servidor.'; }
      else { await docRef.set(local); $('#syncStatus').textContent = 'Servidor atualizado com dados locais.'; }
    } else { await docRef.set(data); $('#syncStatus').textContent = 'Criado backup remoto inicial.'; }
    data.settings.sync.lastSync = nowTs(); saveUserData(currentUser, data); return true;
  }catch(e){ console.error(e); $('#syncStatus').textContent = 'Erro ao sincronizar: '+e.message; return false; }
}
async function pushAll(){ const data=getData(); if(!(await ensureFirebase())) return false; if(fb.pushing) return; fb.pushing=true; try{
    let docRef;
    if(data.settings.sync.useAuth && fb.auth.currentUser){ const uid = fb.auth.currentUser.uid; data.settings.sync.uid = uid; docRef = fb.db.collection('mototrap').doc('users').collection('data').doc(uid); }
    else { docRef = fb.db.collection('mototrap_public').doc(currentUser); }
    await docRef.set(data); data.settings.sync.lastSync = nowTs(); saveUserData(currentUser, data); $('#syncStatus').textContent = 'Enviado ao servidor.'; return true;
  }catch(e){ console.error(e); $('#syncStatus').textContent='Erro ao enviar: '+e.message; return false; }
  finally{ fb.pushing=false; }
}

// ===== Init =====
window.addEventListener('DOMContentLoaded', async ()=>{
  currentUser = ensureSession(); if(!currentUser) return; showApp(); $('#year').textContent = new Date().getFullYear();
  $('#btnLogout').addEventListener('click', logout);
  $$('.tab').forEach(btn => btn.addEventListener('click', ()=> switchTab(btn.dataset.tab)));
  $$('.subtab').forEach(btn => btn.addEventListener('click', ()=> switchGainTab(btn.dataset.gain)));
  $('#earnDate').value = todayStr(); $('#expDate').value = todayStr(); $('#workDate').value = todayStr(); $('#filterMonth').value = new Date().toISOString().slice(0,7);
  $('#earnForm').addEventListener('submit', (e)=>{ e.preventDefault(); const entry={ date:$('#earnDate').value, platform:$('#earnPlatform').value, amount:Number($('#earnAmount').value) }; if(!entry.date || !(entry.amount>=0)) return; setData(data => { data.earnings[entry.platform].push({ date: entry.date, amount: entry.amount }); }); $('#earnAmount').value = ''; });
  $('#expenseForm').addEventListener('submit', (e)=>{ e.preventDefault(); const entry={ date:$('#expDate').value, title:$('#expTitle').value.trim(), amount:Number($('#expAmount').value) }; if(!entry.date || !entry.title || !(entry.amount>=0)) return; setData(data => { data.expenses.push(entry); }); $('#expTitle').value = ''; $('#expAmount').value = ''; });
  $('#workForm').addEventListener('submit', (e)=>{ e.preventDefault(); const entry={ date:$('#workDate').value, km:Number($('#workKm').value), hours:Number($('#workHours').value) }; if(!entry.date || !(entry.km>=0) || !(entry.hours>=0)) return; setData(data => { const idx = data.work.findIndex(w => w.date === entry.date); if(idx>=0) data.work[idx] = entry; else data.work.push(entry); }); $('#workKm').value = ''; $('#workHours').value = ''; });
  $('#goalsForm').addEventListener('submit', handleSaveGoals);
  $('#btnExport').addEventListener('click', exportJson);
  $('#fileImport').addEventListener('change', (e)=>{ const f=e.target.files?.[0]; if(f) importJson(f); });
  $('#btnTestSync').addEventListener('click', async ()=>{ const ok = await pullAll(); alert(ok? 'Conectado e sincronizado.' : 'Falha ao conectar.'); });
  $('#btnSyncNow').addEventListener('click', async ()=>{ const ok = await pushAll(); alert(ok? 'Enviado com sucesso.' : 'Falha ao enviar.'); });
  $('#btnClearSync').addEventListener('click', ()=>{ setData(data=>{ data.settings.sync={ enabled:false, useAuth:false, provider:'firebase', firebaseConfig:null, lastSync:null, uid:null }; }); refreshSyncUi(); alert('Config de Sync removida.'); });
  refreshAll();
  if(getData().settings.sync?.enabled){ await pullAll(); }
});
