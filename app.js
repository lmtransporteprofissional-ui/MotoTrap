// -------- TIMER DA JORNADA DO DIA --------
function formatTimer(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600).toString().padStart(2,'0');
  const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2,'0');
  const s = (totalSec % 60).toString().padStart(2,'0');
  return `${h}:${m}:${s}`;
}

const timerDisplay = document.getElementById('workTimerDisplay');
const btnStart = document.getElementById('btnStartWork');
const btnStop = document.getElementById('btnStopWork');
const WORK_TIMER_STARTED = 'mototrap_work_started';
let timerInterval = null;

// Atualiza contador automático
function updateTimer() {
  const started = localStorage.getItem(WORK_TIMER_STARTED);
  if (started) {
    const elapsed = Date.now() - Number(started);
    timerDisplay.textContent = formatTimer(elapsed);
  } else {
    timerDisplay.textContent = "00:00:00";
  }
}

// Verifica timer ao carregar
function checkTimerOnLoad() {
  if (localStorage.getItem(WORK_TIMER_STARTED)) {
    btnStart.style.display = 'none';
    btnStop.style.display = '';
    timerInterval = setInterval(updateTimer, 1000);
    updateTimer();
  } else {
    btnStart.style.display = '';
    btnStop.style.display = 'none';
    timerDisplay.textContent = "00:00:00";
  }
}
window.addEventListener('DOMContentLoaded', checkTimerOnLoad);

// Iniciar jornada
btnStart.addEventListener('click', () => {
  localStorage.setItem(WORK_TIMER_STARTED, Date.now());
  btnStart.style.display = 'none';
  btnStop.style.display = '';
  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
});

// Encerrar jornada e salvar registro
btnStop.addEventListener('click', () => {
  const started = Number(localStorage.getItem(WORK_TIMER_STARTED));
  if (!started) return;

  const ended = Date.now();
  const elapsedMs = ended - started;
  const elapsedHours = Math.round((elapsedMs / 360000) / 10); // 1 casa decimal

  // Salva registro de trabalho (horas trabalhadas)
  let workHistory = JSON.parse(localStorage.getItem('mototrap_work_history') || '[]');
  workHistory.push({
    date: new Date(started).toISOString().slice(0,10),
    km: 0,      // Km pode ser preenchido manualmente posteriormente
    hours: elapsedHours
  });
  localStorage.setItem('mototrap_work_history', JSON.stringify(workHistory));

  updateWorkTable();

  // Reset timer
  localStorage.removeItem(WORK_TIMER_STARTED);
  btnStart.style.display = '';
  btnStop.style.display = 'none';
  clearInterval(timerInterval);
  timerDisplay.textContent = "00:00:00";
});

// -------- TABELA DE HORAS TRABALHADAS --------
function updateWorkTable() {
  let workHistory = JSON.parse(localStorage.getItem('mototrap_work_history') || '[]');
  const tbody = document.querySelector('#workTable tbody');
  tbody.innerHTML = '';
  let totalKm = 0;
  let totalHours = 0;

  workHistory.forEach((entry, idx) => {
    totalKm += Number(entry.km);
    totalHours += Number(entry.hours);

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

  document.getElementById('avgKm').textContent = (workHistory.length ? (totalKm / workHistory.length).toFixed(1) : "0");
  document.getElementById('avgHours').textContent = (workHistory.length ? (totalHours / workHistory.length).toFixed(1) : "0");
}

// Editar Km diretamente na tabela
window.editKm = function(idx, value) {
  let workHistory = JSON.parse(localStorage.getItem('mototrap_work_history') || '[]');
  workHistory[idx].km = Number(value);
  localStorage.setItem('mototrap_work_history', JSON.stringify(workHistory));
  updateWorkTable();
};

// Excluir registro de trabalho
window.removeWork = function(idx) {
  let workHistory = JSON.parse(localStorage.getItem('mototrap_work_history') || '[]');
  workHistory.splice(idx, 1);
  localStorage.setItem('mototrap_work_history', JSON.stringify(workHistory));
  updateWorkTable();
}

window.addEventListener('DOMContentLoaded', updateWorkTable);

// --------- EXEMPLO PARA OUTRAS TABELAS: GANHOS/DESPESAS ---------
function updateEarnTable() {
  // Lógica semelhante: pegar do localStorage, renderizar, atualizar totais...
}
function updateExpTable() {
  // Lógica semelhante: pegar do localStorage, renderizar, atualizar totais...
}

// --------- ADICIONE O RESTANTE DAS FUNÇÕES DE RESUMO, METAS, ETC ---------
// O resto do seu app pode seguir o mesmo modelo!

// --------- ANO DO RODAPÉ ---------
window.addEventListener('DOMContentLoaded', function() {
  const yEl = document.getElementById("year");
  if (yEl) yEl.textContent = new Date().getFullYear();
});
