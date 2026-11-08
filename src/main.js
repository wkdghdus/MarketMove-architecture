import {
  getSprint,getNode,getTicket,getEpic,ticketsForNode,ticketsForNodeInSprint,
  focusNodeIds,connectedNodeIds,prettyDate,sprintDateRange,shortDateRange,yearLabel,
  validateProject,overviewGroups,overviewEdges,groupsForNodes
} from './model.js'

const $ = selector => document.querySelector(selector)
const $$ = selector => [...document.querySelectorAll(selector)]
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))
const plural = (n,word) => `${n} ${word}${n===1?'':'s'}`
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const isMobile = () => innerWidth <= 720
// Card geometry; tests/source.test.mjs checks the JSON layout against these values.
const NODE_WIDTH = 234
const NODE_HEIGHT = 74
const LANE_PAD = 18
const DRAG_THRESHOLD = 6
let project
let dialogOpener = null
let flows = []
const state = {
  hoveredSprint: null, pinnedSprint: null, hoveredNode: null, selectedNode: null, hoveredGroup: null, selectedGroup: null,
  view: 'overview', zoom: 1, panX: 0, panY: 0, guideNode: null
}
const activeSprintId = () => state.hoveredSprint || state.pinnedSprint
const getGroup = id => overviewGroups(project).find(g => g.id === id) ?? null
const PANES = {overview: '#overviewViewport', graph: '#graphViewport', matrix: '#matrixViewport'}

const stageFor = id => project.stages.find(stage=>stage.id===id)
const stageStyle = id => `--stage-color:${escapeHtml(stageFor(id).color)}`
const epicLabel = id => `${escapeHtml(id)} · ${getEpic(project,id)?.name ?? ''}`

/* ---------- Architecture graph ---------- */
/** Horizontal gutters between card rows, so edges that skip a lane run between cards rather than behind them. */
function rowGutters(){
  const rows=[...new Set(project.nodes.map(n=>n.y))].sort((a,b)=>a-b)
  const gutters=[rows[0]-7]
  for(let i=0;i<rows.length-1;i++)gutters.push((rows[i]+NODE_HEIGHT+rows[i+1])/2)
  gutters.push(rows.at(-1)+NODE_HEIGHT+7)
  return gutters
}
function edgePath(source,target,gutters){
  const x1=source.x+NODE_WIDTH,y1=source.y+NODE_HEIGHT/2,x2=target.x,y2=target.y+NODE_HEIGHT/2
  if(x2-x1<40){ // same lane: loop out through the lane's right-hand gap
    const xRight=Math.max(x1,x2+NODE_WIDTH)+34
    return `M ${x1} ${y1} C ${xRight} ${y1}, ${xRight} ${y2}, ${target.x+NODE_WIDTH} ${y2}`
  }
  const skipsLane=project.nodes.some(n=>n.x>source.x&&n.x<target.x)
  if(!skipsLane){
    const bend=Math.max(36,(x2-x1)*.5)
    return `M ${x1} ${y1} C ${x1+bend} ${y1}, ${x2-bend} ${y2}, ${x2} ${y2}`
  }
  const mid=(y1+y2)/2, yc=gutters.reduce((best,g)=>Math.abs(g-mid)<Math.abs(best-mid)?g:best)
  const run=48
  return `M ${x1} ${y1} C ${x1+run*.8} ${y1}, ${x1+run*.25} ${yc}, ${x1+run} ${yc} L ${x2-run} ${yc} C ${x2-run*.25} ${yc}, ${x2-run*.8} ${y2}, ${x2} ${y2}`
}
function sprintPips(node){
  return `<span class="node-pips" aria-hidden="true" title="Sprints S1–S9; filled = planned work touches this component (not progress)">${project.sprints.map(s=>`<i data-pip="${escapeHtml(s.id)}" class="${node.sprints.includes(s.id)?'is-planned':''}"></i>`).join('')}</span>`
}
function buildGraph(){
  const {architectureWidth:W,architectureHeight:H}=project.meta
  const lanes=project.stages.map(stage=>{
    const xs=project.nodes.filter(n=>n.stage===stage.id).map(n=>n.x)
    return {stage,left:Math.min(...xs)-LANE_PAD,width:Math.max(...xs)-Math.min(...xs)+NODE_WIDTH+LANE_PAD*2}
  })
  const laneHtml=lanes.map(({stage,left,width})=>`<div class="stage-column" style="left:${left}px;width:${width}px;height:${H-28}px;${stageStyle(stage.id)}" aria-hidden="true"><div class="stage-header"><span class="stage-number">${escapeHtml(stage.number)}</span><span class="stage-name">${escapeHtml(stage.title)}</span></div><span class="stage-desc">${escapeHtml(stage.subtitle)}</span></div>`).join('')
  const gutters=rowGutters()
  const edges=project.edges.map(edge=>`<path class="edge-line kind-${escapeHtml(edge.kind)}" data-edge-from="${escapeHtml(edge.from)}" data-edge-to="${escapeHtml(edge.to)}" d="${edgePath(getNode(project,edge.from),getNode(project,edge.to),gutters)}" />`).join('')
  const nodes=project.nodes.map(n=>`<button class="arch-node" type="button" data-open-node="${escapeHtml(n.id)}" style="left:${n.x}px;top:${n.y}px;${stageStyle(n.stage)}" aria-label="${escapeHtml(`${n.title}: ${n.subtitle}. Owner ${n.owner}. Planned in ${n.sprints.join(', ')}. Inspect component`)}"><span class="node-overline"><span>${escapeHtml(n.epic)} · ${escapeHtml(n.owner.toUpperCase())}</span>${sprintPips(n)}</span><strong class="node-title">${escapeHtml(n.title)}</strong><span class="node-subtitle">${escapeHtml(n.subtitle)}</span></button>`).join('')
  const marker=(id,cls)=>`<marker id="${escapeHtml(id)}" class="${cls}" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0 L8 4 L0 8 Z"/></marker>`
  for(const el of $$('[data-horizon]'))el.textContent=project.meta.horizonHours
  const board=$('#architectureBoard')
  board.style.width=`${W}px`;board.style.height=`${H}px`
  board.innerHTML=`${laneHtml}<svg class="edge-layer" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>${marker('arrow','arrow-base')}${marker('arrow-hi','arrow-hi')}${marker('arrow-adj','arrow-adj')}</defs>${edges}</svg>${nodes}`
  for(const node of $$('.arch-node')){
    node.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'){state.hoveredNode=node.dataset.openNode;updateHighlights()}})
    node.addEventListener('pointerleave',()=>{state.hoveredNode=null;updateHighlights()})
    node.addEventListener('focus',()=>{if(node.matches(':focus-visible')){state.hoveredNode=node.dataset.openNode;updateHighlights()}})
    node.addEventListener('blur',()=>{state.hoveredNode=null;updateHighlights()})
  }
}

/* ---------- Product overview (simplified layer) ---------- */
const ICONS = {
  chart:'<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
  news:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>',
  pulse:'<path d="M2 12h4l3-8 4 16 3-8h6"/>',
  database:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  layers:'<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
  spark:'<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  server:'<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
  rewind:'<path d="M11 19l-9-7 9-7v14z"/><path d="M22 19l-9-7 9-7v14z"/>',
  doc:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'
}
function renderOverview(){
  flows=overviewEdges(project)
  const block=g=>{
    const parts=g.nodeIds.map(id=>getNode(project,id).title).join(', ')
    return `<button class="ov-block" type="button" data-open-group="${escapeHtml(g.id)}" style="${stageStyle(g.stage)}" title="${escapeHtml(parts)}" aria-label="${escapeHtml(`${g.title}: ${parts}. Show in system map`)}"><span class="ov-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${ICONS[g.icon]??''}</svg></span><strong>${escapeHtml(g.title)}</strong></button>`
  }
  $('#overviewFlow').innerHTML=`<svg class="ov-edges" id="overviewEdges" aria-hidden="true"></svg>${project.overview.columns.map(col=>`<div class="ov-col">${col.map(block).join('')}</div>`).join('')}`
  for(const btn of $$('.ov-block')){
    const id=btn.dataset.openGroup
    btn.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'){state.hoveredGroup=id;updateHighlights()}})
    btn.addEventListener('pointerleave',()=>{state.hoveredGroup=null;updateHighlights()})
    btn.addEventListener('focus',()=>{if(btn.matches(':focus-visible')){state.hoveredGroup=id;updateHighlights()}})
    btn.addEventListener('blur',()=>{state.hoveredGroup=null;updateHighlights()})
  }
}
/** Connections are drawn from the live block positions, so the same flow works as columns (desktop) or rows (mobile). */
function drawOverviewEdges(){
  const flow=$('#overviewFlow')
  if($('#overviewViewport').hidden||!flow.clientWidth)return
  const box=flow.getBoundingClientRect()
  const rect=id=>{const r=flow.querySelector(`[data-open-group="${id}"]`).getBoundingClientRect();return {l:r.left-box.left,r:r.right-box.left,t:r.top-box.top,b:r.bottom-box.top,cx:(r.left+r.right)/2-box.left,cy:(r.top+r.bottom)/2-box.top}}
  const paths=flows.map(f=>{
    const a=rect(f.from),c=rect(f.to),dx=c.cx-a.cx,dy=c.cy-a.cy
    let d
    if(Math.abs(dx)>=Math.abs(dy)*.6){
      const [x1,x2]=dx>0?[a.r,c.l]:[a.l,c.r],k=Math.max(24,Math.abs(x2-x1)/2)*Math.sign(dx)
      d=`M ${x1} ${a.cy} C ${x1+k} ${a.cy}, ${x2-k} ${c.cy}, ${x2} ${c.cy}`
    }else{
      const [y1,y2]=dy>0?[a.b,c.t]:[a.t,c.b],k=Math.max(18,Math.abs(y2-y1)/2)*Math.sign(dy)
      d=`M ${a.cx} ${y1} C ${a.cx} ${y1+k}, ${c.cx} ${y2-k}, ${c.cx} ${y2}`
    }
    const ends=`data-flow-from="${escapeHtml(f.from)}" data-flow-to="${escapeHtml(f.to)}"`
    return `<path class="ov-edge kind-${escapeHtml(f.kind)}" ${ends} d="${d}"/><path class="ov-flow kind-${escapeHtml(f.kind)}" ${ends} d="${d}"/>`
  }).join('')
  const marker=(id,cls)=>`<marker id="${id}" class="${cls}" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0 L8 4 L0 8 Z"/></marker>`
  const svg=$('#overviewEdges')
  svg.setAttribute('width',box.width);svg.setAttribute('height',box.height)
  svg.innerHTML=`<defs>${marker('ov-arrow','arrow-base')}${marker('ov-arrow-hi','arrow-hi')}</defs>${paths}`
  updateHighlights()
}
function openGroup(id){
  state.selectedGroup=id;state.selectedNode=null;state.hoveredGroup=null
  setView('graph');refreshFocus()
}

/* ---------- Timeline ---------- */
function buildTimeline(){
  const first=project.sprints[0],last=project.sprints.at(-1),long={month:'short',day:'numeric',year:'numeric'}
  $('#timelineRange').textContent=`${first.id}–${last.id} · ${prettyDate(first.start,long)} — ${prettyDate(last.end,long)}`.toUpperCase()
  $('#phaseTrack').innerHTML=project.phases.map(p=>`<div class="phase-segment" style="grid-column:span ${p.sprints.length};--phase-color:${escapeHtml(p.color)}"><span>${escapeHtml(p.id)} · ${escapeHtml(p.name.toUpperCase())}</span><small>${escapeHtml(shortDateRange(p).toUpperCase())}</small></div>`).join('')
  $('#sprintTrack').innerHTML=project.sprints.map(s=>`<button type="button" class="sprint-item kind-${escapeHtml(s.kind)}" data-sprint="${escapeHtml(s.id)}" aria-pressed="false" aria-label="${escapeHtml(`${escapeHtml(s.id)}, ${s.title}: ${sprintDateRange(s)}. ${s.focus}. Commitment: ${s.commitment}. ${plural(s.ticketIds.length,'planned ticket')}.`)}"><span class="sprint-top"><strong class="sprint-code">${escapeHtml(s.id)}</strong><span class="sprint-year">${escapeHtml(yearLabel(s))}</span></span><span class="sprint-date">${escapeHtml(shortDateRange(s))}</span><strong class="sprint-name">${escapeHtml(s.title)}</strong><span class="sprint-note">${escapeHtml(s.commitment)}</span></button>`).join('')
  const buttons=$$('.sprint-item')
  buttons.forEach((btn,index)=>{
    const id=btn.dataset.sprint
    // Hover previews only with a real hover-capable pointer; touch goes straight to tap-to-lock.
    btn.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'){state.hoveredSprint=id;refreshFocus()}})
    btn.addEventListener('pointerleave',()=>{if(state.hoveredSprint===id){state.hoveredSprint=null;refreshFocus()}})
    btn.addEventListener('focus',()=>{if(btn.matches(':focus-visible')){state.hoveredSprint=id;refreshFocus()}})
    btn.addEventListener('blur',()=>{if(state.hoveredSprint===id){state.hoveredSprint=null;refreshFocus()}})
    btn.addEventListener('click',()=>{state.hoveredSprint=btn.matches(':focus-visible')?id:null;lockSprint(id)})
    btn.addEventListener('keydown',e=>{
      const target={ArrowRight:index+1,ArrowLeft:index-1,Home:0,End:buttons.length-1}[e.key]
      if(target===undefined)return
      e.preventDefault();buttons[(target+buttons.length)%buttons.length].focus()
    })
  })
}
function revealSprintButton(id){
  const btn=$(`.sprint-item[data-sprint="${escapeHtml(id)}"]`),scroller=$('#dockScroll')
  if(!btn||scroller.scrollWidth<=scroller.clientWidth)return
  const left=btn.offsetLeft-(scroller.clientWidth-btn.offsetWidth)/2
  scroller.scrollTo({left,behavior:reducedMotion()?'auto':'smooth'})
}

/* ---------- Delivery matrix ---------- */
function renderMatrix(){
  const headers=project.sprints.map(s=>`<th scope="col" data-matrix-col="${escapeHtml(s.id)}"><button class="matrix-head-button" type="button" data-lock-sprint="${escapeHtml(s.id)}" aria-label="${escapeHtml(`Lock ${escapeHtml(s.id)}, ${sprintDateRange(s)}`)}"><strong>${escapeHtml(s.id)}</strong><small>${escapeHtml(shortDateRange(s))}</small></button></th>`).join('')
  let rows=''
  for(const stage of project.stages){
    rows+=`<tr class="matrix-group-row"><th scope="rowgroup" colspan="${project.sprints.length+1}" style="${stageStyle(stage.id)}">${escapeHtml(stage.number)} / ${escapeHtml(stage.title.toUpperCase())}</th></tr>`
    for(const node of project.nodes.filter(n=>n.stage===stage.id)){
      rows+=`<tr data-matrix-row="${escapeHtml(node.id)}"><th scope="row"><button class="matrix-node-button" type="button" data-open-node="${escapeHtml(node.id)}" style="${stageStyle(node.stage)}"><i class="matrix-node-type" aria-hidden="true"></i>${escapeHtml(node.title)}</button></th>`
      for(const s of project.sprints){
        const tickets=ticketsForNodeInSprint(project,node.id,s.id)
        rows+=tickets.length
          ?`<td data-matrix-col="${escapeHtml(s.id)}"><button class="matrix-cell has-work" type="button" data-matrix-sprint="${escapeHtml(s.id)}" data-matrix-node="${escapeHtml(node.id)}" title="${escapeHtml(tickets.map(t=>`${escapeHtml(t.id)} ${t.title}`).join('\n'))}" aria-label="${escapeHtml(`${node.title} in ${escapeHtml(s.id)}: ${plural(tickets.length,'planned ticket')}, ${tickets.map(t=>t.id).join(', ')}`)}"><span aria-hidden="true">${tickets.length>1?tickets.length:''}</span></button></td>`
          :`<td data-matrix-col="${escapeHtml(s.id)}"><span class="matrix-empty" aria-label="${escapeHtml(`${node.title} in ${escapeHtml(s.id)}: no planned tickets`)}">·</span></td>`
      }
      rows+='</tr>'
    }
  }
  $('#matrixViewport').innerHTML=`<p class="matrix-intro"><strong>Dots mark planned work, not task completion.</strong> A dot appears only where at least one MM planning ticket maps that component to that sprint; numbers show more than one ticket. S4 is intentionally empty. Select a dot to lock its sprint and inspect the component.</p><div class="matrix-scroll"><table class="matrix-table"><caption class="sr-only">Planned tickets per architecture component and sprint</caption><thead><tr><th scope="col">ARCHITECTURE COMPONENT</th>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`
}

/* ---------- Focus state ---------- */
function updateHighlights(){
  const sprintId=activeSprintId(),hasSprint=Boolean(sprintId)
  const sprintFocus=hasSprint?focusNodeIds(project,sprintId):null
  // A block opened from the overview focuses its components, unless a sprint takes precedence.
  const focus=sprintFocus??(state.selectedGroup?new Set(getGroup(state.selectedGroup).nodeIds):null),hasFocus=Boolean(focus)
  const selected=state.hoveredNode||state.selectedNode
  const near=!hasFocus&&selected?connectedNodeIds(project,selected):null
  for(const node of $$('.arch-node')){
    const id=node.dataset.openNode
    node.classList.toggle('is-muted',hasFocus?!focus.has(id):Boolean(near&&!near.has(id)))
    node.classList.toggle('is-highlighted',hasFocus?focus.has(id):selected===id)
    node.classList.toggle('is-neighbour',Boolean(near&&near.has(id)&&id!==selected))
    for(const pip of node.querySelectorAll('[data-pip]'))pip.classList.toggle('is-active',pip.dataset.pip===sprintId)
  }
  for(const line of $$('.edge-line')){
    const a=line.dataset.edgeFrom,b=line.dataset.edgeTo
    const both=Boolean(focus&&focus.has(a)&&focus.has(b)),one=Boolean(focus&&!both&&(focus.has(a)||focus.has(b)))
    const adjacent=Boolean(near&&(a===selected||b===selected))
    line.classList.toggle('is-emphasized',both)
    line.classList.toggle('is-incident',one)
    line.classList.toggle('is-adjacent',adjacent)
    line.classList.toggle('is-muted',hasFocus?!(both||one):Boolean(near&&!adjacent))
  }
  const litGroups=sprintFocus?groupsForNodes(project,sprintFocus):null,hovered=!litGroups&&state.hoveredGroup
  const nearGroups=hovered?new Set([hovered,...flows.filter(f=>f.from===hovered||f.to===hovered).flatMap(f=>[f.from,f.to])]):null
  for(const block of $$('.ov-block')){
    const id=block.dataset.openGroup
    block.classList.toggle('is-muted',litGroups?!litGroups.has(id):Boolean(nearGroups&&!nearGroups.has(id)))
    block.classList.toggle('is-highlighted',litGroups?litGroups.has(id):id===hovered)
  }
  for(const path of $$('[data-flow-from]')){
    const a=path.dataset.flowFrom,b=path.dataset.flowTo
    const lit=litGroups?litGroups.has(a)&&litGroups.has(b):Boolean(hovered&&(a===hovered||b===hovered))
    path.classList.toggle('is-emphasized',lit)
    path.classList.toggle('is-muted',Boolean((litGroups||hovered)&&!lit))
  }
  for(const btn of $$('.sprint-item')){
    const s=btn.dataset.sprint
    btn.classList.toggle('is-preview',state.hoveredSprint===s&&state.pinnedSprint!==s)
    btn.classList.toggle('is-pinned',state.pinnedSprint===s)
    btn.setAttribute('aria-pressed',String(state.pinnedSprint===s))
  }
  for(const item of $$('.guide-item')){
    const id=item.dataset.guideNode,current=id===state.guideNode
    item.classList.toggle('is-current',current)
    item.setAttribute('aria-current',String(current))
    item.classList.toggle('is-muted',Boolean(sprintFocus&&!sprintFocus.has(id)))
    item.classList.toggle('is-in-sprint',Boolean(sprintFocus&&sprintFocus.has(id)))
    item.classList.toggle('is-hovered',id===state.hoveredNode)
  }
  for(const row of $$('[data-guide-sprint]'))row.classList.toggle('is-active',row.dataset.guideSprint===sprintId)
  for(const el of $$('[data-matrix-col]'))el.classList.toggle('is-active-col',el.dataset.matrixCol===sprintId)
  for(const row of $$('[data-matrix-row]'))row.classList.toggle('is-active-row',row.dataset.matrixRow===state.selectedNode||Boolean(focus&&focus.has(row.dataset.matrixRow)))
}
const deliveryChip = d => `<button class="focus-chip" type="button" data-open-node="${escapeHtml(d.nodeId)}"><span aria-hidden="true">↗</span>${escapeHtml(d.title)}</button>`
function renderFocusBar(){
  const sprintId=activeSprintId()
  let label,sub,chips
  const simple=state.view==='overview'
  if(sprintId){
    const s=getSprint(project,sprintId),mode=state.hoveredSprint&&state.hoveredSprint!==state.pinnedSprint?'PREVIEW':'LOCKED'
    label=`<span class="focus-mode">${mode}</span>${escapeHtml(s.id)} · ${escapeHtml(s.title.toUpperCase())}`
    // The overview layer leaves out tickets entirely.
    sub=simple?`${sprintDateRange(s)} · ${s.commitment}`:`${sprintDateRange(s)} · ${s.commitment} · ${plural(s.ticketIds.length,'ticket')} · ${plural(s.nodeIds.length,'component')}`
    chips=s.kind==='break'?(simple?'':`<span class="focus-break-note">${escapeHtml(s.focus)} — protected time: no mandatory tickets and no committed components.</span>`):s.deliverables.map(deliveryChip).join('')
  }else if(state.selectedGroup&&!state.selectedNode){
    const g=getGroup(state.selectedGroup)
    label=escapeHtml(g.title.toUpperCase())
    sub=plural(g.nodeIds.length,'component')
    chips=g.nodeIds.map(id=>`<button class="focus-chip" type="button" data-open-node="${escapeHtml(id)}">${escapeHtml(getNode(project,id).title)}</button>`).join('')
  }else if(state.selectedNode){
    const n=getNode(project,state.selectedNode)
    label=escapeHtml(n.title.toUpperCase())
    sub=`${n.owner} · ${plural(n.ticketIds.length,'planned ticket')}`
    chips=n.sprints.map(id=>`<button class="focus-chip" type="button" data-lock-sprint="${escapeHtml(id)}">${escapeHtml(id)} · ${escapeHtml(getSprint(project,id).title)}</button>`).join('')
  }else{
    label='FULL SYSTEM';sub='';chips=''
  }
  $('#mapFocusLabel').innerHTML=label
  $('#mapFocusSub').textContent=sub
  $('#focusChips').innerHTML=chips
  $('#clearFocus').hidden=!sprintId&&!state.selectedNode&&!state.selectedGroup
}
function renderHoverPanel(){
  const panel=$('#mapHoverPanel'),sprintId=activeSprintId()
  if(!sprintId){panel.hidden=true;return}
  const s=getSprint(project,sprintId)
  panel.hidden=false
  panel.innerHTML=`<span class="quick-kicker">${escapeHtml(s.id)} · ${escapeHtml(sprintDateRange(s).toUpperCase())}</span><strong>${escapeHtml(s.title)}</strong><small>${escapeHtml(s.commitment)} · ${plural(s.ticketIds.length,'ticket')} · ${plural(s.nodeIds.length,'component')}</small>${s.kind==='break'?'<p>Protected break. No mandatory development.</p>':''}`
}
function refreshFocus(){renderFocusBar();renderHoverPanel();updateHighlights()}
function lockSprint(id){
  state.pinnedSprint=state.pinnedSprint===id?null:id
  refreshFocus()
  if(state.pinnedSprint)revealSprintButton(state.pinnedSprint)
}
function focusSprint(id,{nodeId=null,scroll=false}={}){
  state.hoveredSprint=null;state.pinnedSprint=id
  if(nodeId)state.selectedNode=nodeId
  refreshFocus();revealSprintButton(id)
  if(scroll)$('#architecture').scrollIntoView({behavior:reducedMotion()?'auto':'smooth'})
}
function clearFocus(){
  state.pinnedSprint=null;state.hoveredSprint=null;state.selectedNode=null;state.hoveredNode=null;state.selectedGroup=null
  refreshFocus()
}

/* ---------- Dialogs ---------- */
const factGrid = facts => `<div class="dialog-facts">${facts.map(([k,v])=>`<div class="dialog-fact"><small>${escapeHtml(k)}</small><strong>${escapeHtml(v)}</strong></div>`).join('')}</div>`
function makeDialog(header,title,lead,body){
  return `<div class="dialog-inner"><div class="dialog-head"><span class="dialog-tag">${escapeHtml(header)}</span><button class="dialog-close" type="button" data-close-dialog aria-label="Close details">×</button></div><h2 id="dialogTitle">${escapeHtml(title)}</h2><div class="dialog-lead">${escapeHtml(lead)}</div>${body}</div>`
}
function openDialog(html){
  const dialog=$('#infoDialog')
  if(!dialog.open)dialogOpener=document.activeElement
  $('#dialogContent').innerHTML=html
  if(!dialog.open)dialog.showModal()
  dialog.scrollTop=0
  dialog.querySelector('.dialog-close').focus()
}
function closeDialog(){const dialog=$('#infoDialog');if(dialog.open)dialog.close()}
function openNode(id){
  const n=getNode(project,id);if(!n)return
  state.selectedNode=id;state.selectedGroup=null;refreshFocus()
  selectGuide(id)
  const related=ticketsForNode(project,id)
  const upstream=project.edges.filter(e=>e.to===id),downstream=project.edges.filter(e=>e.from===id)
  const neighbour=(nodeId,kind)=>`<button type="button" data-open-node="${escapeHtml(nodeId)}">${escapeHtml(getNode(project,nodeId).title)}${kind!=='data'?` <em>${escapeHtml(kind)}</em>`:''}</button>`
  const sprintRows=n.sprints.map(sid=>{
    const tickets=ticketsForNodeInSprint(project,id,sid)
    return `<button type="button" data-lock-sprint="${escapeHtml(sid)}">${escapeHtml(sid)} · ${escapeHtml(getSprint(project,sid).title)}${tickets.length?` <em>${tickets.map(t=>t.id).join(', ')}</em>`:''}</button>`
  }).join('')
  const body=factGrid([['PRIMARY OWNER',n.owner],['EPIC',epicLabel(n.epic)],['PLANNED SPRINTS',n.sprints.join(', ')||'None'],['LINKED TICKETS',`${related.length} planned`]])+
    `<section class="dialog-section"><h3>INPUT CONTRACT</h3><p>${escapeHtml(n.inputs)}</p></section>`+
    `<section class="dialog-section"><h3>OUTPUT / WHAT IT DELIVERS</h3><p>${escapeHtml(n.outputs)}</p></section>`+
    `<section class="dialog-section dialog-risk"><h3>RISK / DESIGN GUARDRAIL</h3><p>${escapeHtml(n.risk)}</p></section>`+
    `<section class="dialog-section"><h3>GRAPH NEIGHBOURS</h3><div class="dialog-columns"><div><small>RECEIVES FROM</small><div class="dialog-related">${upstream.map(e=>neighbour(e.from,e.kind)).join('')||'<span class="dialog-none">Cross-cutting or source component</span>'}</div></div><div><small>FEEDS</small><div class="dialog-related">${downstream.map(e=>neighbour(e.to,e.kind)).join('')||'<span class="dialog-none">Terminal or cross-cutting component</span>'}</div></div></div></section>`+
    `<section class="dialog-section"><h3>PLANNED SPRINTS</h3><div class="dialog-related">${sprintRows}</div></section>`+
    `<section class="dialog-section"><h3>LINKED TICKETS (${related.length})</h3>${related.map(t=>`<button class="dialog-ticket-button" type="button" data-open-ticket="${escapeHtml(t.id)}"><span><small>${escapeHtml(t.id)}</small>${escapeHtml(t.title)}</span><span class="dialog-ticket-meta">${escapeHtml(t.sprint)} · ${escapeHtml(t.owner)} <span aria-hidden="true">↗</span></span></button>`).join('')}</section>`+
    `<div class="dialog-warning">Planned end-state component. Sprint highlighting means planned work touches it — not that anything is built or done.</div>`
  openDialog(makeDialog(`${escapeHtml(n.epic)} / ${stageFor(n.stage).title.toUpperCase()}`,n.title,n.description,body))
}
function openTicket(id){
  const t=getTicket(project,id);if(!t)return
  const sprint=getSprint(project,t.sprint)
  const requiredBy=project.tickets.filter(other=>other.dependencies.includes(t.id))
  const textSections=t.description===t.acceptance
    ?`<section class="dialog-section"><h3>DELIVERABLE &amp; ACCEPTANCE CRITERIA</h3><p>${escapeHtml(t.acceptance)}</p></section>`
    :`<section class="dialog-section"><h3>OBJECTIVE</h3><p>${escapeHtml(t.description)}</p></section><section class="dialog-section"><h3>DONE WHEN / EVIDENCE</h3><p>${escapeHtml(t.acceptance)}</p></section>`
  const ticketButtons=list=>list.map(dep=>`<button type="button" data-open-ticket="${escapeHtml(dep.id)}">${escapeHtml(dep.id)} <em>${escapeHtml(dep.title)}</em></button>`).join('')
  const body=factGrid([['SPRINT',`${escapeHtml(sprint.id)} · ${sprintDateRange(sprint)}`],['OWNER',t.owner],['EPIC',epicLabel(t.epic)],['ESTIMATED SIZE',{S:'S · about 1–3 h',M:'M · about 4–8 h',L:'L · 8 h+, split if possible'}[t.size]??t.size]])+textSections+
    `<section class="dialog-section"><h3>AFFECTED ARCHITECTURE</h3><div class="dialog-related">${t.nodeIds.map(nodeId=>`<button type="button" data-open-node="${escapeHtml(nodeId)}">${escapeHtml(getNode(project,nodeId)?.title)}</button>`).join('')}</div></section>`+
    `<section class="dialog-section"><h3>RECORDED DEPENDENCIES</h3>${t.dependencies.length?`<div class="dialog-related">${ticketButtons(t.dependencies.map(dep=>getTicket(project,dep)))}</div>`:'<p>None recorded in the roadmap.</p>'}${requiredBy.length?`<p class="dialog-subnote">Required by:</p><div class="dialog-related">${ticketButtons(requiredBy)}</div>`:''}</section>`+
    `<div class="dialog-warning">Planning ID only — not a verified GitHub issue and not a claim that the work is complete.</div>`
  openDialog(makeDialog(`${escapeHtml(t.id)} / PLANNED TASK · ${escapeHtml(sprint.id)}`,t.title,`${sprint.focus} · ${sprint.commitment}`,body))
}

/* ---------- Component guide (below the system map) ---------- */
const LONG_DATE = {month:'short',day:'numeric',year:'numeric'}
const teamFor = owner => owner.split(' + ').map(name=>project.team.find(p=>p.name===name)).filter(Boolean)
function renderGuideNav(){
  $('#guideNav').innerHTML=project.stages.map(stage=>`<div class="guide-lane" style="${stageStyle(stage.id)}"><div class="guide-lane-head"><span>${escapeHtml(stage.number)}</span>${escapeHtml(stage.title)}</div>${project.nodes.filter(n=>n.stage===stage.id).map(n=>`<button class="guide-item" type="button" data-guide-node="${escapeHtml(n.id)}" aria-current="false"><strong>${escapeHtml(n.title)}</strong><small>${escapeHtml(n.subtitle)}</small></button>`).join('')}</div>`).join('')
  const items=$$('.guide-item')
  items.forEach((btn,index)=>{
    const id=btn.dataset.guideNode
    btn.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'){state.hoveredNode=id;updateHighlights()}})
    btn.addEventListener('pointerleave',()=>{if(state.hoveredNode===id){state.hoveredNode=null;updateHighlights()}})
    btn.addEventListener('keydown',e=>{
      const target={ArrowDown:index+1,ArrowUp:index-1,Home:0,End:items.length-1}[e.key]
      if(target===undefined)return
      e.preventDefault();items[(target+items.length)%items.length].focus()
    })
  })
}
function renderGuideDetail(){
  const n=getNode(project,state.guideNode),g=n.guide,stage=stageFor(n.stage)
  const index=project.nodes.indexOf(n),prev=project.nodes.at(index-1),next=project.nodes[(index+1)%project.nodes.length]
  const link=(e,otherId)=>`<li><button type="button" data-guide-node="${escapeHtml(otherId)}" style="${stageStyle(getNode(project,otherId).stage)}">${escapeHtml(getNode(project,otherId).title)}${e.kind!=='data'?` <em>${escapeHtml(e.kind)}</em>`:''}</button><span>${escapeHtml(e.carries)}</span></li>`
  const upstream=project.edges.filter(e=>e.to===n.id),downstream=project.edges.filter(e=>e.from===n.id)
  const flowList=(list,key,empty)=>list.length?`<ul class="guide-flow">${list.map(e=>link(e,e[key])).join('')}</ul>`:`<p class="guide-none">${empty}</p>`
  const people=teamFor(n.owner)
  const sprints=n.sprints.map(sid=>{
    const s=getSprint(project,sid),tickets=ticketsForNodeInSprint(project,n.id,sid)
    const delivery=s.deliverables.find(d=>d.nodeId===n.id)
    return `<li class="guide-sprint" data-guide-sprint="${escapeHtml(sid)}"><button type="button" class="guide-sprint-chip" data-lock-sprint="${escapeHtml(sid)}">${escapeHtml(sid)}<small>${escapeHtml(shortDateRange(s))}</small></button><div><strong>${escapeHtml(s.title)}</strong>${delivery?`<p>${escapeHtml(delivery.title)}: ${escapeHtml(delivery.description)}</p>`:''}${tickets.map(t=>`<button type="button" class="guide-ticket" data-open-ticket="${escapeHtml(t.id)}"><small>${escapeHtml(t.id)}</small>${escapeHtml(t.title)}<span>${escapeHtml(t.owner)} · ${escapeHtml(t.size)}</span></button>`).join('')}</div></li>`
  }).join('')
  const gates=project.gates.filter(gate=>gate.nodeIds.includes(n.id)).map(gate=>`<li class="${gate.provisional?'is-provisional':''}"><span class="guide-gate-date">${escapeHtml((gate.dateLabel??prettyDate(gate.date,LONG_DATE)).toUpperCase())}${gate.provisional?' · PROVISIONAL':''}</span><strong>${escapeHtml(gate.label)}</strong><p>${escapeHtml(gate.question)}${gate.provisional?` ${escapeHtml(gate.confirmation)}`:''}</p></li>`).join('')
  $('#guideDetail').style.cssText=stageStyle(n.stage)
  $('#guideDetail').innerHTML=`<div class="guide-detail-head"><span class="guide-kicker">${escapeHtml(stage.number)} / ${escapeHtml(stage.title.toUpperCase())} · ${escapeHtml(index+1)} OF ${escapeHtml(project.nodes.length)}</span><h3>${escapeHtml(n.title)}</h3><p class="guide-subtitle">${escapeHtml(n.subtitle)}</p><p class="guide-lane-summary"><strong>${escapeHtml(stage.title)} lane:</strong> ${escapeHtml(stage.summary)}</p></div>`+
    `<p class="guide-lead">${escapeHtml(g.definition)}</p><p class="guide-why"><strong>WHY IT MATTERS</strong>${escapeHtml(g.why)}</p>`+
    `<section class="guide-section"><h4>WHAT IT SHOULD DO</h4><ul class="guide-list">${g.responsibilities.map(r=>`<li>${escapeHtml(r)}</li>`).join('')}</ul></section>`+
    `<section class="guide-section"><h4>CONTRACT</h4><div class="guide-io"><div><small>RECEIVES</small><p>${escapeHtml(n.inputs)}</p></div><div><small>DELIVERS</small><p>${escapeHtml(n.outputs)}</p></div></div><p class="guide-summary">${escapeHtml(n.description)}</p></section>`+
    `<section class="guide-section"><h4>HOW IT CONNECTS</h4><div class="guide-columns"><div><small>RECEIVES FROM</small>${flowList(upstream,'from','Source or cross-cutting component: nothing upstream on the map.')}</div><div><small>FEEDS</small>${flowList(downstream,'to','End of the graph, or cross-cutting.')}</div></div>${g.note?`<p class="guide-note">${escapeHtml(g.note)}</p>`:''}</section>`+
    `<section class="guide-section"><h4>OWNERSHIP &amp; RESOURCES</h4><div class="guide-io"><div><small>OWNER</small><p>${escapeHtml(n.owner)}${people.map(p=>`<span class="guide-role">${n.owner===p.name?'':`${escapeHtml(p.name)}: `}${escapeHtml(p.role)} · ${escapeHtml(p.scope)}</span>`).join('')}</p></div><div><small>EPIC</small><p>${epicLabel(n.epic)}</p></div></div><small class="guide-label">RESOURCES</small><ul class="guide-list guide-resources">${g.resources.map(r=>`<li>${escapeHtml(r)}</li>`).join('')}</ul><p class="guide-footnote">Tooling is the foundation outline’s proposed stack, not a locked decision. “Planned doc” files don’t exist yet.</p></section>`+
    `<section class="guide-section"><h4>PLANNED WORK · ${escapeHtml(plural(n.ticketIds.length,'ticket').toUpperCase())}</h4><ul class="guide-sprints">${sprints}</ul></section>`+
    (gates?`<section class="guide-section"><h4>DECISION GATES</h4><ul class="guide-gates">${gates}</ul></section>`:'')+
    `<section class="guide-section guide-risk"><h4>RISK / DESIGN GUARDRAIL</h4><p>${escapeHtml(n.risk)}</p></section>`+
    `<div class="guide-actions"><button type="button" class="subtle-button" data-guide-node="${escapeHtml(prev.id)}"><span aria-hidden="true">←</span> ${escapeHtml(prev.title)}</button><button type="button" class="subtle-button" data-guide-locate="${escapeHtml(n.id)}">SHOW ON MAP <span aria-hidden="true">↑</span></button><button type="button" class="subtle-button" data-guide-node="${escapeHtml(next.id)}">${escapeHtml(next.title)} <span aria-hidden="true">→</span></button></div>`
  updateHighlights()
}
function selectGuide(id,{fromGuide=false}={}){
  if(!getNode(project,id))return
  state.guideNode=id
  renderGuideDetail()
  // Keep the current item visible inside the sticky nav without scrolling the page.
  const nav=$('#guideNav'),item=nav.querySelector(`[data-guide-node="${escapeHtml(id)}"]`)
  if(!isMobile()&&(item.offsetTop<nav.scrollTop||item.offsetTop+item.offsetHeight>nav.scrollTop+nav.clientHeight))nav.scrollTop=item.offsetTop-nav.clientHeight/2
  if(!fromGuide)return
  state.selectedNode=id;state.selectedGroup=null;refreshFocus()
  const detail=$('#guideDetail')
  if(detail.getBoundingClientRect().top<0||isMobile())detail.scrollIntoView({behavior:reducedMotion()?'auto':'smooth',block:'start'})
}
/** Bring a component into the middle of the map at the current zoom. */
function locateOnMap(id){
  const n=getNode(project,id),viewport=$('#graphViewport')
  state.selectedNode=id;state.selectedGroup=null;refreshFocus()
  state.panX=viewport.clientWidth/2-(n.x+NODE_WIDTH/2)*state.zoom
  state.panY=viewport.clientHeight/2-(n.y+NODE_HEIGHT/2)*state.zoom
  setTransform()
  $('#architecture').scrollIntoView({behavior:reducedMotion()?'auto':'smooth'})
}

/* ---------- Map viewport: sizing, pan, zoom ---------- */
/** Size the map so the panel, its focus bar and the fixed timeline dock all fit the first desktop screen. */
function sizeMap(){
  const dockHeight=$('#timelineDock').offsetHeight
  document.documentElement.style.setProperty('--dock-h',`${dockHeight}px`)
  const panes=Object.values(PANES).map(sel=>$(sel))
  if(isMobile()){for(const pane of panes)pane.style.height='';return}
  const visible=panes.find(pane=>!pane.hidden)
  const top=visible.getBoundingClientRect().top+scrollY
  const height=Math.round(Math.min(780,Math.max(340,innerHeight-dockHeight-top-$('#focusBar').offsetHeight-12)))
  for(const pane of panes)pane.style.height=`${height}px`
}
function setView(view){
  state.view=view
  for(const [name,sel] of Object.entries(PANES))$(sel).hidden=view!==name
  for(const btn of $$('.view-tab')){
    const active=btn.dataset.view===view;btn.classList.toggle('is-active',active);btn.setAttribute('aria-pressed',String(active))
  }
  $('.map-controls').hidden=view!=='graph'
  $('#componentGuide').hidden=view!=='graph'
  $('#guideJump').hidden=view!=='graph'
  sizeMap()
  if(view==='graph')requestAnimationFrame(fitBoard)
  if(view==='overview')requestAnimationFrame(drawOverviewEdges)
  refreshFocus()
}
function setTransform(){
  $('#graphWorld').style.transform=`translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`
  $('#zoomLevel').textContent=`${Math.round(state.zoom*100)}%`
}
function fitBoard(){
  const viewport=$('#graphViewport')
  if(!viewport.clientWidth||!viewport.clientHeight)return
  const {architectureWidth:W,architectureHeight:H}=project.meta
  if(viewport.clientWidth<650){
    // Narrow screens: keep cards legible and let people pan, instead of shrinking all four lanes to fit.
    state.zoom=Math.min(.72,(viewport.clientHeight-16)/H)
    state.panX=8
  }else{
    state.zoom=Math.min((viewport.clientWidth-20)/W,(viewport.clientHeight-20)/H,1.2)
    state.panX=(viewport.clientWidth-W*state.zoom)/2
  }
  state.panY=Math.max(8,(viewport.clientHeight-H*state.zoom)/2)
  setTransform()
}
function zoomAt(factor,x,y){
  const old=state.zoom,next=Math.max(.35,Math.min(1.8,old*factor));if(next===old)return
  state.panX=x-(x-state.panX)/old*next
  state.panY=y-(y-state.panY)/old*next
  state.zoom=next;setTransform()
}
function zoomBy(factor){const viewport=$('#graphViewport');zoomAt(factor,viewport.clientWidth/2,viewport.clientHeight/2)}
function bindGraphInteraction(){
  const viewport=$('#graphViewport')
  const pointers=new Map()
  let drag=null,pinch=null,suppressClick=false
  $('#fitMap').addEventListener('click',fitBoard)
  $('#zoomIn').addEventListener('click',()=>zoomBy(1.2))
  $('#zoomOut').addEventListener('click',()=>zoomBy(1/1.2))
  const local=e=>{const r=viewport.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}}
  const track=e=>pointers.set(e.pointerId,{...local(e),mouse:e.pointerType==='mouse'})
  const distance=()=>{const [a,b]=[...pointers.values()];return Math.hypot(a.x-b.x,a.y-b.y)}
  viewport.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return
    // A touch pan produces no click, so a stale suppression must not swallow the next real tap.
    if(e.pointerType==='mouse')for(const [id,p] of pointers)if(p.mouse)pointers.delete(id)
    if(!pointers.size)suppressClick=false
    track(e)
    if(pointers.size===2){
      const [a,b]=[...pointers.values()]
      pinch={distance:distance(),zoom:state.zoom,cx:(a.x+b.x)/2,cy:(a.y+b.y)/2};drag=null
    }else{
      // Drags may start on a card; the click is suppressed only if the pointer actually moved.
      drag={id:e.pointerId,x:e.clientX,y:e.clientY,panX:state.panX,panY:state.panY,moved:false}
    }
  })
  viewport.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return
    track(e)
    if(pinch&&pointers.size===2){
      const target=pinch.zoom*distance()/pinch.distance
      zoomAt(target/state.zoom,pinch.cx,pinch.cy);suppressClick=true;return
    }
    if(!drag||drag.id!==e.pointerId)return
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y
    if(!drag.moved&&Math.hypot(dx,dy)<DRAG_THRESHOLD)return
    if(!drag.moved){drag.moved=true;viewport.classList.add('is-dragging');viewport.setPointerCapture(e.pointerId)}
    state.panX=drag.panX+dx;state.panY=drag.panY+dy;setTransform()
  })
  const release=e=>{
    pointers.delete(e.pointerId)
    if(pointers.size<2)pinch=null
    if(drag&&drag.id===e.pointerId){if(drag.moved)suppressClick=true;drag=null;viewport.classList.remove('is-dragging')}
  }
  // Listen on window: a press released outside the map never reaches the viewport and would leave a ghost pointer.
  addEventListener('pointerup',release)
  addEventListener('pointercancel',release)
  viewport.addEventListener('click',e=>{if(suppressClick){e.stopPropagation();e.preventDefault();suppressClick=false}},true)
  viewport.addEventListener('wheel',e=>{
    if(!e.ctrlKey&&!e.metaKey)return
    e.preventDefault();const p=local(e);zoomAt(e.deltaY<0?1.08:1/1.08,p.x,p.y)
  },{passive:false})
  viewport.addEventListener('keydown',e=>{
    if(e.target!==viewport)return
    const step=48,moves={ArrowUp:[0,step],ArrowDown:[0,-step],ArrowLeft:[step,0],ArrowRight:[-step,0]}
    if(moves[e.key]){e.preventDefault();state.panX+=moves[e.key][0];state.panY+=moves[e.key][1];setTransform()}
    else if(e.key==='+'||e.key==='='){e.preventDefault();zoomBy(1.2)}
    else if(e.key==='-'||e.key==='_'){e.preventDefault();zoomBy(1/1.2)}
    else if(e.key==='0'){e.preventDefault();fitBoard()}
  })
  let resizeFrame
  const relayout=()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{sizeMap();if(state.view==='graph')fitBoard();drawOverviewEdges()})}
  addEventListener('resize',relayout)
  new ResizeObserver(relayout).observe($('#timelineDock'))
  new ResizeObserver(relayout).observe($('#overviewFlow'))
}

/* ---------- Global wiring ---------- */
function bindGlobal(){
  for(const btn of $$('.view-tab'))btn.addEventListener('click',()=>setView(btn.dataset.view))
  $('#clearFocus').addEventListener('click',clearFocus)
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-close-dialog]')){closeDialog();return}
    const ticket=e.target.closest('[data-open-ticket]');if(ticket){openTicket(ticket.dataset.openTicket);return}
    const guide=e.target.closest('[data-guide-node]');if(guide){selectGuide(guide.dataset.guideNode,{fromGuide:true});return}
    const locate=e.target.closest('[data-guide-locate]');if(locate){locateOnMap(locate.dataset.guideLocate);return}
    const matrix=e.target.closest('[data-matrix-sprint]');if(matrix){
      focusSprint(matrix.dataset.matrixSprint,{nodeId:matrix.dataset.matrixNode});openNode(matrix.dataset.matrixNode);return
    }
    const group=e.target.closest('[data-open-group]');if(group){openGroup(group.dataset.openGroup);return}
    const node=e.target.closest('[data-open-node]');if(node){openNode(node.dataset.openNode);return}
    const sprint=e.target.closest('[data-lock-sprint]');if(sprint){
      const fromDialog=$('#infoDialog').open
      closeDialog()
      // A deliberate jump selects the chosen sprint even when it is already locked.
      focusSprint(sprint.dataset.lockSprint,{scroll:fromDialog})
    }
  })
  const dialog=$('#infoDialog')
  dialog.addEventListener('click',e=>{if(e.target===dialog)closeDialog()})
  dialog.addEventListener('close',()=>{
    if(dialogOpener?.isConnected)dialogOpener.focus({preventScroll:true})
    dialogOpener=null
  })
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape'||dialog.open)return
    if(activeSprintId()||state.selectedNode||state.selectedGroup)clearFocus()
  })
}
async function boot(){
  try{
    const response=await fetch(new URL('./data/project.json',import.meta.url))
    if(!response.ok)throw new Error(`Could not load project data (${response.status})`)
    project=await response.json()
    const errors=validateProject(project)
    if(errors.length)throw new Error(`Invalid project data: ${errors.join('; ')}`)
    state.guideNode=project.nodes[0].id
    renderOverview();buildGraph();buildTimeline();renderMatrix();renderGuideNav();renderGuideDetail()
    bindGraphInteraction();bindGlobal();refreshFocus()
    setView(state.view)
    document.documentElement.classList.add('is-ready')
  }catch(error){
    console.error('MarketMove Atlas startup failure',error)
    $('#overviewFlow').innerHTML=`<div class="load-error"><strong>Could not load the architecture data.</strong><p>${escapeHtml(error.message)}</p><p>Start the local server with <code>npm run dev</code> or <code>python3 -m http.server 4173</code> and open <code>http://localhost:4173</code>.</p></div>`
  }
}
boot()
