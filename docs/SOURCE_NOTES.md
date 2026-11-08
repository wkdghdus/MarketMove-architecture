# Evidence hierarchy and content decisions

## Sources included in this repository

1. **`REVISED_ROADMAP.md`** — the November 7, 2026 plan. **Authoritative for:** nine sprint dates, S1–S9 focus, academic buffers, phase order, 55 planning ticket IDs, per-ticket owners, eight epics, research gates and February freeze.
2. **`PROJECT_FOUNDATION.md`** — the earlier MarketMove outline. **Authoritative for:** project statement, dataset/ML architecture, six-hour prediction horizon, token-ID joins, temporal leakage safeguards, baseline comparisons, Historical Replay, Live Analyze, technology assumptions and feasibility risks.

The second file contains an **older September–March phase sequence**. Its high-level architecture remains relevant, but its dated development plan must **not supersede** the November 7 revision. `src/data/project.json` reconciles them by assigning the revised dates to technical components from the earlier architecture.

## Model and UX conventions

- MarketMove forecasts **subsequent repricing**, not a causal news impact.
- Primary outputs: probability of a meaningful move and expected direction over the initial **T+6h** horizon. Magnitude / uncertainty range is secondary and contingent on evaluation.
- Baseline variants must remain **Trivial**, **Market Only**, **News Only** and **Market + News**; the research question is incremental value from news.
- Historical join is *proposed*: `PolyBench.clob_token_ids` ↔ `Polymarket-v1.asset_id`. Coverage, mapping reliability and training viability are still unverified. Do not render as a solved fact.
- Label builder is *proposed*: a valid observed price near T+6h, with staleness, outcome matching, timestamp offset and quality metadata. No future value may leak into features used at T.
- Historical news may contain retrospective information. News relevance, true availability timestamps, and frozen encoders are necessary safeguards, not proof of ground truth.
- Event-disjoint evaluation is required; correlated markets related to the same event must not cross train/test boundaries.
- Historical Replay is the favored reliable demo mode if live services are unavailable.
- No production Polymarket API or dataset is contacted by this atlas. The site intentionally has no API keys and reports **no fabricated experiment results**.
- **S4 (Dec 19–Jan 1)** is an exam/winter-break buffer with **zero mandatory tickets**. Optional ideas in the source are not treated as commitments.
- Sprint 3's normal delivery should be finished by **December 9**, despite the two-week sprint ending December 18.
- The paper submission around February 27 and CUCAI showcase in early March **require confirmation**. Only the internal February 12 research freeze is a planned fixed milestone.
- Person names and team responsibilities are from the revised roadmap. Personal emails, resumes and private interview scores are intentionally excluded from the public site and ZIP.

## The atlas itself is not a progress tracker

Each diagram node is the planned **end-state**. Sprint highlighting means "architecture area created or evolved by this planned work", never "actually done". Do not use colors or percentages to imply completion unless a verified GitHub project or ticket source is connected and its states are explicitly mapped.

## Technical presentation decisions

The atlas is a small static product (HTML, CSS, ES modules, JSON, native browser APIs). It has **no external network calls**, zero npm dependencies and its own source-and-data tests. This is deliberate: project planning should remain available even if external hosting, model APIs or development tools fail. Later, an agent may introduce a UI framework only if it preserves the same capabilities, data model and static hosting reliability.
