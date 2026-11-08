# MarketMove — Revised Development Roadmap & Ticket Plan

Western AI · November 7, 2026 – March 2027 · Four developers · Two-week sprints

This revised plan prioritizes three things:

1. Developer growth and ownership. Each person owns a technical workstream, investigates problems, and makes implementation decisions.
2. Technical feasibility before complexity. Prove that the dataset works, establish a baseline, and only then invest in the full news-aware model.
3. Realistic academic workloads. Exams, winter break, and Reading Week directly affect sprint commitments.

The plan uses MarketMove's existing architecture: PolyBench + Polymarket-v1 → historical training data → market/news features → predictive models → Historical Replay and live analysis.

## 1. Academic constraints and project deadlines

Western's 2026–27 undergraduate calendar establishes these dates:

| Date                      | Event                            | Planning decision                                            |
| ------------------------- | -------------------------------- | ------------------------------------------------------------ |
| November 30, 2026         | MarketMove internal target       | Dataset and baseline checkpoint                              |
| December 9, 2026          | Last day of fall classes         | Finish pre-exam prototype                                    |
| December 10               | Study Day                        | No project obligations                                       |
| December 11–22            | Final examinations               | No mandatory tickets or meetings                             |
| December 23 – January 3   | Winter break                     | Optional development                                         |
| January 4, 2027           | Classes resume                   | Regular development resumes                                  |
| February 12               | MarketMove internal target       | Freeze experiments and model                                 |
| February 13–21            | Winter Reading Week              | Paper writing and demo refinement, with flexible commitments |
| Approximately February 27 | Proposed paper submission target | Confirm actual CUCAI deadline                                |
| Early March               | Proposed CUCAI showcase          | Confirm event dates                                          |

Academic dates verified against Western's official [Registrar calendar](https://registrar.uwo.ca/resources/important_dates_and_deadlines.html?utm_source=chatgpt.com) and [2026–27 undergraduate key dates](https://www.uwo.ca/languages/undergraduate/key_dates.html?utm_source=chatgpt.com).&#x20;

[image](https://www.google.com/s2/favicons?domain=https://registrar.uwo.ca\&sz=32)

Western University+2



## 2. Complete sprint roadmap

Development phases

Phase 1 — Data foundations

Nov 7 – Dec 4

Prove data feasibility and produce baseline results

Phase 2 — Core model

Dec 5 – Jan 15

First fused prototype, exam break, full ML implementation

Phase 3 — Evaluation & product

Jan 16 – Feb 12

Ablations, Historical Replay, final model freeze

Phase 4 — Paper & CUCAI

Feb 13 – Mar 12

Research paper, demo polish, showcase

| Sprint | Dates           | Main focus                             | Commitment        |
| ------ | --------------- | -------------------------------------- | ----------------- |
| S1     | Nov 7–20        | Data feasibility and architecture      | Normal            |
| S2     | Nov 21 – Dec 4  | Clean dataset and market-only baseline | High priority     |
| S3     | Dec 5–18        | First fused model before exams         | Very light        |
| S4     | Dec 19 – Jan 1  | Exams and winter break                 | No mandatory work |
| S5     | Jan 2–15        | Complete core ML method                | Normal from Jan 4 |
| S6     | Jan 16–29       | Model evaluation and Historical Replay | Normal            |
| S7     | Jan 30 – Feb 12 | Final experiments and model freeze     | High priority     |
| S8     | Feb 13–26       | Paper writing and demo polish          | Flexible          |
| S9     | Feb 27 – Mar 12 | CUCAI presentation and reliability     | Event-dependent   |

The sprint boundaries remain Saturday-to-Friday to fit your meeting structure. S3 and S4 are deliberately unusual: the team should not be expected to maintain normal output during exams.

## 3. Epics and technical ownership

Eight epics cover the entire product.

| Epic | Name                         | Primary owner   | Definition of completion                                                           |
| ---- | ---------------------------- | --------------- | ---------------------------------------------------------------------------------- |
| E0   | Project Foundation           | Luke + Kristina | Working dev environment, agreed contracts, CI, documentation standards             |
| E1   | Historical Data Engineering  | Nick            | Reproducible PolyBench/Polymarket-v1 dataset with trustworthy six-hour labels      |
| E2   | Market Features & Evaluation | Kristina        | Market-only baseline, leakage-safe splits, reliable experiment metrics             |
| E3   | News Understanding           | Ryan            | News relevance, embeddings, stance features, verified temporal availability        |
| E4   | Fused Predictive ML          | Munadir         | Reproducible market + news model and exportable inference artifacts                |
| E5   | Backend & Live Integration   | Munadir         | Prediction API, live market adapter, historical inference service                  |
| E6   | Historical Replay & Frontend | Ryan            | Working prediction interface and historical prediction-versus-actual demonstration |
| E7   | Research & CUCAI             | Luke + team     | Final experiments, documentation, paper, deployment, presentation                  |

### Team responsibilities

Nick — Data Engineering

Historical data, joining, labels, data QA, reproducibility.

Kristina — Market Modeling & Evaluation

Market features, baselines, experiment design, leakage tests, calibration.

Munadir — Fused ML & Backend

Model integration, training, serving, inference API, live-market connectivity.

Ryan — NLP & Product

News semantic features, NLP evaluation, Historical Replay and frontend.

These are proposed assignments, not permanent restrictions. In particular, Ryan transitions from mostly NLP work in November/January to mostly frontend integration in late January/February. Munadir similarly transitions from model development to serving and infrastructure.

Where experience differs, use pairing and review rather than removing ownership. For example, Nick can own historical data and have Kristina review the data-quality tests.

## 4. Detailed tickets, sprint by sprint

Each proposed ticket includes its intended output and acceptance criteria. IDs such as `MM-001` are planning identifiers, not existing GitHub issue numbers.

Ticket sizes are rough estimates: S = small, M = medium, L = split further if necessary. All technical tickets must include tests or evidence and documented inputs, outputs, assumptions, and limitations.

### Sprint 1 — Establish foundations and prove the historical join

November 7–20, 2026

Critical

Objective: Confirm that PolyBench and Polymarket-v1 can actually produce the historical examples needed to train MarketMove.

This is the most important feasibility sprint. It should focus on evidence, not complete production-quality pipelines.

MM-001 · Initialize development repository Kristina · E0 · S

Create the Python project structure, dependencies, test setup, linting, and basic CI.

Done: A new developer can clone, install dependencies, run a sample script, and pass the repository's initial automated checks.

MM-002 · Define shared data and ML contracts Luke · E0 · S

Establish the expected fields for snapshots, normalized trades, labels, market features, news features, and predictions. Standardize UTC timestamps, token IDs, probability units, and percentage-point deltas.

Done: `DATA_SCHEMA.md` is reviewed by the team, and sample JSON/Parquet schemas are available to implement against.

MM-003 · Explore and profile PolyBench Nick · E1 · S

Write a loader and inspect schema, timestamps, market metadata, news fields, token identifiers, duplicate records, and missing data.

Done: Produce a dataset profile, a normalized sample, and a written list of uncertainties that could block training.

MM-004 · Explore and profile Polymarket-v1 Nick · E1 · S

Inspect the trade schema, asset IDs, prices, sizes, timestamps, and outcome mappings. Confirm which columns support historical price and volume reconstruction.

Done: Provide a normalized trades sample and document how a trade relates to a specific market outcome.

MM-005 · Validate the token-level dataset join Kristina · E1 · M

Join PolyBench `clob_token_ids` to Polymarket-v1 `asset_id`. Account for token normalization, YES/NO outcome mapping, and duplicate matches.

Done: Produce a coverage funnel with match counts, rejected records, and manually checked examples. Do not use fuzzy market-name matching as a silent fallback.

Depends on MM-003 and MM-004.

MM-006 · Prototype six-hour label reconstruction Munadir · E1 · M

For a joined snapshot at T, find the corresponding outcome price around T+6h. Investigate nearest-valid-trade and VWAP alternatives, including how to reject stale observations.

Done: Reconstruct and inspect at least ten examples where suitable observations exist. Return `p_t`, `p_t6h`, timestamp offset, trade count, and quality information.

Depends on a working sample from MM-005.

MM-007 · Audit historical news timing and relevance Ryan · E3 · M

Examine available news text, publication timestamps, and its relationship to the market proposition. Distinguish actual timestamped headlines from context that may have been generated retrospectively.

Done: Review a representative sample, classify timestamp reliability, and document which news fields are safe to use at T.

Sprint 1 review — November 21

The team should demonstrate:

- Actual records loaded from both sources.
- A working token join with coverage statistics.
- Reconstructed future prices, or clear evidence explaining why reconstruction failed.
- An initial assessment of whether the news data is temporally usable.

Exit gate: Continue with the historical supervised-learning plan only if the join and labeling approach appear viable. If not, change the data strategy before investing heavily in models.

### Sprint 2 — Build the clean dataset and first baseline

November 21 – December 4, 2026

November milestone

Objective: Generate a reproducible training dataset and initial market-only model results, targeting November 30 for the internal checkpoint.

| Ticket                                                        | Owner    | Deliverable and acceptance criteria                                                                                                                                                                               |
| ------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MM-008 · Implement historical join pipeline E1 · M            | Nick     | Convert the pilot join into a repeatable pipeline. Accept normalized datasets, output joined historical snapshots, and save valid/rejected row counts. Add tests for unmatched or ambiguous tokens.               |
| MM-009 · Implement six-hour label builder E1 · M              | Munadir  | Build the label function with configurable timestamp tolerances and label methods. Output future price, six-hour delta, observed timestamp, and quality fields. Reject stale/unsupported outcomes explicitly.     |
| MM-010 · Export training dataset v0 and quality report E1 · M | Nick     | Combine valid snapshots, labels, and news metadata into Parquet. Report raw-to-clean coverage, number of independent events, missingness, label quality, and exclusions.                                          |
| MM-011 · Implement market-state features E2 · M               | Kristina | Generate price at T, available momentum windows, volatility, and recent volume. Test that no feature uses a trade after T. Document unavailable features rather than fabricating liquidity/order-book values.     |
| MM-012 · Implement baseline training and evaluation E2 · M    | Kristina | Create event-disjoint train/validation/test splits, trivial baselines, and a first market-only XGBoost model. Output significant-move AUPRC, direction Macro F1 where feasible, class balance, and split details. |
| MM-013 · Prototype frozen news embeddings E3 · M              | Ryan     | Encode eligible headlines and market propositions using a pinned pretrained encoder. Output vectors, similarity/relevance features, and example comparisons.                                                      |
| MM-014 · Define combined feature interface E4 · S             | Munadir  | Define the shared input shape for market + news modeling. Demonstrate merging features by example ID without accidentally including outcome labels as predictors.                                                 |
| MM-015 · Complete feasibility decision report E7 · S          | Luke     | Record dataset coverage, baseline results, known risks, the selected significance threshold, and a proceed/reformulate recommendation.                                                                            |

#### November 30 checkpoint

Milestone M1 — Dataset + Baseline

Repeatable raw-to-clean dataset build

Auditable six-hour labels and rejection rules

Event-aware data split

Trivial and market-only baseline results

News-data timing risk documented

Agreed January modeling direction

0 of 6 criteria met

Reset

The full dataset does not need to have millions of examples, but it must be large and reliable enough to support meaningful evaluation. Preserve the project outline's planning thresholds: approximately 2,000–5,000 clean examples and 500+ independent events would be workable; fewer than roughly 1,000 trustworthy examples is a major warning.

If the historical join is still unresolved, report that as a failed gate rather than claiming the baseline milestone is complete.

### Sprint 3 — First integrated ML prototype

December 5–18, 2026 · All committed work due by December 9

Objective: Build a small end-to-end version of the core method before final exams.

The sprint technically runs until December 18, but no work should be required from December 10 onward.

| Ticket                                               | Owner    | Deliverable and acceptance criteria                                                                                                                                              |
| ---------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MM-016 · Prepare verified integration dataset E1 · S | Nick     | Export a small, fixed set of clean examples with market state, eligible news, labels, and consistent IDs. Include a dataset manifest.                                            |
| MM-017 · Generate aligned semantic features E3 · S   | Ryan     | Process the same examples through the frozen news encoder and export features aligned by example ID. Confirm identical ordering and no missing-key surprises.                    |
| MM-018 · Train first fused model E4 · M              | Munadir  | Combine market and news features in a simple XGBoost model. Produce predictions on a small held-out set. Save the runnable experiment configuration.                             |
| MM-019 · Compare first model variants E2 · S         | Kristina | Compare trivial, Market Only, News Only, and Market + News on the same valid examples and evaluation split. Record differences without claiming significance from a small pilot. |
| MM-020 · Document pre-exam technical status E7 · S   | Luke     | Record completed work, known bugs, blocked items, and the first tasks for January. Ensure all interfaces and model inputs/outputs are documented.                                |

December 9 target demonstration

```
Historical snapshot at T
        +
 Eligible headline
        |
        v
Market features + News features
        |
        v
    Fused model
        |
        v
  First prediction
        |
        v
 Compare to actual
    T + 6 hours
```

The model is allowed to perform poorly. The requirement is that the pipeline genuinely runs and can be evaluated without future-information leakage.

### Sprint 4 — Exam and winter break buffer

December 19, 2026 – January 1, 2027

No mandatory tickets. No required sprint velocity.

December 19–22 overlaps examinations. From December 23 onward, developers can rest, explore, read relevant material, or complete small experimental tasks voluntarily.

Potential optional backlog items:

| Optional ticket                            | Suggested owner | Outcome                                                   |
| ------------------------------------------ | --------------- | --------------------------------------------------------- |
| One-command small-sample training pipeline | Munadir         | A script that reproduces a pilot run                      |
| Static Historical Replay wireframe         | Ryan            | Clickable mock with a prediction and reveal interaction   |
| Dataset reconstruction notes               | Nick            | Improved technical onboarding documentation               |
| Evaluation methodology reading             | Kristina        | Brief notes on time-series validation and ablation design |

These are intentionally uncommitted and should not affect performance expectations.

### Sprint 5 — Complete the core ML implementation

January 2–15, 2027 · Normal work resumes January 4

Objective: Move from a small experimental prototype to a reproducible, full-dataset model that produces meaningful evaluation results.

| Ticket                                                  | Owner    | Deliverable and acceptance criteria                                                                                                                                                                                                                 |
| ------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MM-021 · Finalize training dataset v1 E1 · M            | Nick     | Produce a deterministic dataset build with validated labels, quality filters, event identifiers, and a versioned manifest. Another developer must be able to regenerate the same dataset.                                                           |
| MM-022 · Implement batch news-feature extraction E3 · M | Ryan     | Convert the prototype into a reusable pipeline for embeddings and relevance. Support batching, caching, pinned encoder versions, missing text, and consistent output columns.                                                                       |
| MM-023 · Evaluate proposition-stance features E3 · M    | Ryan     | Test a frozen NLI model or other suitable approach for supports-YES, contradicts-YES, and neutral classifications. Manually inspect at least 30 suitable examples. Document accuracy concerns; don't include unreliable stance features by default. |
| MM-024 · Build reproducible experiment runner E2 · M    | Kristina | Create a training/evaluation command with fixed seeds, configurations, event-disjoint splits, versioned inputs, and machine-readable metric outputs.                                                                                                |
| MM-025 · Establish official baseline comparisons E2 · M | Kristina | Re-run trivial, market-only, and news-only baselines on the same eligible examples. Choose the significant-move threshold using training data only and preserve the untouched test set.                                                             |
| MM-026 · Train the complete fused model E4 · L          | Munadir  | Train a model combining market state and news features. Implement six-hour significant-move and direction prediction, using simple late fusion first. Save validation predictions, configuration, and metrics.                                      |
| MM-027 · Package reproducible inference E4 · S          | Munadir  | Export the trained model and preprocessing configuration. Provide a callable prediction function with an explicit schema and a test showing consistent predictions after reloading.                                                                 |
| MM-028 · Review first meaningful results E7 · S         | Luke     | Review data quality, baseline comparison, fused-model results, implementation completeness, and experiment risks. Decide which improvements are worth pursuing before February.                                                                     |

January 15 milestone: The core model is implemented, and the team can answer whether combining market and news information appears promising.

If news adds no value, investigate whether the issue is data quality, information timing, semantics, model design, or genuinely weak predictive signal. Don't automatically respond by making the architecture more complex.

### Sprint 6 — Evaluate the model and build Historical Replay

January 16–29, 2027

Objective: Establish the model's strengths and weaknesses while connecting it to a functional Historical Replay product.

| Ticket                                                     | Owner    | Deliverable and acceptance criteria                                                                                                                                                                                  |
| ---------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MM-029 · Generate Historical Replay fixtures E1 · M        | Nick     | Create reproducible historical examples containing the market state at T, eligible news, a model prediction, and the observed outcome at T+6h. Keep future outcome data outside the prediction input.                |
| MM-030 · Automate prospective prediction collection E1 · S | Nick     | Build on the initial snapshot-logging procedure. Store immutable prediction-time inputs and later attach observed outcomes as separate records. Track failures and missing observations.                             |
| MM-031 · Run prediction-horizon ablation E2 · M            | Kristina | Compare 1h, 6h, and 24h predictions where valid labels exist. Apply comparable splits, report sample coverage, and explain differences in performance. Keep six hours as the primary target unless formally changed. |
| MM-032 · Perform error and robustness analysis E2 · M      | Kristina | Evaluate model behavior by market topic, liquidity, label quality, and other meaningful groups. Identify systematic failures and differences from the market-only baseline.                                          |
| MM-033 · Build model inference API E5 · M                  | Munadir  | Implement a FastAPI endpoint that accepts the documented feature inputs and returns available prediction outputs. Add validation tests, version metadata, and useful error responses.                                |
| MM-034 · Build Historical Replay service E5 · M            | Munadir  | Provide endpoints for retrieving a historical snapshot, generating a prediction, and revealing the later outcome. Test that hidden future information cannot enter model inference.                                  |
| MM-035 · Implement Historical Replay interface E6 · M      | Ryan     | Build market selection, historical snapshot display, prediction results, and the six-hour fast-forward interaction. Integrate with real replay endpoints and handle missing data.                                    |
| MM-036 · Build basic evaluation dashboard E6 · S           | Ryan     | Visualize saved Market Only, News Only, and Market + News metrics. Include sample counts and model versions so the dashboard cannot accidentally imply stronger evidence than was evaluated.                         |

January 29 target: Interactive Historical Replay

HISTORICAL SNAPSHOT

### Will the Fed cut rates?

Example probability at T

# 67%

News available at T:

Inflation remains above expectations

ILLUSTRATIVE PREDICTION

DOWN

Future outcome hidden

AFTER FAST-FORWARD

### Six hours later

Example observed probability

# 59%

Observed movement:

## −8 pp

PREDICTION VS. REALITY

Direction correct

Reveal actual historical outcome

Illustrative UI and values only; final demo predictions must come from actual saved model outputs.

### Sprint 7 — Final experiments, integration, and model freeze

January 30 – February 12, 2027

Research freeze

Objective: Complete the research experiments, stabilize the model, and have a functioning demonstration before Reading Week.

| Ticket                                                   | Owner    | Deliverable and acceptance criteria                                                                                                                                                          |
| -------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MM-037 · Evaluate confidence calibration E2 · M          | Kristina | Assess predicted significant-move probabilities against observed frequencies. Evaluate a suitable calibration method using validation data and report reliability on held-out data.          |
| MM-038 · Produce final experimental report E2 · M        | Kristina | Produce final comparison tables, ablations, robustness figures, sample sizes, and limitations. Document which model claims are supported by evidence and which are not.                      |
| MM-039 · Freeze dataset and audit reproducibility E1 · M | Nick     | Lock the final dataset version, source provenance, quality report, and generation configuration. Independently verify that core dataset outputs can be rebuilt.                              |
| MM-040 · Implement live market integration E5 · M        | Munadir  | Create an adapter for supported Polymarket market search, current price, and historical state APIs. Document rate limits, unavailable fields, and how live features match training features. |
| MM-041 · Freeze model and inference artifacts E4 · M     | Munadir  | Pin model weights, preprocessing, feature schema, threshold, calibration, and configurations. Verify inference parity between offline evaluation and API results.                            |
| MM-042 · Implement Live Analyze interface E6 · M         | Ryan     | Allow users to select a supported market, enter news, and request a prediction. Display the current market probability and supported outputs using real API responses.                       |
| MM-043 · Add reliable demo fallback E6 · S               | Ryan     | Make Historical Replay usable with cached historical examples and local model artifacts if the live market service is unavailable.                                                           |
| MM-044 · Conduct final research freeze review E7 · S     | Luke     | Approve dataset/model versions, experiments, paper figures, known limitations, and unresolved noncritical issues. Record the frozen research configuration.                                  |

Freeze date: February 12, 2027. After this point, work should be limited to correctness fixes, research writing, deployment, and the showcase. Do not add new experimental claims without rerunning the necessary controlled evaluations.

If time is limited, prioritize final evaluation and Historical Replay over perfect live-market functionality.

### Sprint 8 — Paper writing and demo refinement

February 13–26, 2027 · Reading Week February 13–21

Objective: Assemble the research paper from the already-completed experiment outputs, stabilize the demonstration, and prepare the final submission.

| Ticket                                                  | Owner    | Deliverable and acceptance criteria                                                                                                                                     |
| ------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MM-045 · Write dataset and preprocessing methods E7 · M | Nick     | Document data sources, joins, label reconstruction, feature availability, filtering, and dataset limitations. Provide the data coverage diagram and tables.             |
| MM-046 · Write experiments and results E7 · M           | Kristina | Write evaluation methodology, baselines, ablations, confidence analysis, primary findings, and limitations. Reconcile all reported numbers with saved experiment files. |
| MM-047 · Write model methodology E7 · M                 | Munadir  | Document feature fusion, model architecture, training configurations, prediction tasks, and inference. Explain why the chosen methods were appropriate.                 |
| MM-048 · Complete deployment documentation E5 · S       | Munadir  | Document installation, startup, API behavior, dependencies, configuration, failure handling, and offline fallback procedures.                                           |
| MM-049 · Polish and record the demonstration E6 · M     | Ryan     | Refine the frontend, charts, labels, loading states, and walkthrough. Produce a recorded backup and verify the demo on the presentation device.                         |
| MM-050 · Integrate and submit research paper E7 · L     | Luke     | Assemble all sections, reconcile terminology and figures, manage reviews, verify citations and claims, and submit by the confirmed deadline.                            |

The technical paper should not begin from a blank document during Reading Week. All experiments should already be documented, with figures and methods available from the prior sprints.

The February 27 date is your provisional target, not a verified CUCAI submission deadline.

### Sprint 9 — CUCAI readiness

February 27 – March 12, 2027 · Adjust to confirmed CUCAI schedule

Objective: Produce a polished, reliable showcase and prepare the team to confidently explain the technical work.

| Ticket                                                   | Owner    | Deliverable and acceptance criteria                                                                                                                             |
| -------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MM-051 · Independently review experimental claims E7 · S | Kristina | Challenge possible leakage, statistical assumptions, and model comparisons. Produce answers to difficult research questions.                                    |
| MM-052 · Reproduce project artifacts E7 · S              | Nick     | Rebuild the dataset and representative predictions from repository instructions. Confirm that required files, configurations, and documentation are accessible. |
| MM-053 · Perform deployment reliability tests E5 · M     | Munadir  | Test model loading, API failures, latency, invalid inputs, external service unavailability, and Historical Replay fallback.                                     |
| MM-054 · Finalize showcase demo E6 · M                   | Ryan     | Complete the demo script, verify all interaction flows, and prepare backup screenshots or recordings.                                                           |
| MM-055 · Rehearse presentation and technical Q&A E7 · M  | Luke     | Finalize slides, coordinate speaker responsibilities, run timed rehearsals, and prepare responses to likely recruiter/researcher questions.                     |

## 5. Technical dependencies and milestones

The most important path through the project is:

Nov 20 · MM-005

Validated historical join

Nov 30 · MM-008–010

Clean data + six-hour labels

Nov 30 · MM-011–012

Market-only baseline

Dec 9 · MM-016–019

First fused prototype

Jan 15 · MM-021–027

Complete core model

Jan 29 · MM-029–036

Historical Replay + evaluation

Feb 12 · MM-037–044

Final model + research freeze

Late Feb / March · MM-045–055

Paper + showcase

### Critical decisions at each gate

| Gate   | Question                                                                              | Possible response                                                               |
| ------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Nov 20 | Can we join historical market snapshots to real trades and reconstruct future prices? | Continue, revise the data source, or reduce scope                               |
| Nov 30 | Do we have a trustworthy training dataset and baseline?                               | Approve modeling or prioritize data repairs                                     |
| Dec 9  | Can the complete feature-to-prediction path run?                                      | Document problems for January                                                   |
| Jan 15 | Does news appear to improve prediction?                                               | Prioritize promising outputs, investigate failures, or report negative findings |
| Jan 29 | Can we demonstrate predictions against actual historical outcomes?                    | Stabilize Historical Replay or simplify product scope                           |
| Feb 12 | Are experiments reproducible and sufficiently complete for the paper?                 | Freeze results or explicitly approve necessary corrections                      |

One technical decision to settle early is the primary output contract. For now:

- Primary: Significant movement within six hours, with probability and direction.
- Secondary: Approximate movement magnitude if reliable.
- Research comparison: Market Only vs. News Only vs. Market + News.

If magnitude proves too noisy, the project can remain technically successful without presenting false precision. Volatility or trading volume can be explored as additional outcomes, but must be evaluated using the same disciplined experimental process.

## 6. Sprint capacity and prioritization

To avoid overcommitting a student team, I would assign effort rather than assume that eight tickets always equal eight comparable tasks.

A reasonable initial convention is:

| Ticket size | Planning effort         | Guideline                                                      |
| ----------- | ----------------------- | -------------------------------------------------------------- |
| S           | About 1–3 focused hours | Narrow fix, documentation, investigation, or small integration |
| M           | About 4–8 focused hours | One defined component or experiment                            |
| L           | More than 8 hours       | Split into smaller PRs when possible                           |

These are starting estimates, not performance quotas. Actual capacity should be agreed with each developer.

For a regular two-week sprint, aim for approximately one substantial ticket and one small supporting ticket per person. Some of the proposed sprints contain more work than a team with limited weekly hours may complete; only move tickets from the forecast backlog into the committed sprint after capacity is confirmed.

A priority order for when work slips:

1. Data correctness, valid labels, leakage protection.
2. Baseline and fused-model comparison.
3. Core experiment reproducibility.
4. Historical Replay.
5. Paper and final research documentation.
6. Live integration and visual polish.

The paper and demo deadline are fixed targets, so research work must be protected before optional features.

## 7. GitHub Project structure

Use these fields for each issue:

| Field        | Example                               |
| ------------ | ------------------------------------- |
| Title        | `[E1] Validate historical token join` |
| Epic         | E1 — Historical Data Engineering      |
| Sprint       | S1                                    |
| Owner        | Kristina                              |
| Priority     | P0 — Critical                         |
| Size         | M                                     |
| Status       | In Progress                           |
| Dependencies | MM-003, MM-004                        |
| Evidence     | PR, tests, sample outputs, report     |

Keep issue statuses simple: `Backlog`, `Ready`, `In Progress`, `In Review`, `Blocked`, and `Done`.

### Ticket template

Use one consistent template so every developer knows what is required, while retaining room for exploration.

# [Epic] Ticket Title

**Owner:**\
**Sprint:**\
**Priority:** P0 / P1 / P2\
**Estimated size:** S / M / L\
**Dependencies:**

## Objective

What problem are we solving, and why is this important to MarketMove?

## Inputs

Describe the data, files, APIs, schemas, and dependencies required to perform this work.

## Expected Outputs

Describe the returned values, generated files, interfaces, artifacts, or experimental findings.

## Implementation / Investigation

Explain the intended approach and major technical requirements.

The owner may propose alternatives if they are better supported by evidence.

## Acceptance Criteria

- Intended functionality or investigation is complete.
- Required outputs are produced and verified.
- Tests or experimental evidence are included.
- Edge cases and limitations are documented.
- Input/output contracts are updated.
- Pull request or documentation is reviewed.

## Findings and Technical Decisions

Record decisions, assumptions, failed approaches, and important discoveries.

## Documentation

List relevant repository documentation files to update.

## Evidence / PR

Link the implementation, experiment output, tests, or report.

For investigation tickets, an unsuccessful experiment can still count as completed if the developer produces reproducible evidence and explains the decision it supports.

## 8. Saturday meeting cadence

Keep your original two-week rhythm, but adjust the exceptions for the academic calendar.

| Date   | Meeting                                 | Expectation                             |
| ------ | --------------------------------------- | --------------------------------------- |
| Nov 7  | Sprint 1 planning                       | Kickoff                                 |
| Nov 14 | Mid-sprint standup                      | Normal                                  |
| Nov 21 | Sprint 1 review + Sprint 2 planning     | Normal                                  |
| Nov 28 | Mid-sprint standup                      | Baseline milestone check                |
| Dec 5  | Sprint 2 review + Sprint 3 planning     | Scope only work achievable before exams |
| Dec 12 | Standup                                 | Cancel                                  |
| Dec 19 | Sprint 4 planning                       | Cancel                                  |
| Dec 26 | Standup                                 | Cancel                                  |
| Jan 2  | Sprint 5 planning                       | Asynchronous; normal work starts Jan 4  |
| Jan 9  | Mid-sprint standup                      | Normal                                  |
| Jan 16 | Sprint 5 review + Sprint 6 planning     | Normal                                  |
| Jan 23 | Mid-sprint standup                      | Normal                                  |
| Jan 30 | Sprint 6 review + Sprint 7 planning     | Normal                                  |
| Feb 6  | Mid-sprint standup                      | Final experiments check                 |
| Feb 13 | Sprint 7 review + Sprint 8 planning     | Short or asynchronous                   |
| Feb 20 | Mid-sprint standup                      | Optional during Reading Week            |
| Feb 27 | Paper / demo review + Sprint 9 planning | Adjust to conference schedule           |
| Mar 6  | Showcase readiness check                | Only if before CUCAI                    |

At each meeting, ask developers to demonstrate what they accomplished, share what they learned, identify blockers, and say what they plan to deliver next.

For blocked or late tickets, require a short update in the issue and an urgent message in the team chat when intervention is needed. Avoid making developers wait until Saturday to ask for help.

## 9. Recommended immediate action

For the November 7 kickoff, I would only create the eight epic containers, the seven committed Sprint 1 tickets, and the milestone dates in the GitHub Project.

Keep Sprint 2–9 tickets as a forecast backlog. Refine their acceptance criteria and estimates as the team discovers actual data constraints.

The one additional continuous task worth starting early is a minimal prospective prediction log. Once the team agrees on the input schema, begin preserving timestamped market/news observations in November, even before the automated collector exists. That provides prospective examples that may be valuable when historical news timestamps prove unreliable.

Ultimately, I would evaluate MarketMove on two dimensions: whether the team produced trustworthy evidence about news and prediction-market movement, and whether every developer can confidently explain and defend the technical system they helped build. Those goals reinforce each other without making delivery the only measure of success.