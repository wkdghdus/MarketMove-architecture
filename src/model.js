/** Pure roadmap selectors and formatters. No runtime framework needed. */
export function getSprint(project, id) { return project.sprints.find(item => item.id === id) ?? null }
export function getNode(project, id) { return project.nodes.find(item => item.id === id) ?? null }
export function getTicket(project, id) { return project.tickets.find(item => item.id === id) ?? null }
export function getPhase(project, id) { return project.phases.find(item => item.id === id) ?? null }
export function getEpic(project, id) { return project.epics.find(item => item.id === id) ?? null }
export function ticketsForSprint(project, id) { return project.tickets.filter(item => item.sprint === id) }
export function ticketsForNode(project, id) { return project.tickets.filter(item => item.nodeIds.includes(id)) }
/** Tickets that connect one component to one sprint: the only evidence for a delivery-matrix dot. */
export function ticketsForNodeInSprint(project, nodeId, sprintId) { return project.tickets.filter(t => t.sprint === sprintId && t.nodeIds.includes(nodeId)) }
export function focusNodeIds(project, id) { return new Set(getSprint(project, id)?.nodeIds ?? []) }
export function connectedNodeIds(project, id) {
  const connected = new Set([id])
  for (const edge of project.edges) {
    if (edge.from === id) connected.add(edge.to)
    if (edge.to === id) connected.add(edge.from)
  }
  return connected
}

/** Simplified product layer: blocks, and block-to-block flows derived from component edges. */
export function overviewGroups(project) { return project.overview.columns.flat() }
export function groupsForNodes(project, nodeIds) { return new Set(overviewGroups(project).filter(g => g.nodeIds.some(id => nodeIds.has(id))).map(g => g.id)) }
export function overviewEdges(project) {
  const owner = new Map(overviewGroups(project).flatMap(g => g.nodeIds.map(id => [id, g.id])))
  const flows = new Map()
  for (const e of project.edges) {
    const from = owner.get(e.from), to = owner.get(e.to)
    if (from === to) continue
    const key = `${from}>${to}`, prev = flows.get(key)
    // A flow carrying any historical data reads as data; otherwise it keeps its live/feedback character.
    if (!prev || e.kind === 'data') flows.set(key, {id: key, from, to, kind: e.kind})
  }
  return [...flows.values()]
}

function isoDate(iso) { return new Date(`${iso}T12:00:00Z`) }
export function prettyDate(iso, options = {month: 'short', day: 'numeric'}) { return new Intl.DateTimeFormat('en-US', {...options, timeZone: 'UTC'}).format(isoDate(iso)) }
const yearOf = iso => Number(iso.slice(0, 4))
/** "Nov 21 – Dec 4, 2026" or, across a year boundary, "Dec 19, 2026 – Jan 1, 2027". */
export function sprintDateRange(sprint) {
  const crossYear = yearOf(sprint.start) !== yearOf(sprint.end)
  const start = prettyDate(sprint.start, crossYear ? {month: 'short', day: 'numeric', year: 'numeric'} : undefined)
  return `${start} – ${prettyDate(sprint.end, {month: 'short', day: 'numeric', year: 'numeric'})}`
}
/** Month/day only, for space-constrained timeline cells: "Nov 21 – Dec 4". */
export function shortDateRange(sprint) { return `${prettyDate(sprint.start)} – ${prettyDate(sprint.end)}` }
/** "2026", or "2026 → 27" when the sprint crosses into a new year. */
export function yearLabel(sprint) {
  const a = yearOf(sprint.start), b = yearOf(sprint.end)
  return a === b ? String(a) : `${a} → ${String(b).slice(2)}`
}

export function validateProject(project) {
  const errors = []
  const nodeIds = new Set(project.nodes.map(n => n.id)), sprintIds = new Set(project.sprints.map(s => s.id)), ticketIds = new Set(project.tickets.map(t => t.id))
  if (nodeIds.size !== project.nodes.length) errors.push('Duplicate node ID')
  if (sprintIds.size !== project.sprints.length) errors.push('Duplicate sprint ID')
  if (ticketIds.size !== project.tickets.length) errors.push('Duplicate ticket ID')
  for (const n of project.nodes) if (!project.stages.some(s => s.id === n.stage)) errors.push(`Unknown stage in ${n.id}`)
  for (const e of project.edges) if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) errors.push(`Unknown node in edge ${e.id}`)
  for (const t of project.tickets) {
    if (!sprintIds.has(t.sprint)) errors.push(`Unknown sprint in ${t.id}`)
    if (!t.nodeIds.length || t.nodeIds.some(id => !nodeIds.has(id))) errors.push(`Unmapped node in ${t.id}`)
    for (const dep of t.dependencies || []) if (!ticketIds.has(dep)) errors.push(`Unknown dependency ${dep} in ${t.id}`)
  }
  for (const s of project.sprints) {
    if (s.start > s.end) errors.push(`Invalid dates in ${s.id}`)
    for (const id of s.nodeIds) if (!nodeIds.has(id)) errors.push(`Unknown sprint node ${id} in ${s.id}`)
    for (const id of s.ticketIds) if (!ticketIds.has(id)) errors.push(`Unknown ticket ${id} in ${s.id}`)
    for (const d of s.deliverables) if (!nodeIds.has(d.nodeId)) errors.push(`Unknown delivery node ${d.nodeId} in ${s.id}`)
    const union = new Set([...ticketsForSprint(project, s.id).flatMap(t => t.nodeIds), ...s.deliverables.map(d => d.nodeId)])
    if (union.size !== s.nodeIds.length || s.nodeIds.some(id => !union.has(id))) errors.push(`Stale component focus in ${s.id}`)
    if (!getPhase(project, s.phase)?.sprints.includes(s.id)) errors.push(`Phase mismatch in ${s.id}`)
  }
  const grouped = overviewGroups(project).flatMap(g => g.nodeIds)
  if (grouped.length !== nodeIds.size || grouped.some(id => !nodeIds.has(id)) || new Set(grouped).size !== grouped.length) errors.push('Overview blocks must cover every component exactly once')
  for (const g of project.gates) {
    if (!sprintIds.has(g.sprint)) errors.push(`Unknown sprint in gate ${g.label}`)
    if (g.nodeIds.some(id => !nodeIds.has(id))) errors.push(`Unknown node in gate ${g.label}`)
  }
  return errors
}
