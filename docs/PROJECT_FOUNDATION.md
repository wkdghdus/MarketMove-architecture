https://github.com/wkdghdus/marketmove-intro

# MarketMove — Project Foundation Outline

## 1. Project Overview

### Project Statement

**MarketMove is an AI/ML system that predicts how breaking news is likely to affect the short-term probability of a prediction market.**

A user selects an existing prediction market, enters a piece of breaking news, and MarketMove analyzes both:

* what the news implies about the market proposition, and
* the market's current state and recent behavior.

The system then predicts:

1. **Whether a significant movement is likely**
2. **Which direction the market is likely to move**
3. **Approximately how large the movement may be**

The initial primary prediction horizon is **six hours**.

---

### Problem Statement

Prediction markets continuously aggregate information into probabilities.

For example:

> **Will the Federal Reserve cut interest rates by September? — 67%**

When new information appears, however, it is difficult for a user to answer:

> **How important is this news to this market, and how much could it change the odds?**

A headline may be highly relevant but already priced in. Another may contradict the market proposition but arrive while liquidity is low. A third may contain genuinely new information that causes a significant repricing.

Current general-purpose AI tools can reason about what a headline *sounds like it implies*, but they generally do not combine that semantic reasoning with:

* current prediction-market probability,
* recent price momentum,
* volatility,
* trading volume,
* liquidity,
* order-book state,
* and historical examples of subsequent market movement.

MarketMove attempts to fill that gap using **historical prediction-market data + NLP + supervised machine learning**.

The project is deliberately framed as **forecasting subsequent market reaction**, rather than claiming that a headline causally produced a market movement.

---

### Target Users

The primary showcase audience is:

* university students,
* technically curious prediction-market users,
* software engineers,
* ML engineers,
* recruiters,
* AI practitioners.

The product is designed primarily as an **interactive forecasting and ML demonstration**, not as automated financial advice or an automated trading system.

---

### Proposed Solution

The user selects a currently available prediction market and submits a news headline.

Example:

**Market**

> Will the Federal Reserve cut rates by September?

Current probability: **67%**

**News**

> Powell says inflation remains too high for near-term rate cuts.

MarketMove could return:

**Significant-move probability:** 82%
**Expected direction:** ↓ DOWN
**Expected six-hour movement:** ~-6 percentage points
**Likely range:** -3 to -9 points
**Projected probability:** ~61%

Behind this simple interaction, MarketMove combines:

**News understanding**

* semantic relevance,
* market-proposition stance,
* text embeddings,

with:

**Market state**

* current probability,
* recent momentum,
* volatility,
* volume,
* liquidity,
* spread,
* order-book information.

The final product will also contain a **Historical Replay mode**, where a user can freeze the market at a historical timestamp, run MarketMove using only information available at that point, and then fast-forward six hours to see what actually happened.

---

# 2. Core Functionality

## A. Live Market Analysis

The main product flow is:

```text
Choose Prediction Market
          ↓
Enter Breaking News
          ↓
Fetch Current Market State
          ↓
Analyze News + Market
          ↓
Predict Market Reaction
```

The user receives three primary outputs.

### 1. Significant-Move Prediction

Example:

> **Probability of ≥5 point movement within six hours: 82%**

This is expected to be the most statistically robust prediction task.

---

### 2. Direction Prediction

Classification into:

* UP
* FLAT
* DOWN

Example:

```text
DOWN    76%
FLAT    18%
UP       6%
```

---

### 3. Magnitude Prediction

Example:

> Expected movement: **~-6 points**

Instead of presenting an unrealistically precise value, MarketMove should display an uncertainty range:

> Likely movement: **-3 to -9 points**

Magnitude prediction is considered a secondary target. The project remains viable if significant-move detection and direction prediction perform substantially better than exact magnitude regression.

---

## B. Historical Replay

Historical Replay is a major part of the product because it allows users to see whether the system actually predicted something correctly.

Example:

```text
February 8, 2026 — 10:32 AM

Market probability:
67%

News available:
"Powell says inflation remains too high..."
```

MarketMove generates:

```text
Prediction:
DOWN

Expected movement:
-6 pts

Projected probability:
61%
```

The future market path initially remains hidden.

The user presses:

> **FAST FORWARD 6 HOURS**

The website then reveals:

```text
Actual probability:
59%

Predicted:
61%

Actual move:
-8 pts

Direction:
Correct ✓

Significant move:
Correct ✓
```

This transforms MarketMove from:

> "An AI says this headline might move the market."

into:

> "Here is what the model predicted at time T, and here is what actually happened afterward."

---

## C. Evaluation Dashboard

A technical page will answer:

> **Does MarketMove actually work?**

It will display metrics such as:

* Significant-move AUPRC
* AUROC
* precision / recall
* direction Macro F1
* magnitude MAE
* calibration
* performance by topic
* performance by liquidity
* performance by prediction horizon

Most importantly, it will compare:

```text
Market Only
vs.
News Only
vs.
Market + News
```

This ablation demonstrates whether news contributes predictive information beyond what is already visible in market behavior.

---

## MVP Scope

The MVP should include:

* Search/select an existing prediction market
* Display current market probability
* Input a news headline
* Generate news-market semantic features
* Generate market-state features
* Significant-move prediction
* Direction prediction
* Basic magnitude prediction if supported by evaluation
* Historical Replay
* Prediction-versus-actual visualization
* Evaluation metrics
* Reproducible historical training pipeline

---

## Intentionally Out of Scope

The initial MVP will **not** attempt to build:

* automated trading,
* portfolio optimization,
* automatic execution of bets,
* full-scale news aggregation,
* causal inference,
* automatic discovery of every market affected by a headline,
* complex multi-agent systems,
* reinforcement learning,
* large transformer training from scratch.

Automatic market discovery may become a stretch feature after the core forecasting pipeline works.

For MVP, the **user explicitly selects the market**.

---

# 3. Technical Approach

## Core ML Question

MarketMove is fundamentally learning:

```text
News available at T
        +
Market definition
        +
Market state at T
        ↓
     Model
        ↓
Future market movement
```

The central project hypothesis is:

> **News contains predictive information about future market repricing beyond the information already encoded in the market itself.**

---

## Historical Data Sources

MarketMove initially combines two historical datasets.

### PolyBench

PolyBench provides information available at prediction time **T**, including:

* market question,
* market description,
* resolution criteria,
* market probability,
* timestamp,
* market token IDs,
* news context,
* snapshot order-book information.

### Polymarket-v1

Polymarket-v1 provides historical trade data, including approximately:

* token / asset ID,
* condition ID,
* timestamps,
* trade price,
* trade volume,
* market slug,
* outcome.

This allows MarketMove to reconstruct:

* price history before T,
* price around T,
* price around T+1h,
* price around T+6h,
* price around T+24h.

---

## Dataset Join

The main historical join uses Polymarket outcome-token identifiers:

```text
PolyBench
clob_token_ids
       ↓
Polymarket-v1
asset_id
```

This is preferable to fuzzy matching market names or questions.

A major first-stage engineering task will validate exactly how much historical data can be joined successfully.

---

## Label Reconstruction

The primary prediction horizon is:

> **6 hours**

Markets may not trade at exactly T+6h, so the project will reconstruct an approximate six-hour probability using methods such as:

* nearest valid trade within a tolerance window,
* volume-weighted average price,
* volume-weighted median.

Every label will include quality metadata such as:

* timestamp offset,
* trade count,
* surrounding volume,
* label method,
* label-quality rating.

Very stale or illiquid examples will be discarded.

---

## Market Features

Potential market-state features include:

* current probability,
* 15-minute momentum,
* one-hour momentum,
* six-hour momentum,
* historical volatility,
* recent trading volume,
* bid/ask spread,
* liquidity,
* order-book depth,
* order-book imbalance,
* time until market resolution.

---

## News Features

The NLP pipeline answers three different questions.

### 1. Relevance

> Does this headline actually concern this prediction market?

News and market text will be embedded using a pretrained text encoder, and semantic similarity will be calculated.

---

### 2. Proposition Stance

> Does the headline support YES, contradict YES, or remain neutral?

For example:

**Market**

> The Federal Reserve will cut rates by September.

**Headline**

> Powell says rates must remain elevated.

Possible semantic output:

```text
Supports YES       0.08
Neutral            0.17
Contradicts YES    0.75
```

This is more useful than generic positive/negative sentiment.

---

### 3. Expected Reaction

The semantic features are then combined with current market conditions to predict how strongly traders are likely to react.

---

# Model Development Strategy

The project will intentionally begin with simple, measurable baselines before introducing complex models.

## Baseline 0 — Trivial

Examples:

* always predict FLAT,
* always predict no significant move,
* always predict zero change.

---

## Baseline 1 — Market Only

Initial model:

**XGBoost**

Inputs include market probability, momentum, volatility, volume, liquidity, spread, and order-book features.

This establishes:

> How predictable is short-term market movement without news?

---

## Baseline 2 — News Only

Inputs:

* headline embedding,
* market embedding,
* semantic similarity,
* proposition stance.

This establishes:

> How useful is the headline by itself?

---

## Model 3 — Market + News

The initial fused model will use **late feature fusion**.

```text
NEWS FEATURES
embedding representation
relevance
stance
        │
        ├────────────┐
                     ↓
                   XGBoost
                     ↑
        ┌────────────┘
        │
MARKET FEATURES
probability
momentum
volatility
volume
liquidity
spread
order-book state
```

The most important experiment becomes:

> **Does Market + News outperform Market Only?**

More complex neural fusion or cross-encoder architectures will only be explored after the simpler system demonstrates meaningful signal.

---

# Temporal Leakage Protection

At prediction time **T**, the model may use only information that existed by T.

```text
MODEL MAY SEE             MODEL MAY NOT SEE

news at T                 future prices
market state at T         future volume
past prices               future volatility
past volatility           final resolution
past volume               later news
order book at T
```

Training/test splits will also be grouped by **event**, rather than randomly splitting related markets, because several correlated markets may belong to the same real-world event.

---

# Proposed Technology Stack

### Data / ML

* Python
* pandas / Polars
* NumPy
* scikit-learn
* XGBoost
* Hugging Face / Sentence Transformers
* PyTorch for later neural experiments

### Backend

Recommended:

* Python
* FastAPI
* model inference service
* replay service
* Polymarket integration service

### Frontend

Recommended:

* React
* Next.js
* Tailwind CSS
* charting library for market movement visualization

### Data Storage

Potentially:

* Parquet for processed ML datasets
* PostgreSQL or equivalent database for prospective predictions
* cached historical replay examples

### External Integration

* Polymarket market APIs
* Polymarket order-book / historical market interfaces where available

Exact infrastructure can be finalized during initial project setup.

---

# High-Level System Architecture

```text
                 HISTORICAL TRAINING

PolyBench                         Polymarket-v1
   │                                   │
   │                                   │
   ├──── News / market snapshot        ├──── Price history
   │                                   ├──── Volume
   │                                   └──── Future prices
   │
   └──────────────┬────────────────────┘
                  ↓
           Training Dataset
                  ↓
        Feature Engineering
          /             \
     News Features    Market Features
          \             /
           \           /
             Fused Model
                 ↓
      Impact / Direction / Magnitude
```

Live inference:

```text
USER
 │
 ├── Select Market
 │
 └── Enter News
        ↓
Fetch Current Market State
        ↓
News + Market Feature Pipeline
        ↓
Trained Model
        ↓
Calibration
        ↓
Prediction API
        ↓
MarketMove Website
```

---

# 4. Development Plan

## Phase 1 — September

### Prove the Dataset

Goals:

* project/repository setup,
* load PolyBench,
* load Polymarket-v1,
* normalize token IDs,
* validate historical join,
* reconstruct six-hour prices,
* generate data-quality report,
* begin prospective data collection.

**Exit condition:**

> We know exactly how many trustworthy training examples are available.

---

## Phase 2 — October

### Prove Predictive Signal

Build:

* trivial baselines,
* market-only XGBoost,
* news embedding pipeline,
* relevance features,
* news-only model,
* initial fused model,
* event-group evaluation.

**Critical question by the end of October:**

> Does adding news improve prediction over market data alone?

---

## Phase 3 — November

### Improve the ML

Potential improvements:

* proposition stance,
* better feature engineering,
* threshold tuning,
* calibration,
* magnitude regression,
* cross-encoder experiments,
* robustness analysis,
* performance by liquidity/topic.

Complexity will only be added where evaluation shows measurable benefit.

---

## Phase 4 — December

### Historical Replay Product

Build the first complete product experience:

```text
Historical Market
      ↓
Freeze at T
      ↓
Run MarketMove
      ↓
Hide Future
      ↓
Fast Forward 6H
      ↓
Reveal Actual Outcome
```

Deliverables:

* Replay API
* Replay interface
* prediction visualization
* market price-path animation
* prediction-versus-actual comparison

---

## Phase 5 — January

### Live MarketMove

Build:

* market search,
* live Polymarket integration,
* current market-state retrieval,
* recent market-history features,
* user headline input,
* live inference,
* prediction UI.

Prospective predictions will also continue to be collected and evaluated.

---

## Phase 6 — February / Early March

### CUCAI Preparation

Focus on:

* model freeze,
* final evaluation,
* frontend polish,
* latency,
* reliability,
* demo cases,
* documentation,
* presentation,
* failure handling.

Historical Replay will remain available as a reliable demo mode even if external live APIs fail during the showcase.

---

# Major Milestones

## Milestone 1 — Historical Ground Truth Exists

For a PolyBench snapshot at T, the project can reliably reconstruct the same market's probability around T+6h using Polymarket-v1.

---

## Milestone 2 — Market Baseline Exists

MarketMove can predict future movement using only market-state information and evaluate it correctly on unseen events.

---

## Milestone 3 — News Adds Value

Market + News measurably outperforms Market Only on held-out events.

---

## Milestone 4 — Historical Replay Works

A historical prediction can be generated and compared interactively against the real subsequent market movement.

---

## Milestone 5 — Live Product Works

A user can select an active market, enter news, and receive a calibrated prediction through the website.

---

# 5. Risks & Unknowns

## Risk 1 — Historical Dataset Join

The exact number of usable PolyBench ↔ Polymarket-v1 examples is still unknown.

This is the first major feasibility question and should be tested before serious model development.

### Mitigation

Complete a dataset coverage funnel before investing in model complexity.

---

## Risk 2 — Illiquid Markets

Some prediction markets may have long periods without trades, making six-hour labels unreliable.

### Mitigation

Use:

* trade-window tolerances,
* volume filters,
* staleness thresholds,
* label-quality scores.

---

## Risk 3 — News May Not Add Predictive Value

The market may already incorporate much of the information contained in news.

### Mitigation

Explicitly compare:

```text
Market Only
News Only
Market + News
```

If news does not improve exact magnitude prediction, test whether it improves:

* significant-move detection,
* direction,
* future volatility,
* future volume.

---

## Risk 4 — Exact Magnitude May Be Too Difficult

Predicting exactly how many percentage points a market will move may be noisy.

### Mitigation

Make:

> **Will it move materially?**

and:

> **Which direction?**

the primary prediction tasks.

Magnitude remains a secondary output.

---

## Risk 5 — Imperfect Historical News Timing

Historical news timestamps may not perfectly represent when information became available to traders.

### Mitigation

* avoid causal claims,
* use conservative temporal filtering,
* begin prospective data collection early.

---

## Risk 6 — Historical LLM Contamination

Modern LLMs may already know the outcome of historical events.

### Mitigation

Historical experiments will initially use frozen embedding / NLI models rather than unrestricted current frontier-model reasoning.

Prospective examples avoid this issue because predictions are generated before their outcomes occur.

---

## Risk 7 — Event Leakage

Several prediction markets may represent different questions about the same event.

### Mitigation

Split training, validation, and test sets using event IDs.

---

# Outstanding Questions to Validate

Before development locks in, the team should answer:

1. How many high-quality joined historical examples actually exist?
2. How many independent events do those examples represent?
3. Should significant movement initially mean 3, 5, or 10 percentage points?
4. Should six-hour price labels use nearest trade, VWAP, or another robust method?
5. Which frozen text encoder provides the best relevance representation?
6. Which approach provides reliable proposition stance?
7. Is magnitude prediction statistically viable?
8. Which Polymarket interfaces should power live market state and history?
9. What source should power prospective headline collection?
10. What infrastructure is necessary for reliable CUCAI deployment?

---

# Go / No-Go Criteria

The project should not assume feasibility until the dataset is audited.

Approximate planning thresholds:

### Strong

* ≥5,000 clean examples
* ≥1,000 independent events

### Workable

* 2,000–5,000 examples
* approximately ≥500 independent events

### Concerning

* 1,000–2,000 examples

In this case, reduce model complexity and prioritize significant-move + direction prediction.

### Major Reformulation Required

* fewer than approximately 1,000 trustworthy examples,
* failed token-level join,
* unreliable future-price reconstruction.

These thresholds are planning guidelines rather than strict scientific rules.

---

# 6. Developer Onboarding

## Ideal Team Size

**3–5 developers**

---

## Preferred Skills

Developers do not need to know prediction markets beforehand.

Useful experience includes:

* Python
* pandas / data processing
* introductory machine learning
* scikit-learn
* XGBoost / gradient boosting
* NLP / embeddings
* PyTorch
* APIs / backend development
* React / Next.js
* frontend data visualization
* statistics / model evaluation

Most importantly, developers should be interested in learning how a complete ML product moves from:

```text
Raw Data
   ↓
Dataset
   ↓
Features
   ↓
Model
   ↓
Evaluation
   ↓
API
   ↓
Product
```

---

# Recommended Workstreams

For five developers:

### Developer 1 — Historical Data Engineering

Own:

* PolyBench
* Polymarket-v1
* token joins
* price reconstruction
* labels
* data QA

---

### Developer 2 — NLP / Semantic Modeling

Own:

* embeddings
* news-market relevance
* proposition stance
* news aggregation
* semantic experiments

---

### Developer 3 — Prediction ML

Own:

* baselines
* significant-move model
* direction model
* magnitude model
* feature fusion
* calibration
* evaluation

---

### Developer 4 — Backend / Platform

Own:

* inference API
* live Polymarket integration
* Replay service
* prospective collector
* feature serving

---

### Developer 5 — Frontend / Product

Own:

* market search
* headline input
* prediction UI
* historical Replay
* price visualizations
* evaluation dashboard

---

## If the Team Has Three Developers

```text
Developer A
Data Engineering + Collector

Developer B
NLP + ML

Developer C
Backend + Frontend
```

The PM coordinates:

* data contracts,
* experiment priorities,
* evaluation standards,
* milestone dependencies,
* integration.

---

# Developer Documentation

New developers should receive:

* `MASTER_PLAN.md`
* `DATA_SCHEMA.md`
* `ML_SPEC.md`
* `EXPERIMENTS.md`
* `MODEL_CARD.md`
* `API_CONTRACTS.md`
* `DEMO_RUNBOOK.md`

The documentation should make clear:

* what each component receives,
* what each component returns,
* what information is allowed at prediction time,
* how components depend on one another.

---

# First Task for a New Developer

A strong initial engineering task is:

> **Take a small subset of PolyBench markets, normalize their outcome-token IDs, locate the matching Polymarket-v1 trades, and reconstruct a six-hour future price with quality metadata.**

Expected output:

```text
PolyBench markets tested: X
Valid token IDs: X
Matched Polymarket-v1 tokens: X
Valid T prices: X
Valid T+6h labels: X
Rejected examples: X
```

For several examples, the developer should also output:

```text
Market
Snapshot timestamp
Token ID
Price at T
Target T+6h timestamp
Observed future trade timestamp
Future price
Timestamp offset
Nearby volume
Label quality
```

This task introduces a new developer to the project's most important data structures while simultaneously contributing to the first feasibility milestone.

---

# 7. Expected Outcomes & Deliverables

## By CUCAI

MarketMove should have:

### 1. Reproducible Historical Dataset Pipeline

A deterministic pipeline combining PolyBench and Polymarket-v1 into training examples containing:

* market data,
* news data,
* historical market features,
* six-hour outcome labels,
* quality metadata.

---

### 2. Evaluated ML Models

At minimum:

* trivial baseline,
* market-only baseline,
* news-only model,
* fused market + news model.

All evaluated on unseen events.

---

### 3. Public-Facing Website

The website should contain four major experiences.

#### Live Analyze

```text
Select Market
     ↓
Enter News
     ↓
Analyze
     ↓
Prediction
```

#### Historical Replay

```text
Historical Snapshot
     ↓
Predict
     ↓
Fast Forward
     ↓
Reveal Reality
```

#### Evaluation

Show whether the model actually performs better than its baselines.

#### About / Methodology

Explain:

* the project idea,
* datasets,
* six-hour prediction horizon,
* ML methodology,
* limitations.

---

### 4. Prospective Prediction Dataset

Predictions made throughout the year should be logged before their future outcomes become known.

Stored information includes:

* headline,
* timestamp,
* market,
* market state,
* model prediction,
* actual +1h / +6h / +24h market state.

This creates a cleaner real-world evaluation set for the final showcase.

---

### 5. Technical Documentation

The project should be reproducible and understandable to another developer.

---

# CUCAI Live Demo

An ideal demonstration is:

### Step 1

Briefly explain prediction markets.

### Step 2

Choose a familiar market.

### Step 3

Show its current probability.

### Step 4

Enter a realistic breaking-news headline.

### Step 5

MarketMove displays:

```text
Significant Move
82%

Direction
↓ DOWN

Expected Movement
~-6 pts
```

### Step 6

Explain the key signals behind the forecast.

### Step 7

Switch to **Historical Replay**.

### Step 8

Select a past market/news example.

### Step 9

Freeze the system at timestamp T.

### Step 10

Generate the prediction.

### Step 11

Press:

> **FAST FORWARD 6 HOURS**

### Step 12

Reveal the real movement.

### Step 13

Show the Evaluation page comparing:

```text
Market Only
vs.
News Only
vs.
Market + News
```

### Step 14

Explain that MarketMove has also collected prospective predictions during the academic year.

---

# Definition of Project Success

MarketMove will be considered successful if, by the end of the development cycle:

1. Historical prediction-market states can be reliably connected to future market movements.
2. The training and evaluation process prevents temporal and event leakage.
3. A meaningful market-only baseline exists.
4. The incremental value of news is measured rather than assumed.
5. At least one news-dependent prediction task provides useful predictive signal.
6. Predictions include calibrated confidence or uncertainty where appropriate.
7. Historical Replay demonstrates predictions against real outcomes.
8. A polished website supports end-to-end interaction.
9. The system can run reliably during CUCAI.
10. The project clearly demonstrates substantial work in:

* data engineering,
* NLP,
* market/time-series features,
* supervised ML,
* evaluation,
* backend engineering,
* and frontend product development.

The strongest possible outcome is demonstrating:

> **Market behavior contains information. News contains information. MarketMove can measure whether combining the two improves short-term prediction-market forecasting.**
