import {exerciseLibrary,equipment,defaultRoutines,profiles} from './data.js';
import {getSetting,setSetting,putWorkout,allWorkouts,exportAll,replaceAll} from './db.js';

const $=s=>document.querySelector(s); const app=$('#app');
const state={profile:null,view:'home',routines:null,active:null,libraryCategory:'Todos',librarySearch:'',historyExercise:'leg_press',timer:null,timerLeft:0,saveTimer:null};
const clone=o=>JSON.parse(JSON.stringify(o));
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const fmtDate=iso=>new Intl.DateTimeFormat('es',{month:'short',day:'numeric'}).format(new Date(iso));
const today=()=>new Date().toISOString().slice(0,10);
const exerciseImg=id=>`./assets/exercises/${id}.webp`;

function toast(message){const t=$('#toast');t.textContent=message;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),2200)}
function topbar(back=false){return `<header class="topbar"><button class="icon-btn" data-action="${back?'back':'profiles'}" aria-label="${back?'Volver':'Cambiar perfil'}">${back?'←':state.profile?profiles[state.profile].initial:'D&E'}</button><div class="brand">D<span>&</span>E <i>TRAINING</i></div><button class="icon-btn" data-action="settings" aria-label="Configuración">⚙</button></header>`}
function nav(active='today'){return `<nav class="bottom-nav" aria-label="Navegación principal">${[['today','◉','Entrenar'],['library','▦','Biblioteca'],['progress','↗','Progreso'],['editor','≡','Rutinas']].map(([id,ico,label])=>`<button class="nav-btn ${active===id?'active':''}" data-nav="${id}"><span>${ico}</span>${label}</button>`).join('')}</nav>`}

async function init(){
 try{state.routines=await getSetting('routines',clone(defaultRoutines));state.profile=await getSetting('lastProfile',null);state.active=await getSetting('activeWorkout',null)}catch(e){console.error(e);state.routines=clone(defaultRoutines);toast('No se pudo abrir el almacenamiento')}
 if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(console.warn);
 route(state.profile?'today':'home');
}
function route(view,opts={}){state.view=view;if(opts.profile)state.profile=opts.profile;window.scrollTo(0,0);render()}

function render(){
 if(state.view==='home') return renderHome();
 if(state.view==='today') return renderDashboard();
 if(state.view==='workout') return renderWorkout();
 if(state.view==='exercise') return renderExercise(optsExercise);
 if(state.view==='library') return renderLibrary();
 if(state.view==='progress') return renderProgress();
 if(state.view==='editor') return renderEditor();
 if(state.view==='settings') return renderSettings();
}

function renderHome(){
 app.innerHTML=`${topbar()}<main><p class="eyebrow">¿Quién entrena?</p><h1>Elegí tu perfil</h1><p class="muted">Cada historial se guarda por separado.</p><div class="profile-grid">${Object.entries(profiles).map(([id,p])=>`<button class="profile-card ${id}" data-profile="${id}"><span class="profile-initial">${p.initial}</span><span><span class="profile-name">${p.name}</span><span class="profile-meta">${p.meta}</span></span></button>`).join('')}</div><div class="card"><strong>Todo queda en este teléfono</strong><p class="muted" style="margin:6px 0 0">La app guarda automáticamente pesos, repeticiones y rutinas. No necesita cuenta.</p></div></main>`;
}

async function lastSession(user){const all=await allWorkouts();return all.filter(x=>x.user===user&&x.completedAt).sort((a,b)=>b.timestamp-a.timestamp)[0]}
function renderDashboard(){
 const p=profiles[state.profile],active=state.active?.user===state.profile?state.active:null;
 app.innerHTML=`${topbar()}<main><p class="eyebrow">Perfil activo</p><h1>Hola, ${p.name}</h1><p class="muted">Elegí el entrenamiento de hoy.</p>${active?`<button class="card full" data-action="resume" style="text-align:left"><span class="eyebrow">En curso</span><h2 style="margin:6px 0">Día ${active.day}</h2><span class="muted">Continuar ejercicio ${active.index+1} de ${active.items.length} →</span></button>`:''}<div class="day-grid">${['A','B','C'].map(d=>`<button class="day-btn" data-day="${d}">DÍA ${d}<small>${state.routines[state.profile][d].length} ejercicios</small></button>`).join('')}</div><section class="card"><span class="eyebrow">Último entrenamiento</span><div id="last-session" class="muted" style="margin-top:8px">Buscando…</div></section><section><div class="topbar"><h2 style="margin:0">Rutina actual</h2><button class="secondary" data-nav="editor">Editar</button></div><div class="exercise-list">${state.routines[state.profile].A.slice(0,4).map(item=>exerciseRow(item.exerciseId,`${item.sets} × ${item.reps}`)).join('')}</div></section></main>${nav('today')}`;
 lastSession(state.profile).then(x=>{const el=$('#last-session');if(el)el.textContent=x?`${fmtDate(x.date)} · Día ${x.day}`:'Todavía no hay entrenamientos guardados.'});
}

function exerciseRow(id,meta='',action='open-exercise'){const e=exerciseLibrary[id];return `<button class="exercise-row full" data-action="${action}" data-exercise="${id}" style="text-align:left"><img class="exercise-thumb" src="${exerciseImg(id)}" loading="lazy" alt=""><span class="exercise-row-main"><span class="exercise-row-title">${e.name}</span><span class="exercise-row-meta">${meta||equipment[e.equipment].name}</span></span><span class="chev">›</span></button>`}
function newActive(day){const items=state.routines[state.profile][day].map(item=>({...item,setsData:Array.from({length:item.sets},()=>({weight:'',reps:'',done:false,rir:''})),notes:''}));return {id:`${state.profile}-${Date.now()}`,user:state.profile,day,date:today(),startedAt:Date.now(),index:0,items}}
async function startWorkout(day){if(state.active&&state.active.user===state.profile&&!confirm('Hay un entrenamiento en curso. ¿Empezar uno nuevo?'))return;state.active=newActive(day);await saveActive();route('workout')}
async function saveActive(){try{await setSetting('activeWorkout',state.active)}catch(e){toast('No se pudo guardar') }}
function scheduleSave(){clearTimeout(state.saveTimer);state.saveTimer=setTimeout(saveActive,180)}

function renderWorkout(){
 const a=state.active;if(!a)return route('today');const item=a.items[a.index],e=exerciseLibrary[item.exerciseId];const pct=((a.index+1)/a.items.length*100).toFixed(0);
 app.innerHTML=`${topbar(true)}<main><div class="progress-head"><div class="progress-label"><span>DÍA ${a.day}</span><span>Ejercicio ${a.index+1} de ${a.items.length}</span></div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div></div>${exerciseGuide(e)}${lastBox(e.id)}<section class="card"><div class="topbar"><div><span class="eyebrow">Hoy</span><h2 style="margin:4px 0 0">${item.sets} × ${item.reps}</h2></div><select class="rir-select" data-field="session-rir" aria-label="RIR de la serie"><option value="">RIR</option>${[0,1,2,3,4].map(n=>`<option value="${n}">RIR ${n}</option>`).join('')}</select></div><table class="sets-table"><thead><tr><th>Serie</th><th>Peso lb</th><th>Reps</th><th>OK</th></tr></thead><tbody>${item.setsData.map((s,i)=>`<tr><td class="set-num">${i+1}</td><td><input inputmode="decimal" data-set="${i}" data-key="weight" value="${esc(s.weight)}" aria-label="Peso serie ${i+1}"></td><td><input inputmode="numeric" data-set="${i}" data-key="reps" value="${esc(s.reps)}" aria-label="Repeticiones serie ${i+1}"></td><td><button class="check-btn ${s.done?'done':''}" data-action="check-set" data-set="${i}" aria-label="Completar serie ${i+1}">${s.done?'✓':'○'}</button></td></tr>`).join('')}</tbody></table><textarea class="note" data-field="notes" placeholder="Nota opcional">${esc(item.notes)}</textarea></section>${progressionHint(item)}${timerCard(item.rest)}<div class="sticky-actions"><button class="secondary" data-action="previous" ${a.index===0?'disabled':''}>← Anterior</button><button class="primary" data-action="next">${a.index===a.items.length-1?'Finalizar':'Siguiente →'}</button></div></main>`;
 hydrateLast(e.id);updateTimerView();
}
function exerciseGuide(e){return `<section class="card exercise-guide"><p class="eyebrow">${esc(e.category)}</p><h1>${esc(e.name)}</h1><p class="muted equipment-name">${esc(equipment[e.equipment].name)}</p><figure class="exercise-visual"><img src="${exerciseImg(e.id)}" loading="eager" alt="${esc(e.name)}: posición inicial, posición final y músculos trabajados"><figcaption class="sr-only">Guía visual de ${esc(e.name)} con posición inicial y final.</figcaption></figure><div class="info-grid"><div class="info-block"><h3>Cómo hacerlo</h3><p>${esc(e.how)}</p></div><div class="info-block"><h3>Evita</h3><ul>${e.avoid.split('; ').map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div><div class="info-block"><h3>Músculos</h3><div class="muscles"><span class="pill">Principal: ${esc(e.primary)}</span>${e.secondary.map(x=>`<span class="pill">${esc(x)}</span>`).join('')}</div></div></section>`}
function lastBox(id){return `<section class="card" id="last-box"><span class="eyebrow">Última vez</span><p class="muted" style="margin:8px 0 0">Buscando…</p></section>`}
async function hydrateLast(id){const a=await allWorkouts();const r=a.filter(x=>x.user===state.profile&&x.exerciseId===id&&x.completedAt).sort((x,y)=>y.timestamp-x.timestamp)[0];const el=$('#last-box');if(!el)return;el.innerHTML=r?`<div class="last-box"><div><span class="eyebrow">Última vez</span><div class="last-load">${esc(r.sets?.find(s=>s.weight)?.weight||'—')} lb</div><div class="muted">${r.sets?.map(s=>s.reps||'—').join(' / ')}</div></div><strong>${fmtDate(r.date)}</strong></div>`:`<span class="eyebrow">Última vez</span><p class="muted" style="margin:8px 0 0">Sin registros anteriores.</p>`}
function progressionHint(item){const max=Number((item.reps.match(/(\d+)(?!.*\d)/)||[])[1]);if(!max||!item.setsData.every(s=>s.done&&Number(s.reps)>=max))return '';return `<div class="card" style="border-color:#8cac00"><strong>↑ Considera aumentar el peso la próxima vez</strong><p class="muted" style="margin:6px 0 0">Completaste el extremo alto del rango con todas las series.</p></div>`}
function timerCard(rest){return `<section class="card"><div class="topbar"><div><span class="eyebrow">Descanso</span><div id="timer-live" class="timer-live">${state.timerLeft?clock(state.timerLeft):clock(rest)}</div></div><button class="secondary" data-action="stop-timer">Detener</button></div><div class="timer-chips">${[45,60,75,90,120].map(s=>`<button class="timer-chip" data-timer="${s}">${s}s</button>`).join('')}</div></section>`}
const clock=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
function startTimer(sec){clearInterval(state.timer);state.timerLeft=sec;updateTimerView();state.timer=setInterval(()=>{state.timerLeft--;updateTimerView();if(state.timerLeft<=0){clearInterval(state.timer);state.timer=null;toast('Descanso terminado');navigator.vibrate?.([160,80,160])}},1000)}
function updateTimerView(){const e=$('#timer-live');if(e){e.textContent=clock(Math.max(0,state.timerLeft));e.classList.toggle('warn',state.timerLeft>0&&state.timerLeft<=5)}}
async function finishWorkout(){const a=state.active;const completedAt=new Date().toISOString();for(const [sequence,item] of a.items.entries()){await putWorkout({id:`${a.id}:${sequence}:${item.exerciseId}`,sessionId:a.id,user:a.user,date:a.date,day:a.day,sequence,exerciseId:item.exerciseId,sets:item.setsData,plannedSets:item.sets,repsTarget:item.reps,rest:item.rest,notes:item.notes||'',duration:Math.round((Date.now()-a.startedAt)/60000),completedAt,timestamp:Date.now()})}state.active=null;await setSetting('activeWorkout',null);toast('Entrenamiento guardado');route('today')}

let optsExercise='leg_press';
function renderExercise(id){const e=exerciseLibrary[id];app.innerHTML=`${topbar(true)}<main>${exerciseGuide(e)}${lastBox(id)}</main>${nav(state.view==='library'?'library':'')}`;hydrateLast(id)}
function renderLibrary(){const cats=['Todos',...new Set(Object.values(exerciseLibrary).map(e=>e.category))];const q=state.librarySearch.toLowerCase();const rows=Object.values(exerciseLibrary).filter(e=>(state.libraryCategory==='Todos'||e.category===state.libraryCategory)&&(!q||`${e.name} ${e.primary} ${equipment[e.equipment].name}`.toLowerCase().includes(q)));app.innerHTML=`${topbar()}<main><p class="eyebrow">Biblioteca maestra</p><h1>${Object.keys(exerciseLibrary).length} ejercicios</h1><input class="search" id="library-search" type="search" placeholder="Buscar ejercicio o máquina" value="${esc(state.librarySearch)}"><div class="filters">${cats.map(c=>`<button class="filter ${c===state.libraryCategory?'active':''}" data-category="${c}">${c}</button>`).join('')}</div><div class="exercise-list">${rows.map(e=>exerciseRow(e.id)).join('')||'<div class="empty">No encontré ejercicios.</div>'}</div></main>${nav('library')}`}

async function renderProgress(){const options=Object.values(exerciseLibrary).sort((a,b)=>a.name.localeCompare(b.name));app.innerHTML=`${topbar()}<main><p class="eyebrow">Progreso</p><h1>Historial por ejercicio</h1><select class="search" id="history-select">${options.map(e=>`<option value="${e.id}" ${e.id===state.historyExercise?'selected':''}>${e.name}</option>`).join('')}</select><section class="card"><canvas id="chart" class="chart" width="640" height="260" aria-label="Gráfica de progreso"></canvas></section><section class="card" id="history-list"><div class="muted">Cargando…</div></section></main>${nav('progress')}`;await hydrateProgress()}
async function hydrateProgress(){const rows=(await allWorkouts()).filter(x=>x.user===state.profile&&x.exerciseId===state.historyExercise&&x.completedAt).sort((a,b)=>b.timestamp-a.timestamp);const box=$('#history-list');if(!box)return;if(!rows.length){box.innerHTML='<div class="empty">Todavía no hay datos para este ejercicio.</div>';drawChart([]);return}box.innerHTML=`<table class="history-table"><thead><tr><th>Fecha</th><th>Peso</th><th>Reps</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${fmtDate(r.date)}</td><td>${esc(r.sets.find(s=>s.weight)?.weight||'—')} lb</td><td>${r.sets.map(s=>esc(s.reps||'—')).join('/')}</td></tr>`).join('')}</tbody></table>`;drawChart(rows.slice().reverse())}
function drawChart(rows){const c=$('#chart');if(!c)return;const x=c.getContext('2d'),w=c.width,h=c.height;x.clearRect(0,0,w,h);x.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--line');x.lineWidth=2;for(let i=1;i<4;i++){x.beginPath();x.moveTo(35,i*h/4);x.lineTo(w-15,i*h/4);x.stroke()}const vals=rows.map(r=>Number(r.sets.find(s=>s.weight)?.weight)||0);if(!vals.some(Boolean)){x.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--muted');x.font='24px sans-serif';x.fillText('Sin cargas registradas',160,140);return}const max=Math.max(...vals,1),min=Math.min(...vals),range=Math.max(max-min,5);x.strokeStyle='#8cac00';x.lineWidth=6;x.lineJoin='round';x.beginPath();vals.forEach((v,i)=>{const px=35+(w-55)*(i/Math.max(vals.length-1,1)),py=h-30-(h-55)*((v-min)/range);i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke();x.fillStyle='#8cac00';vals.forEach((v,i)=>{const px=35+(w-55)*(i/Math.max(vals.length-1,1)),py=h-30-(h-55)*((v-min)/range);x.beginPath();x.arc(px,py,7,0,Math.PI*2);x.fill()})}

function renderEditor(){const r=state.routines[state.profile];app.innerHTML=`${topbar()}<main><p class="eyebrow">Editar rutina</p><h1>${profiles[state.profile].name}</h1><div class="day-grid">${['A','B','C'].map(d=>`<button class="day-btn ${editorDay===d?'primary':''}" data-edit-day="${d}">DÍA ${d}<small>${r[d].length} ejercicios</small></button>`).join('')}</div><section class="card"><div class="editor-meta" style="display:grid;grid-template-columns:1fr 62px 74px 70px;gap:7px"><span>Ejercicio</span><span>Series</span><span>Reps</span><span>Desc.</span></div><div id="editor-list">${r[editorDay].map((item,i)=>editorRow(item,i)).join('')}</div><button class="secondary full" data-action="add-exercise">+ Agregar ejercicio</button></section><p class="muted">Los cambios se guardan automáticamente. Usá las flechas para cambiar el orden.</p><button class="danger-btn full" data-action="restore-routines">Restaurar rutinas originales</button></main>${nav('editor')}`}
let editorDay='A';
function editorRow(item,i){const e=exerciseLibrary[item.exerciseId];return `<div class="editor-row" data-index="${i}"><div><select data-editor="exerciseId">${Object.values(exerciseLibrary).sort((a,b)=>a.name.localeCompare(b.name)).map(o=>`<option value="${o.id}" ${o.id===item.exerciseId?'selected':''}>${o.name}</option>`).join('')}</select><div class="move-btns"><button class="mini-btn" data-action="move-up" data-index="${i}" aria-label="Subir">↑</button><button class="mini-btn" data-action="move-down" data-index="${i}" aria-label="Bajar">↓</button><button class="mini-btn" data-action="remove-exercise" data-index="${i}" aria-label="Eliminar">×</button></div></div><input inputmode="numeric" data-editor="sets" value="${item.sets}"><input data-editor="reps" value="${esc(item.reps)}"><input inputmode="numeric" data-editor="rest" value="${item.rest}"></div>`}
async function saveRoutines(){await setSetting('routines',state.routines);toast('Rutina guardada')}

function renderSettings(){app.innerHTML=`${topbar(true)}<main><p class="eyebrow">Configuración</p><h1>Datos y ayuda</h1><section class="card"><h2>RIR</h2><p><strong>Repeticiones en reserva.</strong> RIR 2 significa terminar pudiendo hacer unas 2 repeticiones más con buena técnica.</p><p class="muted">Primeras dos semanas: RIR 2–3. Después: RIR 1–2. No hace falta llegar al fallo de forma sistemática.</p></section><section class="card"><h2>Backup</h2><p class="muted">Incluye historial, rutinas y configuración.</p><div class="button-row"><button class="primary" data-action="export">Exportar</button><button class="secondary" data-action="pick-import">Importar</button></div><input id="import-file" type="file" accept="application/json" hidden></section><section class="card"><h2>Instalar en iPhone</h2><p>Abre esta página en Safari, toca <strong>Compartir</strong> y elige <strong>Añadir a pantalla de inicio</strong>.</p></section><section class="card"><h2>Funcionamiento offline</h2><p class="muted">Después de la primera carga, la app conserva la interfaz, rutinas y recursos ya utilizados incluso con mala señal.</p></section></main>`}
async function exportBackup(){const data=await exportAll();const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`de-training-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Backup exportado')}
async function importBackup(file){try{const data=JSON.parse(await file.text());if(data.format!=='de-training-backup')throw new Error('Formato inválido');const choice=prompt('Escribe REEMPLAZAR para borrar los datos actuales o COMBINAR para conservarlos.');if(choice===null)return;const mode=choice.trim().toLowerCase();if(!['reemplazar','combinar'].includes(mode)){toast('Importación cancelada');return}await replaceAll(data,mode==='reemplazar'?'replace':'combine');state.routines=await getSetting('routines',clone(defaultRoutines));state.active=await getSetting('activeWorkout',null);toast('Backup restaurado');route('today')}catch(e){console.error(e);toast('No se pudo importar ese archivo')}}

app.addEventListener('click',async ev=>{
 const b=ev.target.closest('button');if(!b)return;
 if(b.dataset.profile){state.profile=b.dataset.profile;await setSetting('lastProfile',state.profile);route('today');return}
 if(b.dataset.nav){route(b.dataset.nav);return}
 if(b.dataset.day){await startWorkout(b.dataset.day);return}
 if(b.dataset.category){state.libraryCategory=b.dataset.category;renderLibrary();return}
 if(b.dataset.editDay){editorDay=b.dataset.editDay;renderEditor();return}
 if(b.dataset.timer){startTimer(Number(b.dataset.timer));return}
 const action=b.dataset.action;
 if(action==='profiles'){state.active?route('today'):route('home');return}
 if(action==='settings'){route('settings');return}
 if(action==='back'){route(state.active&&state.view==='workout'?'today':state.view==='exercise'?'library':'today');return}
 if(action==='resume'){route('workout');return}
 if(action==='open-exercise'){optsExercise=b.dataset.exercise;state.view='exercise';renderExercise(optsExercise);return}
 if(action==='check-set'){const s=state.active.items[state.active.index].setsData[Number(b.dataset.set)];s.done=!s.done;if(s.done&&!state.timerLeft)startTimer(state.active.items[state.active.index].rest);scheduleSave();renderWorkout();return}
 if(action==='previous'){state.active.index=Math.max(0,state.active.index-1);await saveActive();renderWorkout();return}
 if(action==='next'){if(state.active.index===state.active.items.length-1){if(confirm('¿Finalizar y guardar este entrenamiento?'))await finishWorkout()}else{state.active.index++;await saveActive();renderWorkout()}return}
 if(action==='stop-timer'){clearInterval(state.timer);state.timer=null;state.timerLeft=0;updateTimerView();return}
 if(action==='add-exercise'){state.routines[state.profile][editorDay].push({exerciseId:'goblet_squat',sets:3,reps:'8–12',rest:90});await saveRoutines();renderEditor();return}
 if(action==='remove-exercise'){state.routines[state.profile][editorDay].splice(Number(b.dataset.index),1);await saveRoutines();renderEditor();return}
 if(action==='move-up'||action==='move-down'){const arr=state.routines[state.profile][editorDay],i=Number(b.dataset.index),j=action==='move-up'?i-1:i+1;if(j>=0&&j<arr.length)[arr[i],arr[j]]=[arr[j],arr[i]];await saveRoutines();renderEditor();return}
 if(action==='restore-routines'&&confirm('¿Restaurar las rutinas originales de Daniel y Elina?')){state.routines=clone(defaultRoutines);await saveRoutines();renderEditor();return}
 if(action==='export'){await exportBackup();return}
 if(action==='pick-import'){$('#import-file').click();return}
});
app.addEventListener('input',ev=>{
 if(ev.target.id==='library-search'){state.librarySearch=ev.target.value;renderLibrary();$('#library-search')?.focus();return}
 if(ev.target.dataset.set!==undefined){const s=state.active.items[state.active.index].setsData[Number(ev.target.dataset.set)];s[ev.target.dataset.key]=ev.target.value;scheduleSave();return}
 if(ev.target.dataset.field==='notes'){state.active.items[state.active.index].notes=ev.target.value;scheduleSave();return}
 const key=ev.target.dataset.editor;if(key){const i=Number(ev.target.closest('.editor-row').dataset.index),item=state.routines[state.profile][editorDay][i];item[key]=['sets','rest'].includes(key)?Math.max(1,Number(ev.target.value)||1):ev.target.value;clearTimeout(state.saveTimer);state.saveTimer=setTimeout(saveRoutines,250)}
});
app.addEventListener('change',ev=>{if(ev.target.id==='history-select'){state.historyExercise=ev.target.value;hydrateProgress()}if(ev.target.id==='import-file'&&ev.target.files[0])importBackup(ev.target.files[0]);if(ev.target.dataset.field==='session-rir'){const item=state.active.items[state.active.index];item.setsData.filter(s=>s.done).forEach(s=>s.rir=ev.target.value);scheduleSave()}});
window.addEventListener('beforeunload',()=>{if(state.active)saveActive()});
init();
