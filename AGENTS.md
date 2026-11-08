# Instructions for coding agents

This is a complete, functioning **technical architecture and delivery roadmap website**, not the MarketMove model itself.

1. **Read and implement [`PLAN.md`](PLAN.md)** before making changes. Treat its acceptance checklist as your definition of done.
2. Read [`docs/SOURCE_NOTES.md`](docs/SOURCE_NOTES.md), [`docs/REVISED_ROADMAP.md`](docs/REVISED_ROADMAP.md) and [`docs/PROJECT_FOUNDATION.md`](docs/PROJECT_FOUNDATION.md) in that order. Use the revised **November 7, 2026 – March 12, 2027** timeline, not the foundation's old phase dates.
3. The content source of truth is [`src/data/project.json`](src/data/project.json). Preserve all **9 sprints**, **55 MM tickets**, **8 epics**, **21 nodes**, and the many-to-many sprint-to-architecture map unless a source-backed project change is explicitly requested.
4. A sprint's highlight represents **planned work touching components**, **not shipped functionality**. Never infer actual progress from dates, invent performance metrics, or present unverified news-data feasibility as solved.
5. **Sprint 4 has no committed tickets**, and December exams intentionally constrain S3. CUCAI's late-February paper deadline is provisional.
6. This is a zero-dependency static app. Prefer improving current `HTML / CSS / JS / JSON`; do not replace with framework boilerplate unnecessarily.
7. Run `npm run check`, verify viewport behavior on desktop and mobile, then produce `dist/` via `npm run build`. The website must function without an API key or online service.
8. Do not publish developers' personal emails, resumes, applications or interview scores. Public attribution is first name + assigned scope from the roadmap.

For a one-pass coding session, the user prompt is: **`Implement PLAN.md end-to-end.`**
