//! Public API for the Locus NLP pipeline.
//!
//! The trait is intentionally narrow — `analyze` returns a single `NlpDoc`
//! that carries every linguistic signal we extract, regardless of which
//! capabilities are wired in the current build. Phase A populates only
//! `tokens` and `entities`; later phases fill in the remaining fields
//! without changing the trait shape.

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

#[derive(Debug, thiserror::Error)]
pub enum NlpError {
    #[error("model not loaded: {0}")]
    ModelMissing(String),
    #[error("inference failed: {0}")]
    Inference(String),
    #[error("not implemented in this pipeline")]
    NotImplemented,
}

pub type Result<T> = std::result::Result<T, NlpError>;

#[derive(Clone, Copy, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
pub enum PosTag {
    Noun,
    Verb,
    Adj,
    Adv,
    Pron,
    Det,
    Prep,
    Conj,
    Num,
    Punct,
    #[default]
    Other,
}

#[derive(Clone, Copy, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
pub enum EntityLabel {
    Person,
    Org,
    Loc,
    Time,
    Date,
    Money,
    Product,
    #[default]
    Misc,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Token {
    /// Byte offset into the source text where the token starts.
    pub start: usize,
    /// Byte offset (exclusive) where the token ends.
    pub end: usize,
    pub surface: String,
    pub lemma: Option<String>,
    pub pos: PosTag,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Entity {
    pub start: usize,
    pub end: usize,
    pub text: String,
    pub label: EntityLabel,
    pub score: f32,
    /// Populated in Phase E (entity linking). `None` until then.
    pub linked_id: Option<String>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Keyword {
    pub term: String,
    pub score: f32,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct CorefChain {
    pub head: String,
    pub mention_spans: Vec<(usize, usize)>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct NlpDoc {
    pub text: String,
    pub tokens: Vec<Token>,
    pub entities: Vec<Entity>,
    /// Phase B.
    pub keywords: Vec<Keyword>,
    /// Phase D.
    pub coref: Vec<CorefChain>,
    /// Phase C — sentence-level dense vector (e.g. MiniLM-L6 → 384 dims).
    pub embedding: Option<Vec<f32>>,
}

#[async_trait]
pub trait NlpPipeline: Send + Sync {
    /// Extract all available linguistic signals from `text`.
    async fn analyze(&self, text: &str) -> Result<NlpDoc>;

    /// Sentence-level dense embedding. Default impl returns
    /// `NotImplemented` — pipelines without an embedder do not need to
    /// override this until Phase C lands.
    async fn embed(&self, _text: &str) -> Result<Vec<f32>> {
        Err(NlpError::NotImplemented)
    }
}
