import re, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = (ROOT/'docs/REVISED_ROADMAP.md').read_text(encoding='utf-8')
parts = re.split(r'(?=^### Sprint [1-9] —)', SRC, flags=re.M)
sections = {}
for p in parts:
    mt = re.match(r'### Sprint (\d+) —', p)
    if mt: sections[int(mt.group(1))]=p
assert len(sections)==9, sections.keys()

tickets=[]
# Sprint 1 free-form tickets
s1=sections[1]
items=list(re.finditer(r'^(MM-\d{3}) · (.+?) (Kristina|Munadir|Nick|Ryan|Luke) · (E\d) · ([SML])\s*$', s1, re.M))
for i,m in enumerate(items):
    chunk=s1[m.end(): items[i+1].start() if i+1<len(items) else len(s1)]
    chunk=chunk.split('Sprint 1 review')[0].strip()
    desc=chunk.split('\n\nDone:')[0].strip()
    acceptance=re.search(r'^Done:\s*(.+?)(?:\n\n|$)',chunk,re.S|re.M)
    dep=re.search(r'Depends on (.+?)\.',chunk)
    deps=re.findall(r'MM-\d{3}',dep.group(1)) if dep else []
    tickets.append(dict(id=m.group(1),title=m.group(2).strip(),sprint='S1',owner=m.group(3),epic=m.group(4),size=m.group(5),description=desc,acceptance=acceptance.group(1).strip() if acceptance else desc,dependencies=deps))
assert len(tickets)==7, [(t['id'],t['title']) for t in tickets]
for s in [2,3,5,6,7,8,9]:
    for line in sections[s].splitlines():
        if not re.match(r'^\|\s*MM-\d{3}',line):continue
        cols=[x.strip() for x in line.strip().strip('|').split('|')]
        assert len(cols)>=3,(s,line)
        head,owner,acceptance=cols[0],cols[1],cols[2]
        m=re.match(r'(MM-\d{3}) · (.*?) (E\d) · ([SML])$',head)
        assert m,(s,head)
        tickets.append(dict(id=m.group(1),title=m.group(2).strip(),sprint=f'S{s}',owner=owner,epic=m.group(3),size=m.group(4),description=acceptance,acceptance=acceptance,dependencies=[]))
assert len(tickets)==55,len(tickets)
assert sorted(int(t['id'].split('-')[1]) for t in tickets)==list(range(1,56))

stages=[
 {'id':'signals','number':'01','title':'Source signals','subtitle':'What the system knows','color':'#86d5f7','summary':'Raw inputs. Nothing here is computed by the team: these sources are loaded, profiled and audited before anything is built on them.'},
 {'id':'foundations','number':'02','title':'Data foundations','subtitle':'Make time and identity trustworthy','color':'#d2abff','summary':'Turns raw sources into a dataset with trustworthy identity (which outcome token?) and time (what was really known at T?). Holds the first feasibility gate.'},
 {'id':'intelligence','number':'03','title':'Prediction engine','subtitle':'Turn signals into evidence','color':'#d1e68c','summary':'Features, baselines, the fused model and the experiments that decide whether news adds anything beyond the market itself.'},
 {'id':'experience','number':'04','title':'Product & evidence','subtitle':'Make results inspectable','color':'#f9b78e','summary':'Serves the frozen model and makes results inspectable: prediction and replay APIs, Live Analyze, Historical Replay, the evidence dashboard and the paper.'},
]

nodes=[
 ('polybench','signals',38,82,'PolyBench','Historical market snapshots','Nick','E1','Market definitions, snapshot probability, token IDs and candidate news context captured at historical time T.','Snapshot timestamps + outcome-token IDs','Structured historical snapshots','News may be retrospective, not truly available at T'),
 ('polymarket_history','signals',38,168,'Polymarket-v1','Trades & realized prices','Nick','E1','Trade-level history used to reconstruct market state before T and observed outcomes near T+6h.','Asset ID, timestamp, trade price and size','Historic prices, volume and future-label observations','Sparse trades and ambiguous outcome mappings'),
 ('news_context','signals',38,254,'News at time T','Timestamped headlines','Ryan','E3','News text and publication-time provenance; only information available at prediction time may enter features.','News text, publication time, market proposition','Eligible headline + reliability flag','Retrospective summaries and later publication updates'),
 ('polymarket_live','signals',38,512,'Live Polymarket','Market state endpoints','Munadir','E5','Future live connector for market selection, price and supported history. Not the same as historical training data.','Supported market lookup, current prices','Market state for live inference','API rate limits and training/serving parity'),
 ('contracts','foundations',378,82,'Contracts & tooling','Schema · tests · CI','Kristina + Luke','E0','UTC timestamps, normalized identifiers, percent-point labels, project setup and shared API contracts.','Raw source schemas, team decisions','Versioned contracts and reproducible tooling','Inconsistent units or hidden assumptions'),
 ('token_join','foundations',378,168,'Outcome-token join','clob_token_ids ↔ asset_id','Nick + Kristina','E1','Validate token-level join coverage and YES/NO mappings. No silent fuzzy-text fallback.','PolyBench IDs + Polymarket trade asset_id','Verified historical snapshot-to-trade links','Unmatched, duplicate or ambiguous token IDs'),
 ('label_reconstruction','foundations',378,254,'6h label builder','Future state at T + 6h','Munadir','E1','Reconstruct p(T+6h) with documented time windows, staleness and trade quality checks.','Joined snapshots + timestamped trades','Delta in percentage points + label quality','Do not leak the future into model features'),
 ('training_dataset','foundations',378,340,'Training dataset','Curated Parquet + manifests','Nick','E1','One reproducible example per valid snapshot with valid features, event grouping, outcomes and source provenance.','Joined snapshots + labels + eligible news','Deterministic training data and quality report','Sample size and event coverage are unproven'),
 ('prospective_log','foundations',378,512,'Prospective logger','Pre-outcome observations','Nick','E1','Capture prediction-time data before outcomes are known; append later observations separately.','Immutable T snapshot + future observed state','Prospective evaluation records','Never rewrite historical inputs with future values'),
 ('market_features','intelligence',718,82,'Market features','Momentum · volatility · volume','Kristina','E2','Generate only reconstructible market signals using trade history at or before T.','Price history up to T','Market-only feature vector','Missing order-book or liquidity features must remain missing'),
 ('news_features','intelligence',718,168,'News semantics','Embeddings · relevance · stance','Ryan','E3','Frozen encoder, proposition relevance and optional stance features with verified publication times.','Eligible news + market proposition','News feature vector','No contaminated future-aware text reasoning'),
 ('baseline_models','intelligence',718,254,'Baseline models','Trivial / market / news','Kristina','E2','Comparable baseline models on the same eligible examples and event-disjoint splits.','Market features, news features, T+6h labels','Saved baseline predictions + metrics','Training/test leakage and class imbalance'),
 ('fused_model','intelligence',718,340,'Fused predictor','Late-fusion XGBoost','Munadir','E4','Fuse market and news features to estimate significant-move probability and direction; magnitude only if validated.','Market + news vectors','6h movement likelihood and direction','News lift is a hypothesis, not a guaranteed result'),
 ('evaluation','intelligence',718,426,'Evaluation lab','Ablations · calibration','Kristina','E2','Compare Market Only, News Only and Market + News, horizons and robustness under event-aware splits.','Saved predictions + held-out labels','AUPRC, macro F1, robustness and calibrated evidence','Prevent cherry-picking thresholds and results'),
 ('model_package','intelligence',718,512,'Model artifacts','Versioned inference contract','Munadir','E4','Freeze model, encoder, preprocessing configuration and threshold with reproducible API parity.','Validated model + preprocessing','Loadable, versioned inference package','Mismatch between offline and deployed predictions'),
 ('prediction_api','experience',1058,512,'Inference API','FastAPI prediction service','Munadir','E5','Validate and serve six-hour model predictions with version metadata and safe handling of unavailable features.','Current or replay-safe feature inputs','Typed prediction result','No unvalidated model outputs should be presented as facts'),
 ('replay_api','experience',1058,82,'Replay service','Historical T / T+6h endpoints','Munadir','E5','Return replay snapshots while withholding future outcomes until the reveal interaction.','Verified replay fixtures + model','Safe snapshot, prediction, future reveal','Future-label leakage into initial inference'),
 ('live_analyze','experience',1058,426,'Live Analyze','Market + headline UI','Ryan','E6','User chooses a market, enters news and explores a six-hour prediction and its caveats.','Market selection + entered headline','Supported forecast display','No automatic trading or guaranteed returns'),
 ('historical_replay','experience',1058,168,'Historical Replay','Freeze · forecast · reveal','Ryan','E6','Interactive prediction-versus-reality story with true time boundaries and a reliable cached demo mode.','Historical T snapshot + frozen prediction','T+6h observed-move comparison','Demo values must be real or explicitly illustrative'),
 ('evaluation_ui','experience',1058,254,'Evidence dashboard','Baseline comparison','Ryan','E6','Display sample sizes, saved evaluation results, model versions and limitations without implying unsupported lift.','Final experiments + model metadata','Transparent comparison dashboard','No fabricated performance metrics'),
 ('paper_showcase','experience',1058,340,'Paper & CUCAI','Research freeze · showcase','Luke + team','E7','Paper, methods, reproducible artifacts, presentation, demo reliability and CUCAI readiness.','Validated datasets, experiments and demo','Reviewable research story and event-ready demo','Submission and event dates are provisional'),
]
# Long-form component guide, from PROJECT_FOUNDATION.md (architecture, stack, risks) reconciled with the
# revised roadmap tickets. Tooling is the foundation's *proposed* stack; "planned docs" are its onboarding list.
guides={
 'polybench':dict(
  definition='A historical benchmark of prediction-market snapshots. Each record captures a market at time T: question, description, resolution criteria, probability, timestamp, outcome-token IDs (clob_token_ids), news context and snapshot order-book data.',
  why='It supplies the “what was known at T” half of every training example, and the token IDs that make a precise join possible.',
  responsibilities=['Load and profile the schema, timestamps, market metadata, news fields and token identifiers.','Flag duplicate records, missing data and fields whose timing is uncertain.','Produce a normalized sample and a written list of uncertainties that could block training.','Hand normalized clob_token_ids to the outcome-token join.'],
  resources=['Dataset: PolyBench','Python · pandas / Polars for loading and profiling','Contract: snapshot fields in DATA_SCHEMA.md']),
 'polymarket_history':dict(
  definition='Polymarket-v1 trade history: token / asset ID, condition ID, timestamp, trade price, trade size, market slug and outcome.',
  why='Trades are the only record of the market’s path: the price history before T (features) and the observed price near T + 6h (labels).',
  responsibilities=['Confirm which columns support historical price and volume reconstruction.','Document how a single trade maps to a specific market outcome (YES / NO token).','Provide normalized trades keyed by asset_id for the join and the label builder.','Expose sparsity, so illiquid markets are filtered rather than guessed.'],
  resources=['Dataset: Polymarket-v1','Python · pandas / Polars; Parquet for normalized trades','Contract: normalized-trade fields in DATA_SCHEMA.md']),
 'news_context':dict(
  definition='The news text attached to a market, with when it was published and how it relates to the market proposition. At serving time, it is the headline the user enters.',
  why='News is the variable under test. If a headline was not really available at T, any lift it shows is leakage, not signal.',
  responsibilities=['Separate genuinely timestamped headlines from context written or updated after the fact.','Classify timestamp reliability and attach a flag to each headline.','Pass only eligible headlines into the dataset and the NLP pipeline.','Document which news fields are safe to use at T.'],
  resources=['Source: PolyBench news-context fields','Manual sample review of timestamp reliability','Contract: news fields in DATA_SCHEMA.md']),
 'polymarket_live':dict(
  definition='A planned adapter to Polymarket’s live interfaces for market search, current price and whatever history they support.',
  why='Live Analyze needs a current market state, and it must be built the same way as the training features or the prediction is meaningless.',
  responsibilities=['Look up supported markets; return current probability and recent history.','Document rate limits and fields that are unavailable live.','Map live fields onto the training feature definitions (training / serving parity).','Fail clearly, so the demo can fall back to Historical Replay.'],
  resources=['Polymarket market, price and history interfaces where available','Python · Polymarket integration service (proposed)','Planned doc: API_CONTRACTS.md']),
 'contracts':dict(
  definition='The shared rules and scaffolding every component builds against: repository, dependencies, tests, linting, CI, data schemas and conventions.',
  why='Five people build separate pieces; contracts are what make them fit. Units, IDs or timestamps that disagree silently break everything downstream.',
  responsibilities=['Standardize UTC timestamps, normalized token IDs, probability units and percentage-point deltas (never relative percent).','Define the fields for snapshots, normalized trades, labels, market features, news features and predictions.','Define the combined market + news input shape without letting labels leak in as predictors.','Keep interfaces and model inputs / outputs documented across the exam break.'],
  resources=['DATA_SCHEMA.md with sample JSON / Parquet schemas','Python project structure, test setup, linting and CI','Planned docs: MASTER_PLAN.md, API_CONTRACTS.md'],
  note='No arrows on the map by design: it is cross-cutting, and every component depends on it.'),
 'token_join':dict(
  definition='The bridge between the two historical datasets: PolyBench clob_token_ids matched to Polymarket-v1 asset_id, at the level of individual outcome tokens.',
  why='It is the first feasibility question. If the join fails or covers too few independent events, the project must be reformulated before any modelling.',
  responsibilities=['Normalize token IDs and match each snapshot to the trades of exactly that outcome.','Resolve YES / NO mapping and duplicate matches explicitly.','Never fall back silently to fuzzy matching on market names or questions.','Produce a coverage funnel (match counts, rejected records, hand-checked examples), then turn the pilot into a repeatable, tested pipeline.'],
  resources=['Inputs: normalized PolyBench + Polymarket-v1','Python · pandas / Polars; tests for unmatched and ambiguous tokens','Planning thresholds: ≥ 5,000 examples and ≥ 1,000 events is strong; < 1,000 trustworthy examples means reformulate']),
 'label_reconstruction':dict(
  definition='The function that produces the target: the market’s probability around T + 6h, and the move from T in percentage points.',
  why='Markets rarely trade exactly at T + 6h. Without a careful, documented label the model learns from noise, or from the future.',
  responsibilities=['Find the outcome price near T + 6h: nearest valid trade within a tolerance, VWAP or volume-weighted median.','Return p_t, p_t6h, the delta, observed timestamp, offset, trade count and a label-quality rating.','Reject stale, illiquid or unsupported outcomes explicitly.','Support 1h / 24h horizon ablations while keeping six hours primary.'],
  resources=['Inputs: joined snapshots + timestamped trades','Configurable timestamp tolerances and label methods','Contract: label fields in DATA_SCHEMA.md']),
 'training_dataset':dict(
  definition='The curated, versioned Parquet dataset: one example per valid snapshot, with market state, eligible news, the six-hour label, event grouping and source provenance.',
  why='Every model, metric, replay fixture and paper table is built from it. If it cannot be rebuilt identically, no result can be trusted.',
  responsibilities=['Combine valid snapshots, labels and news metadata, with event IDs for event-disjoint splits.','Report raw-to-clean coverage, independent events, missingness, label quality and exclusions.','Build deterministically from a versioned manifest, so another developer regenerates the same data.','Export small verified fixtures and Historical Replay examples, keeping outcomes out of prediction inputs.'],
  resources=['Parquet + dataset manifests','Coverage and quality report','Paper: dataset and preprocessing methods section']),
 'prospective_log':dict(
  definition='A collector that records predictions and their inputs before outcomes are known, then attaches the later +1h / +6h / +24h observations as separate records.',
  why='It yields a clean evaluation set without historical-timestamp doubts or LLM contamination: the outcome did not exist when the prediction was made.',
  responsibilities=['Store immutable prediction-time inputs: headline, market, market state and model prediction.','Append later observed states as separate records; never overwrite inputs.','Track failures and missing observations.','Feed prospective records back to the Evaluation lab.'],
  resources=['PostgreSQL or equivalent (proposed)','Scheduled collection job'],
  note='Its sources (live market state and served predictions) are not drawn as edges; only its feedback into evaluation is.'),
 'market_features':dict(
  definition='Market-state signals built only from trades at or before T: price at T, momentum windows, volatility and recent volume.',
  why='They form the Market Only baseline, the bar news has to beat, and half of the fused model’s input.',
  responsibilities=['Compute price at T, available momentum windows (e.g. 15 min, 1 h, 6 h), volatility and recent volume.','Test that no feature uses a trade after T.','Keep order-book, spread and liquidity features missing and documented when they cannot be reconstructed; never fabricate them.','Emit a vector aligned by example ID.'],
  resources=['Python · pandas / NumPy','Leakage tests on feature timestamps']),
 'news_features':dict(
  definition='The NLP pipeline: a pinned, frozen pretrained text encoder that embeds the headline and the market proposition, plus relevance and optional stance features.',
  why='It turns text into model inputs without letting a modern model’s hindsight about historical events contaminate them.',
  responsibilities=['Relevance: does the headline concern this market? (embedding similarity).','Stance: does it support YES, contradict YES or stay neutral? (frozen NLI, optional).','Batch, cache and version outputs with consistent columns and explicit handling of missing text.','Leave stance out by default if manual review finds it unreliable.'],
  resources=['Hugging Face / Sentence Transformers (pinned encoder)','Frozen NLI model for stance','Manual inspection set (≥ 30 examples) for stance accuracy']),
 'baseline_models':dict(
  definition='The comparison models: Trivial (always FLAT / no significant move), Market Only (XGBoost) and News Only.',
  why='Without them there is no way to tell whether the fused model learned anything that news adds.',
  responsibilities=['Use event-disjoint train / validation / test splits, so related markets never cross the boundary.','Train on exactly the same eligible examples as the fused model.','Choose the significant-move threshold on training data only; keep the test set untouched.','Report significant-move AUPRC, direction Macro F1, class balance and split details.'],
  resources=['scikit-learn · XGBoost','Event IDs from the training dataset']),
 'fused_model':dict(
  definition='The core predictor: late-fusion XGBoost over the concatenated market and news feature vectors.',
  why='It tests the central hypothesis, that news carries information beyond what the market already shows.',
  responsibilities=['Predict the probability of a significant move and the direction (UP / FLAT / DOWN) over six hours.','Add magnitude with an uncertainty range only if evaluation supports it.','Save predictions, configuration and metrics for every run.','Stay simple: neural or cross-encoder fusion only after this shows real signal.'],
  resources=['XGBoost; PyTorch reserved for later neural experiments','Combined feature interface from Contracts','Planned doc: ML_SPEC.md']),
 'evaluation':dict(
  definition='Where every claim is tested: ablations, horizons, robustness, calibration and the final experimental report.',
  why='It decides what the project can honestly say. Everything in the dashboard and paper must trace back to its saved outputs.',
  responsibilities=['Compare Trivial, Market Only, News Only and Market + News on the same examples and splits.','Run 1h / 6h / 24h horizon ablations and error analysis by topic, liquidity and label quality.','Assess calibration on validation data and report reliability on held-out data.','Use fixed seeds, versioned inputs and machine-readable metrics; reconcile every published number.'],
  resources=['Reproducible experiment runner (train / evaluate command)','Metrics: AUPRC, AUROC, precision / recall, Macro F1, magnitude MAE, calibration','Planned doc: EXPERIMENTS.md']),
 'model_package':dict(
  definition='The frozen, versioned inference package: model weights, encoder version, preprocessing, feature schema, threshold and calibration.',
  why='It guarantees that what was evaluated offline is exactly what the API and Replay serve.',
  responsibilities=['Export the model and preprocessing behind a callable predict function with an explicit schema.','Test that predictions are identical after reloading.','Pin every artifact at the research freeze.','Verify parity between offline evaluation and API results.'],
  resources=['Versioned model artifacts + preprocessing configuration','Planned doc: MODEL_CARD.md']),
 'prediction_api':dict(
  definition='A FastAPI service that validates inputs and serves typed six-hour predictions.',
  why='It is the single door between the model and the product, and decides what users are allowed to see.',
  responsibilities=['Accept the documented feature inputs; return the supported outputs with model-version metadata.','Handle unavailable features safely and return useful errors.','Never present an unvalidated output as fact.','Be tested for model loading, latency, invalid input and external outages, with an offline fallback.'],
  resources=['Python · FastAPI','Planned doc: API_CONTRACTS.md; deployment runbook']),
 'replay_api':dict(
  definition='Backend endpoints for Historical Replay: fetch the snapshot at T, generate a prediction, then reveal the observed T + 6h outcome.',
  why='Replay is only convincing if the future is genuinely hidden when the prediction is made.',
  responsibilities=['Serve a historical snapshot containing only information available at T.','Run inference through the same model package as the live API.','Withhold the later outcome until the reveal request.','Prove with tests that hidden future data cannot reach inference.'],
  resources=['Replay fixtures from the training dataset','Python · FastAPI replay service (proposed)']),
 'live_analyze':dict(
  definition='The main product flow: choose a supported market, enter a headline, see the six-hour forecast and its caveats.',
  why='It is the experience the project statement describes, and shows what MarketMove is for.',
  responsibilities=['Search and select a supported market; show its current probability.','Accept a headline and request a prediction from the real API.','Display only outputs the model supports, with uncertainty and caveats.','Make clear it is not trading advice or automated betting.'],
  resources=['React / Next.js / Tailwind + a charting library (recommended, not locked)','Planned doc: DEMO_RUNBOOK.md'],
  note='A live extra: when capacity shrinks, Historical Replay and evaluation come first.'),
 'historical_replay':dict(
  definition='An interactive prediction-versus-reality story: freeze a market at T, forecast, fast-forward six hours, reveal what actually happened.',
  why='It turns “an AI says this might move the market” into “here is what it predicted, and here is what happened”, and it is the reliable demo mode.',
  responsibilities=['Show market selection, the historical snapshot and the prediction.','Run the six-hour fast-forward and reveal, marking direction and significance correct or incorrect.','Work from cached examples and local artifacts if live services fail.','Use real values, or label illustrative ones explicitly.'],
  resources=['Frontend + charting for the price-path animation','Cached replay fixtures and local model artifacts','Recorded backup walkthrough; DEMO_RUNBOOK.md']),
 'evaluation_ui':dict(
  definition='The “Does MarketMove actually work?” page.',
  why='It shows the evidence as it is, so viewers can judge the claims for themselves.',
  responsibilities=['Visualize saved Market Only, News Only and Market + News metrics.','Show sample counts, model versions and limitations next to every number.','Never imply stronger evidence than was evaluated.','Read from saved experiment outputs, not hand-typed numbers.'],
  resources=['Saved evaluation outputs + model metadata','Frontend charting']),
 'paper_showcase':dict(
  definition='The finish line: research paper, reproducible artifacts, presentation, demo reliability and CUCAI Q&A.',
  why='It is where the work is judged; every upstream component contributes a section, a figure or a demo.',
  responsibilities=['Run the research-freeze review: approve dataset and model versions, experiments, figures and known limitations.','Assemble the paper; reconcile terminology, figures, citations and claims.','Rehearse the demo and the technical Q&A.','Confirm the paper deadline and event dates, which are still provisional.'],
  resources=['Methods sections from the data, model, evaluation and deployment owners','Demo script, backup recordings and slides','Planned doc: MASTER_PLAN.md']),
}
node_data=[]
for (id,stage,x,y,title,subtitle,owner,epic,description,inputs,outputs,risk) in nodes:
    node_data.append(dict(id=id,stage=stage,x=x,y=y,title=title,subtitle=subtitle,owner=owner,epic=epic,description=description,inputs=inputs,outputs=outputs,risk=risk,guide=guides[id]))
assert set(guides)=={n['id'] for n in node_data}

def edge(a,b,carries,kind='data'):
    return {'id':f'{a}--{b}', 'from':a,'to':b, 'kind':kind, 'carries':carries}
edges=[
 edge('polybench','token_join','Snapshot outcome-token IDs (clob_token_ids)'),edge('polymarket_history','token_join','Trade asset_id values to match against'),
 edge('polymarket_history','label_reconstruction','Timestamped trades around T + 6h'),edge('token_join','label_reconstruction','Verified snapshot ↔ token links'),
 edge('token_join','training_dataset','Joined snapshots + valid / rejected counts'),edge('label_reconstruction','training_dataset','p(T + 6h), delta in points, label-quality fields'),
 edge('news_context','training_dataset','Eligible headlines + timestamp-reliability flag'),edge('training_dataset','market_features','Per-example price history at or before T'),
 edge('news_context','news_features','Eligible headline text + market proposition'),edge('training_dataset','news_features','Example IDs to align text features to'),
 edge('market_features','baseline_models','Market-only feature vector'),edge('news_features','baseline_models','News-only feature vector'),
 edge('market_features','fused_model','Market vector for late fusion'),edge('news_features','fused_model','News vector for late fusion'),
 edge('fused_model','evaluation','Saved predictions + run configuration'),edge('baseline_models','evaluation','Baseline predictions on the same examples'),
 edge('evaluation','model_package','Validated model choice, threshold and calibration'),edge('fused_model','model_package','Trained weights + preprocessing configuration'),
 edge('model_package','prediction_api','Pinned, loadable inference package'),edge('model_package','replay_api','The same package, for replay-safe inference'),
 edge('training_dataset','replay_api','Replay fixtures: state at T + withheld outcome'),edge('polymarket_live','prediction_api','Current state of the selected market','live'),
 edge('news_context','prediction_api','The headline a user enters','live'),edge('prediction_api','live_analyze','Typed prediction + version metadata'),
 edge('replay_api','historical_replay','Snapshot and prediction, then the reveal'),edge('evaluation','evaluation_ui','Saved metrics, sample sizes and model versions'),
 edge('evaluation_ui','paper_showcase','Comparison figures for the paper and talk'),edge('historical_replay','paper_showcase','Main demo + offline fallback'),
 edge('live_analyze','paper_showcase','Live demo segment'),edge('prospective_log','evaluation','Pre-outcome predictions + later observed outcomes','feedback')
]

node_map={
1:['contracts'],2:['contracts'],3:['polybench'],4:['polymarket_history'],5:['token_join'],6:['label_reconstruction'],7:['news_context'],
8:['token_join','training_dataset'],9:['label_reconstruction'],10:['training_dataset'],11:['market_features'],12:['baseline_models','evaluation'],13:['news_features'],14:['contracts','fused_model'],15:['training_dataset','evaluation'],
16:['training_dataset'],17:['news_features'],18:['fused_model'],19:['baseline_models','evaluation'],20:['contracts','paper_showcase'],
21:['training_dataset'],22:['news_features'],23:['news_features'],24:['evaluation'],25:['baseline_models','evaluation'],26:['fused_model'],27:['model_package'],28:['evaluation','paper_showcase'],
29:['training_dataset','replay_api'],30:['prospective_log'],31:['evaluation','label_reconstruction'],32:['evaluation'],33:['prediction_api'],34:['replay_api'],35:['historical_replay'],36:['evaluation_ui'],
37:['evaluation'],38:['evaluation'],39:['training_dataset'],40:['polymarket_live'],41:['model_package'],42:['live_analyze'],43:['historical_replay'],44:['paper_showcase'],
45:['training_dataset','paper_showcase'],46:['evaluation','paper_showcase'],47:['fused_model','paper_showcase'],48:['prediction_api','paper_showcase'],49:['historical_replay','paper_showcase'],50:['paper_showcase'],
51:['evaluation','paper_showcase'],52:['training_dataset','paper_showcase'],53:['prediction_api','replay_api'],54:['historical_replay','live_analyze'],55:['paper_showcase']
}
for t in tickets:
    idx=int(t['id'].split('-')[1]); t['nodeIds']=node_map[idx]

phases=[
 dict(id='P1',name='Data foundations',short='DATA',sprints=['S1','S2'],start='2026-11-07',end='2026-12-04',color='#83d9d4'),
 dict(id='P2',name='Core model',short='MODEL',sprints=['S3','S4','S5'],start='2026-12-05',end='2027-01-15',color='#c9b8ff'),
 dict(id='P3',name='Evaluation & product',short='PRODUCT',sprints=['S6','S7'],start='2027-01-16',end='2027-02-12',color='#dbe18b'),
 dict(id='P4',name='Paper & CUCAI',short='SHOWCASE',sprints=['S8','S9'],start='2027-02-13',end='2027-03-12',color='#ffc09f'),
]

# Release item title -> architectural node: a curated sprint-to-node mapping, not inferred "done" status.
sprint_data=[
 dict(id='S1',number=1,start='2026-11-07',end='2026-11-20',phase='P1',title='Prove the join',focus='Data feasibility & architecture',commitment='Normal',kind='discovery',summary='Confirm source schemas, token-level matching and whether trustworthy six-hour labels are possible before investing in models.',note='Go / no-go: continue only if source join and historical labels look viable.',deliverables=[
  dict(nodeId='contracts',title='Contracts take shape',description='Development setup, UTC conventions and common prediction schemas.'),
  dict(nodeId='token_join',title='First source bridge',description='Validate PolyBench outcome tokens against Polymarket-v1 asset IDs.'),
  dict(nodeId='label_reconstruction',title='Price ground truth pilot',description='Reconstruct approximately ten valid T → T+6h examples.'),
  dict(nodeId='news_context',title='Temporal news audit',description='Separate valid timestamped headlines from retrospective context.')]),
 dict(id='S2',number=2,start='2026-11-21',end='2026-12-04',phase='P1',title='Ship dataset v0',focus='Clean dataset & market-only baseline',commitment='High priority',kind='critical',summary='Make raw-to-clean data reproducible, establish leakage-safe market-only baseline, and decide whether the dataset is viable.',note='November 30 is an internal checkpoint, not the entire sprint end.',deliverables=[
  dict(nodeId='training_dataset',title='Reproducible Parquet v0',description='Audited joined examples, six-hour labels and rejection accounting.'),
  dict(nodeId='market_features',title='Market state vector',description='Momentum, volatility and volume using information at or before T.'),
  dict(nodeId='baseline_models',title='First trustworthy baseline',description='Trivial and market-only XGBoost comparison on event-disjoint splits.'),
  dict(nodeId='news_features',title='Frozen encoder pilot',description='Headline / market embeddings and relevance diagnostics.')]),
 dict(id='S3',number=3,start='2026-12-05',end='2026-12-18',phase='P2',title='First fused loop',focus='First integrated ML prototype',commitment='Very light',kind='reduced',summary='Complete a tiny end-to-end market + news → prediction → actual comparison, with all committed work finished by December 9.',note='December 10–22 is protected exam time. Do not assign normal sprint velocity.',deliverables=[
  dict(nodeId='training_dataset',title='Small verified fixture',description='A consistent sample with market, headline and later outcome.'),
  dict(nodeId='news_features',title='Aligned text features',description='Frozen news features matched by example ID.'),
  dict(nodeId='fused_model',title='Fused XGBoost pilot',description='First small market-plus-news predictions.'),
  dict(nodeId='evaluation',title='Pilot ablation',description='Compare variants without overstating significance.')]),
 dict(id='S4',number=4,start='2026-12-19',end='2027-01-01',phase='P2',title='Protected break',focus='Exams & winter break',commitment='No mandatory work',kind='break',summary='No mandatory tickets, meetings or sprint-velocity expectations. Optional exploration is explicitly uncommitted.',note='Dec 19–22 overlaps exams; Dec 23–Jan 3 is winter break. Optional work is not a deliverable.',deliverables=[]),
 dict(id='S5',number=5,start='2027-01-02',end='2027-01-15',phase='P2',title='Complete the model',focus='Full ML implementation',commitment='Normal from Jan 4',kind='build',summary='Promote the pilot to deterministic full-dataset modeling, official baselines, a complete fused model and a reloadable inference package.',note='Modeling resumes at normal capacity January 4; investigate news lift, do not assume it.',deliverables=[
  dict(nodeId='training_dataset',title='Stable dataset v1',description='Versioned manifests, filters, event IDs and regeneration steps.'),
  dict(nodeId='news_features',title='Batch semantic pipeline',description='Caching, frozen encoder and optional verified NLI stance.'),
  dict(nodeId='fused_model',title='Complete fused model',description='Significant move and direction predictions with saved results.'),
  dict(nodeId='model_package',title='Loadable model artifacts',description='Pinned preprocessing and deterministic inference.')]),
 dict(id='S6',number=6,start='2027-01-16',end='2027-01-29',phase='P3',title='Make it demonstrable',focus='Evaluation & Historical Replay',commitment='Normal',kind='build',summary='Stress-test the model, build a replay-safe prediction API, and make historical prediction versus actual movement interactive.',note='January 29 target: a functional Historical Replay, not simulated accuracy.',deliverables=[
  dict(nodeId='evaluation',title='Error & horizon studies',description='1h / 6h / 24h ablations plus failure mode analysis.'),
  dict(nodeId='replay_api',title='Future-safe replay service',description='Separate T snapshot from later outcome reveal.'),
  dict(nodeId='historical_replay',title='Interactive replay',description='Market selection, prediction, six-hour fast forward and actual reveal.'),
  dict(nodeId='evaluation_ui',title='Baseline dashboard',description='Show model comparison with sample sizes and versions.')]),
 dict(id='S7',number=7,start='2027-01-30',end='2027-02-12',phase='P3',title='Freeze what works',focus='Final experiments & model freeze',commitment='High priority',kind='critical',summary='Evaluate calibration and robustness, freeze research artifacts, and connect supported live Polymarket markets without sacrificing replay reliability.',note='February 12 is the model/research freeze; Historical Replay outranks optional live polish.',deliverables=[
  dict(nodeId='evaluation',title='Final experimental evidence',description='Calibration, ablation results, independent test and documented limitations.'),
  dict(nodeId='model_package',title='Pinned release artifacts',description='Model, preprocessing, thresholds and offline/API parity.'),
  dict(nodeId='polymarket_live',title='Live market adapter',description='Market lookup, current probability and supported history.'),
  dict(nodeId='live_analyze',title='News + market interface',description='Select a market and input a headline for a real model response.')]),
 dict(id='S8',number=8,start='2027-02-13',end='2027-02-26',phase='P4',title='Tell the story',focus='Paper writing & demo polish',commitment='Flexible',kind='reduced',summary='Turn frozen experiment artifacts into a reproducible paper and dependable demonstration during Reading Week.',note='Provisional late-February paper submission target; CUCAI deadline not confirmed.',deliverables=[
  dict(nodeId='paper_showcase',title='Research paper draft',description='Dataset, model, experiment and limitation sections with reconciled figures.'),
  dict(nodeId='historical_replay',title='Reliable demo walkthrough',description='Polished flows, screen recording and fallback.'),
  dict(nodeId='prediction_api',title='Deployment runbook',description='Startup, API, failure handling and fallback documentation.')]),
 dict(id='S9',number=9,start='2027-02-27',end='2027-03-12',phase='P4',title='Showcase ready',focus='CUCAI readiness & reliability',commitment='Event-dependent',kind='release',summary='Independently challenge research claims, reproduce artifacts, harden the deployment and rehearse the CUCAI demonstration.',note='The final schedule depends on confirmed paper and showcase dates.',deliverables=[
  dict(nodeId='evaluation',title='Claims reviewed',description='A second pass on leakage, statistical assumptions and comparison validity.'),
  dict(nodeId='prediction_api',title='Failure-tested services',description='Invalid inputs, external outage and inference recovery paths.'),
  dict(nodeId='paper_showcase',title='Presentable technical story',description='Reproducible artifacts, demo script and coordinated Q&A.')])
]

for s in sprint_data:
    s['ticketIds']=[t['id'] for t in tickets if t['sprint']==s['id']]
    s['nodeIds']=list(dict.fromkeys([n for t in tickets if t['sprint']==s['id'] for n in t['nodeIds']] + [d['nodeId'] for d in s['deliverables']]))

for n in node_data:
    n['sprints']=[s['id'] for s in sprint_data if n['id'] in s['nodeIds']]
    n['ticketIds']=[t['id'] for t in tickets if n['id'] in t['nodeIds']]

team=[
 dict(name='Nick',role='Historical data engineering',color='#86d5f7',scope='Token joins · labels · dataset QA'),
 dict(name='Kristina',role='Market modeling & evaluation',color='#d0e58a',scope='Baselines · leak-safe splits · metrics'),
 dict(name='Munadir',role='Fused ML & backend',color='#ceb7ff',scope='XGBoost fusion · artifacts · APIs'),
 dict(name='Ryan',role='NLP & frontend',color='#ffb99a',scope='Embeddings · stance · Replay / UI'),
 dict(name='Luke',role='Project manager',color='#d0d9ee',scope='Contracts · research review · CUCAI'),
]
epics=[
 dict(id='E0',name='Project Foundation',owner='Luke + Kristina'),
 dict(id='E1',name='Historical Data Engineering',owner='Nick'),
 dict(id='E2',name='Market Features & Evaluation',owner='Kristina'),
 dict(id='E3',name='News Understanding',owner='Ryan'),
 dict(id='E4',name='Fused Predictive ML',owner='Munadir'),
 dict(id='E5',name='Backend & Live Integration',owner='Munadir'),
 dict(id='E6',name='Historical Replay & Frontend',owner='Ryan'),
 dict(id='E7',name='Research & CUCAI',owner='Luke + team'),
]
gates=[
 dict(date='2026-11-20',sprint='S1',label='Join feasibility',question='Can the token join and 6h future-price reconstruction be trusted?',nodeIds=['token_join','label_reconstruction']),
 dict(date='2026-11-30',sprint='S2',label='Dataset + baseline',question='Is there a trustworthy training dataset and event-aware market baseline?',nodeIds=['training_dataset','baseline_models']),
 dict(date='2026-12-09',sprint='S3',label='Pre-exam demo',question='Can the entire feature-to-prediction path run without leakage?',nodeIds=['news_features','fused_model']),
 dict(date='2027-01-15',sprint='S5',label='Core model',question='Does Market + News appear to improve on Market Only?',nodeIds=['fused_model','evaluation']),
 dict(date='2027-01-29',sprint='S6',label='Historical Replay',question='Can we reveal real historical outcomes after replay-safe inference?',nodeIds=['replay_api','historical_replay']),
 dict(date='2027-02-12',sprint='S7',label='Research freeze',question='Are experiments reproducible and sufficiently complete?',nodeIds=['evaluation','model_package']),
 dict(date='2027-02-27',dateLabel='≈ Feb 27, 2027',sprint='S8',label='Proposed paper target',question='Is the submission deadline confirmed and the paper evidence-ready?',nodeIds=['paper_showcase'],provisional=True,confirmation='Confirm the actual CUCAI paper deadline.'),
 dict(date='2027-03-01',dateLabel='Early March 2027',sprint='S9',label='Proposed CUCAI showcase',question='Are the event dates confirmed, and are the demo, fallback and Q&A rehearsed?',nodeIds=['paper_showcase','historical_replay'],provisional=True,confirmation='Confirm the CUCAI event dates.'),
]

project={
 'meta':{'name':'MarketMove','description':'Architectural roadmap explorer for the Western AI MarketMove project.','period':'November 2026 – March 2027','plannedAt':'2026-11-07','horizonHours':6,'architectureWidth':1330,'architectureHeight':616,'status':'Planning visualization — not a live delivery tracker','sourcePolicy':'Revised November 7, 2026 roadmap controls sprint dates; older foundation outline controls project architecture and scientific constraints.'},
 'stages':stages,'phases':phases,'sprints':sprint_data,'team':team,'epics':epics,'nodes':node_data,'edges':edges,'tickets':tickets,'gates':gates,
 'principles':[
  {'title':'Feasibility before complexity','body':'Validate the PolyBench → Polymarket-v1 join and labels before training a fused model.'},
  {'title':'Information must exist at T','body':'No future prices, later news, final resolutions or hindsight labels may enter model features.'},
  {'title':'Evidence before claims','body':'Test Market Only vs. News Only vs. Market + News on held-out events; do not assume news adds value.'},
  {'title':'Research first, polish second','body':'When capacity shrinks, protect data correctness, evaluation and Historical Replay ahead of live extras.'},
 ],
 # Open scientific risks from SOURCE_NOTES / PROJECT_FOUNDATION; rendered verbatim so they stay visible.
 'limitations':[
  {'title':'Dataset join unverified','body':'PolyBench clob_token_ids ↔ Polymarket-v1 asset_id coverage and mapping reliability are not yet measured.'},
  {'title':'Timestamp trust','body':'Historical news may be retrospective; true availability at T must be audited before any feature is used.'},
  {'title':'Event leakage','body':'Correlated markets from the same event must never straddle train and test splits.'},
  {'title':'No guaranteed news lift','body':'Market + News beating Market Only is the research question, not an assumed result.'},
  {'title':'Magnitude is conditional','body':'Primary output is significant move + direction at T+6h; magnitude is shown only if evaluation supports it.'},
  {'title':'Research dates provisional','body':'The ≈ Feb 27 paper target and early-March CUCAI showcase need confirmation; only the Feb 12 freeze is an internal fixed target.'},
 ],
 # Simplified product layer: columns of blocks, flowing left to right. Every node belongs to exactly one block;
 # block-to-block connections are derived from edges[] at runtime, so this only curates grouping and order.
 'overview':{'columns':[
  [dict(id='markets',title='Market history',icon='chart',stage='signals',nodeIds=['polybench','polymarket_history']),
   dict(id='news',title='News',icon='news',stage='signals',nodeIds=['news_context']),
   dict(id='live',title='Live markets',icon='pulse',stage='signals',nodeIds=['polymarket_live'])],
  [dict(id='dataset',title='Training data',icon='database',stage='foundations',nodeIds=['contracts','token_join','label_reconstruction','training_dataset','prospective_log'])],
  [dict(id='features',title='Features',icon='layers',stage='intelligence',nodeIds=['market_features','news_features']),
   dict(id='model',title='Forecast model',icon='spark',stage='intelligence',nodeIds=['baseline_models','fused_model'])],
  [dict(id='evaluation',title='Evaluation',icon='target',stage='intelligence',nodeIds=['evaluation']),
   dict(id='serving',title='Prediction API',icon='server',stage='experience',nodeIds=['model_package','prediction_api','replay_api'])],
  [dict(id='replay',title='Historical Replay',icon='rewind',stage='experience',nodeIds=['historical_replay']),
   dict(id='research',title='Paper & CUCAI',icon='doc',stage='experience',nodeIds=['evaluation_ui','paper_showcase']),
   dict(id='live_app',title='Live Analyze',icon='bolt',stage='experience',nodeIds=['live_analyze'])],
 ]},
}

out=ROOT/'src/data/project.json'
out.write_text(json.dumps(project,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('generated',out,'with',len(tickets),'tickets,',len(node_data),'nodes,',len(edges),'edges')
