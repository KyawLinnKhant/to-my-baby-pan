// Helpers
const $ = (q, el=document) => el.querySelector(q);
const $$ = (q, el=document) => [...el.querySelectorAll(q)];
const storeKey = 'princess-pan-posts-v1';
const roleKey = 'princess-pan-role-v1';

function toast(msg){
  const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
  setTimeout(()=>t.classList.add('hidden'), 1800);
}

// Local storage
function loadPosts(){
  try { return JSON.parse(localStorage.getItem(storeKey) || '[]'); } catch { return []; }
}
function savePosts(posts){
  localStorage.setItem(storeKey, JSON.stringify(posts));
  renderLetters(); renderCalendar();
}

// Login flow
let role = localStorage.getItem(roleKey); // 'knight' | 'princess' | null

function showApp(){
  $('#login').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#whoami').textContent = role === 'knight' ? 'Knight K' : 'Princess Pan';
  $('#roleLabel').textContent = role === 'knight' ? 'Knight K' : 'Princess Pan';
  initSince();
  renderLetters();
  renderCalendar();
}

function initLogin(){
  const pwWrap = $('#knight-password-wrap');
  let selected = 'princess';
  $('#btn-princess').addEventListener('click', ()=>{ selected='princess'; pwWrap.hidden = true; });
  $('#btn-knight').addEventListener('click', ()=>{ selected='knight'; pwWrap.hidden = false; $('#pw').focus(); });

  $('#continue').addEventListener('click', ()=>{
    if (selected === 'knight'){
      const val = $('#pw').value || '';
      if (val !== window.APP_CONFIG.knightPassword){
        toast('Wrong password');
        return;
      }
      role = 'knight';
    } else {
      role = 'princess';
    }
    localStorage.setItem(roleKey, role);
    showApp();
  });
}

// Since / days
function initSince(){
  const since = new Date(window.APP_CONFIG.lovingSince + 'T00:00:00');
  const now = new Date();
  const diff = Math.floor((now - since) / (1000*60*60*24));
  $('#since-date').textContent = since.toLocaleDateString(undefined, { day:'2-digit', month:'short', year:'numeric' });
  $('#days').textContent = diff;
}

// Letters
function dataUrlFromFile(file){
  return new Promise((resolve, reject)=>{
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

async function handlePost(){
  const f = $('#file').files[0];
  if (!f){ toast('Choose a photo first'); return; }
  const caption = $('#caption').value.trim();
  const dataUrl = await dataUrlFromFile(f);
  const ymd = new Date().toISOString().slice(0,10);

  const post = {
    id: 'p_' + Date.now(),
    ymd,
    caption,
    url: dataUrl,
    createdAt: Date.now(),
    read: role === 'knight' ? true : false // if Princess posts, mark read=false for Knight; but we keep simple
  };
  const posts = loadPosts();
  posts.unshift(post);
  savePosts(posts);
  $('#file').value = '';
  $('#caption').value = '';
  toast('Posted');
}

function renderLetters(){
  const list = $('#letters');
  list.innerHTML = '';
  const filter = $('.chip.active').dataset.filter;
  let posts = loadPosts().sort((a,b)=>b.createdAt - a.createdAt);
  if (filter === 'unread') posts = posts.filter(p => !p.read);
  if (filter === 'read') posts = posts.filter(p => !!p.read);

  posts.forEach(p=>{
    const card = document.createElement('div'); card.className='letter';
    const img = document.createElement('img'); img.className='letter-img'; img.src = p.url; img.alt = p.caption || 'letter';
    const body = document.createElement('div'); body.className='letter-body';

    const meta = document.createElement('div'); meta.className='meta';
    const date = new Date(p.createdAt).toLocaleString();
    meta.innerHTML = `<span>${date}</span> · <span>${p.read ? 'Read' : 'Unread'}</span>`;

    const caption = document.createElement('div'); caption.textContent = p.caption || '';
    caption.style.marginTop = '6px';

    const actions = document.createElement('div'); actions.className='actions';
    // Download button
    const a = document.createElement('a');
    a.href = p.url; a.download = (p.caption || 'letter') + '.jpg';
    a.className = 'btn pink'; a.textContent = 'Download';
    actions.appendChild(a);

    // Mark read/unread
    const mark = document.createElement('button');
    mark.className='btn';
    mark.textContent = p.read ? 'Mark Unread' : 'Mark Read';
    mark.addEventListener('click', ()=>{
      const posts2 = loadPosts();
      const t = posts2.find(x=>x.id===p.id); if (t){ t.read = !t.read; savePosts(posts2); }
    });
    actions.appendChild(mark);

    // Delete (Knight only)
    if (role === 'knight'){
      const del = document.createElement('button');
      del.className='btn'; del.textContent='Delete';
      del.addEventListener('click', ()=>{
        const posts2 = loadPosts().filter(x=>x.id!==p.id);
        savePosts(posts2); toast('Deleted');
      });
      actions.appendChild(del);
    }

    body.appendChild(meta);
    if (p.caption) body.appendChild(caption);
    body.appendChild(actions);
    card.appendChild(img); card.appendChild(body);
    list.appendChild(card);
  });
}

// Calendar
function daysInMonth(year, month){ return new Date(year, month+1, 0).getDate(); }

function renderCalendar(){
  const cal = $('#calendar');
  cal.innerHTML = '';

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // 0=Sun
  const total = daysInMonth(year, month);

  const posts = loadPosts();
  const byDay = {};
  posts.forEach(p=>{
    const d = p.ymd.slice(-2);
    const day = parseInt(d,10);
    if (!byDay[day]) byDay[day] = { read:0, unread:0 };
    if (p.read) byDay[day].read++; else byDay[day].unread++;
  });

  // header
  const header = document.createElement('div');
  header.className='cal-head';
  header.innerHTML = `<h3 style="margin:6px 0 10px 4px">${now.toLocaleString(undefined,{month:'long'})} ${year}</h3>`;
  cal.appendChild(header);

  const grid = document.createElement('div'); grid.className='cal-grid';
  // blanks
  for(let i=0;i<startDay;i++){ const b = document.createElement('div'); b.className='cal-cell'; grid.appendChild(b); }
  for(let d=1; d<=total; d++){
    const cell = document.createElement('div'); cell.className='cal-cell';
    const label = document.createElement('div'); label.className='date'; label.textContent = d; cell.appendChild(label);

    // heart on 25th
    if (d === 25){
      const heart = document.createElement('div'); heart.className='heart'; heart.textContent='♥'; cell.appendChild(heart);
    }

    const info = byDay[d];
    if (info){
      if (info.unread>0){
        const dot = document.createElement('div'); dot.className='dot dot-unread'; cell.appendChild(dot);
      } else if (info.read>0){
        const dot = document.createElement('div'); dot.className='dot dot-read'; cell.appendChild(dot);
      }
    }
    grid.appendChild(cell);
  }
  cal.appendChild(grid);
}

// Tabs & filters
function initTabs(){
  $$('.tab').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('.tab').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const name = btn.dataset.tab;
      $$('.tabpanel').forEach(p=>p.classList.remove('active'));
      $('#tab-' + name).classList.add('active');
    });
  });

  $$('.chip').forEach(c=>{
    c.addEventListener('click', ()=>{
      $$('.chip').forEach(x=>x.classList.remove('active'));
      c.classList.add('active');
      renderLetters();
    });
  });
}

function initUploader(){
  $('#post').addEventListener('click', handlePost);
}

function initSettings(){
  $('#logout').addEventListener('click', ()=>{
    localStorage.removeItem(roleKey);
    role = null;
    $('#app').classList.add('hidden');
    $('#login').classList.remove('hidden');
  });
}

// bootstrap
window.addEventListener('DOMContentLoaded', ()=>{
  initTabs(); initUploader(); initSettings();
  if (role){ showApp(); } else { initLogin(); }
});
