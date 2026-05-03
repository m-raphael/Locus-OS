# NLP Phase A · Crate scaffold + POS-tagging + NER

Parent: [`nlp-stack.md`](./nlp-stack.md)
Status: **ready to break into backlog rows**
Owner: TBD
Estimated size: 5 backlog tasks (A.1 – A.5), ~3–4 days end-to-end.

> **Refinement of the parent plan.** Phase A switches the local ML runtime
> from `rust-bert` (libtorch) to **`candle`** + ONNX Runtime via `ort`.
> Candle is pure-Rust, has first-class Apple Silicon (Metal) support, and
> avoids shipping libtorch (~500 MB) to every dev. The parent plan §3 is
> superseded for the local pipeline implementation only; the trait shape
> and Neo4j schema are unchanged.

---

## A.0 · Goal

After Phase A is merged:

1. A new crate **`locus-nlp`** exists with a stable public API
   (`NlpPipeline` trait + `NlpDoc` types) that the rest of the workspace
   can depend on.
2. A **`LocalPipeline`** implementation populates `tokens` (with POS tags)
   and `entities` (with NER labels) for arbitrary English text, fully
   offline, on CPU, in <150 ms p95 for an utterance ≤ 30 tokens on an M1.
3. Every freeform user intent that flows through `commands::parse_intent`
   carries an attached `NlpDoc` end-to-end (parser → command → GraphQL).
4. The GraphQL `parseIntent` mutation returns the `NlpDoc` so the UI can
   display detected entities (highlighting / chips) in a later phase.
5. A golden test suite locks the behaviour of three reference utterances.

Phases B–F (keywords, embeddings, coref, entity linking, prompt engineering)
build on top of this scaffold without touching the trait shape.

---

## A.1 · Crate skeleton (`locus-nlp`)

### Layout

```
crates/locus-nlp/
  Cargo.toml
  src/
    lib.rs              # public API, factory
    pipeline.rs         # NlpPipeline trait + NlpDoc structs
    local.rs            # LocalPipeline (candle + ort)
    nim.rs              # NimPipeline stub (returns NotImplemented in A)
    models/
      mod.rs            # model loading + cache directory resolution
  tests/
    golden.rs
    fixtures/
      open_slack_with_sarah.json
      remind_me_friday.json
      summarise_doc_for_anna.json
```

### Cargo.toml (target)

```toml
[package]
name = "locus-nlp"
version = "0.1.0"
edition = "2021"

[dependencies]
async-trait = "0.1"
serde       = { version = "1", features = ["derive"] }
serde_json  = "1"
thiserror   = "1"
tokio       = { version = "1", features = ["sync", "fs"] }
tracing     = "0.1"

# Local pipeline
candle-core         = "0.7"
candle-transformers = "0.7"
tokenizers          = "0.20"
ort                 = { version = "2.0.0-rc.4", default-features = false, features = ["load-dynamic"] }

# Cache dir
directories = "5"
sha2        = "0.10"
reqwest     = { version = "0.12", features = ["rustls-tls", "stream"], default-features = false }

[features]
default = []
# Bundled models embedded via include_bytes (release builds). Off by default
# during development to keep target/ small.
bundled-models = []
```

### Public surface (`pipeline.rs`)

```rust
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

#[derive(Debug, thiserror::Error)]
pub enum NlpError {
    #[error("model not loaded: {0}")] ModelMissing(String),
    #[error("inference failed: {0}")] Inference(String),
    #[error("not implemented in this pipeline")] NotImplemented,
}

pub type Result<T> = std::result::Result<T, NlpError>;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Token {
    pub start: usize,         // byte offset in source text
    pub end:   usize,
    pub surface: String,
    pub lemma:   Option<String>,
    pub pos:     PosTag,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum PosTag {
    Noun, Verb, Adj, Adv, Pron, Det, Prep, Conj, Num, Punct, Other,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Entity {
    pub start: usize,
    pub end:   usize,
    pub text:  String,
    pub label: EntityLabel,
    pub score: f32,
    pub linked_id: Option<String>,   // populated in Phase E
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum EntityLabel { Person, Org, Loc, Time, Date, Money, Product, Misc }

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct NlpDoc {
    pub text:     String,
    pub tokens:   Vec<Token>,
    pub entities: Vec<Entity>,
    pub keywords: Vec<Keyword>,           // Phase B
    pub coref:    Vec<CorefChain>,        // Phase D
    pub embedding: Option<Vec<f32>>,      // Phase C
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Keyword     { pub term: String, pub score: f32 }

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct CorefChain  { pub head: String, pub mention_spans: Vec<(usize, usize)> }

#[async_trait]
pub trait NlpPipeline: Send + Sync {
    async fn analyze(&self, text: &str) -> Result<NlpDoc>;
    async fn embed(&self, text: &str) -> Result<Vec<f32>> { Err(NlpError::NotImplemented) }
}
```

### Factory (`lib.rs`)

```rust
pub fn pipeline() -> std::sync::Arc<dyn NlpPipeline> {
    // Phase A: always Local. NimPipeline is wired in Phase F.
    std::sync::Arc::new(local::LocalPipeline::new_default())
}
```

---

## A.2 · `LocalPipeline` — POS tagging

### Model

- **Distilled BERT POS tagger**, ONNX-exported.
- Source: `vblagoje/bert-english-uncased-finetuned-pos` (CC-BY-4.0,
  Apache-2.0-compatible) → exported to ONNX via Optimum, INT8-quantised.
- ~50 MB on disk. Cached at `$XDG_CACHE_HOME/locus/models/pos.onnx`.

### Loading

- On first call, `LocalPipeline::new_default()` checks the cache dir.
- If the file is missing or its SHA-256 doesn't match the bundled
  `models/manifest.json`, download from a GitHub Releases asset on the
  Locus repo (we host the ONNX so we don't depend on HuggingFace uptime).
- Loaded into an `ort::Session` once; the `LocalPipeline` holds an `Arc`.

### Inference path

1. Tokenise with WordPiece (`tokenizers` crate, vocab bundled).
2. Run `ort::Session::run` to get logits per token.
3. Argmax → UPOS tag string → map to our `PosTag` enum.
4. Reassemble subword pieces back into surface tokens; carry the head
   piece's tag forward.

### Performance budget

- ≤ 30 ms p95 for 30-token input on M1 CPU.
- ≤ 100 ms p95 cold (first call after process start).
- Heap residency ≤ 80 MB after warm-up.

---

## A.3 · `LocalPipeline` — NER

### Model

- **Distilled BERT NER** fine-tuned on OntoNotes-5 (gives PERSON, ORG,
  LOC, DATE, TIME, MONEY, PRODUCT, etc — richer than CoNLL-2003).
- Source: `dslim/distilbert-NER` re-fine-tuned on OntoNotes; ONNX +
  INT8 quantised. ~65 MB.
- Cached at `$XDG_CACHE_HOME/locus/models/ner.onnx`.

### Inference path

Same as POS, but:

- Output labels are BIO-encoded (`B-PER`, `I-PER`, `O`, ...).
- Decoder: walk the label sequence, accumulate consecutive `B-X`/`I-X`
  spans into one `Entity`, take the mean of the per-token softmax
  confidences as `Entity.score`.
- Drop entities with `score < 0.5`.

### Mapping to `EntityLabel`

| OntoNotes tag | `EntityLabel` |
|---|---|
| PERSON | Person |
| ORG, NORP | Org |
| GPE, LOC, FAC | Loc |
| DATE | Date |
| TIME | Time |
| MONEY, PERCENT, QUANTITY | Money |
| PRODUCT, WORK_OF_ART | Product |
| _everything else_ | Misc |

---

## A.4 · Pipeline integration

### Where the call happens

`src-tauri/src/commands.rs::parse_intent`:

```rust
#[tauri::command]
pub async fn parse_intent(
    db: State<'_, AppDb>,
    nlp: State<'_, AppNlp>,                   // NEW
    input: String,
) -> Result<ParseIntentResult, String> {
    let parsed   = locus_parser::parse(&input);
    let nlp_doc  = nlp.0.analyze(&input).await.map_err(|e| e.to_string())?;
    let result   = orchestrate(parsed, &nlp_doc, &db.0).await?;
    Ok(ParseIntentResult { result, nlp: nlp_doc })
}
```

`src-tauri/src/lib.rs` setup block adds:

```rust
let nlp = locus_nlp::pipeline();
app.manage(commands::AppNlp(nlp));
```

`commands.rs`:

```rust
pub struct AppNlp(pub Arc<dyn locus_nlp::NlpPipeline>);
```

### Orchestrator changes

`crates/locus-agent/src/orchestrator.rs::orchestrate` gains a borrow of
`&NlpDoc` and uses entities to enrich Space metadata:

- A `Person` entity → tag the new Space with `participants[]`.
- A `Date` / `Time` entity → tag the new Space with `scheduled_at`.
- An `Org` / `Product` entity → tag the new Space with `topic_tags[]`.

These are graph properties only in Phase A — Phase E will promote them
into linked `:Entity` nodes.

### GraphQL surface

`src-tauri/src/gql.rs::ParseIntentResult` gains an `nlp: NlpDoc` field
exposed as a GraphQL object (derive `async_graphql::SimpleObject` on the
DTO mirrors). No new mutation needed.

---

## A.5 · Test suite

### Golden tests

Three reference utterances; each has a JSON fixture with the expected
entities (POS is asserted only at the spot-check level — full POS
sequences would be too brittle).

| Fixture | Utterance | Expected entities |
|---|---|---|
| `open_slack_with_sarah.json` | "open Slack with Sarah at 3pm" | `Org(Slack)`, `Person(Sarah)`, `Time(3pm)` |
| `remind_me_friday.json` | "remind me to call mum on Friday" | `Person(mum)` _or none_, `Date(Friday)` |
| `summarise_doc_for_anna.json` | "summarise the Q2 report for Anna" | `Person(Anna)`, optional `Misc(Q2 report)` |

A test passes if every expected entity is present **with the correct
label** (text match is case-insensitive, `score >= 0.5`). Extra entities
are allowed (we don't want false-fail flake when the model evolves).

### Smoke benchmark

A `cargo test --release nlp_bench` that asserts:

- Cold first-call latency  < 1 s.
- Warm  p95 latency        < 150 ms over 50 iterations of the 3 fixtures.

If these regress, fail the test (so we notice before merging a model
swap that destroys responsiveness).

### Headless CI

CI runs `cargo test -p locus-nlp -- --test-threads=1` with
`LOCUS_MODEL_DIR` pointed at a checked-in fixture dir to skip the
download path. The download path is exercised by a separate manual
`cargo test -p locus-nlp --features download-test` job.

---

## Backlog rows (drop into the CSV)

| Task ID | Task Name | Spec | Acceptance Criteria | API | DB | Frontend | Priority | Phase |
|---|---|---|---|---|---|---|---|---|
| **NLP-A.1** | Scaffold `locus-nlp` crate | Create the crate skeleton from §A.1 with the trait, `NlpDoc` types, `NimPipeline` stub returning `NotImplemented`, and a `LocalPipeline::new_default()` that loads no models yet (returns empty `NlpDoc`). Add to workspace `Cargo.toml`. | `cargo check -p locus-nlp` is green; `cargo test -p locus-nlp` runs at least one trait-roundtrip test; no other crate's behaviour changes. | — | — | — | P0 | A |
| **NLP-A.2** | POS tagger via ONNX | Implement §A.2: cache-dir model loader, WordPiece tokeniser, ONNX session, subword reassembly, UPOS→`PosTag` mapping. | `analyze()` returns ≥ one `Token` per surface word for the three fixtures with non-`Other` POS tags ≥ 90 % of the time; warm p95 ≤ 30 ms on M1. | — | — | — | P0 | A |
| **NLP-A.3** | NER via ONNX | Implement §A.3: BIO decoder, score thresholding, OntoNotes→`EntityLabel` mapping. | All three golden fixtures pass; warm p95 ≤ 80 ms on M1; entities below score 0.5 are dropped. | — | — | — | P0 | A |
| **NLP-A.4** | Wire `NlpDoc` through `parse_intent` | §A.4: Tauri state, command signature change, orchestrator borrows `&NlpDoc`, GraphQL `ParseIntentResult` exposes `nlp`. | A GraphiQL query for `parseIntent(input: "open Slack with Sarah at 3pm")` returns an `nlp.entities` array containing the three expected entities. Existing Tauri callers compile unchanged or are updated in the same diff. | GraphQL `ParseIntentResult.nlp: NlpDoc!` | New properties on `:Space` (`participants`, `scheduled_at`, `topic_tags`) — written by orchestrator, no migration | none in A (consumed in a later phase) | P0 | A |
| **NLP-A.5** | Golden + benchmark tests | §A.5: three JSON fixtures, golden runner, release-mode smoke benchmark, CI fixture-dir override. | `cargo test -p locus-nlp` passes locally and in CI; benchmark fails the build if cold ≥ 1 s or warm p95 ≥ 150 ms. | — | — | — | P1 | A |

Dependencies: A.1 → A.2 → A.3 → A.4. A.5 can start after A.3 (it gates merge).

---

## Risks specific to Phase A

- **Model hosting.** GitHub Releases assets cap at 2 GB but per-file at
  ~2 GB; our two ONNX files combined are ~115 MB so we're fine. Mirror
  to a second bucket if download flakiness shows up.
- **Quantisation drift.** INT8 quantised models occasionally mislabel
  rare proper nouns. The golden tests use common names; we accept this
  trade-off for the latency budget.
- **ort + Apple Silicon.** `ort` 2.0-rc loads dynamic ORT; on macOS we
  bundle `libonnxruntime.dylib` via `cargo:rustc-link-search` in
  `build.rs`. Fallback: switch to the static `ort` feature (larger binary
  but no runtime path issue).
- **Token alignment.** WordPiece splits "Slack" into one piece but "3pm"
  into two; the decoder must merge them or NER drops "3pm". Unit-tested.

---

## Out of scope for Phase A (deferred to later phases)

- Lemma population on `Token` (POS only — lemma needs a separate model).
- Keyword extraction, embeddings, coref, entity linking, prompt
  engineering — each gets its own phase.
- UI rendering of detected entities (Sycamore work, scheduled with the
  Space-detail redesign).
- Multilingual support — English only; the model is English-uncased.
- Auto-redownload on model version bump beyond the SHA-mismatch path.
