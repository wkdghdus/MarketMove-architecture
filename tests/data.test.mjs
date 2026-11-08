import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {getSprint,getNode,getTicket,focusNodeIds,connectedNodeIds,sprintDateRange,shortDateRange,yearLabel,ticketsForNodeInSprint,validateProject,ticketsForNode,ticketsForSprint} from '../src/model.js'
const project=JSON.parse(await readFile(new URL('../src/data/project.json',import.meta.url),'utf8'))

test('roadmap model is internally consistent',()=>{assert.deepEqual(validateProject(project),[])})
test('revised plan has exactly nine sprints, 55 planning tickets, and eight epics',()=>{
  assert.equal(project.sprints.length,9)
  assert.equal(project.tickets.length,55)
  assert.equal(project.epics.length,8)
  assert.equal(project.nodes.length,21)
  for(let i=1;i<=55;i++)assert.ok(getTicket(project,`MM-${String(i).padStart(3,'0')}`))
})
test('all sprint ticket references and component mappings are bidirectional',()=>{
  for(const sprint of project.sprints){
    assert.deepEqual(sprint.ticketIds,project.tickets.filter(t=>t.sprint===sprint.id).map(t=>t.id))
    for(const ticketId of sprint.ticketIds){
      const ticket=getTicket(project,ticketId)
      assert.ok(ticket.nodeIds.every(id=>focusNodeIds(project,sprint.id).has(id)),`${ticketId} must highlight every affected node`)
    }
  }
  for(const node of project.nodes){
    assert.deepEqual(node.ticketIds,ticketsForNode(project,node.id).map(t=>t.id))
    assert.ok(node.ticketIds.length>0,`Unowned component: ${node.id}`)
  }
})
test('sprint 4 is protected exam break with zero mandatory tickets and zero highlighted nodes',()=>{
  const s=getSprint(project,'S4');assert.equal(s.kind,'break');assert.deepEqual(s.ticketIds,[]);assert.deepEqual([...focusNodeIds(project,'S4')],[])
})
test('first and final gates match revised roadmap timing',()=>{
  assert.equal(getSprint(project,'S1').start,'2026-11-07')
  assert.equal(getSprint(project,'S9').end,'2027-03-12')
  assert.equal(getSprint(project,'S7').end,'2027-02-12')
  assert.equal(getSprint(project,'S3').note.includes('December 10–22'),true)
})
test('sprint hover focuses source join and reconstruction; later sprint focuses replay',()=>{
  for(const id of ['token_join','label_reconstruction','polybench'])assert.ok(focusNodeIds(project,'S1').has(id))
  for(const id of ['historical_replay','replay_api'])assert.ok(focusNodeIds(project,'S6').has(id))
  assert.ok(connectedNodeIds(project,'token_join').has('label_reconstruction'))
})
test('future leakage and scientific limitations remain visible',()=>{
  const material=project.principles.map(p=>p.body).join(' ')
  assert.match(material,/No future prices/)
  assert.match(getNode(project,'news_context').risk,/Retrospective/)
  assert.match(getNode(project,'fused_model').risk,/hypothesis/)
})
test('cross-month and cross-year sprint labels are unambiguous',()=>{
  assert.equal(sprintDateRange(getSprint(project,'S2')),'Nov 21 – Dec 4, 2026')
  assert.equal(sprintDateRange(getSprint(project,'S4')),'Dec 19, 2026 – Jan 1, 2027')
  assert.equal(sprintDateRange(getSprint(project,'S9')),'Feb 27 – Mar 12, 2027')
  assert.equal(shortDateRange(getSprint(project,'S9')),'Feb 27 – Mar 12')
  assert.equal(yearLabel(getSprint(project,'S4')),'2026 → 27')
  assert.equal(yearLabel(getSprint(project,'S5')),'2027')
  for(const s of project.sprints)assert.equal((new Date(s.end)-new Date(s.start))/864e5,13,`${s.id} is a two-week window`)
})
test('delivery matrix dots come only from ticket-to-node mappings',()=>{
  let dots=0
  for(const n of project.nodes)for(const s of project.sprints){
    const count=ticketsForNodeInSprint(project,n.id,s.id).length
    if(count)dots++
    assert.equal(count>0,project.tickets.some(t=>t.sprint===s.id&&t.nodeIds.includes(n.id)))
  }
  assert.ok(dots>0)
  assert.equal(project.nodes.reduce((a,n)=>a+ticketsForNodeInSprint(project,n.id,'S4').length,0),0)
  // S7 curates a polymarket_live delivery that is also backed by MM-040; deliverable-only nodes never create dots.
  assert.equal(ticketsForNodeInSprint(project,'polymarket_live','S7')[0].id,'MM-040')
})
test('overview layer groups every component once and derives flows from component edges',async()=>{
  const {overviewGroups,overviewEdges,groupsForNodes}=await import('../src/model.js')
  const groups=overviewGroups(project)
  assert.equal(groups.flatMap(g=>g.nodeIds).sort().join(),project.nodes.map(n=>n.id).sort().join())
  assert.ok(groups.length<=12,'overview stays simpler than the component map')
  const flows=overviewEdges(project)
  assert.ok(flows.every(f=>f.from!==f.to))
  assert.equal(flows.find(f=>f.id==='live>serving').kind,'live')
  assert.equal(flows.find(f=>f.id==='dataset>evaluation').kind,'feedback')
  assert.ok(flows.some(f=>f.id==='markets>dataset')&&flows.some(f=>f.id==='serving>replay'))
  assert.deepEqual([...groupsForNodes(project,focusNodeIds(project,'S4'))],[])
  assert.ok(groupsForNodes(project,focusNodeIds(project,'S6')).has('replay'))
  assert.ok(!JSON.stringify(project.overview).includes('MM-'),'no tickets in the overview layer')
})
test('recorded ticket dependencies are preserved',()=>{
  assert.deepEqual(getTicket(project,'MM-005').dependencies,['MM-003','MM-004'])
  assert.equal(ticketsForSprint(project,'S2').length,8)
  assert.equal(ticketsForSprint(project,'S4').length,0)
})
