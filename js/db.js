const DB_NAME='de-training';
const DB_VERSION=1;
let dbPromise;

export function db(){
  if(!dbPromise) dbPromise=new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const d=req.result;
      if(!d.objectStoreNames.contains('settings')) d.createObjectStore('settings');
      if(!d.objectStoreNames.contains('workouts')){
        const s=d.createObjectStore('workouts',{keyPath:'id'});
        s.createIndex('user','user'); s.createIndex('exerciseId','exerciseId'); s.createIndex('date','date');
      }
    };
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
  });
  return dbPromise;
}

export async function getSetting(key,fallback){
  const d=await db(); return new Promise((resolve,reject)=>{const r=d.transaction('settings').objectStore('settings').get(key);r.onsuccess=()=>resolve(r.result??fallback);r.onerror=()=>reject(r.error)});
}
export async function setSetting(key,value){
  const d=await db(); return new Promise((resolve,reject)=>{const r=d.transaction('settings','readwrite').objectStore('settings').put(value,key);r.onsuccess=()=>resolve(value);r.onerror=()=>reject(r.error)});
}
export async function putWorkout(record){
  const d=await db(); return new Promise((resolve,reject)=>{const r=d.transaction('workouts','readwrite').objectStore('workouts').put(record);r.onsuccess=()=>resolve(record);r.onerror=()=>reject(r.error)});
}
export async function allWorkouts(){
  const d=await db(); return new Promise((resolve,reject)=>{const r=d.transaction('workouts').objectStore('workouts').getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error)});
}
export async function replaceAll(data,mode='replace'){
  const d=await db();
  return new Promise((resolve,reject)=>{const tx=d.transaction(['settings','workouts'],'readwrite');if(mode==='replace'){tx.objectStore('settings').clear();tx.objectStore('workouts').clear()}Object.entries(data.settings||{}).forEach(([k,v])=>tx.objectStore('settings').put(v,k));(data.workouts||[]).forEach(v=>tx.objectStore('workouts').put(v));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
}
export async function exportAll(){
  const d=await db(); const settings={};
  await new Promise((resolve,reject)=>{const r=d.transaction('settings').objectStore('settings').openCursor();r.onsuccess=()=>{const c=r.result;if(c){settings[c.key]=c.value;c.continue()}else resolve()};r.onerror=()=>reject(r.error)});
  return {format:'de-training-backup',version:1,exportedAt:new Date().toISOString(),settings,workouts:await allWorkouts()};
}
