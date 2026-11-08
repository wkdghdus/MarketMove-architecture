import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {ticketsForSprint} from '../src/model.js'
const project=JSON.parse(await readFile(new URL('../src/data/project.json',import.meta.url),'utf8'))
const roadmap=await readFile(new URL('../docs/REVISED_ROADMAP.md',import.meta.url),'utf8')
const NODE_W=234,NODE_H=74 // must match NODE_WIDTH / NODE_HEIGHT in src/main.js

/** Parse MM tickets from both roadmap formats: Sprint 1 prose headers and Sprint 2–9 tables. */
function parseRoadmapTickets(markdown){
  const found={};let sprint=null
  for(const line of markdown.split('\n')){
    const heading=line.match(/^### Sprint (\d)/);if(heading){sprint=`S${heading[1]}`;continue}
    if(line.startsWith('## '))sprint=null
    if(!sprint)continue
    let m=line.match(/^\|\s*(MM-\d{3}) · (.+?) (E\d) · ([SML])\s*\|\s*(\w+)\s*\|/)
    if(m){found[m[1]]={sprint,title:m[2],epic:m[3],size:m[4],owner:m[5]};continue}
    m=line.match(/^(MM-\d{3}) · (.+) (\w+) · (E\d) · ([SML])$/)
    if(m)found[m[1]]={sprint,title:m[2],owner:m[3],epic:m[4],size:m[5]}
  }
  return found
}

test('every MM ticket matches the revised roadmap transcription',()=>{
  const source=parseRoadmapTickets(roadmap)
  assert.equal(Object.keys(source).length,55)
  const flat=text=>text.replace(/[`*]/g,'').replace(/\s+/g,' ')
  const flatRoadmap=flat(roadmap)
  for(const t of project.tickets){
    const s=source[t.id];assert.ok(s,`${t.id} missing from roadmap`)
    for(const key of ['sprint','title','owner','epic','size'])assert.equal(t[key],s[key],`${t.id} ${key}`)
    assert.ok(flatRoadmap.includes(flat(t.acceptance)),`${t.id} acceptance text is verbatim from the roadmap`)
  }
})
test('sprint windows, focus and capacity follow the revised roadmap table',()=>{
  const expected=[
    ['S1','2026-11-07','2026-11-20','Normal'],['S2','2026-11-21','2026-12-04','High priority'],['S3','2026-12-05','2026-12-18','Very light'],
    ['S4','2026-12-19','2027-01-01','No mandatory work'],['S5','2027-01-02','2027-01-15','Normal from Jan 4'],['S6','2027-01-16','2027-01-29','Normal'],
    ['S7','2027-01-30','2027-02-12','High priority'],['S8','2027-02-13','2027-02-26','Flexible'],['S9','2027-02-27','2027-03-12','Event-dependent']]
  assert.deepEqual(project.sprints.map(s=>[s.id,s.start,s.end,s.commitment]),expected)
  assert.match(project.sprints.find(s=>s.id==='S7').focus,/model freeze/i)
  assert.deepEqual(project.phases.map(p=>p.sprints.join(',')),['S1,S2','S3,S4,S5','S6,S7','S8,S9'])
  assert.deepEqual(project.epics.map(e=>e.id),['E0','E1','E2','E3','E4','E5','E6','E7'])
})
test('canonical entity counts are preserved',()=>{
  assert.equal(project.stages.length,4)
  assert.equal(project.phases.length,4)
  assert.equal(project.nodes.length,21)
  assert.equal(project.edges.length,30)
  assert.ok(project.edges.some(e=>e.kind==='live')&&project.edges.some(e=>e.kind==='feedback'))
})
test('sprint focus is exactly the union of ticket and curated delivery components',()=>{
  for(const s of project.sprints){
    const union=new Set([...ticketsForSprint(project,s.id).flatMap(t=>t.nodeIds),...s.deliverables.map(d=>d.nodeId)])
    assert.deepEqual(new Set(s.nodeIds),union,s.id)
    if(s.kind!=='break')assert.ok(s.deliverables.length>=3&&s.deliverables.length<=4,`${s.id} has 3–4 delivery cards`)
  }
})
test('research gates: six roadmap gates plus provisional paper and showcase targets',()=>{
  const fixed=project.gates.filter(g=>!g.provisional).map(g=>g.date)
  assert.deepEqual(fixed,['2026-11-20','2026-11-30','2026-12-09','2027-01-15','2027-01-29','2027-02-12'])
  const provisional=project.gates.filter(g=>g.provisional)
  assert.equal(provisional.length,2)
  for(const g of provisional){assert.ok(g.dateLabel&&g.confirmation,`${g.label} carries an approximate date and a confirmation note`)}
  assert.ok(provisional.some(g=>/showcase/i.test(g.label)))
})
test('component guide covers every node, edge and lane',()=>{
  for(const n of project.nodes){
    const g=n.guide
    assert.ok(g&&g.definition&&g.why,`${n.id} has a definition and rationale`)
    assert.ok(g.responsibilities.length>=3,`${n.id} lists what it should do`)
    assert.ok(g.resources.length>=1,`${n.id} lists resources`)
  }
  for(const e of project.edges)assert.ok(e.carries,`${e.id} says what flows along it`)
  for(const s of project.stages)assert.ok(s.summary,`${s.id} has a lane summary`)
})
test('architecture cards never overlap on the board',()=>{
  const {architectureWidth:W,architectureHeight:H}=project.meta
  for(const [i,a] of project.nodes.entries()){
    assert.ok(a.x>=0&&a.y>=0&&a.x+NODE_W<=W&&a.y+NODE_H<=H,`${a.id} inside board`)
    for(const b of project.nodes.slice(i+1)){
      const apart=a.x+NODE_W<=b.x||b.x+NODE_W<=a.x||a.y+NODE_H<=b.y||b.y+NODE_H<=a.y
      assert.ok(apart,`${a.id} overlaps ${b.id}`)
    }
  }
})
test('public data has no personal contact or candidate-assessment details',()=>{
  const text=JSON.stringify(project)
  assert.ok(!/[\w.+-]+@[\w-]+\.[\w.]+/.test(text),'no email addresses')
  assert.ok(!/\b(r[eé]sum[eé]|cv|curriculum vitae|interview scores?|linkedin|phone)\b/i.test(text),'no resume, interview or contact details')
  for(const person of project.team)assert.deepEqual(Object.keys(person).sort(),['color','name','role','scope'])
})
test('UI templates take schedule facts from project.json, not hardcoded strings',async()=>{
  const months='(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*'
  for(const file of ['../index.html','../src/main.js','../src/model.js']){
    // Comments may show format examples; only executable code and markup are checked.
    const source=(await readFile(new URL(file,import.meta.url),'utf8')).replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'')
    assert.ok(!new RegExp(`\\b${months}\\.? \\d{1,2}\\b`,'i').test(source),`${file} hardcodes a calendar date`)
    assert.ok(!/\b202[6-7]\b/.test(source),`${file} hardcodes a roadmap year`)
    assert.ok(!/MM-0\d\d/.test(source.replace(/placeholder="[^"]*"/,'')),`${file} hardcodes a ticket ID`)
    assert.ok(!/['"`]S[1-9]['"`]/.test(source),`${file} branches on a literal sprint ID`)
  }
})
