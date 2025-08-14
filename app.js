/* Minimal data store using localStorage */
const LS_KEY = 'princess-letters-v2';

function loadState(){
  try{ return JSON.parse(localStorage.getItem(LS_KEY)) || { posts: [], reads: {}, user: null };}
  catch{ return { posts: [], reads: {}, user: null };}
}
function saveState(s){ localStorage.setItem(LS_KEY, JSON.stringify(s)); }
let state = loadState();

/* Elements */
const el = (id)=>document.getElementById(id);
const loginView = el('loginView');
const dashView  = el('dashView');
const who       = el('who');
const loveDate  = el('startDate');
const loveDays  = el('daysSince');
const btnPrincess = el('btnPrincess');
const btnKnight   = el('btnKnight');
const kPass       = el('kPass');
const btnLogout   = el('btnLogout');
const knightOnly  = el('knightOnly');
const princessOnly= el('princessOnly');

const fileInput   = el('fileInput');
const captionInput= el('captionInput');
const btnUpload   = el('btnUpload');
const bar         = el('bar');
const progress    = el('progress');
const uploadHint  = el('uploadHint');

/* Config */
const CFG = window.APP_CONFIG || {};
const LOVE_SINCE = new Date(CFG.LOVE_SINCE_ISO || '2022-10-18');

/* Utils */
const fmtYMD = (d)=>{
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,'0');
  const dd=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
};
function daysBetween(a,b){
  const MS=24*60*60*1000;
  return Math.floor((b - a)/MS);
}

/* Loving You Since block */
function renderLove(){
  const d = LOVE_SINCE;
  loveDate.textContent = d.toLocaleDateString(undefined, { day:'2-digit', month:'short', year:'numeric' });
  loveDays.textContent = `— Days ${daysBetween(d, new Date())}`;
}

/* Auth */
function setUser(u){
  state.user = u;
  saveState(state);
  who.textContent = u ? (u.role==='knight' ? 'Knight K' : 'Princess Pan') : '';
  loginView.classList.toggle('hidden', !!u);
  dashView.classList.toggle('hidden', !u);
  knightOnly.classList.toggle('hidden', !(u && u.role==='knight'));
  princessOnly.classList.toggle('hidden', !(u && u.role==='princess'));
  renderAll();
}

btnPrincess.onclick = ()=> setUser({ role:'princess' });
btnKnight.onclick = ()=> {
  const ok = (kPass.value || '') === (CFG.KNIGHT_PASSWORD || '');
  if(!ok){ alert('Wrong Knight password'); return; }
  setUser({ role:'knight' });
};
btnLogout.onclick = ()=> setUser(null);

/* Upload (image letters) */
async function uploadImage(file, onProgress){
  // If Cloudinary configured, use it. Else read as data URL.
  if(CFG.CLOUDINARY_CLOUD && CFG.CLOUDINARY_PRESET){
    const url = `https://api.cloudinary.com/v1_1/${CFG.CLOUDINARY_CLOUD}/image/upload`;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', CFG.CLOUDINARY_PRESET);
    if(CFG.CLOUDINARY_FOLDER) fd.append('folder', CFG.CLOUDINARY_FOLDER);
    return new Promise((resolve,reject)=>{
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.onload = ()=>{
        if(xhr.status>=200 && xhr.status<300){
          try{ resolve(JSON.parse(xhr.responseText).secure_url); }
          catch(e){ reject(e); }
        } else reject(new Error('Cloudinary upload failed'));
      };
      xhr.onerror = ()=> reject(new Error('Network error'));
      if(xhr.upload && onProgress){
        xhr.upload.onprogress=(e)=>{
          if(e.lengthComputable) onProgress(Math.round(e.loaded*100/e.total));
        };
      }
      xhr.send(fd);
    });
  } else {
    // Local data URL
    return new Promise((resolve,reject)=>{
      const r = new FileReader();
      r.onload = ()=> resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
      // Fake progress
      let p=0; const t=setInterval(()=>{ p=Math.min(99,p+15); onProgress&&onProgress(p); if(p===99) clearInterval(t); },120);
    });
  }
}

btnUpload.onclick = async ()=>{
  const file = fileInput.files && fileInput.files[0];
  if(!file){ alert('Choose an image first'); return; }
  progress.classList.remove('hidden'); uploadHint.textContent='Uploading…';
  bar.style.width='1%';
  try{
    const url = await uploadImage(file, (p)=>{ bar.style.width = Math.min(99,p)+'%'; });
    // Save post
    const now = new Date();
    const post = {
      id: 'p_'+Date.now(),
      ymd: fmtYMD(now),
      createdAtMs: Date.now(),
      caption: captionInput.value.trim(),
      imageUrl: url,
      read: false
    };
    state.posts.unshift(post);
    saveState(state);
    bar.style.width='100%';
    uploadHint.textContent='Uploaded!';
    captionInput.value='';
    fileInput.value='';
    renderFeed();
    renderCalendar();
    setTimeout(()=>{ progress.classList.add('hidden'); uploadHint.textContent=''; }, 600);
  }catch(e){
    uploadHint.textContent='Upload failed';
  }
};

/* Feed */
function renderFeed(){
  const feed = document.getElementById('feed');
  feed.innerHTML = '';
  const u = state.user;
  state.posts
    .sort((a,b)=>(b.createdAtMs||0)-(a.createdAtMs||0))
    .forEach(p=>{
      const card = document.createElement('div');
      card.className='card-img';
      const img = document.createElement('img');
      img.src = p.imageUrl;
      img.alt = p.caption||p.ymd;

      const inner = document.createElement('div');
      inner.style.padding='8px';

      const cap = document.createElement('div');
      cap.className='caption';
      cap.textContent = p.caption||'';

      const meta = document.createElement('div');
      meta.className='meta';
      const when = document.createElement('div');
      when.className='when';
      when.textContent = p.ymd;
      const actions = document.createElement('div');
      actions.className='row';

      const btnDownload = document.createElement('a');
      btnDownload.className='btn btn-sm btn-pink';
      btnDownload.textContent='Download';
      btnDownload.href=p.imageUrl;
      btnDownload.download = `letter-${p.ymd}.jpg`;

      actions.appendChild(btnDownload);

      if(u && u.role==='knight'){
        const btnDel = document.createElement('button');
        btnDel.className='btn btn-sm';
        btnDel.textContent='Delete';
        btnDel.onclick=()=>{
          if(confirm('Delete this letter?')){
            state.posts = state.posts.filter(x=>x.id!==p.id);
            saveState(state);
            renderFeed(); renderCalendar();
          }
        };
        actions.appendChild(btnDel);
      }

      inner.appendChild(cap);
      inner.appendChild(meta);
      meta.appendChild(when);
      meta.appendChild(actions);

      card.appendChild(img);
      card.appendChild(inner);
      feed.appendChild(card);
    });
}

/* Calendar */
const cal = document.getElementById('calendar');
const monthLabel = document.getElementById('monthLabel');
let view = new Date();
view.setDate(1);

function renderCalendar(){
  monthLabel.textContent = view.toLocaleDateString(undefined, { month:'long', year:'numeric' });
  cal.innerHTML = '';
  const startWeekday = (new Date(view.getFullYear(), view.getMonth(), 1)).getDay(); // 0 Sun
  const daysInMonth = new Date(view.getFullYear(), view.getMonth()+1, 0).getDate();

  // Build a map of read/unread by day
  const map = {}; // ymd -> {readCount, unreadCount}
  state.posts.forEach(p=>{
    const ymd = p.ymd;
    const d = new Date(ymd);
    if(d.getMonth()!==view.getMonth() || d.getFullYear()!==view.getFullYear()) return;
    map[ymd] = map[ymd] || { read:0, unread:0 };
    const isRead = !!state.reads[p.id];
    if(isRead) map[ymd].read++; else map[ymd].unread++;
  });

  // Leading blanks
  for(let i=0;i<startWeekday;i++){
    const cell = document.createElement('div'); cell.className='day'; cal.appendChild(cell);
  }

  for(let day=1; day<=daysInMonth; day++){
    const ymd = fmtYMD(new Date(view.getFullYear(), view.getMonth(), day));
    const cell = document.createElement('div');
    cell.className='day';
    const num = document.createElement('div');
    num.className='num';
    num.textContent=day;
    cell.appendChild(num);

    // badges (centered, -3px up)
    const badge = document.createElement('div');
    badge.className='badge';
    if(map[ymd]){
      if(map[ymd].unread>0){
        const d1 = document.createElement('span');
        d1.className='dot orange';
        badge.appendChild(d1);
      }
      if(map[ymd].read>0){
        const d2 = document.createElement('span');
        d2.className='dot pink';
        d2.style.marginTop='3px';
        badge.appendChild(d2);
      }
    }
    cell.appendChild(badge);

    // ♥ on the 25th, placed like dots (below number, up 3px)
    if(day===25){
      const heart = document.createElement('div');
      heart.className='badge heart';
      heart.innerHTML = '<span class="heart">♥</span>';
      cell.appendChild(heart);
    }

    cal.appendChild(cell);
  }
}

el('prevMonth').onclick = ()=>{ view.setMonth(view.getMonth()-1); renderCalendar(); };
el('nextMonth').onclick = ()=>{ view.setMonth(view.getMonth()+1); renderCalendar(); };

/* Initial boot */
function renderAll(){
  renderLove();
  renderFeed();
  renderCalendar();
}

// Show default
if(state.user){ setUser(state.user); } else { setUser(null); }
