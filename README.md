# MarketMove · Architecture & Delivery Atlas

A working, responsive visualization of **how MarketMove's technical architecture evolves across the revised November 2026–March 2027 roadmap**. Built for Western AI, with sprint selection, architecture highlighting, a delivery matrix, ownership, research gates, and the original **MM-001–MM-055** planning tickets.

> **This is a planning website, not the MarketMove prediction product and not a live Jira/GitHub status dashboard.** Every sprint and component describes planned work; no task is presented as complete merely because its date has passed.

## One-command local start

Requires **Node.js 20+**. No third-party npm dependencies, environment variables, paid services, secrets, account setup, or dataset downloads.

```bash
npm run dev
```

Open **http://localhost:4173**. Alternatively, with Python 3 installed: `python3 -m http.server 4173` in the repository root.

```bash
npm run test     # 19 source-of-truth/data integrity tests (incl. roadmap transcription check)
npm run build    # ready-to-deploy static dist/
npm run preview  # serve the dist/ build on :4173
npm run check    # test + build
```

`npm install` is optional; the project has zero third-party dependencies. The included `package-lock.json` is compatible with `npm ci` in GitHub Actions.

## What works

The site is deliberately minimal: **three diagrams and a timeline**, nothing else on the page.

| Interaction | Result |
| --- | --- |
| **Overview** (default) | The final product as 11 blocks and their data flows — no tickets, no jargon. Hover a block to trace its connections; click it to open the System map focused on its components. |
| **System map** | The full end-state architecture (4 lanes, 21 components, 30 dependencies). Drag, pinch or `+`/`−` to zoom, **Fit view** to reset; arrow keys pan a focused map. Click a component for its contracts, risk, owner, neighbours, planned sprints and linked tickets; open any ticket for its acceptance criteria and dependencies. |
| **Component guide** (below the System map) | All 21 components, grouped by lane: definition, why it matters, what it should do, contract, connections (with what flows along each edge), owner, resources/proposed tooling, planned sprints and tickets, decision gates and risk. Hovering a component highlights it on the map; selecting one focuses the map on its neighbours; **Show on map** centers it; a locked sprint dims components it doesn't touch. Clicking a map card also syncs the guide. |
| **Delivery matrix** | 21 components × S1–S9. A dot appears only where a planning ticket maps that component to that sprint; selecting it locks the sprint and inspects the component. |
| **Timeline** (always docked) | Hover or keyboard-focus a sprint to preview it; click or tap to lock; leaving a preview restores the lock. Clicking the locked sprint again, **Clear focus** or `Escape` returns to the full system. `←`/`→` move between sprints. |

**Sprint 4 has zero mandatory tickets and highlights nothing.** Highlights always mean planned work, never completion. Reduced-motion preferences are honoured. Research gates, team, principles and scientific limitations remain in `project.json` and the docs but are not rendered.

## Repository anatomy

```text
marketmove-architecture-site/
├── PLAN.md                   # one-shot coding-agent implementation / finishing brief
├── README.md                 # setup, usage, boundaries
├── index.html                # accessible page structure
├── src/
│   ├── main.js               # overview, system map, matrix, timeline, dialogs
│   ├── model.js              # framework-free data selectors and validation
│   ├── styles.css            # complete responsive visual system
│   └── data/project.json     # single source of truth (phases, tickets, edges, components)
├── public/mark.svg           # local brand/favicon asset
├── docs/
│   ├── REVISED_ROADMAP.md    # supplied Nov 7 development/ticket plan
│   ├── PROJECT_FOUNDATION.md # supplied technical project outline
│   ├── SOURCE_NOTES.md       # precedence, assumptions and scientific constraints
│   ├── DATA_DICTIONARY.md    # editable data model and mapping rules
│   └── TEAM_ROLES.md         # responsibilities, no personal contact details
├── scripts/
│   ├── serve.mjs             # dependency-free development server
│   ├── build.mjs             # dependency-free production build
│   └── generate_data.py      # regenerates project.json from the roadmap + curated mappings/layout
├── tests/data.test.mjs       # integrity, formatting, search and matrix invariants
├── tests/source.test.mjs     # roadmap transcription, gates, layout and privacy checks
├── .github/workflows/       # CI and Pages deploy workflows
├── netlify.toml
└── vercel.json
```

## Deploy

- **GitHub Pages:** Push this repo to `main`. In repository **Settings → Pages**, choose **GitHub Actions**. The bundled workflow builds and publishes `dist/` on pushes to `main`. You must enable Pages permissions/settings on your own repository. Paths are relative and work on subpaths such as `/marketmove-architecture-site/`.
- **Netlify:** Import the repository. The included `netlify.toml` uses `npm run build` and publishes `dist`.
- **Vercel:** Import the repository. The included `vercel.json` builds to `dist`.
- **Any static host:** Run `npm run build`; upload `dist/`.

This package is deliberately **separate from `marketmove-intro`**, which serves as a reference for project architecture. Do not commit or deploy it into the existing ML codebase without deliberately choosing that integration.

## Editing content

**Edit `src/data/project.json`**, not hard-coded HTML, when changing sprint dates, owners, tickets, architecture nodes or connections. Every ticket has one or more `nodeIds`; a sprint's affected components are explicitly mapped. See [`docs/DATA_DICTIONARY.md`](docs/DATA_DICTIONARY.md). Run `npm run check` after changes. `python3 scripts/generate_data.py` reproduces the committed `project.json` exactly and is the safest way to change mappings, layout or gates; it overwrites the JSON, so keep hand edits and the generator in sync.

Before marking any real issue `Done` or displaying actual progress, integrate a verified issue-status source. Never infer completion from dates.

## Agent handoff

The repository contains a detailed, executable implementation brief in [`PLAN.md`](PLAN.md). Tell your coding agent:

```text
Implement PLAN.md end-to-end. Work in the existing repository. Preserve the revised 2026–2027 schedule and the source-backed architecture mappings. Do not ask follow-up questions. Run the tests, inspect the UI at desktop and mobile sizes, and fix issues before finishing.
```

The initial implementation is already usable; this prompt is intended for an agent to polish, extend and verify it in one pass, not to replace it with an empty scaffold.

## Visual reference

The repo includes compact browser-rendered preview images in `docs/previews/`: `desktop.webp` (initial architecture at 1440×900), `sprint-hover.webp` (S2 locked) and `mobile.webp` (S6 tapped at 390×844). These are for design QA, not user-supplied data or inferred implementation status.
