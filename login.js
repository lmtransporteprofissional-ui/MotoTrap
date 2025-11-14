const $ = (s, r=document)=> r.querySelector(s);
const $$ = (s, r=document)=> Array.from(r.querySelectorAll(s));
const STORAGE_SESSION = 'mototrap_session';
const STORAGE_USERS = 'mototrap_users';
function loadUsers(){ return JSON.parse(localStorage.getItem(STORAGE_USERS) || '{}'); }
function saveUsers(obj){ localStorage.setItem(STORAGE_USERS, JSON.stringify(obj)); }
async function sha256(text){ const enc=new TextEncoder().encode(text); const buf=await crypto.subtle.digest('SHA-256',enc); return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join(''); }
function switchAuth(which){ $$('.tab-auth').forEach(b=> b.classList.toggle('active', b.dataset.auth===which)); $$('#auth-login, #auth-register').forEach(p=> p.classList.remove('visible')); $('#auth-'+which).classList.add('visible'); }

window.addEventListener('DOMContentLoaded', ()=>{
  $('#year').textContent = new Date().getFullYear();

  const sess = JSON.parse(localStorage.getItem(STORAGE_SESSION) || 'null');
  if(sess?.username){ window.location.href='index.html'; return; }

  $$('.tab-auth').forEach(btn=> btn.addEventListener('click', ()=> switchAuth(btn.dataset.auth)));
  switchAuth('login');

  // LOGIN
  $('#loginForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const userRaw = $('#loginUser').value || '';
    const user = userRaw.trim().toLowerCase();
    const pass = $('#loginPass').value;
    const remember = $('#rememberMe').checked;
    if(!user || !pass) return;

    // valida local (compatibilidade com dados locais)
    const users = loadUsers();
    if(!users[user]){ alert('Usuário local não existe. Crie uma conta.'); return; }
    const hash = await sha256(pass);
    if(users[user].passwordHash !== hash){
      alert('Senha incorreta no cadastro local. Se no Firebase a senha for diferente, use "Esqueci a senha".');
      return;
    }

    try{
      await firebase.auth().setPersistence('local');
      await firebase.auth().signInWithEmailAndPassword(user, pass);
    }catch(e){
      if(e.code === 'auth/user-not-found'){
        try{ await firebase.auth().createUserWithEmailAndPassword(user, pass); }
        catch(err){ alert('Firebase: '+(err?.message||err)); return; }
      } else if(e.code === 'auth/wrong-password'){
        alert('Firebase: senha incorreta. Use "Esqueci a senha" para alinhar a senha no Firebase.');
        return;
      } else if(e.code === 'auth/invalid-email'){
        alert('Firebase: e-mail inválido.');
        return;
      } else {
        alert('Erro de autenticação Firebase: '+(e?.message||e));
        return;
      }
    }

    localStorage.setItem(STORAGE_SESSION, JSON.stringify({ username: user, remember }));
    window.location.href='index.html';
  });

  // REGISTER
  $('#registerForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const userRaw = $('#regUser').value || '';
    const user = userRaw.trim().toLowerCase();
    const pass = $('#regPass').value;
    if(!user || !pass) return;

    const users = loadUsers();
    if(users[user]){ alert('Usuário já existe.'); return; }

    users[user] = { passwordHash: await sha256(pass), createdAt: Date.now() };
    saveUsers(users);

    // cria no Firebase (melhor UX)
    try{
      await firebase.auth().setPersistence('local');
      await firebase.auth().createUserWithEmailAndPassword(user, pass);
    }catch(e){ if(e.code !== 'auth/email-already-in-use'){ console.warn('Firebase signup:', e?.message||e); } }

    alert('Conta criada! Agora faça login.');
    switchAuth('login');
    $('#loginUser').value = user;
    $('#loginPass').value = '';
  });

  // RESET PASSWORD
  $('#btnReset').addEventListener('click', async ()=>{
    const email = ($('#loginUser').value || '').trim().toLowerCase();
    if(!email){ alert('Digite seu e‑mail no campo e clique de novo em "Esqueci a senha".'); return; }
    try{ await firebase.auth().sendPasswordResetEmail(email); alert('Enviamos um e‑mail de redefinição.'); }
    catch(e){ alert('Falha ao enviar e‑mail de redefinição: '+(e?.message||e)); }
  });
});
