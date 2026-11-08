# Roadmap data contract

The source of truth is `src/data/project.json`. The atlas renders directly from this JSON; **no UI component hardcodes sprint tickets or graph node relationships**.

## Top-level entities

| Key | Description | Important fields |
| --- | --- | --- |
| `meta` | Planning scope, architectural board dimensions, horizon and source precedence | `architectureWidth`, `architectureHeight` (board size in px), `horizonHours`, `sourcePolicy` |
| `stages[]` | Four architectural swimlanes | `id`, `title`, `subtitle`, `color`, `summary` (lane intro in the component guide) |
| `phases[]` | Four roadmap phases, mapped to sprint IDs | `id`, `sprints[]`, ISO `start` / `end` |
| `sprints[]` | Exactly nine two-week plan windows | `id`, ISO dates, `phase`, `commitment`, `kind`, `ticketIds[]`, `nodeIds[]`, `deliverables[]` |
| `nodes[]` | Twenty-one selectable technical components | `id`, `stage`, `x` / `y` (top-left of a 234×74 card; lanes are 340 px apart, rows 86 px), title, ownership, epic, I/O contracts, risk, related sprints and tickets; `guide` = `{definition, why, responsibilities[], resources[], note?}` for the component guide below the System map |
| `edges[]` | Directed architectural dependencies | `from`, `to`, optional `kind` (`data`, `live`, `feedback`), `carries` (what flows along the edge) |
| `tickets[]` | 55 planning tickets, MM-001–MM-055 | `id`, `title`, `sprint`, `owner`, `epic`, `size`, `description`, `acceptance`, `dependencies[]`, `nodeIds[]` |
| `epics[]` | Eight workstreams, E0–E7 | `id`, `name`, `owner` |
| `team[]` | Public-facing first-name ownership reference | `name`, `role`, `scope` |
| `gates[]` | Major date-specific research/development decisions | `date` (ISO sort anchor), `sprint`, `label`, `question`, `nodeIds[]`; provisional gates add `provisional: true`, a human `dateLabel` (e.g. "Early March 2027") and a `confirmation` note, and must never be shown as confirmed |
| `principles[]` | Scientific and product safeguards | `title`, `body` |
| `limitations[]` | Open scientific risks that stay visible until measured | `title`, `body` |
| `overview` | Simplified product layer shown by default | `columns[][]` of blocks: `id`, `title`, `icon`, `stage`, `nodeIds[]`. Every node belongs to exactly one block; block-to-block flows are derived from `edges[]` at runtime, never stored |

All dates are `YYYY-MM-DD` **calendar dates**. The frontend formats them in UTC to avoid timezone drift between browsers. Sprints are Saturday–Friday two-week windows; S4 is uncommitted despite sharing the same interval structure.

## Mapping sprint work to architecture

Every ticket must include **one or more valid `nodeIds`**. The **architectural focus for sprint `Sx`** is the union of the node IDs related to its tickets, plus its curated `deliverables[]`. The union is stored explicitly in `sprints[].nodeIds` to keep rendering fast. The diagram brightens this set on hover/focus; everything else dims.

A ticket can map to multiple components (e.g., MM-033 touches prediction API, while MM-035 touches Historical Replay UI). A component can be touched in multiple sprints (e.g., the training dataset matures from pilot join through final audit). This is a **many-to-many relation**, not a one-time "release date" per node.

### Example

```json
{
  "id": "MM-005",
  "title": "Validate the token-level dataset join",
  "sprint": "S1",
  "owner": "Kristina",
  "epic": "E1",
  "size": "M",
  "nodeIds": ["token_join"],
  "dependencies": ["MM-003", "MM-004"]
}
```

`S1.nodeIds` consequently includes `token_join`, and the graph connection from `polybench` to `token_join` remains visible during S1 focus.

## Updating the plan safely

1. Edit the appropriate `tickets[]` record and map it to existing `nodes[]` or add a well-defined new node.
2. Update affected `sprints[].ticketIds`, `sprints[].nodeIds`, and `nodes[].ticketIds` / `nodes[].sprints` as needed. Do not let sprint or node reverse indexes become stale.
3. For sprint-specific headline outcomes, edit `sprints[].deliverables[]`; these are **proposed releases**, not evidence of completion.
4. If adding a node, place it in an existing or a new stage; record coordinates and any additional dependency edges.
5. Run `npm run check` and verify that a hover, ticket modal and delivery matrix all show the change. Tests validate bidirectional ticket mapping, the sprint focus union, non-overlapping card coordinates, and that every ticket still matches `REVISED_ROADMAP.md`.

The generator (`python3 scripts/generate_data.py`) rebuilds the entire JSON from the bundled revised roadmap plus the curated architecture mapping, layout, gates and limitations, and reproduces the committed file byte-for-byte. **Warning:** it overwrites `project.json`; do not use it after hand-editing the JSON without also updating the generator.

## Scientific data standards to preserve in copy

- Probability in `[0,1]` or percent, explicitly labeled; movement is **percentage points**, not relative percent.
- Feature time T must not include T+6h outcomes. Prices near the prediction horizon need quality metadata and tolerances.
- Historical join may fail; display the risk rather than fabricating coverage counts.
- Do not replace the 6h primary horizon based solely on favorable research results; 1h/24h are later ablations.
- Do not claim that "Market + News" exceeds the baseline until held-out, event-aware experiments demonstrate it.
