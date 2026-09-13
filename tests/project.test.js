import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {exerciseLibrary,equipment,defaultRoutines} from '../js/data.js';

test('la biblioteca es amplia y cada ejercicio referencia equipo real',()=>{
  assert.ok(Object.keys(exerciseLibrary).length>=50);
  for(const [id,e] of Object.entries(exerciseLibrary)){
    assert.equal(id,e.id);
    assert.ok(equipment[e.equipment],`${id} usa equipo inexistente`);
    assert.ok(e.how&&e.avoid&&e.primary);
  }
});

test('las rutinas solo referencian la biblioteca y respetan A/B/C',()=>{
  for(const user of ['daniel','elina']) for(const day of ['A','B','C']){
    assert.ok(defaultRoutines[user][day].length>=6);
    for(const item of defaultRoutines[user][day]){
      assert.ok(exerciseLibrary[item.exerciseId],`${user} ${day}: ${item.exerciseId}`);
      assert.ok(item.sets>0&&item.rest>=45&&item.reps);
    }
  }
  const elinaIds=Object.values(defaultRoutines.elina).flat().map(x=>x.exerciseId);
  assert.ok(!elinaIds.some(id=>exerciseLibrary[id].category==='Pecho'));
});

test('todos los recursos de equipo existen',async()=>{
  for(const eq of Object.values(equipment)) for(const img of eq.images) await access(new URL(`../assets/equipment/${img}`,import.meta.url));
});

test('cada ejercicio tiene su guía visual anatómica optimizada',async()=>{
  for(const id of Object.keys(exerciseLibrary)) await access(new URL(`../assets/exercises/${id}.webp`,import.meta.url));
  const app=await readFile(new URL('../js/app.js',import.meta.url),'utf8');
  assert.match(app,/assets\/exercises/);
  assert.doesNotMatch(app,/equipmentStrip|motionSvg/);
});

test('manifest y service worker usan rutas relativas para GitHub Pages',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../manifest.webmanifest',import.meta.url),'utf8'));
  assert.equal(manifest.start_url,'./'); assert.equal(manifest.scope,'./');
  const sw=await readFile(new URL('../sw.js',import.meta.url),'utf8');
  assert.match(sw,/['"]\.\/index\.html['"]/); assert.doesNotMatch(sw,/['"]\/index\.html['"]/);
});
