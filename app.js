(function(){
"use strict";

/* ================= state ================= */
let state = null;
let weekOffset = 0;
let saveTimer = null;
let artifactApi = null;
let artifactChecked = false;
let newRating = { books: 0, media: 0 };
let newSeasonCount = {};
let activeTab = "today";

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

/* Tabs are a per-viewer UI concern, not shared state — new tabs can be added
   here later (e.g. Finance, Fitness) without touching the state schema. */
const TABS = [
  {id:"today", label:"Today"},
  {id:"studio", label:"Studio"},
  {id:"goals", label:"Goals"},
  {id:"reflections", label:"Reflections"}
];

/* Themed icons per default habit — outline draws in var(--ink-soft), and
   fills solid with var(--pink-deep) once ticked (handled by .chk[data-on] CSS). */
const HABIT_ICONS = {
  water: '<svg viewBox="0 0 24 24"><path d="M12 3c3 4 6 7.8 6 11.3A6 6 0 1 1 6 14.3C6 10.8 9 7 12 3z"/></svg>',
  sleep: '<svg viewBox="0 0 24 24"><path d="M18.5 14.5A7.5 7.5 0 0 1 9.5 5.5a7.5 7.5 0 1 0 9 9z"/></svg>',
  movement: '<svg viewBox="0 0 24 24"><path d="M4 15l3-3 2 2 4-5 2 2 3-3M4 18h16" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="7" r="1.6"/></svg>',
  skincare: '<svg viewBox="0 0 24 24"><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"/><circle cx="18" cy="17" r="1.4"/><circle cx="6" cy="18" r="1"/></svg>',
  meals: '<svg viewBox="0 0 24 24"><path d="M7 3v7a2 2 0 0 0 4 0V3M9 10v11M9 3v3M15 3c-1.2 0-2 1.5-2 4s.8 4 2 4v10" stroke-linecap="round"/></svg>',
  vitamins: '<svg viewBox="0 0 24 24"><rect x="4" y="9" width="16" height="8" rx="4" transform="rotate(-30 12 13)"/><line x1="12" y1="7.5" x2="12" y2="18.5" transform="rotate(-30 12 13)"/></svg>',
  gratitude_dua: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-9.5A4.5 4.5 0 0 1 12 8a4.5 4.5 0 0 1 7 2.5C19 15.6 12 20 12 20z"/></svg>',
  prayers5: '<svg viewBox="0 0 24 24"><path d="M5 20V11a7 7 0 0 1 14 0v9" stroke-linecap="round"/><path d="M5 20h14M9 20v-5a3 3 0 0 1 6 0v5"/></svg>',
  quran: '<svg viewBox="0 0 24 24"><path d="M12 5c-2-1.4-4.6-1.8-7-1v13c2.4-.8 5-.4 7 1 2-1.4 4.6-1.8 7-1V4c-2.4-.8-5-.4-7 1z" stroke-linejoin="round"/><path d="M12 5v13"/></svg>',
  istighfar: '<svg viewBox="0 0 24 24"><circle cx="12" cy="4.5" r="1.4"/><circle cx="17.8" cy="7.5" r="1.4"/><circle cx="19.5" cy="13.5" r="1.4"/><circle cx="16" cy="18.5" r="1.4"/><circle cx="9.5" cy="19.8" r="1.4"/><circle cx="5" cy="15.5" r="1.4"/><circle cx="5.5" cy="9" r="1.4"/></svg>',
  tidy10: '<svg viewBox="0 0 24 24"><path d="M14 3l6 6-8.5 8.5a3 3 0 0 1-4.2 0l-1.8-1.8a3 3 0 0 1 0-4.2L14 3z" stroke-linejoin="round"/><path d="M4 20l3.5-3.5" stroke-linecap="round"/></svg>',
  mealprep: '<svg viewBox="0 0 24 24"><path d="M4 10h16v3a7 7 0 0 1-7 7H11a7 7 0 0 1-7-7v-3z"/><path d="M2 10h20M8 10V6M16 10V6" stroke-linecap="round"/></svg>',
  creativetime: '<svg viewBox="0 0 24 24"><path d="M3 21l1-4.5L15.5 5 19 8.5 7.5 20 3 21z" stroke-linejoin="round"/><path d="M13.5 6.5L17.5 10.5" /></svg>',
  selfgrowth: '<svg viewBox="0 0 24 24"><path d="M12 21V11" stroke-linecap="round"/><path d="M12 12C12 8 9 6 5 6c0 4 3 6 7 6zM12 12c0-4.5 3-6.5 7-6.5 0 4.5-3 6.5-7 6.5z"/></svg>',
  socialeffort: '<svg viewBox="0 0 24 24"><path d="M4 5h16v10H9l-4 4V5z" stroke-linejoin="round"/></svg>'
};
const DEFAULT_ICON = '<svg viewBox="0 0 24 24"><path d="M12 3l2.2 5.6 6 .4-4.6 4 1.5 5.8L12 15.8 6.9 18.8l1.5-5.8-4.6-4 6-.4L12 3z" stroke-linejoin="round"/></svg>';
function habitIcon(id){ return HABIT_ICONS[id] || DEFAULT_ICON; }

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
    series: [],
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
  if(!state.series) state.series = [];
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
        return `<td><span class="chk" role="checkbox" aria-checked="${on}" tabindex="0" data-action="toggle-habit" data-habit="${h.id}" data-date="${key}" data-on="${on}">${habitIcon(h.id)}</span></td>`;
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
        <h2>Today</h2>
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
function renderStars(rating, opts){
  opts = opts || {};
  const stars = [1,2,3,4,5].map(n=>{
    const on = n <= (rating||0);
    if(opts.readOnly){
      return `<span class="star" data-on="${on}">★</span>`;
    }
    return `<span class="star" data-on="${on}" data-action="${opts.action}" data-kind="${opts.kind||''}" data-id="${opts.id||''}" data-value="${n}">★</span>`;
  }).join("");
  return `<span class="stars${opts.picker?' picker':''}">${stars}</span>`;
}

function renderMediaCard(kind, title, placeholder){
  const list = state[kind];
  const items = [...list].sort((a,b)=> (b.date||"").localeCompare(a.date||""));
  const rows = items.length ? items.map(it=>`
    <li class="media-row">
      <span class="txt">${esc(it.title)}</span>
      ${renderStars(it.rating, {action:"set-rating", kind, id:it.id})}
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
    <div class="new-rating-row">
      <label>Rating</label>
      ${renderStars(newRating[kind], {action:"set-new-rating", kind, picker:true})}
    </div>
  </div>`;
}

function renderSeries(){
  const rows = state.series.length ? state.series.map(s=>{
    const seasons = s.seasons.map(season=>{
      const eps = season.watched.map((on,i)=>`
        <span class="ep-box" data-on="${on}" data-action="toggle-episode" data-series="${s.id}" data-season="${season.id}" data-ep="${i}">${i+1}</span>`).join("");
      return `
        <div class="season-block">
          <div class="season-label">Season ${season.seasonNumber}</div>
          <div class="episode-row">${eps}</div>
        </div>`;
    }).join("");

    const seasonCount = newSeasonCount[s.id] || "";

    return `
      <div class="series-card">
        <div class="series-top">
          <span class="series-title">${esc(s.title)}</span>
          <span class="del" data-action="remove-series" data-series="${s.id}">remove</span>
        </div>
        ${seasons}
        <div class="add-season-row">
          <input type="number" min="1" id="season-ep-count-${s.id}" placeholder="Episodes" value="${seasonCount}">
          <button type="button" class="btn ghost sm" data-action="add-season" data-series="${s.id}">Add season</button>
        </div>
      </div>`;
  }).join("") : `<div class="empty-note">No series yet.</div>`;

  return `
  <div class="card">
    <h3>TV series</h3>
    ${rows}
    <div class="add-habit-row" style="margin-top:16px;">
      <input type="text" id="new-series-title" placeholder="Series title">
      <button type="button" class="btn ghost" data-action="add-series">Add series</button>
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
    <div class="grid-2">
      ${renderMediaCard("books","Books read","Book title")}
      ${renderMediaCard("media","Movies watched","Title")}
      ${renderSeries()}
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

/* ================= render: tab bar ================= */
function renderTabBar(){
  const tabs = TABS.map(t=>`
    <button type="button" class="tab-btn" data-action="switch-tab" data-tab="${t.id}" data-active="${activeTab===t.id}">${t.label}</button>
  `).join("");
  return `<div class="tab-bar">${tabs}</div>`;
}

function renderTabPanel(){
  let content = "";
  if(activeTab === "today"){
    content = renderDailyCheck() + renderHabits();
  } else if(activeTab === "studio"){
    content = renderProjects();
  } else if(activeTab === "goals"){
    content = renderGoals() + renderThisYear();
  } else if(activeTab === "reflections"){
    content = renderJournal();
  }
  return `<div class="tab-panel">${content}</div>`;
}

/* ================= render: all ================= */
function renderApp(){
  return `
    ${renderHero()}
    ${renderTabBar()}
    ${renderTabPanel()}
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
  state[kind].push({id:uid(), title, date: date || todayKey(), rating: newRating[kind] || 0});
  newRating[kind] = 0;
}
function removeMedia(kind, id){
  state[kind] = state[kind].filter(i=>i.id!==id);
}
function setNewRating(kind, value){
  newRating[kind] = Number(value);
}
function setRating(kind, id, value){
  const it = state[kind].find(i=>i.id===id);
  if(it) it.rating = Number(value);
}
function addSeries(title){
  title = title.trim();
  if(!title) return;
  state.series.push({id:uid(), title, seasons:[]});
}
function removeSeries(id){
  state.series = state.series.filter(s=>s.id!==id);
}
function addSeason(seriesId, episodeCount){
  const s = state.series.find(s=>s.id===seriesId);
  if(!s) return;
  const n = Math.max(1, Math.min(60, Number(episodeCount)||0));
  if(!n) return;
  s.seasons.push({id:uid(), seasonNumber: s.seasons.length+1, watched: new Array(n).fill(false)});
  delete newSeasonCount[seriesId];
}
function toggleEpisode(seriesId, seasonId, epIndex){
  const s = state.series.find(s=>s.id===seriesId);
  if(!s) return;
  const season = s.seasons.find(se=>se.id===seasonId);
  if(!season) return;
  season.watched[epIndex] = !season.watched[epIndex];
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
function applyStoredTab(){
  try{
    const tb = localStorage.getItem("asmaJournalTab");
    if(tb && TABS.some(t=>t.id===tb)) activeTab = tb;
  }catch(e){}
}
function switchTab(tabId){
  if(!TABS.some(t=>t.id===tabId)) return;
  activeTab = tabId;
  try{ localStorage.setItem("asmaJournalTab", tabId); }catch(e){}
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
    case "switch-tab": switchTab(t.getAttribute("data-tab")); render(); return;
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
    case "set-new-rating": {
      // Don't full-render here: that would wipe any title already typed in
      // the neighboring add-row input. Just repaint this one star picker.
      setNewRating(t.getAttribute("data-kind"), t.getAttribute("data-value"));
      const picker = t.closest(".stars");
      if(picker){
        const val = Number(t.getAttribute("data-value"));
        picker.querySelectorAll(".star").forEach((star,i)=> star.setAttribute("data-on", i < val));
      }
      changed = false;
      break;
    }
    case "set-rating": setRating(t.getAttribute("data-kind"), t.getAttribute("data-id"), t.getAttribute("data-value")); break;
    case "add-series": {
      const input = document.getElementById("new-series-title");
      addSeries(input.value);
      break;
    }
    case "remove-series": removeSeries(t.getAttribute("data-series")); break;
    case "add-season": {
      const sid = t.getAttribute("data-series");
      const input = document.getElementById(`season-ep-count-${sid}`);
      addSeason(sid, input.value);
      break;
    }
    case "toggle-episode": toggleEpisode(t.getAttribute("data-series"), t.getAttribute("data-season"), Number(t.getAttribute("data-ep"))); break;
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
  else if(id==="new-series-title"){ e.preventDefault(); document.querySelector('[data-action="add-series"]').click(); }
  else if(id==="new-books-title"){ e.preventDefault(); document.querySelector('[data-action="add-media"][data-kind="books"]').click(); }
  else if(id==="new-media-title"){ e.preventDefault(); document.querySelector('[data-action="add-media"][data-kind="media"]').click(); }
  else if(id && id.startsWith("season-ep-count-")){
    e.preventDefault();
    const sid = id.replace("season-ep-count-","");
    document.querySelector(`[data-action="add-season"][data-series="${sid}"]`).click();
  }
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
  applyStoredTab();
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
