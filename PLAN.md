# IMPLEMENTATION PLAN — MarketMove Architecture & Delivery Atlas

**Agent instruction:** Implement this plan end-to-end in the **existing repository**, without stopping for routine clarification. Read the documents below, inspect the working site, preserve source-backed scope, fix problems, run all checks, and deliver a polished deployable architecture/roadmap website. Do not scaffold a new ML application and do not discard the existing implemented atlas.

> This repository already includes a working first implementation. Treat the task as **complete the product to release quality in one pass**, using and improving the current modules, not as a request to produce an outline or proof of concept.

## 0. Outcome and scope

Build a standalone, public-facing, interactive **technical architecture ↔ sprint roadmap** atlas for Western AI's MarketMove project. A first-time viewer should immediately see the **technical end-state architecture**. A persistent **nine-sprint timeline at the bottom** lets them hover/focus a time window and see both: (1) which exact architectural components are being delivered or advanced; and (2) which ticket-level work and owner make that delivery possible.

The purpose is to communicate the *project's execution plan* to PMs, student developers, mentors and recruiting/showcase audiences. It must make complex ML, data and product dependencies comprehensible without pretending the project has already been built.

**Explicitly out of scope:** building real PolyBench or Polymarket data pipelines; training the prediction model; integrating live Polymarket APIs; automated betting/trading; writing the research paper; fabricating accuracy results; pulling GitHub issue status without a verified issue ID mapping. This website **visualizes planned work**, it does not implement that planned work.

## 1. Required reading, in order

1. `README.md` — scripts and existing functionality.
2. `docs/SOURCE_NOTES.md` — evidence precedence and scientific claims.
3. `docs/REVISED_ROADMAP.md` — **current source** for S1–S9, 55 MM tickets, eight epics and ownership.
4. `docs/PROJECT_FOUNDATION.md` — end-state technical architecture, scientific method and MVP experiences.
5. `docs/DATA_DICTIONARY.md` — canonical JSON relations.
6. `src/data/project.json` — all structured display content.
7. `src/main.js`, `src/model.js`, `src/styles.css`, `index.html`, and `tests/data.test.mjs` — working implementation.

**Source conflicts:** The original foundation document contains an earlier September–February construction schedule. The revised **November 7, 2026 – March 12, 2027** nine-sprint roadmap overrides that earlier schedule. Keep technical methods from the foundation; keep schedule/people/tickets from the revision. Do not infer any actual `Done` status.

## 2. Design vision

**Visual direction:** Premium dark systems dashboard, somewhere between an ML infrastructure observability tool, a system-design whiteboard and a research project timeline. Deep graphite background, clean off-white type, soft technical grid, confident lime/mint accents, and distinct restrained colors for four architecture lanes. The visual should feel like an actual engineering instrument, not a generic templated landing page.

### Initial viewport

- Brand + restrained navigation at top.
- Very concise project framing and counters; **architecture must visually dominate the first desktop screen**.
- A connected and inspectable end-state architecture, not a collapsed list of titles.
- Four lanes: `Source signals` → `Data foundations` → `Prediction engine` → `Product & evidence`.
- Persistent, bottom-aligned timeline with S1–S9, exact **start and end dates**, phase grouping, and protected S4 styling.
- A clear instructional affordance: hover to preview; click to lock; click a node to inspect.
- No full-screen loading hero, lorem ipsum, fake charts, stock illustrations, or fabricated milestone completion percentages.

### Layout constraints

- Desktop reference: **1440×900** and **1440×950**. Initial view should visibly contain the architectural map and the entire bottom timeline, even if detailed cards are below the fold.
- Tablet: readable map navigation, controls remain available.
- Mobile reference: **390×844**. Timeline horizontally scrolls; map can pan. The page itself must not create unintended horizontal scrolling.
- Prefer zoomable/pannable fixed-coordinate SVG + HTML architecture over tiny illegible cards. Preserve zoom/fit controls and touch navigation.
- Use keyboard-operable buttons and native `dialog`; visible focus indicators and adequate contrast. Reduced motion should be respected.

## 3. Data model (do not change arbitrarily)

`src/data/project.json` is the **single source of truth**. Do not hardcode ticket names, sprint dates, affected components, owners, gate details or phase boundaries in UI templates.

Canonical entities:

- `meta`: source/period/horizon/canvas dimensions.
- `stages`: four ordered architectural lanes.
- `nodes` (**21**): inspectable components with `id`, stage, position, epic, owner, description, inputs, outputs, risks, ticket and sprint backlinks.
- `edges` (**30**): directed dependencies; `live` and `feedback` edges visually distinguished.
- `phases` (**4**): P1–P4 grouping S1–S9.
- `sprints` (**9**): exact ISO ranges, priority/commitment, `ticketIds`, `nodeIds`, and **curated concise `deliverables`**.
- `tickets` (**55**): planning IDs MM-001–MM-055, owner, epic, size, description/evidence, dependencies, and node IDs.
- `team`, `epics`, `gates`, `principles`.

### Critical traceability logic

- Every MM ticket touches **at least one** architecture component via `ticket.nodeIds`.
- A sprint's highlighted node set is **the union** of all its ticket component IDs and curated release-card components.
- A node may appear in multiple sprints because the system evolves incrementally.
- Node inspection must display **relevant planned sprints, related tickets, owner, inputs, outputs, and risks**.
- Sprint hover/focus must brighten relevant components and their incident connections, dim unrelated components, and replace the roadmap spotlight with that sprint's focus and exact delivery summaries.
- Sprint click locks selection. Hovering a different sprint temporarily previews it; leaving restores the locked sprint. Clicking the locked sprint again returns to no lock.
- No S4 feature release, no mandatory S4 tickets, no fake progress bar.

## 4. Source-backed technical graph

Keep the following dataflow legible and consistent with `PROJECT_FOUNDATION.md`:

```text
HISTORICAL SOURCES
PolyBench market/news snapshots at T  ──┐
                                        ├── outcome-token join
Polymarket-v1 trade history ────────────┘          │
                         └── future price at T+6h ─┴──> audited historical dataset
                                                       │
                                  ┌────────────────────┴──────────────────┐
                                  ▼                                       ▼
                         market features                           news features
                          up through T                       frozen embeddings/stance
                                  │                                       │
                                  ├────────── baselines ─────────────────┤
                                  └────── market + news fused ML ────────┘
                                                   │
                                          held-out evaluation
                                                   │
                                         versioned model artifacts
                                                   │
                                   ┌───────────────┴───────────────┐
                                   ▼                               ▼
                              inference API                   replay service
                                   │                               │
          live Polymarket ───> Live Analyze                    Historical Replay
                                   │                               │
                                   └──────── research evidence ───┴──> CUCAI
```

Preserve non-linear real-world dependencies in the actual graph (for example multiple source records go into the join; replay also uses historical dataset fixtures; prospective logs feed research evaluation). Showing a simple text-only chain instead of the architecture diagram **fails the task**.

The core research question is whether `Market + News` has **held-out predictive lift** over `Market Only`. The initial primary prediction horizon is **six hours**; exact magnitude is secondary. Avoid conflating a forecast with evidence of causation.

## 5. Required fully working interactions

### A. Architecture-first graph

- Nodes as actual semantic interactive controls (keyboard/pointer).
- SVG directed edges behind nodes, with visible differentiation for live and feedback dataflows.
- Pan with drag; zoom with `+` and `−`; fit view; preserve legibility at desktop breakpoints.
- On node hover, show contextual graph neighbors; on click, open a detail panel with contracts/owner/risk/tickets/sprints.
- On sprint hover, highlight only affected nodes and meaningful connecting edges.
- On no sprint selection, restore all planned components to normal brightness.

### B. Persistent timeline

All nine sprint boundaries from the revised roadmap:

| Sprint | Dates | Main focus | Capacity |
| --- | --- | --- | --- |
| S1 | Nov 7–20, 2026 | Data feasibility & architecture | Normal |
| S2 | Nov 21–Dec 4, 2026 | Clean dataset & baseline | High priority |
| S3 | Dec 5–18, 2026 | First fused pilot | **Very light, committed work due Dec 9** |
| S4 | Dec 19, 2026–Jan 1, 2027 | Exams/winter break | **No mandatory work** |
| S5 | Jan 2–15, 2027 | Full ML implementation | Normal from Jan 4 |
| S6 | Jan 16–29, 2027 | Evaluation & Historical Replay | Normal |
| S7 | Jan 30–Feb 12, 2027 | Final experiments & freeze | High priority |
| S8 | Feb 13–26, 2027 | Paper & demo | Flexible |
| S9 | Feb 27–Mar 12, 2027 | CUCAI readiness | Event-dependent |

Phase grouping P1(S1–S2), P2(S3–S5), P3(S6–S7), P4(S8–S9). Display both sprint dates and labels. Make cross-month/year ranges unmistakable. Touch users must be able to tap to pin. Avoid hover-only information.

### C. Sprint delivery spotlight

For each sprint, show: focus, duration, commitment level, accurate summary, count of planned tickets, count of related components, and 3–4 precise component-level delivery cards. Clicking a delivery card inspects the corresponding architecture node. S4 must show a positive clear message about protected time rather than empty/broken content.

### D. Delivery matrix

Toggle the main canvas from **System Map** to **Delivery Matrix**. Matrix rows = 21 components (grouped by four stages), columns = S1–S9. Mark planned work in a cell **only if an actual planning ticket connects that node and sprint**. Cell click must locate the sprint and component. Show an explicit disclaimer: dots represent planned work, not task completion.

### E. Ticket library and research gates

- Search MM tickets by ID, title, description, epic or owner.
- Filter by sprint and owner. Render 55 complete records with optional show-more disclosure.
- Ticket detail view with owner, sprint, size, epic, full acceptance/evidence, mapped architecture components and recorded dependencies.
- Export filtered tickets as Markdown (client-side, no server API).
- Readable milestones/decision gates that link to related sprint context, clearly labeling the proposed/unknown CUCAI paper date.
- Public team summary uses responsibilities only—**do not publish personal emails, interview scores or resume links**.

## 6. Technical implementation constraints

The working site uses browser-native `HTML + CSS + ES modules`, with no external JavaScript libraries or runtime APIs. This is intentional: a static planning artifact should open immediately and be deployable as plain files. Preserve that architecture unless the current implementation demonstrably cannot meet requirements; do not replatform to React/Next.js merely for trendiness.

- Node.js **20+** for the optional local dev/build scripts.
- `npm run dev` serves all assets locally on port 4173.
- `npm run test` must pass data integrity checks.
- `npm run build` produces `dist/` containing the complete static site.
- `npm run preview` serves `dist/`.
- Must work without external API keys, credentials, network calls, downloads or paid dependencies.
- All assets, the data JSON, favicon, styles, scripts and source references should be included in the repository.
- Paths must be **relative**, so GitHub Pages project subpaths work.
- Keep clean README and source reconciliation notes.

## 7. Engineering checklist for the coding agent

Execute these in order; do not replace real functionality with placeholders.

- [ ] Read sources and inspect the existing implementation, JSON mappings, UI and tests.
- [ ] Start local site. Verify no console errors or failed resource requests.
- [ ] Make architecture occupy the first desktop screen together with the bottom sprint timeline. Tighten hero/counters if needed.
- [ ] Check the actual architecture at **1440×900**, **1280×800**, **768×1024** and **390×844**. Fix card collisions, clipped controls, accidental horizontal overflow, and sticky dock overlap.
- [ ] Verify hover-preview/lock-restore/clear behavior for **every S1–S9**. In particular, S4 must have zero committed nodes and zero mandatory tickets.
- [ ] Verify graph dragging, zoom controls, fit view and node inspect dialogs on desktop and touch simulation.
- [ ] Verify matrix dot mappings against ticket data; selecting cells should create coherent sprint-and-node focus.
- [ ] Verify searching/filtering 55 tickets and exporting a Markdown brief.
- [ ] Verify panel close, keyboard tab order, keyboard-operable timeline, Escape and reduced-motion styles.
- [ ] Verify date labels across November→December and December→January, February→March.
- [ ] Cross-check all ticket names, owners, planned sprints, eight epic codes, and dates against `REVISED_ROADMAP.md`. Correct transcription errors, not project decisions.
- [ ] Keep scientific limitations visible: dataset join unverified, timestamp trust, event leakage, no guaranteed news lift, magnitude conditional, research date provisional.
- [ ] Run `npm run check` and fix any regressions. Add tests if a bug reveals a missing data invariant.
- [ ] Build and preview deployment output. Confirm relative paths load under a non-root prefix (GitHub Pages subpath).
- [ ] Make final file organization and documentation accurate; no missing resources, TODO UI, broken links or pretend status.

## 8. User acceptance test — perform manually or with browser automation

1. At **1440×900**, load `/`. The architectural diagram and bottom timeline appear without the user having to scroll; main focus is the system, not a massive landing-page hero.
2. Hover `S1`: source data, token join, 6h labeling and shared contracts are emphasized. Roadmap explains feasibility risk.
3. Click `S2`, move pointer away: S2 remains selected; its baseline/data components remain emphasized; ticket explorer offers 8 Sprint 2 tickets.
4. Hover `S6`: preview shifts to replay/evaluation. On leaving, S2 returns.
5. Click `S4`: delivery spotlight explicitly states no mandatory tickets, and no technical nodes are falsely presented as being delivered.
6. Click `Fused predictor`: detail view displays `Munadir`, expected inputs/outputs, model risks and MM tickets across sprints.
7. Switch `Delivery Matrix`: rows and S1–S9 columns present; clicking a populated cell brings up that component while focusing a sprint.
8. Search `MM-005`: get the token join ticket with its dependency `MM-003`/`MM-004`. Export brief includes acceptance criteria.
9. Open on a narrow screen, tap a timeline sprint, pan the architecture and inspect a node; body remains within viewport width.
10. Read the research gates: neither Feb 27 nor the early-March showcase is falsely described as confirmed.

**Do not stop at green unit tests**. The screenshot and responsive checks are release blockers. No external data should be required to demo any of the above.

## 9. Deliverable and final agent response

The work is complete when `npm run check` passes, the static site is deployable from `dist/`, and all acceptance tests above pass. In your final response summarize **what was implemented or fixed**, how the interaction works, which tests passed, how to launch (`npm run dev`), and how to deploy. Include any genuinely unresolved limitation; never imply a source-backed experiment or completed MarketMove system exists when it does not.

## 10. Optional next iterations — NOT part of the one-shot deliverable

Only after the release-quality atlas is complete: verified GitHub Project sync for real ticket statuses; per-node dependency traversal with deep-linkable URLs; snapshot/export view for kickoff slides; importable roadmap CSV; a verified delivery-status overlay; links to real PRs. These are enhancements, not reasons to ship an incomplete first version.
