(function(){
  const $ = (sel, root=document)=>root.querySelector(sel);
  const $$ = (sel, root=document)=>Array.from(root.querySelectorAll(sel));

  const state = {
    role: null,        // 'princess' | 'knight'
    filter: 'unread',  // 'unread' | 'read'
    posts: loadPosts()
  };

  // --- Elements
  const loginPage = $('#loginPage');
  const appPage = $('#appPage');
  const tabs = $('#tabs');
  const logoutBtn = $('#logoutBtn');
  const loginBtn = $('#loginBtn');
  const cardPrincess = $('#cardPrincess');
  const cardKnight   = $('#cardKnight');
  const roleHint = $('#roleHint');
  const pwField = $('#pwField');
  const pwInput = $('#pwInput');

  const sinceDate = $('#sinceDate');
  const sinceDays = $('#sinceDays');

  const filterUnread = $('#filterUnread');
  const filterRead   = $('#filterRead');
  const lettersGrid  = $('#lettersGrid');
  const uploader = $('#uploader');
  const fileInput = $('#fileInput');
  const captionInput = $('#captionInput');
  const postBtn = $('#postBtn');
  const uploadHint = $('#uploadHint');

  const panelLetters = $('#panel-letters');
  const panelCalendar= $('#panel-calendar');

  // --- Init
  const cfg = window.APP_CONFIG || {};
  const since = new Date(cfg.lovingSince || '2022-10-18');
  sinceDate.textContent = since.toLocaleDateString(undefined, { day:'2-digit', month:'short', year:'numeric' });
  updateDays();

  function updateDays(){
    const now = new Date();
    const diff = Math.floor((now - since) / (1000*60*60*24));
    sinceDays.textContent = String(diff);
  }
  setInterval(updateDays, 60_000);

  // Role cards
  function selectRole(role){
    state.role = role;
    cardPrincess.classList.toggle('selected', role==='princess');
    cardKnight.classList.toggle('selected', role==='knight');
    if(role==='princess'){
      roleHint.textContent = 'Hello Princess! Tap continue.';
      pwField.hidden = true;
    }else{
      roleHint.textContent = 'Hello Knight! Please enter password.';
      pwField.hidden = false;
      pwInput.focus();
    }
  }
  cardPrincess.addEventListener('click', ()=>selectRole('princess'));
  cardKnight.addEventListener('click', ()=>selectRole('knight'));
  selectRole('princess');

  loginBtn.addEventListener('click', ()=>{
    if(state.role==='knight'){
      if(pwInput.value !== (cfg.knightPassword||'')){
        pwInput.classList.add('shake');
        setTimeout(()=>pwInput.classList.remove('shake'), 500);
        return;
      }
    }
    onLogin(state.role);
  });

  function onLogin(role){
    loginPage.hidden = true;
    appPage.hidden = false;
    tabs.hidden = false;
    logoutBtn.hidden = false;
    uploader.hidden = (role !== 'knight');
    renderLetters();
    renderCalendar();
  }

  logoutBtn.addEventListener('click', ()=>{
    loginPage.hidden = false;
    appPage.hidden = true;
    tabs.hidden = true;
    logoutBtn.hidden = true;
  });

  // Tabs
  $$('#tabs button').forEach(b=>{
    b.addEventListener('click', ()=>{
      $$('#tabs button').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      const id = b.dataset.tab;
      panelLetters.hidden = id!=='letters';
      panelCalendar.hidden= id!=='calendar';
    });
  });

  // Filters
  filterUnread.addEventListener('click', ()=>{ state.filter='unread'; filterUnread.classList.add('active'); filterRead.classList.remove('active'); renderLetters(); });
  filterRead  .addEventListener('click', ()=>{ state.filter='read';   filterRead.classList.add('active');   filterUnread.classList.remove('active'); renderLetters(); });

  // Upload
  postBtn.addEventListener('click', async ()=>{
    const file = fileInput.files?.[0];
    if(!file){ uploadHint.textContent = 'Choose a file first.'; return; }
    uploadHint.textContent = 'Adding…';
    const url = await fileToObjectURL(file);
    const post = {
      id: 'local-' + Date.now(),
      ymd: ymdStr(new Date()),
      caption: captionInput.value.trim(),
      imageUrl: url,
      read: false,
      createdAtMs: Date.now()
    };
    state.posts.unshift(post);
    savePosts(state.posts);
    fileInput.value = '';
    captionInput.value = '';
    uploadHint.textContent = 'Posted!';
    renderLetters();
    renderCalendar();
    setTimeout(()=> uploadHint.textContent='', 800);
  });

  function fileToObjectURL(file){
    return Promise.resolve(URL.createObjectURL(file));
  }

  // Letters rendering
  function renderLetters(){
    lettersGrid.innerHTML = '';
    const posts = state.posts
      .filter(p => state.filter==='unread' ? !p.read : !!p.read)
      .sort((a,b) => (b.createdAtMs||0)-(a.createdAtMs||0));

    if(posts.length===0){
      lettersGrid.innerHTML = `<div class="empty">No ${state.filter} letters.</div>`;
      return;
    }

    for(const p of posts){
      const tpl = $('#letterTpl').content.cloneNode(true);
      const card = tpl.querySelector('.letter');
      const img = tpl.querySelector('.thumb'); img.src = p.imageUrl;
      tpl.querySelector('.caption').textContent = p.caption || '';
      tpl.querySelector('.ymd').textContent = p.ymd;

      const a = tpl.querySelector('.download');
      a.href = p.imageUrl;
      a.textContent = "Download";

      const markBtn = tpl.querySelector('.mark');
      markBtn.textContent = p.read ? 'Mark Unread' : 'Mark Read';
      markBtn.addEventListener('click', ()=>{
        p.read = !p.read;
        savePosts(state.posts);
        renderLetters();
        renderCalendar();
      });

      const delBtn = tpl.querySelector('.delete');
      if(state.role==='knight'){
        delBtn.hidden = false;
        delBtn.addEventListener('click', ()=>{
          if(confirm('Delete this letter?')){
            const idx = state.posts.findIndex(x=>x.id===p.id);
            if(idx>=0){ state.posts.splice(idx,1); savePosts(state.posts); renderLetters(); renderCalendar(); }
          }
        });
      }
      lettersGrid.appendChild(tpl);
    }
  }

  // Calendar
  function renderCalendar(){
    const cal = $('#calendar');
    cal.innerHTML='';

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0..11
    const first = new Date(year, month, 1);
    const startIdx = first.getDay(); // 0=Sun
    const daysInMonth = new Date(year, month+1, 0).getDate();

    const head = document.createElement('div');
    head.className='cal-head';
    "Sun Mon Tue Wed Thu Fri Sat".split(" ").forEach(d=>{
      const s=document.createElement('div'); s.textContent=d; head.appendChild(s);
    });
    cal.appendChild(head);

    const grid = document.createElement('div');
    grid.className='cal-grid';

    for(let i=0;i<startIdx;i++){
      const c=document.createElement('div'); c.className='cell empty'; grid.appendChild(c);
    }

    for(let day=1; day<=daysInMonth; day++){
      const c=document.createElement('div'); c.className='cell';
      const num=document.createElement('div'); num.className='daynum'; num.textContent=day; c.appendChild(num);

      // dots for posts on this day
      const ymd = ymdStr(new Date(year, month, day));
      const todays = state.posts.filter(p=>p.ymd===ymd);
      if(todays.some(p=>!p.read)){
        const d=document.createElement('div'); d.className='dot dot-orange'; c.appendChild(d);
      }else if(todays.length>0){
        const d=document.createElement('div'); d.className='dot dot-pink'; c.appendChild(d);
      }

      // heart on 25th (different color)
      if(day===25){
        const h=document.createElement('div'); h.className='heart-s'; h.textContent='♥'; c.appendChild(h);
      }

      grid.appendChild(c);
    }

    cal.appendChild(grid);
  }

  function ymdStr(d){
    const y=d.getFullYear();
    const m=String(d.getMonth()+1).padStart(2,'0');
    const day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }

  // Storage
  function loadPosts(){
    try{
      const raw=localStorage.getItem('pp.posts') || '[]';
      const arr=JSON.parse(raw);
      return Array.isArray(arr)?arr:[];
    }catch{ return [] }
  }
  function savePosts(arr){
    localStorage.setItem('pp.posts', JSON.stringify(arr));
  }

})();
