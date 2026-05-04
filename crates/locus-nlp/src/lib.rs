//! Locus-OS NLP pipeline.
//!
//! Single public trait (`NlpPipeline`) with two implementations:
//!
//! - [`LocalPipeline`] — fully offline, runs on CPU. Phase A populates POS
//!   and NER; later phases add keywords, embeddings, coref, entity linking.
//! - [`NimPipeline`] — NVIDIA NIM-backed. Stubbed in Phase A; wired in
//!   Phase F with a fallback to `LocalPipeline` on failure or timeout.
//!
//! Pick one with the [`pipeline`] factory, which inspects the environment
//! at construction time. Today (Phase A) it always returns
//! [`LocalPipeline`].

pub mod local;
pub mod models;
pub mod ner;
pub mod nim;
pub mod pipeline;
pub mod pos;
pub mod split_compound;
pub mod time_phrase;

pub use local::LocalPipeline;
pub use nim::NimPipeline;
pub use pipeline::{
    CorefChain, Entity, EntityLabel, Keyword, NlpDoc, NlpError, NlpPipeline, PosTag, Result, Token,
};
pub use split_compound::{split_compound, CompoundSplit};
pub use time_phrase::{extract_time_phrases, Direction, TimeExpression, TimeKind, TimeUnit};

use std::sync::Arc;

/// Construct the default pipeline for this build. Phase A: always Local.
/// Phase F will switch to `NimPipeline` when `NVIDIA_API_KEY` is set.
pub fn pipeline() -> Arc<dyn NlpPipeline> {
    Arc::new(LocalPipeline::new_default())
}
