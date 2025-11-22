// ===== AUTH STORAGE KEYS =====
const K_USERS   = 'mototrap_users';
const K_SESSION = 'mototrap_session';
const K_ATTEMPTS= 'mototrap_login_attempts';

function onReady(fn){
  if(document.readyState==="complete"||document.readyState==="interactive") setTimeout(fn,1);
  else document.addEventListener("DOMContentLoaded",fn);
}
const store = {
  get:(k,f)=>{ try{ const v=JSON.parse(localStorage.getItem(k)); return v??f; }catch{ return f; } },
  set:(k,v)=>localStorage.setItem(k, JSON.stringify(v))
};

// Cria usuário de demonstração se não existir
function seedDemoUser(){
  let users=store.get(K_USERS, []);
  if(users.length===0){
    users.push({ email:'admin@mototrap.local', name:'Admin', pass:'demo:123456' });
    store.set(K_USERS, users);
  }
}

// Rate limit: 5 falhas => 15 minutos de espera
function isLocked(){
  const at=store.get(K_ATTEMPTS, {count:0, ts:0});
  const now=Date.now(), windowMs=15*60*1000;
  if(at.count>=5 && (now-at.ts)<windowMs){
    return Math.ceil((windowMs-(now-at.ts))/60000);
  }
  return 0;
}
function addAttempt(){
  const data=store.get(K_ATTEMPTS, {count:0, ts:0});
  const now=Date.now(), resetMs=15*60*1000;
  if((now-data.ts)>resetMs){ data.count=0; }
  data.count+=1; data.ts=now;
  store.set(K_ATTEMPTS, data);
}
function clearAttempts(){ store.set(K_ATTEMPTS, {count:0, ts:0}); }

// Sessão (sessionStorage se NÃO lembrar; localStorage se lembrar)
function createSession(email, remember){
  const session={ email, loginAt:Date.now() };
  try{
    if(remember){ localStorage.setItem(K_SESSION, JSON.stringify(session)); }
    else { sessionStorage.setItem(K_SESSION, JSON.stringify(session)); localStorage.removeItem(K_SESSION); }
  }catch{ localStorage.setItem(K_SESSION, JSON.stringify(session)); }
}
function getSession(){
  try{
    const s1=sessionStorage.getItem(K_SESSION); if(s1) return JSON.parse(s1);
    const s2=localStorage.getItem(K_SESSION);  if(s2) return JSON.parse(s2);
  }catch{}
  return null;
}
function destroySession(){ try{ sessionStorage.removeItem(K_SESSION); }catch{} try{ localStorage.removeItem(K_SESSION); }catch{} }

// Guard de rota (bloqueia acesso se não logado)
function enforceAuth(){
  const s=getSession();
  if(!s && !location.pathname.endsWith('login.html')){
    window.location.href='login.html';
  }
}
function logout(){ destroySession(); window.location.href='login.html'; }

// Verificação de senha simples (DEMO)
async function verifyPassword(stored, input){
  if(!stored) return false;
  const [scheme, value]=String(stored).split(':',2);
  if(scheme==='demo' || scheme==='plain'){ return input===value; }
  return input===stored; // fallback
}

// Handler do login
async function handleLogin(e){
  e.preventDefault();
  const emailEl=document.getElementById('email');
  const passEl=document.getElementById('password');
  const remember=document.getElementById('remember')?.checked;
  const email=emailEl?.value.trim().toLowerCase();
  const pass=passEl?.value||'';
  const emailErr=document.getElementById('emailError');
  const passErr=document.getElementById('passwordError');
  const formErr=document.getElementById('formError');

  if(emailErr) emailErr.textContent=''; if(passErr) passErr.textContent=''; if(formErr) formErr.textContent='';

  const lockedMins=isLocked();
  if(lockedMins){ if(formErr) formErr.textContent=`Muitas tentativas. Tente novamente em ${lockedMins} min.`; return; }

  if(!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
    if(emailErr) emailErr.textContent='Informe um e-mail válido.'; return;
  }
  if(!pass || pass.length<6){
    if(passErr) passErr.textContent='A senha deve ter ao menos 6 caracteres.'; return;
  }

  let users=store.get(K_USERS, []);
  const user=users.find(u=>u.email===email);
  if(!user){ addAttempt(); if(formErr) formErr.textContent='Usuário não encontrado.'; return; }

  const ok=await verifyPassword(user.pass, pass);
  if(!ok){ addAttempt(); if(formErr) formErr.textContent='Senha incorreta.'; return; }

  clearAttempts(); createSession(email, !!remember);
  window.location.href='index.html';
}

// Bootstrap
onReady(()=>{
  if(document.getElementById('loginForm')){
    seedDemoUser();
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    const toggle=document.getElementById('togglePassword');
    const pwd=document.getElementById('password');
    if(toggle && pwd){
      toggle.addEventListener('click', ()=>{
        const t=pwd.getAttribute('type')==='password' ? 'text':'password';
        pwd.setAttribute('type', t);
      });
    }

    const createDemo=document.getElementById('createDemo');
    if(createDemo){
      createDemo.addEventListener('click', (e)=>{
        e.preventDefault();
        seedDemoUser();
        alert('Usuário de demonstração:\nE-mail: admin@mototrap.local\nSenha: 123456');
      });
    }
  } else {
    // Em páginas protegidas
    enforceAuth();
    // (Opcional) Bind em botão Sair, se existir
    const logoutBtn=document.getElementById('btnLogout');
    if(logoutBtn){ logoutBtn.addEventListener('click', logout); }
  }

  