// ===== UTIL =====
function onReady(fn){ if(document.readyState==="complete"||document.readyState==="interactive") setTimeout(fn,1); else document.addEventListener("DOMContentLoaded",fn); }
const store = { get:(k,f)=>{ try{ const v=JSON.parse(localStorage.getItem(k)); return v??f; }catch{ return f; } }, set:(k,v)=>localStorage.setItem(k, JSON.stringify(v)) };

// ===== TIMER DA JORNADA DO DIA =====
function formatTimer(ms){ const totalSec=Math.floor(ms/1000); const h=String(Math.floor(totalSec/3600)).padStart(2,'0'); const m=String(Math.floor((totalSec%3600)/60)).padStart(2,'0'); const s=String(totalSec%60).padStart(2,'0'); return `${h}:${m}:${s}`; }
let timerDisplay, btnStart, btnStop; const WORK_TIMER_STARTED='mototrap_work_started'; let timerInterval=null;
function bindTimerElements(){ timerDisplay=document.getElementById('workTimerDisplay'); btnStart=document.getElementById('btnStartWork'); btnStop=document.getElementById('btnStopWork'); }
function updateTimer(){ if(!timerDisplay) return; const started=localStorage.getItem(WORK_TIMER_STARTED); if(started){ const elapsed=Date.now()-Number(started); timerDisplay.textContent=formatTimer(elapsed); } else { timerDisplay.textContent="00:00:00"; } }
function checkTimerOnLoad(){ if(!btnStart||!btnStop||!timerDisplay) return; if(localStorage.getItem(WORK_TIMER_STARTED)){ btnStart.style.display='none'; btnStop.style.display=''; if(!timerInterval) timerInterval=setInterval(updateTimer,1000); updateTimer(); } else { btnStart.style.display=''; btnStop.style.display='none'; timerDisplay.textContent="00:00:00"; clearInterval(timerInterval); timerInterval=null; } }
function startJornada(){ localStorage.setItem(WORK_TIMER_STARTED, Date.now()); if(btnStart) btnStart.style.display='none'; if(btnStop) btnStop.style.display=''; updateTimer(); if(!timerInterval) timerInterval=setInterval(updateTimer,1000); }
function stopJornada(){
  const started=Number(localStorage.getItem(WORK_TIMER_STARTED)); if(!started) return;
  const ended=Date.now(); const elapsedMs=ended-started;
  const elapsedHours=+(elapsedMs/3_600_000).toFixed(2); // CORRETO: ms -> horas
  let workHistory=store.get('mototrap_work_history', []);
  workHistory.push({ date:new Date(started).toISOString().slice(0,10), km:0, hours:elapsedHours });
  store.set('mototrap_work_history', workHistory);
  updateWorkTable(); updateEarnExpenseChart(); updateResumo();
  localStorage.removeItem(WORK_TIMER_STARTED);
  if(btnStart) btnStart.style.display=''; if(btnStop) btnStop.style.display='none';
  clearInterval(timerInterval); timerInterval=null; if(timerDisplay) timerDisplay.textContent="00:00:00";
}

// ===== TABELA DE HORAS TRABALHADAS =====
function updateWorkTable(){
  const tbody=document.querySelector('#workTable tbody'); if(!tbody) return;
  let workHistory=store.get('mototrap_work_history', []); tbody.innerHTML='';
  let totalKm=0,totalHours=0;
  workHistory.forEach((entry,idx)=>{
    totalKm+=Number(entry.km); totalHours+=Number(entry.hours);
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>${entry.date}</td>
      <td><input type="number" min="0" step="0.1" value="${entry.km}" onchange="editKm(${idx}, this.value)"></td>
      <td>${entry.hours}</td>
      <td><button onclick="removeWork(${idx})" class="btn danger small">Excluir</button></td>`;
    tbody.appendChild(tr);
  });
  const avgKmEl=document.getElementById('avgKm'), avgHoursEl=document.getElementById('avgHours');
  if(avgKmEl) avgKmEl.textContent=workHistory.length ? (totalKm/workHistory.length).toFixed(1) : '0';
  if(avgHoursEl) avgHoursEl.textContent=workHistory.length ? (totalHours/workHistory.length).toFixed(1) : '0';
  updateResumo(); updateEarnExpenseChart();
}
window.editKm=function(idx, value){ let workHistory=store.get('mototrap_work_history', []); if(!workHistory[idx]) return; workHistory[idx].km=Number(value); store.set('mototrap_work_history', workHistory); updateWorkTable(); };
window.removeWork=function(idx){ let workHistory=store.get('mototrap_work_history', []); workHistory=workHistory.filter((_,i)=>i!==idx); store.set('mototrap_work_history', workHistory); updateWorkTable(); };

// ===== GRÁFICO DE GANHOS X DESPESAS =====
function updateEarnExpenseChart(){
  const canvas=document.getElementById('chartCanvas'); if(!canvas) return;
  const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height);
  let earns=store.get('mototrap_earns', []), exps=store.get('mototrap_exps', []);
  const days={};
  earns.forEach(e=>{ days[e.date]=days[e.date]||{gain:0,exp:0}; days[e.date].gain+=Number(e.amount||0); });
  exps.forEach(e=>{ days[e.date]=days[e.date]||{gain:0,exp:0}; days[e.date].exp +=Number(e.amount||0); });
  const dates=Object.keys(days).sort();
  const w=canvas.width, h=canvas.height;
  const leftPad=40,rightPad=10,bottomPad=24,topPad=18;
  const innerW=Math.max(1,w-leftPad-rightPad);
  const innerH=Math.max(1,h-topPad-bottomPad);
  const barGroupWidth=Math.max(28, Math.floor(innerW/Math.max(1,dates.length)));
  const maxVal=Math.max(1, ...dates.map(d=>Math.max(days[d].gain, days[d].exp)));

  ctx.font='12px Arial'; ctx.textAlign='center';
  dates.forEach((date,i)=>{
    const x=leftPad + i*barGroupWidth;

    const gainHeight=(days[date].gain/maxVal)*innerH;
    ctx.fillStyle='#2986cc';
    ctx.fillRect(x, h - bottomPad - gainHeight, (barGroupWidth/2)-3, gainHeight);

    