//! NVIDIA NIM-backed pipeline.
//!
//! Stubbed in Phase A: every method returns `NlpError::NotImplemented`.
//! Phase F wires the actual HTTP calls and falls back to `LocalPipeline`
//! whenever a NIM request fails or times out (>1 s).

use async_trait::async_trait;

use crate::pipeline::{NlpDoc, NlpError, NlpPipeline, Result};

pub struct NimPipeline {
    _api_key: String,
}

impl NimPipeline {
    pub fn new(api_key: impl Into<String>) -> Self {
        Self {
            _api_key: api_key.into(),
        }
    }
}

#[async_trait]
impl NlpPipeline for NimPipeline {
    async fn analyze(&self, _text: &str) -> Result<NlpDoc> {
        Err(NlpError::NotImplemented)
    }

    async fn embed(&self, _text: &str) -> Result<Vec<f32>> {
        Err(NlpError::NotImplemented)
    }
}
