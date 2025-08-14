// Helpers
const $ = (sel, p=document) => p.querySelector(sel);
const $$ = (sel, p=document) => [...p.querySelectorAll(sel)];
const fmt = (d) => d.toISOString().slice(0,10);
const today = () => new Date();

const STORE_KEY = 'to-pan:posts';
const ROLE_KEY = 'to-pan:role';

function loadPosts(){
  try{ return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }catch{ return []; }
}
function savePosts(arr){
  localStorage.setItem(STORE_KEY, JSON.stringify(arr));
  window.dispatchEvent(new Event('posts-updated'));
}
function setRole(role){
  localStorage.setItem(ROLE_KEY, role);
}
function getRole(){
  return localStorage.getItem(ROLE_KEY);
}

function daysSince(iso){
  const start = new Date(iso);
  const now = new Date();
  const ms = now - start;
  return Math.floor(ms / (1000*60*60*24));
}

// Loving you since
function renderSince(){
  const sinceISO = window.APP_CONFIG.SINCE_DATE_ISO;
  $('#since-date').textContent = new Date(sinceISO).toLocaleDateString(undefined, { day:'2-digit', month:'short', year:'numeric' });
  $('#days-since').textContent = String(daysSince(sinceISO));
}

// Auth handling
function showApp(role){
  $('#auth-card').hidden = true;
  $('#app-card').hidden = false;
  $('#whoami').textContent = role === 'knight' ? 'Knight K' : 'Princess Pan';
  $('#upload-wrap').hidden = (role !== 'knight');
  setRole(role);
  renderLetters();
  renderCalendar(currentMonthDate);
}

function promptKnight(){
  $('#pw-row').hidden = false;
  $('#pw-input').focus();
}

function handleAuth(){
  const role = getRole();
  if(role){ showApp(role); return; }

  // buttons
  $('#btn-princess').addEventListener('click', ()=> showApp('princess'));
  $('#btn-knight').addEventListener('click', promptKnight);
  $('#pw-submit').addEventListener('click', ()=> {
    const ok = $('#pw-input').value === (window.APP_CONFIG.KNIGHT_PASSWORD || '');
    if(ok) showApp('knight');
    else alert('Wrong password.');
  });
}

// Logout
$('#logout').addEventListener('click', ()=>{
  localStorage.removeItem(ROLE_KEY);
  location.reload();
});

// Tabs
$$('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    $('#tab-letters').hidden = tab!=='letters';
    $('#tab-calendar').hidden = tab!=='calendar';
  });
});

// Upload
$('#btn-upload').addEventListener('click', async ()=>{
  const file = $('#file-input').files[0];
  if(!file) return alert('Choose an image first.');
  const cap = $('#caption-input').value.trim();

  const dataUrl = await fileToDataURL(file);
  const post = {
    id: 'p'+Date.now(),
    ymd: fmt(new Date()),
    caption: cap,
    imageDataUrl: dataUrl,
    read: false,
    createdAtMs: Date.now()
  };
  const all = loadPosts();
  all.unshift(post);
  savePosts(all);

  // reset
  $('#file-input').value = '';
  $('#caption-input').value = '';
  renderLetters();
  renderCalendar(currentMonthDate);
});

function fileToDataURL(file){
  return new Promise((res, rej)=>{
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

// Letters rendering
function renderLetters(){
  const role = getRole();
  const filt = $$('input[name="filt"]').find(r => r.checked).value;
  const posts = loadPosts();
  let list = posts.slice();
  if(filt==='unread') list = list.filter(p => !p.read);
  if(filt==='read') list = list.filter(p => p.read);

  const wrap = $('#letters-grid');
  wrap.innerHTML = '';

  if(!list.length){
    wrap.innerHTML = '<div class="muted">No letters yet.</div>';
    return;
  }

  for(const p of list){
    const div = document.createElement('div');
    div.className = 'card-item';
    div.innerHTML = `
      <img class="card-img" src="${p.imageDataUrl}" alt="letter image">
      <div class="card-body">
        <div><strong>${p.ymd}</strong></div>
        <div>${escapeHtml(p.caption || '')}</div>
        <div class="card-meta">
          <span class="${p.read ? 'pink' : 'blue'}">${p.read ? 'Read' : 'Unread'}</span>
          <span>${new Date(p.createdAtMs).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
        </div>
        <div class="actions"></div>
      </div>
    `;
    const actions = div.querySelector('.actions');

    // Princess: Download
    if(role === 'princess'){
      const a = document.createElement('a');
      a.textContent = 'Download';
      a.className = 'btn-small pink';
      a.href = p.imageDataUrl;
      a.download = `letter-${p.ymd}.png`;
      actions.appendChild(a);
    }

    // Knight: Delete + toggle read
    if(role === 'knight'){
      const del = document.createElement('button');
      del.className = 'btn-small';
      del.textContent = 'Delete';
      del.addEventListener('click', ()=>{
        if(!confirm('Delete this letter?')) return;
        const next = loadPosts().filter(x => x.id !== p.id);
        savePosts(next);
        renderLetters(); renderCalendar(currentMonthDate);
      });
      actions.appendChild(del);

      const tog = document.createElement('button');
      tog.className = 'btn-small blue';
      tog.textContent = p.read ? 'Mark unread' : 'Mark read';
      tog.addEventListener('click', ()=>{
        const arr = loadPosts();
        const idx = arr.findIndex(x => x.id === p.id);
        if(idx>=0){ arr[idx].read = !arr[idx].read; savePosts(arr); }
        renderLetters(); renderCalendar(currentMonthDate);
      });
      actions.appendChild(tog);
    }

    wrap.appendChild(div);
  }
}
$$('input[name="filt"]').forEach(r => r.addEventListener('change', renderLetters));

function escapeHtml(s){
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// Calendar
let currentMonthDate = new Date();
currentMonthDate.setDate(1);

$('#prev-month').addEventListener('click', ()=>{
  currentMonthDate.setMonth(currentMonthDate.getMonth()-1);
  renderCalendar(currentMonthDate);
});
$('#next-month').addEventListener('click', ()=>{
  currentMonthDate.setMonth(currentMonthDate.getMonth()+1);
  renderCalendar(currentMonthDate);
});

function renderCalendar(d0){
  const y = d0.getFullYear();
  const m = d0.getMonth();
  $('#cal-title').textContent = new Date(y, m, 1).toLocaleDateString(undefined, {month:'long', year:'numeric'});

  const posts = loadPosts();
  const byDay = new Map();
  for(const p of posts){
    (byDay.get(p.ymd) || byDay.set(p.ymd, []).get(p.ymd)).push(p);
  }

  const cal = $('#calendar');
  cal.innerHTML = '';

  const firstDow = (new Date(y, m, 1).getDay() + 6) % 7; // make Monday=0
  const daysInMonth = new Date(y, m+1, 0).getDate();

  // Previous month fillers
  for(let i=0;i<firstDow;i++){
    const prevDate = new Date(y, m, - (firstDow-i) + 1);
    cal.appendChild(dayCell(prevDate, byDay, true));
  }

  // Current month
  for(let d=1; d<=daysInMonth; d++){
    const dt = new Date(y, m, d);
    cal.appendChild(dayCell(dt, byDay, false));
  }

  // Fill to complete weeks
  while(cal.children.length % 7 !== 0){
    const last = new Date(y, m, daysInMonth);
    const idx = cal.children.length - (firstDow + daysInMonth);
    const nextDate = new Date(y, m+1, idx+1);
    cal.appendChild(dayCell(nextDate, byDay, true));
  }
}

function dayCell(dt, byDay, out){
  const cell = document.createElement('div');
  cell.className = 'day' + (out ? ' out' : '');
  const num = document.createElement('div');
  num.className = 'num';
  num.textContent = dt.getDate();
  cell.appendChild(num);

  // today highlight
  const t = today();
  if(dt.getFullYear()===t.getFullYear() && dt.getMonth()===t.getMonth() && dt.getDate()===t.getDate()){
    cell.classList.add('today');
  }

  // markers row
  const marks = document.createElement('div');
  marks.className = 'marks';

  // heart on 25th (vertically centered under number, positioned by CSS marks row)
  if(dt.getDate() === 25){
    const heart = document.createElement('span');
    heart.className = 'heart';
    marks.appendChild(heart);
  }

  const ymd = fmt(dt);
  const list = byDay.get(ymd) || [];
  if(list.length){
    const hasUnread = list.some(p => !p.read);
    const dot = document.createElement('span');
    dot.className = 'dot ' + (hasUnread ? 'blue' : 'pink');
    marks.appendChild(dot);
  }

  cell.appendChild(marks);
  return cell;
}

// Init
renderSince();
handleAuth();
renderCalendar(currentMonthDate);
