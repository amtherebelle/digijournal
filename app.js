(function(){
"use strict";

/* ================= state ================= */
let state = null;
let weekOffset = 0;
let saveTimer = null;
let artifactApi = null;
let artifactChecked = false;

const AFFIRMATIONS = [
  "Small steps, kept gently, still arrive.",
  "You are allowed to build this slowly.",
  "Progress is quieter than it looks from the inside.",
  "Today only needs to be honest, not perfect.",
  "What you tend to, grows — including yourself.",
  "Rest is part of the record, not a gap in it.",
  "One page at a time is still a whole book.",
  "You don't need to feel ready to begin well."
];

const MOODS = [
  {id:"great", label:"Great"},
  {id:"good", label:"Good"},
  {id:"okay", label:"Okay"},
  {id:"rough", label:"Rough"},
  {id:"awful", label:"Awful"}
];

const DAY_LABELS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

/* ================= helpers ================= */
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

function isoDate(d){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function addDays(d,n){ const r=new Date(d); r.setDate(r.getDate()+n); return r; }
function startOfWeek(d){
  const r=new Date(d);
  const dow=(r.getDay()+6)%7; // Monday = 0
  r.setDate(r.getDate()-dow);
  r.setHours(0,0,0,0);
  return r;
}
function esc(s){
  return String(s==null?"":s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function fmtHuman(d){
  return d.toLocaleDateString("en-GB",{weekday:"long", day:"numeric", month:"long"});
}
function fmtShort(d){
  return d.toLocaleDateString("en-GB",{day:"numeric", month:"short"});
}
function fmtMoney(n){
  n = Number(n)||0;
  return "£" + n.toLocaleString("en-GB",{maximumFractionDigits:0});
}
function dayOfYear(d){
  const start = new Date(d.getFullYear(),0,0);
  const diff = d - start;
  return Math.floor(diff / 86400000);
}
function todayKey(){ return isoDate(new Date()); }

/* ================= default state ================= */
function defaultState(){
  return {
    lastModified: new Date().toISOString(),
    habitGroups: [
      {id:"health", name:"Health & body", habits:[
        {id:"water", name:"Water"},
        {id:"sleep", name:"Sleep"},
        {id:"movement", name:"Movement"},
        {id:"skincare", name:"Skincare"},
        {id:"meals", name:"Meals"},
        {id:"vitamins", name:"Vitamins"}
      ]},
      {id:"faith", name:"Faith & mindfulness", habits:[
        {id:"gratitude_dua", name:"Gratitude & du'a"},
        {id:"prayers5", name:"5 prayers"},
        {id:"quran", name:"Qur'an (a page)"},
        {id:"istighfar", name:"Istighfar (250)"}
      ]},
      {id:"home", name:"Home & admin", habits:[
        {id:"tidy10", name:"Tidy 10 minutes"},
        {id:"mealprep", name:"Meal prep / planning"}
      ]},
      {id:"work", name:"Work & business", habits:[
        {id:"creativetime", name:"Creative project time"}
      ]},
      {id:"growth", name:"Personal growth", habits:[
        {id:"selfgrowth", name:"Self-growth check-in"},
        {id:"socialeffort", name:"Social effort"}
      ]}
    ],
    habitLog: {},
    mood: {},
    dailyCheck: {},
    projects: [
      {id:"nqc", name:"Nerdy Quirks Co", postedLog:{}, ideas:[]},
      {id:"swa", name:"She Writes Anyway", postedLog:{}, ideas:[]}
    ],
    homeBuying: {
      milestones: [
        {id:"m1", label:"Save the deposit", done:false},
        {id:"m2", label:"Get a Mortgage in Principle", done:false},
        {id:"m3", label:"House-hunting", done:false},
        {id:"m4", label:"Offer accepted", done:false},
        {id:"m5", label:"Survey & solicitor (conveyancing)", done:false},
        {id:"m6", label:"Exchange contracts", done:false},
        {id:"m7", label:"Complete & get the keys", done:false}
      ],
      savingsCurrent: 0,
      savingsTarget: 0
    },
    ptQuals: {
      title: "Diploma for the Gym Instructing and Personal Training Practitioner (RQF)",
      units: [
        {id:"u1", name:"Anatomy and Physiology for Exercise", progress:0},
        {id:"u2", name:"Applied Anatomy & Physiology", progress:0},
        {id:"u3", name:"Nutrition for Physical Activity", progress:0},
        {id:"u4", name:"Client Consultations and Lifestyle Management", progress:0},
        {id:"u5", name:"Planning and Delivering Gym and Personal Training Programmes", progress:0},
        {id:"u6", name:"Planning and Delivering Personal Training Programmes", progress:0},
        {id:"u7", name:"Maximising the Customer Experience in the Exercise Environment", progress:0},
        {id:"u8", name:"Business Acumen for Personal Trainers", progress:0}
      ]
    },
    yearlyGoals: [],
    books: [],
    media: [],
    bucketCategories: [
      {id:"travel", name:"Travel"},
      {id:"growth", name:"Personal growth"}
    ],
    bucketItems: [],
    journal: []
  };
}

/* ================= persistence ================= */
function loadInitialState(){
  let embedded = null;
  try{
    const raw = document.getElementById("app-state").textContent;
    embedded = JSON.parse(raw);
  }catch(e){ embedded = defaultState(); }

  let local = null;
  try{
    const raw = localStorage.getItem("asmaJournalBackup");
    if(raw) local = JSON.parse(raw);
  }catch(e){ local = null; }

  if(local && local.lastModified && (!embedded.lastModified || local.lastModified > embedded.lastModified)){
    state = local;
    setTimeout(()=>publishState(true), 800);
  } else {
    state = embedded;
  }
  if(!state.dailyCheck) state.dailyCheck = {};
  if(!state.books) state.books = [];
  if(!state.media) state.media = [];
  if(!state.bucketCategories) state.bucketCategories = [];
  if(!state.bucketItems) state.bucketItems = [];
}

function backupLocally(){
  try{ localStorage.setItem("asmaJournalBackup", JSON.stringify(state)); }catch(e){}
}

async function getArtifactApi(){
  if(artifactChecked) return artifactApi;
  artifactChecked = true;
  try{
    if(window.claude && typeof window.claude.use === "function"){
      artifactApi = await window.claude.use("artifact");
    }
  }catch(e){ artifactApi = null; }
  return artifactApi;
}

function buildFullHTML(){
  const css = document.getElementById("app-style").textContent;
  const js = document.getElementById("app-script").textContent;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Asma's Journal</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Karla:wght@400;500;700&display=swap">
<style id="app-style">${css}</style>
</head>
<body>
<div class="wrap" id="app-root"></div>
<script id="app-state" type="application/json">${JSON.stringify(state)}<\/script>
<script id="app-script">${js}<\/script>
</body>
</html>`;
}

function setSaveStatus(mode){
  const el = document.getElementById("save-state");
  if(!el) return;
  el.setAttribute("data-state", mode);
  if(mode==="saving") el.textContent = "Saving…";
  else if(mode==="offline") el.textContent = "Kept on this device — will sync when possible";
  else el.textContent = "Saved";
}

function scheduleSave(){
  state.lastModified = new Date().toISOString();
  backupLocally();
  if(saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(()=>publishState(false), 1800);
  setSaveStatus("saving");
}

async function publishState(silent){
  const api = await getArtifactApi();
  if(!api){ setSaveStatus("offline"); return; }
  try{
    await api.publish(buildFullHTML());
    setSaveStatus("saved");
  }catch(err){
    const code = err && err.code;
    if(code === "conflict") return;
    if(code === "not_writer" || code === "not_granted" || code === "not_declared"){
      setSaveStatus("offline");
      return;
    }
    setSaveStatus("offline");
    if(!silent){
      setTimeout(()=>publishState(true), 4000);
    }
  }
}

/* ================= render: hero ================= */
function renderHero(){
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning, Asma." : hour < 18 ? "Good afternoon, Asma." : "Good evening, Asma.";
  const affirmation = AFFIRMATIONS[dayOfYear(now) % AFFIRMATIONS.length];
  const currentMood = state.mood[todayKey()];

  const pills = MOODS.map(m => `
    <button type="button" class="mood-pill" data-action="set-mood" data-mood="${m.id}" data-active="${currentMood===m.id}">
      <span class="swatch" style="background:var(--mood-${m.id})"></span>${m.label}
    </button>`).join("");

  return `
  <div class="hero">
    <div class="hero-top">
      <div>
        <div class="eyebrow">Personal Journal</div>
        <h1>${greeting}</h1>
        <div class="tagline">A quiet place to keep track of the small things — habits, ideas, goals, and how you're really doing.</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="date-badge">${fmtHuman(now)}</div>
        <button type="button" class="icon-btn" data-action="toggle-theme" title="Toggle light / dark" aria-label="Toggle theme">☾</button>
      </div>
    </div>
    <div class="affirmation">${affirmation}</div>
    <div class="mood-row">
      <div class="mood-label">How are you today?</div>
      <div class="mood-pills">${pills}</div>
    </div>
  </div>`;
}

/* ================= render: habits ================= */
function habitStreak(habitId){
  let count = 0;
  let d = new Date();
  d.setHours(0,0,0,0);
  while(true){
    const key = isoDate(d);
    if(state.habitLog[key] && state.habitLog[key][habitId]){
      count++;
      d = addDays(d,-1);
    } else break;
  }
  return count;
}

function renderHabits(){
  const monday = addDays(startOfWeek(new Date()), weekOffset*7);
  const days = Array.from({length:7}, (_,i)=>addDays(monday,i));
  const tKey = todayKey();
  const rangeLabel = `${fmtShort(days[0])} – ${fmtShort(days[6])}`;

  const head = days.map((d,i)=>{
    const isToday = isoDate(d)===tKey;
    return `<th style="${isToday?'color:var(--pink-deep)':''}">${DAY_LABELS[i]}<br><span style="font-weight:400">${d.getDate()}</span></th>`;
  }).join("");

  const groupsHtml = state.habitGroups.map(g=>{
    const rows = g.habits.map(h=>{
      const cells = days.map(d=>{
        const key = isoDate(d);
        const on = !!(state.habitLog[key] && state.habitLog[key][h.id]);
        return `<td><span class="chk" role="checkbox" aria-checked="${on}" tabindex="0" data-action="toggle-habit" data-habit="${h.id}" data-date="${key}" data-on="${on}">${on?"✓":""}</span></td>`;
      }).join("");
      return `<tr>
        <td><div class="habit-name">${esc(h.name)}<span class="rm" data-action="remove-habit" data-group="${g.id}" data-habit="${h.id}" title="Remove tracker">✕</span></div></td>
        ${cells}
        <td><span class="streak">${habitStreak(h.id) || 0}d</span></td>
      </tr>`;
    }).join("");
    return `
      <tr class="group-row"><td colspan="9">${esc(g.name)}</td></tr>
      ${rows || `<tr><td colspan="9"><div class="empty-note">Nothing here yet.</div></td></tr>`}
      <tr class="add-row">
        <td colspan="9">
          <div class="add-habit-inline">
            <input type="text" class="new-habit-in" data-group="${g.id}" placeholder="Add to ${esc(g.name)}">
            <button type="button" class="btn ghost sm" data-action="add-habit" data-group="${g.id}">Add</button>
          </div>
        </td>
      </tr>`;
  }).join("");

  return `
  <div class="section">
    <div class="section-head">
      <div>
        <h2>Habit tracker</h2>
        <div class="section-sub">Tick off the little things, day by day.</div>
      </div>
      <div class="week-nav">
        <button type="button" class="icon-btn" data-action="week-prev" aria-label="Previous week">‹</button>
        <span>${rangeLabel}</span>
        <button type="button" class="icon-btn" data-action="week-next" aria-label="Next week">›</button>
      </div>
    </div>
    <div class="card" style="overflow-x:auto;">
      <table class="habit-table">
        <thead><tr><th style="text-align:left">Habit</th>${head}<th>Streak</th></tr></thead>
        <tbody>${groupsHtml}</tbody>
      </table>
    </div>
  </div>`;
}

/* ================= render: daily check-in ================= */
function renderDailyCheck(){
  const tKey = todayKey();
  const todays = state.dailyCheck[tKey] || {win:"", gratitude:["","",""]};

  const history = Object.keys(state.dailyCheck)
    .filter(k => k !== tKey && (state.dailyCheck[k].win || (state.dailyCheck[k].gratitude||[]).some(g=>g)))
    .sort((a,b)=> b.localeCompare(a))
    .slice(0,6)
    .map(k=>{
      const c = state.dailyCheck[k];
      const grats = (c.gratitude||[]).filter(g=>g).map(g=>`<li>${esc(g)}</li>`).join("");
      return `<div class="checkin-entry">
        <div class="entry-date">${fmtHuman(new Date(k))}</div>
        ${c.win ? `<div class="checkin-win">Small win: ${esc(c.win)}</div>` : ""}
        ${grats ? `<ul class="checkin-grat">${grats}</ul>` : ""}
      </div>`;
    }).join("");

  return `
  <div class="section">
    <div class="section-head">
      <div>
        <h2>Today's check-in</h2>
        <div class="section-sub">One small win, three things you're grateful for.</div>
      </div>
    </div>
    <div class="card">
      <label for="checkin-win">Small win today</label>
      <input type="text" id="checkin-win" data-field="checkin-win" placeholder="Something that went right, however small" value="${esc(todays.win)}">
      <div class="grat-row">
        <div><label for="checkin-grat-0">Grateful for</label><input type="text" id="checkin-grat-0" data-field="checkin-grat" data-idx="0" placeholder="One" value="${esc(todays.gratitude[0]||"")}"></div>
        <div><label for="checkin-grat-1">&nbsp;</label><input type="text" id="checkin-grat-1" data-field="checkin-grat" data-idx="1" placeholder="Two" value="${esc(todays.gratitude[1]||"")}"></div>
        <div><label for="checkin-grat-2">&nbsp;</label><input type="text" id="checkin-grat-2" data-field="checkin-grat" data-idx="2" placeholder="Three" value="${esc(todays.gratitude[2]||"")}"></div>
      </div>
      ${history ? `<div class="checkin-history">${history}</div>` : ""}
    </div>
  </div>`;
}

/* ================= render: creative studio ================= */
function postedStreak(p){
  let count = 0;
  let d = new Date();
  d.setHours(0,0,0,0);
  while(true){
    const key = isoDate(d);
    if(p.postedLog && p.postedLog[key]){
      count++;
      d = addDays(d,-1);
    } else break;
  }
  return count;
}

function renderProjectCard(p){
  const tKey = todayKey();
  const postedToday = !!(p.postedLog && p.postedLog[tKey]);
  const streak = postedStreak(p);

  const ideas = p.ideas.length ? p.ideas.map(i=>`
      <li>
        <span class="dot">•</span>
        <span class="txt">${esc(i.text)}</span>
        <span class="del" data-action="remove-idea" data-project="${p.id}" data-idea="${i.id}">remove</span>
      </li>`).join("") : `<div class="empty-note">No ideas jotted down yet.</div>`;

  return `
  <div class="card project-card">
    <h3>${esc(p.name)}</h3>
    <button type="button" class="post-toggle" data-action="toggle-posted" data-project="${p.id}" data-on="${postedToday}">
      <span class="post-check">${postedToday?"✓":""}</span>
      <span>Posted today?</span>
    </button>
    ${streak ? `<div class="project-meta">${streak} day${streak===1?"":"s"} posting streak</div>` : ""}
    <div class="idea-area">
      <span class="idea-label">Ideas &amp; notes</span>
      <ul class="idea-list">${ideas}</ul>
      <div class="add-idea">
        <input type="text" id="idea-input-${p.id}" placeholder="Add an idea">
        <button type="button" class="btn ghost" data-action="add-idea" data-project="${p.id}">Add</button>
      </div>
    </div>
  </div>`;
}

function renderProjects(){
  return `
  <div class="section">
    <div class="section-head">
      <div>
        <h2>Creative studio</h2>
        <div class="section-sub">Nerdy Quirks Co and She Writes Anyway, side by side.</div>
      </div>
    </div>
    <div class="grid-2">
      ${state.projects.map(renderProjectCard).join("")}
    </div>
  </div>`;
}

/* ================= render: goals ================= */
function renderHomeBuying(){
  const milestones = state.homeBuying.milestones.map(m=>`
    <li class="milestone" data-done="${m.done}">
      <span class="check" data-action="toggle-milestone" data-milestone="${m.id}" data-done="${m.done}">${m.done?"✓":""}</span>
      <span class="label">${esc(m.label)}</span>
      <span class="del" data-action="remove-milestone" data-milestone="${m.id}">remove</span>
    </li>`).join("");

  const pct = state.homeBuying.savingsTarget > 0
    ? Math.min(100, Math.round(state.homeBuying.savingsCurrent / state.homeBuying.savingsTarget * 100))
    : 0;

  return `
  <div class="card">
    <h3>Home buying journey</h3>
    <ul class="milestone-list">${milestones || `<div class="empty-note">No milestones yet.</div>`}</ul>
    <div class="add-habit-row" style="margin-top:12px;">
      <input type="text" id="new-milestone-input" placeholder="Add a step">
      <button type="button" class="btn ghost" data-action="add-milestone">Add</button>
    </div>
    <div class="savings-box">
      <div class="savings-figures">
        <span class="cur">${fmtMoney(state.homeBuying.savingsCurrent)}</span>
        <span class="tgt">of ${fmtMoney(state.homeBuying.savingsTarget)} deposit goal</span>
      </div>
      <div class="progress-track" style="margin-top:10px;"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="savings-edit">
        <input type="number" min="0" id="savings-current-input" placeholder="Saved so far" value="${state.homeBuying.savingsCurrent||''}">
        <input type="number" min="0" id="savings-target-input" placeholder="Target" value="${state.homeBuying.savingsTarget||''}">
        <button type="button" class="btn" data-action="save-savings">Update</button>
      </div>
    </div>
  </div>`;
}

function renderPtQuals(){
  const units = state.ptQuals.units;
  const overall = units.length ? Math.round(units.reduce((s,u)=>s+u.progress,0)/units.length) : 0;
  const rows = units.map(u=>{
    const statusLabel = u.progress>=100 ? "Complete" : u.progress>0 ? "In progress" : "Not started";
    return `
    <li class="unit-row">
      <div class="unit-top">
        <span class="unit-name">${esc(u.name)}</span>
        <span class="unit-status" data-status="${statusLabel==='Complete'?'done':statusLabel==='In progress'?'active':'idle'}">${statusLabel}</span>
      </div>
      <div class="progress-row">
        <div class="progress-track"><div class="progress-fill" style="width:${u.progress}%"></div></div>
        <div class="progress-pct">${u.progress}%</div>
      </div>
      <div class="progress-btns">
        <button type="button" data-action="unit-dec" data-unit="${u.id}">−</button>
        <button type="button" data-action="unit-inc" data-unit="${u.id}">+</button>
      </div>
    </li>`;
  }).join("");

  return `
  <div class="card">
    <h3>PT qualification</h3>
    <div class="project-meta">${esc(state.ptQuals.title)}</div>
    <div class="progress-row" style="margin-top:14px;">
      <div class="progress-track"><div class="progress-fill" style="width:${overall}%"></div></div>
      <div class="progress-pct">${overall}%</div>
    </div>
    <div class="project-meta">Overall across all ${units.length} units</div>
    <ul class="unit-list">${rows}</ul>
  </div>`;
}

function renderYearlyGoals(){
  const items = state.yearlyGoals.map(g=>`
    <li class="goal-item" data-done="${g.done}">
      <span class="check" data-action="toggle-goal" data-goal="${g.id}" data-done="${g.done}">${g.done?"✓":""}</span>
      <span class="label">${esc(g.text)}</span>
      <span class="del" data-action="remove-goal" data-goal="${g.id}">remove</span>
    </li>`).join("");

  return `
  <div class="card">
    <h3>Yearly goals</h3>
    <ul class="goal-list">${items || `<div class="empty-note">Nothing on the list yet — what do you want this year to hold?</div>`}</ul>
    <div class="add-habit-row" style="margin-top:12px;">
      <input type="text" id="new-goal-input" placeholder="Add a goal for this year">
      <button type="button" class="btn ghost" data-action="add-goal">Add</button>
    </div>
  </div>`;
}

function renderGoals(){
  return `
  <div class="section">
    <div class="section-head">
      <div>
        <h2>Big goals</h2>
        <div class="section-sub">The things worth working toward all year.</div>
      </div>
    </div>
    <div class="grid-3">
      ${renderHomeBuying()}
      ${renderPtQuals()}
      ${renderYearlyGoals()}
    </div>
  </div>`;
}

/* ================= render: this year (books / media / bucket list) ================= */
function renderMediaCard(kind, title, placeholder){
  const list = state[kind];
  const items = [...list].sort((a,b)=> (b.date||"").localeCompare(a.date||""));
  const rows = items.length ? items.map(it=>`
    <li class="media-row">
      <span class="txt">${esc(it.title)}</span>
      <span class="media-date">${it.date ? fmtShort(new Date(it.date)) : ""}</span>
      <span class="del" data-action="remove-media" data-kind="${kind}" data-id="${it.id}">remove</span>
    </li>`).join("") : `<div class="empty-note">Nothing logged yet.</div>`;

  return `
  <div class="card">
    <h3>${title}</h3>
    <ul class="media-list">${rows}</ul>
    <div class="add-habit-row" style="margin-top:12px;">
      <input type="text" id="new-${kind}-title" placeholder="${placeholder}">
      <input type="date" id="new-${kind}-date" style="flex:0 0 150px;">
      <button type="button" class="btn ghost" data-action="add-media" data-kind="${kind}">Add</button>
    </div>
  </div>`;
}

function renderBucketList(){
  const cats = state.bucketCategories.map(c=>{
    const items = state.bucketItems.filter(i=>i.categoryId===c.id);
    const rows = items.map(i=>`
      <li class="goal-item" data-done="${i.done}">
        <span class="check" data-action="toggle-bucket" data-id="${i.id}" data-done="${i.done}">${i.done?"✓":""}</span>
        <span class="label">${esc(i.text)}</span>
        <span class="del" data-action="remove-bucket" data-id="${i.id}">remove</span>
      </li>`).join("");
    return `
      <div class="bucket-cat">
        <div class="bucket-cat-name">${esc(c.name)}</div>
        <ul class="goal-list">${rows || `<div class="empty-note">Nothing here yet.</div>`}</ul>
      </div>`;
  }).join("");

  const catOptions = state.bucketCategories.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");

  return `
  <div class="card">
    <h3>Bucket list</h3>
    ${cats}
    <div class="add-habit-row" style="margin-top:14px;">
      <select id="new-bucket-cat">${catOptions}</select>
      <input type="text" id="new-bucket-text" placeholder="Add an item">
      <button type="button" class="btn ghost" data-action="add-bucket">Add</button>
    </div>
  </div>`;
}

function renderThisYear(){
  return `
  <div class="section">
    <div class="section-head">
      <div>
        <h2>This year</h2>
        <div class="section-sub">What you're reading, watching, and dreaming about.</div>
      </div>
    </div>
    <div class="grid-3">
      ${renderMediaCard("books","Books read","Book title")}
      ${renderMediaCard("media","Movies &amp; shows watched","Title")}
      ${renderBucketList()}
    </div>
  </div>`;
}

/* ================= render: journal ================= */
function renderJournal(){
  const entries = [...state.journal].sort((a,b)=> b.date.localeCompare(a.date));
  const list = entries.length ? entries.map(e=>`
    <div class="entry">
      <span class="del" data-action="remove-entry" data-entry="${e.id}">remove</span>
      <div class="entry-date">${fmtHuman(new Date(e.date))}</div>
      <div class="entry-text">${esc(e.text)}</div>
    </div>`).join("") : `<div class="empty-note">Your reflections will collect here.</div>`;

  return `
  <div class="section">
    <div class="section-head">
      <div>
        <h2>Reflections</h2>
        <div class="section-sub">Whatever's on your mind — wins, worries, plans, free-writing.</div>
      </div>
    </div>
    <div class="card">
      <textarea id="journal-input" placeholder="Write freely…"></textarea>
      <div style="margin-top:10px;display:flex;justify-content:flex-end;">
        <button type="button" class="btn" data-action="save-journal">Save entry</button>
      </div>
      <div class="journal-entries">${list}</div>
    </div>
  </div>`;
}

/* ================= render: all ================= */
function renderApp(){
  return `
    ${renderHero()}
    ${renderHabits()}
    ${renderDailyCheck()}
    ${renderProjects()}
    ${renderGoals()}
    ${renderThisYear()}
    ${renderJournal()}
    <div class="divider">
      <svg viewBox="0 0 120 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 7H45" stroke="currentColor" stroke-width="1"/><path d="M75 7H120" stroke="currentColor" stroke-width="1"/><circle cx="60" cy="7" r="3" fill="currentColor"/></svg>
    </div>
    <div class="footer">
      <div>Asma's Journal</div>
      <div class="save-state" id="save-state" data-state="saved">Saved</div>
    </div>
  `;
}

function render(){
  document.getElementById("app-root").innerHTML = renderApp();
}

/* ================= mutations ================= */
function toggleHabit(habitId, dateKey){
  if(!state.habitLog[dateKey]) state.habitLog[dateKey] = {};
  state.habitLog[dateKey][habitId] = !state.habitLog[dateKey][habitId];
  if(!state.habitLog[dateKey][habitId]) delete state.habitLog[dateKey][habitId];
}
function removeHabit(groupId, habitId){
  const g = state.habitGroups.find(g=>g.id===groupId);
  if(!g) return;
  g.habits = g.habits.filter(h=>h.id!==habitId);
}
function addHabit(groupId, name){
  name = name.trim();
  if(!name) return;
  const g = state.habitGroups.find(g=>g.id===groupId);
  if(!g) return;
  g.habits.push({id:uid(), name});
}
function setMood(moodId){
  const key = todayKey();
  state.mood[key] = state.mood[key]===moodId ? undefined : moodId;
  if(state.mood[key]===undefined) delete state.mood[key];
}
function setCheckinWin(text){
  const key = todayKey();
  if(!state.dailyCheck[key]) state.dailyCheck[key] = {win:"", gratitude:["","",""]};
  if(state.dailyCheck[key].win === text) return false;
  state.dailyCheck[key].win = text;
  return true;
}
function setCheckinGrat(idx, text){
  const key = todayKey();
  if(!state.dailyCheck[key]) state.dailyCheck[key] = {win:"", gratitude:["","",""]};
  if(!state.dailyCheck[key].gratitude) state.dailyCheck[key].gratitude = ["","",""];
  if(state.dailyCheck[key].gratitude[idx] === text) return false;
  state.dailyCheck[key].gratitude[idx] = text;
  return true;
}
function togglePosted(projectId){
  const p = state.projects.find(p=>p.id===projectId);
  if(!p) return;
  if(!p.postedLog) p.postedLog = {};
  const key = todayKey();
  p.postedLog[key] = !p.postedLog[key];
  if(!p.postedLog[key]) delete p.postedLog[key];
}
function addIdea(projectId, text){
  text = text.trim();
  if(!text) return;
  const p = state.projects.find(p=>p.id===projectId);
  if(!p) return;
  p.ideas.push({id:uid(), text});
}
function removeIdea(projectId, ideaId){
  const p = state.projects.find(p=>p.id===projectId);
  if(!p) return;
  p.ideas = p.ideas.filter(i=>i.id!==ideaId);
}
function toggleMilestone(id){
  const m = state.homeBuying.milestones.find(m=>m.id===id);
  if(m) m.done = !m.done;
}
function removeMilestone(id){
  state.homeBuying.milestones = state.homeBuying.milestones.filter(m=>m.id!==id);
}
function addMilestone(label){
  label = label.trim();
  if(!label) return;
  state.homeBuying.milestones.push({id:uid(), label, done:false});
}
function saveSavings(current, target){
  state.homeBuying.savingsCurrent = Math.max(0, Number(current)||0);
  state.homeBuying.savingsTarget = Math.max(0, Number(target)||0);
}
function bumpUnit(unitId, delta){
  const u = state.ptQuals.units.find(u=>u.id===unitId);
  if(!u) return;
  u.progress = Math.max(0, Math.min(100, u.progress + delta));
}
function toggleGoal(id){
  const g = state.yearlyGoals.find(g=>g.id===id);
  if(g) g.done = !g.done;
}
function removeGoal(id){
  state.yearlyGoals = state.yearlyGoals.filter(g=>g.id!==id);
}
function addGoal(text){
  text = text.trim();
  if(!text) return;
  state.yearlyGoals.push({id:uid(), text, done:false});
}
function addMedia(kind, title, date){
  title = title.trim();
  if(!title) return;
  state[kind].push({id:uid(), title, date: date || todayKey()});
}
function removeMedia(kind, id){
  state[kind] = state[kind].filter(i=>i.id!==id);
}
function toggleBucket(id){
  const it = state.bucketItems.find(i=>i.id===id);
  if(it) it.done = !it.done;
}
function removeBucket(id){
  state.bucketItems = state.bucketItems.filter(i=>i.id!==id);
}
function addBucket(categoryId, text){
  text = text.trim();
  if(!text || !categoryId) return;
  state.bucketItems.push({id:uid(), categoryId, text, done:false});
}
function addJournalEntry(text){
  text = text.trim();
  if(!text) return;
  state.journal.push({id:uid(), date:new Date().toISOString(), text});
}
function removeEntry(id){
  state.journal = state.journal.filter(e=>e.id!==id);
}

/* ================= theme ================= */
function applyStoredTheme(){
  try{
    const t = localStorage.getItem("asmaJournalTheme");
    if(t==="light" || t==="dark") document.documentElement.setAttribute("data-theme", t);
  }catch(e){}
}
function toggleTheme(){
  const cur = document.documentElement.getAttribute("data-theme");
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const effectiveDark = cur ? cur==="dark" : prefersDark;
  const next = effectiveDark ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try{ localStorage.setItem("asmaJournalTheme", next); }catch(e){}
}

/* ================= events ================= */
function onClick(e){
  const t = e.target.closest("[data-action]");
  if(!t) return;
  const action = t.getAttribute("data-action");
  let changed = true;

  switch(action){
    case "toggle-theme": toggleTheme(); changed=false; break;
    case "set-mood": setMood(t.getAttribute("data-mood")); break;
    case "week-prev": weekOffset -= 1; render(); return;
    case "week-next": weekOffset += 1; render(); return;
    case "toggle-habit": toggleHabit(t.getAttribute("data-habit"), t.getAttribute("data-date")); break;
    case "remove-habit": removeHabit(t.getAttribute("data-group"), t.getAttribute("data-habit")); break;
    case "add-habit": {
      const gid = t.getAttribute("data-group");
      const input = document.querySelector(`.new-habit-in[data-group="${gid}"]`);
      addHabit(gid, input.value);
      break;
    }
    case "toggle-posted": togglePosted(t.getAttribute("data-project")); break;
    case "add-idea": {
      const pid = t.getAttribute("data-project");
      const input = document.getElementById(`idea-input-${pid}`);
      addIdea(pid, input.value);
      break;
    }
    case "remove-idea": removeIdea(t.getAttribute("data-project"), t.getAttribute("data-idea")); break;
    case "toggle-milestone": toggleMilestone(t.getAttribute("data-milestone")); break;
    case "remove-milestone": removeMilestone(t.getAttribute("data-milestone")); break;
    case "add-milestone": {
      const input = document.getElementById("new-milestone-input");
      addMilestone(input.value);
      break;
    }
    case "save-savings": {
      const cur = document.getElementById("savings-current-input").value;
      const tgt = document.getElementById("savings-target-input").value;
      saveSavings(cur, tgt);
      break;
    }
    case "unit-dec": bumpUnit(t.getAttribute("data-unit"), -5); break;
    case "unit-inc": bumpUnit(t.getAttribute("data-unit"), 5); break;
    case "toggle-goal": toggleGoal(t.getAttribute("data-goal")); break;
    case "remove-goal": removeGoal(t.getAttribute("data-goal")); break;
    case "add-goal": {
      const input = document.getElementById("new-goal-input");
      addGoal(input.value);
      break;
    }
    case "add-media": {
      const kind = t.getAttribute("data-kind");
      const title = document.getElementById(`new-${kind}-title`).value;
      const date = document.getElementById(`new-${kind}-date`).value;
      addMedia(kind, title, date);
      break;
    }
    case "remove-media": removeMedia(t.getAttribute("data-kind"), t.getAttribute("data-id")); break;
    case "toggle-bucket": toggleBucket(t.getAttribute("data-id")); break;
    case "remove-bucket": removeBucket(t.getAttribute("data-id")); break;
    case "add-bucket": {
      const cat = document.getElementById("new-bucket-cat").value;
      const text = document.getElementById("new-bucket-text").value;
      addBucket(cat, text);
      break;
    }
    case "save-journal": {
      const input = document.getElementById("journal-input");
      addJournalEntry(input.value);
      break;
    }
    case "remove-entry": removeEntry(t.getAttribute("data-entry")); break;
    default: changed = false;
  }

  if(changed){
    render();
    scheduleSave();
  }
}

function onBlurCapture(e){
  const el = e.target;
  if(!el || !el.getAttribute) return;
  const field = el.getAttribute("data-field");
  let changed = false;
  if(field === "checkin-win"){
    changed = setCheckinWin(el.value);
  } else if(field === "checkin-grat"){
    changed = setCheckinGrat(Number(el.getAttribute("data-idx")), el.value);
  }
  if(changed){
    scheduleSave();
    // no full render needed — inputs already show the typed value
  }
}

function onKeydown(e){
  if(e.key !== "Enter") return;
  const id = e.target.id;
  if(id==="new-milestone-input"){ e.preventDefault(); document.querySelector('[data-action="add-milestone"]').click(); }
  else if(id==="new-goal-input"){ e.preventDefault(); document.querySelector('[data-action="add-goal"]').click(); }
  else if(id==="new-bucket-text"){ e.preventDefault(); document.querySelector('[data-action="add-bucket"]').click(); }
  else if(id && id.startsWith("idea-input-")){
    e.preventDefault();
    const pid = id.replace("idea-input-","");
    document.querySelector(`[data-action="add-idea"][data-project="${pid}"]`).click();
  } else if(e.target.classList && e.target.classList.contains("new-habit-in")){
    e.preventDefault();
    const gid = e.target.getAttribute("data-group");
    document.querySelector(`[data-action="add-habit"][data-group="${gid}"]`).click();
  }
}

/* ================= init ================= */
function init(){
  applyStoredTheme();
  loadInitialState();
  render();
  document.addEventListener("click", onClick);
  document.addEventListener("blur", onBlurCapture, true);
  document.addEventListener("keydown", onKeydown);
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

})();
