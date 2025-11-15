// ===== TIMER DA JORNADA DO DIA =====
function formatTimer(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600).toString().padStart(2,'0');
  const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2,'0');
  const s = (totalSec % 60).toString().padStart(2,'0');
  return `${h}:${m}:${s}`;
}

let timerDisplay, btnStart, btnStop;
const WORK_TIMER_STARTED = 'mototrap_work_started';
let timerInterval = null;

function onReady(fn) {
  if (document.readyState === "complete" || document.readyState === "interactive")
    setTimeout(fn, 1);
  else
    document.addEventListener("DOMContentLoaded", fn);
}

function bindTimerElements() {
  timerDisplay = document.getElementById('workTimerDisplay');
  btnStart = document.getElementById('btnStartWork');
  btnStop = document.getElementById('btnStopWork');
}

function updateTimer() {
  const started = localStorage.getItem(WORK_TIMER_STARTED);
  if (started) {
    const elapsed = Date.now() - Number(started);
    timerDisplay.textContent = formatTimer(elapsed);
  } else {
    timerDisplay.textContent = "00:00:00";
  }
}

function checkTimerOnLoad() {
  if (localStorage.getItem(WORK_TIMER_STARTED)) {
    btnStart.style.display = 'none';
    btnStop.style.display = '';
    if (!timerInterval) timerInterval = setInterval(updateTimer, 1000);
    updateTimer();
  } else {
    btnStart.style.display = '';
    btnStop.style.display = 'none';
    timerDisplay.textContent = "00:00:00";
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function startJornada() {
  localStorage.setItem(WORK_TIMER_STARTED, Date.now());
  btnStart.style.display = 'none';
  btnStop.style.display = '';
  updateTimer();
  if (!timerInterval) timerInterval = setInterval(updateTimer, 1000);
}

function stopJornada() {
  const started = Number(localStorage.getItem(WORK_TIMER_STARTED));
  if (!started) return;

  const ended = Date.now();
  const elapsedMs = ended - started;

  // Calcula horas e minutos
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;
  const elapsedFormatted = `${hours}h ${minutes}m`;

  let workHistory = JSON.parse(localStorage.getItem('mototrap_work_history') || '[]');
  workHistory.push({
    date: new Date(started).toISOString().slice(0,10),
    km: 0,
    hours: elapsedFormatted,
    totalMinutes: elapsedMinutes
  });
  localStorage.setItem('mototrap_work_history', JSON.stringify(workHistory));

  updateWorkTable();
  updateEarnExpenseChart();
  updateResumo();

  localStorage.removeItem(WORK_TIMER_STARTED);
  btnStart.style.display = '';
  btnStop.style.display = 'none';
  clearInterval(timerInterval);
  timerInterval = null;
  timerDisplay.textContent = "00:00:00";
}

onReady(() => {
  bindTimerElements();
  checkTimerOnLoad();

  btnStart.addEventListener('click', startJornada);
  btnStop.addEventListener('click', stopJornada);

  updateWorkTable();
  updateEarnExpenseChart();
  updateResumo();
  updateEarnTable();
  updateExpTable();
  updateGoals();
  updateRodapeAno();
});

// ===== TABELA DE HORAS TRABALHADAS =====
function updateWorkTable() {
  let workHistory = JSON.parse(localStorage.getItem('mototrap_work_history') || '[]');
  const tbody = document.querySelector('#workTable tbody');
  tbody.innerHTML = '';
  let totalKm = 0, totalMinutes = 0;

  workHistory.forEach((entry, idx) => {
    totalKm += Number(entry.km);
    totalMinutes += Number(entry.totalMinutes);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${entry.date}</td>
      <td>
        <input type="number" min="0" step="0.1" value="${entry.km}" onchange="editKm(${idx}, this.value)">
      </td>
      <td>${entry.hours}</td>
      <td>
        <button onclick="removeWork(${idx})" class="btn danger small">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  let avgHours = "0h 0m";
  if (workHistory.length) {
    const avgMinutes = Math.floor(totalMinutes / workHistory.length);
    const h = Math.floor(avgMinutes / 60);
    const m = avgMinutes % 60;
    avgHours = `${h}h ${m}m`;
  }

  document.getElementById('avgKm').textContent = (workHistory.length ? (totalKm / workHistory.length).toFixed(1) : "0");
  document.getElementById('avgHours').textContent = avgHours;

  updateResumo();
  updateEarnExpenseChart();
}

window.editKm = function(idx, value) {
  let workHistory = JSON.parse(localStorage.getItem('mototrap_work_history') || '[]');
  workHistory[idx].km = Number(value);
  localStorage.setItem('mototrap_work_history', JSON.stringify(workHistory));
  updateWorkTable();
};

window.removeWork = function(idx) {
  let workHistory = JSON.parse(localStorage.getItem('mototrap_work_history') || '[]');
  workHistory.splice(idx, 1);
  localStorage.setItem('mototrap_work_history', JSON.stringify(workHistory));
  updateWorkTable();
};

// ===== GRÁFICO DE GANHOS X DESPESAS =====
function updateEarnExpenseChart() {
  const canvas = document.getElementById('chartCanvas');
  if (!canvas) return;

  canvas.width = canvas.offsetWidth; // Ajusta largura para responsividade
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let earns = JSON.parse(localStorage.getItem('mototrap_earns') || '[]');
  let exps  = JSON.parse(localStorage.getItem('mototrap_exps') || '[]');

  let days = {};
  earns.forEach(e => {
    days[e.date] = days[e.date] || {gain: 0, exp: 0};
    days[e.date].gain += Number(e.amount || 0);
  });
  exps.forEach(e => {
    days[e.date] = days[e.date] || {gain: 0, exp: 0};
    days[e.date].exp += Number(e.amount || 0);
  });

  const dates = Object.keys(days).sort();
  const w = canvas.width, h = canvas.height;
  const barGroupWidth = Math.max(20, Math.floor((w - 40) / (dates.length || 1)));
  const maxVal = dates.length ? Math.max(...dates.map(d => Math.max(days[d].gain, days[d].exp))) : 1;

  ctx.font = "12px Arial";
  ctx.textAlign = "center";

  dates.forEach((date, i) => {
    const x = 30 + i * barGroupWidth;
    const gainHeight = (days[date].gain / maxVal) * (h - 40);
    ctx.fillStyle = "#2986cc";
    ctx.fillRect(x, h - gainHeight - 20, (barGroupWidth / 2) - 2, gainHeight);
    ctx.fillText("R$" + days[date].gain.toFixed(2), x + (barGroupWidth / 4), h - gainHeight - 24);

    const expHeight = (days[date].exp / maxVal) * (h - 40);
    ctx.fillStyle = "#d9534f";
    ctx.fillRect(x + (barGroupWidth / 2), h - expHeight - 20, (barGroupWidth / 2) - 2, expHeight);
    ctx.fillText("R$" + days[date].exp.toFixed(2), x + (3 * barGroupWidth / 4), h - expHeight - 24);

    ctx.fillStyle = "#ccc";
    ctx.fillText(date, x + barGroupWidth / 2, h - 5);
  });

  ctx.textAlign = "right";
  ctx.fillStyle = "#fff";
  ctx.fillText("Valores diários em R$", w - 10, 14);
}

window.addEventListener('resize', updateEarnExpenseChart);

// ===== GANHOS =====
function updateEarnTable() {
  let earns = JSON.parse(localStorage.getItem('mototrap_earns') || '[]');
  const tbody = document.querySelector('#earnTable tbody');
  let total = 0;
  tbody.innerHTML = '';
  earns.forEach((e, idx) => {
    total += Number(e.amount);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${e.date}</td>
      <td>${e.platform}</td>
      <td>R$ ${Number(e.amount).toFixed(2)}</td>
      <td><button onclick="removeEarn(${idx})" class="btn danger small">Excluir</button></td>
    `;
    tbody.appendChild(tr);
  });
  document.getElementById('earnTotal').textContent = "R$ " + total.toFixed(2);
  updateResumo();
  updateEarnExpenseChart();
}

window.removeEarn = function(idx) {
  let earns = JSON.parse(localStorage.getItem('mototrap_earns') || '[]');
  earns.splice(idx,1);
  localStorage.setItem('mototrap_earns', JSON.stringify(earns));
  updateEarnTable();
  updateEarnExpenseChart();
};

onReady(() => {
  document.getElementById('earnForm').addEventListener('submit', function(e){
    e.preventDefault();
    let earns = JSON.parse(localStorage.getItem('mototrap_earns') || '[]');
    earns.push({
      date: document.getElementById('earnDate').value,
      platform: document.getElementById('earnPlatform').value,
      amount: Number(document.getElementById('earnAmount').value)
    });
    localStorage.setItem('mototrap_earns', JSON.stringify(earns));
    this.reset();
    updateEarnTable();
    updateResumo();
    updateEarnExpenseChart();
  });
});

// ===== DESPESAS =====
function updateExpTable() {
  let exps = JSON.parse(localStorage.getItem('mototrap_exps') || '[]');
  const tbody = document.querySelector('#expTable tbody');
  let total = 0;
  tbody.innerHTML = '';
  exps.forEach((e, idx) => {
    total += Number(e.amount);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${e.date}</td>
      <td>${e.title}</td>
      <td>R$ ${Number(e.amount).toFixed(2)}</td>
      <td><button onclick="removeExp(${idx})" class="btn danger small">Excluir</button></td>
    `;
    tbody.appendChild(tr);
  });
  document.getElementById('expTotal').textContent = "R$ " + total.toFixed(2);
  updateResumo();
  updateEarnExpenseChart();
}

window.removeExp = function(idx) {
  let exps = JSON.parse(localStorage.getItem('mototrap_exps') || '[]');
  exps.splice(idx,1);
  localStorage.setItem('mototrap_exps', JSON.stringify(exps));
  updateExpTable();
  updateEarnExpenseChart();
};

onReady(() => {
  document.getElementById('expForm').addEventListener('submit', function(e){
    e.preventDefault();
    let exps = JSON.parse(localStorage.getItem('mototrap_exps') || '[]');
    exps.push({
      date: document.getElementById('expDate').value,
      title: document.getElementById('expTitle').value,
      amount: Number(document.getElementById('expAmount').value)
    });
    localStorage.setItem('mototrap_exps', JSON.stringify(exps));
    this.reset();
    updateExpTable();
    updateResumo();
    updateEarnExpenseChart();
  });
});

// ===== METAS =====
function updateGoals() {
  let metas = JSON.parse(localStorage.getItem('mototrap_goals') || '{}');
  document.getElementById('goalsLive').textContent =
    `Meta diária - Ganhos: R$ ${metas.gDailyEarn||'0'} | KM: ${metas.gDailyKm||'0'} | Horas: ${metas.gDailyHours||'0'}`;
}

onReady(() => {
  document.getElementById('goalsForm').addEventListener('submit', function(e){
    e.preventDefault();
    let metas = {
      gDailyEarn: document.getElementById('gDailyEarn').value,
      gDailyKm: document.getElementById('gDailyKm').value,
      gDailyHours: document.getElementById('gDailyHours').value,
      gWeeklyEarn: document.getElementById('gWeeklyEarn').value,
      gWeeklyKm: document.getElementById('gWeeklyKm').value,
      gWeeklyHours: document.getElementById('gWeeklyHours').value,
      gMonthlyEarn: document.getElementById('gMonthlyEarn').value,
      gMonthlyKm: document.getElementById('gMonthlyKm').value,
      gMonthlyHours: document.getElementById('gMonthlyHours').value
    };
    localStorage.setItem('mototrap_goals', JSON.stringify(metas));
    updateGoals();
  });
  updateGoals();
});

// ===== RESUMO RÁPIDO =====
function updateResumo() {
  let earns = JSON.parse(localStorage.getItem('mototrap_earns') || '[]');
  let exps = JSON.parse(localStorage.getItem('mototrap_exps') || '[]');
  let earnTotal = earns.reduce((acc, e) => acc + Number(e.amount), 0);
  let expTotal = exps.reduce((acc, e) => acc + Number(e.amount), 0);

  document.getElementById('statEarnings').textContent = "R$ " + earnTotal.toFixed(2);
  document.getElementById('statExpenses').textContent = "R$ " + expTotal.toFixed(2);
  document.getElementById('statProfit').textContent = "R$ " + (earnTotal - expTotal).toFixed(2);
}

// ===== RODAPÉ ANO =====
function updateRodapeAno() {
  const yEl = document.getElementById("year");
  if (yEl) yEl.textContent = new Date().getFullYear();
}

onReady(updateRodapeAno);
