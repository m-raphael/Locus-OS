# Locus-OS · NLP Stack Plan

Status: **draft / not yet sequenced into a sprint**.
Audience: implementer + reviewer. Optimised for being read top-to-bottom in
one pass before the work is broken into Obsidian backlog rows.

## 1. Why this matters for Locus

Locus parses freeform user intents into Spaces, Flows, and Modules. Today
that parsing is keyword-driven (`locus-parser`) with optional LLM rewrite
through NIM. To reach the S2+ vision — context-aware Spaces, ambient
suggestion, durable memory — we need richer linguistic structure on every
incoming utterance and on every Memory we store. The seven NLP capabilities
below are the minimum to build that structure once and reuse it everywhere
(parser, agent router, memory recall, graph enrichment).

## 2. Capability map

| # | Capability | What it gives Locus | Where it plugs in |
|---|------------|---------------------|-------------------|
| 1 | **POS-tagging** | Word-level grammatical tags. Foundation for the others. | `locus-parser` preprocessing |
| 2 | **NER** | People, places, orgs, dates, products in user input. | Intent → Space metadata, Memory facets |
| 3 | **Keyword extraction** | Topical anchors per utterance / per Memory. | Memory tags, Space search, recall ranking |
| 4 | **Coreference resolution** | "it / that / them" → concrete entity. | Multi-turn agent dialogue, simulation prompts |
| 5 | **Entity linking** | Mentioned entities → canonical IDs (Wikidata / internal). | Graph edges in Neo4j, dedup of Memory subjects |
| 6 | **Word embeddings** | Dense vectors for semantic similarity. | Memory recall, Space suggestion, plugin discovery |
| 7 | **Prompt engineering** | Structured prompts for the LLM agent layer. | `locus-agent` orchestrator + NIM calls |

These are dependent in roughly that order: POS / NER feed everything else;
embeddings unlock recall; prompt engineering wraps the lot when calling NIM.

## 3. Architecture

A new crate **`crates/locus-nlp`** owns all of this. It exposes one public
trait, plus typed result structs:

```rust
#[async_trait]
pub trait NlpPipeline: Send + Sync {
    async fn analyze(&self, text: &str) -> Result<NlpDoc>;
    async fn embed(&self, text: &str) -> Result<Vec<f32>>;
}

pub struct NlpDoc {
    pub tokens:        Vec<Token>,        // surface, lemma, pos
    pub entities:      Vec<Entity>,       // span, label, linked_id
    pub keywords:      Vec<Keyword>,      // term, score
    pub coref_chains:  Vec<CorefChain>,   // mention spans → head entity
    pub embedding:     Vec<f32>,          // sentence-level
}
```

Two implementations behind the trait:

- **`LocalPipeline`** — default, fully offline, uses `rust-bert` /
  `rust-tokenizers` with quantised models (DistilBERT-NER, MiniLM-L6 for
  embeddings, an English POS tagger from the `flair`/`stanza` ONNX export).
  Loaded once at startup, sits behind an `Arc` so all callers share weights.
- **`NimPipeline`** — opt-in, uses NVIDIA NIM endpoints for NER + embeddings
  when `NVIDIA_API_KEY` is set. Falls back to `LocalPipeline` for any call
  that fails or times out (>1 s).

A thin `pipeline()` factory in `locus-nlp` picks one based on env, exactly
mirroring how `locus-agent::orchestrator` already chooses NIM vs keyword.

### Where the data lives in Neo4j

Nodes and edges to add (mirrored in a new `0002_nlp.cypher` migration):

```
(:Entity { id, canonical, kind, wikidata_id })
(:Keyword { term })
(:Memory) -[:MENTIONS]-> (:Entity)
(:Memory) -[:TAGGED_WITH]-> (:Keyword)
(:Space)  -[:ABOUT]-> (:Entity)
```

`Memory.embedding` becomes a `LIST<FLOAT>` property; we add a
`vector.index('memory_emb', 'Memory', 'embedding', 384, 'cosine')` so
recall is a single Cypher call.

## 4. Phased rollout

Each phase is a single committable unit, ordered so we can stop at any
phase and still have a working system.

### Phase A — crate scaffolding & POS/NER

- New crate `locus-nlp` with the trait, structs, and `LocalPipeline` doing
  POS-tagging + NER only.
- Wire into `locus-parser`: every parsed intent attaches an `NlpDoc`.
- Tests: golden cases for "open Slack with Sarah at 3pm" (verifies PERSON,
  ORG, TIME spans).

### Phase B — Keyword extraction

- Add KeyBERT-style extractor on top of the existing embedder. (Same MiniLM
  weights, no extra download.)
- Persist keywords to `Memory.tags` and the `:Keyword` graph layer.
- Update `search_memories` GraphQL field to optionally filter by keyword.

### Phase C — Embeddings + vector recall

- `embed()` exposed on the trait; `Memory.embedding` populated on store.
- New `0002_nlp.cypher` migration adds the Neo4j vector index.
- New GraphQL field `recallMemories(query: String, k: Int): [Memory!]!`
  uses the cosine index for top-K.
- Replace the keyword-only fallback in `locus-agent::orchestrator` with
  vector recall when the embedder is available.

### Phase D — Coreference resolution

- Add a coref module (port of `neuralcoref` or distilled student model).
  This one is the most expensive in CPU; gate behind a feature flag
  `--features coref` so we can ship A–C first.
- Used inside `locus-agent` to rewrite multi-turn user input before it is
  sent to NIM ("close it" → "close the Figma window").

### Phase E — Entity linking

- Lookup table seeded from Wikidata dumps for the top 100k entities,
  bundled as a quantised FAISS index inside the app resources.
- Linker matches NER spans → Wikidata QIDs; falls back to "create new
  internal :Entity" if no candidate scores above threshold (0.6 cosine).
- Adds `(:Entity)-[:SAME_AS { source: 'wikidata' }]->(:Entity)` so we keep
  provenance.

### Phase F — Prompt engineering layer

- Move all NIM prompt assembly out of `locus-agent::orchestrator` into a
  `locus-nlp::prompts` module with one function per use case
  (`route_intent`, `summarise_memory`, `propose_next_space`, ...).
- Each prompt is a typed builder that takes the relevant `NlpDoc` fields
  so we never hand the LLM a raw string when we have structured context.
- Add a `prompts/` directory with `.md` templates loaded via `include_str!`
  so non-Rust contributors can iterate on wording without rebuilding.
- Snapshot tests: every prompt builder has a golden `.txt` to catch
  accidental phrasing changes.

## 5. Non-goals (for this plan)

- No fine-tuning. Use pre-trained weights as-is.
- No GPU dependency. Everything runs on CPU; NIM is the cloud option.
- No multilingual support in the first pass — English only.
- No live model swapping at runtime; choice is made at startup.

## 6. Risks & open questions

- **Binary size.** rust-bert + ONNX models add ~300 MB. We may need to
  download on first launch instead of bundling.
- **Cold start.** Loading every model takes 2–4 s. Need a splash state in
  the Tauri shell, or lazy-load per capability.
- **Privacy.** NIM mode sends user text off-device. Must be explicit
  opt-in with a clear visual indicator in the UI and a per-Space override.
- **Coref licensing.** Most strong models are GPL/non-commercial. Confirm
  Apache-2.0-compatible options before committing to Phase D.

## 7. Definition of done (whole plan)

1. `crates/locus-nlp` exists, both pipelines pass the same trait test suite.
2. Every Memory written through the GraphQL API stores entities, keywords
   and an embedding within 200 ms p95 on a 2023 M-series Mac.
3. `recallMemories(query, k)` returns semantically relevant results, not
   just keyword overlaps.
4. The agent orchestrator uses prompt-engineered NIM calls with structured
   NLP context instead of raw user strings.
5. Neo4j Browser shows enriched `:Entity` / `:Keyword` graph for any test
   intent, demonstrating the linking is live.
