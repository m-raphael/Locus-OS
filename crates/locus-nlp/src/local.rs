//! Offline NLP pipeline backed by ONNX Runtime.
//!
//! Phase A.2 wires the POS tagger; A.3 adds NER. The pipeline loads models
//! lazily on first call from the cache directory resolved by [`models`].

use async_trait::async_trait;
use std::sync::{Arc, Mutex};

use crate::models;
use crate::ner::NerTagger;
use crate::pipeline::{NlpDoc, NlpPipeline, Result};
use crate::pos::PosTagger;

pub struct LocalPipeline {
    pos_tagger: Mutex<Option<Arc<PosTagger>>>,
    ner_tagger: Mutex<Option<Arc<NerTagger>>>,
}

impl LocalPipeline {
    /// Construct a pipeline with the default model selection.
    ///
    /// Models are loaded lazily on the first `analyze` call so that
    /// construction is infallible even when models haven't been downloaded
    /// yet.
    pub fn new_default() -> Self {
        Self {
            pos_tagger: Mutex::new(None),
            ner_tagger: Mutex::new(None),
        }
    }

    fn ensure_pos_tagger(&self) -> Result<Arc<PosTagger>> {
        let mut guard = self
            .pos_tagger
            .lock()
            .map_err(|e| crate::pipeline::NlpError::Inference(e.to_string()))?;
        if let Some(ref tagger) = *guard {
            return Ok(Arc::clone(tagger));
        }
        let dir = models::ensure_model_dir()?;
        let tagger = PosTagger::load(&dir).map_err(|e| {
            tracing::warn!("POS model not loaded: {e}");
            e
        })?;
        let tagger = Arc::new(tagger);
        *guard = Some(Arc::clone(&tagger));
        Ok(tagger)
    }

    fn ensure_ner_tagger(&self) -> Result<Arc<NerTagger>> {
        let mut guard = self
            .ner_tagger
            .lock()
            .map_err(|e| crate::pipeline::NlpError::Inference(e.to_string()))?;
        if let Some(ref tagger) = *guard {
            return Ok(Arc::clone(tagger));
        }
        let dir = models::ensure_model_dir()?;
        let tagger = NerTagger::load(&dir).map_err(|e| {
            tracing::warn!("NER model not loaded: {e}");
            e
        })?;
        let tagger = Arc::new(tagger);
        *guard = Some(Arc::clone(&tagger));
        Ok(tagger)
    }
}

impl Default for LocalPipeline {
    fn default() -> Self {
        Self::new_default()
    }
}

#[async_trait]
impl NlpPipeline for LocalPipeline {
    async fn analyze(&self, text: &str) -> Result<NlpDoc> {
        let tokens = match self.ensure_pos_tagger() {
            Ok(tagger) => tagger.tag(text)?,
            Err(_) => Vec::new(),
        };
        let entities = match self.ensure_ner_tagger() {
            Ok(tagger) => tagger.tag(text)?,
            Err(_) => Vec::new(),
        };

        Ok(NlpDoc {
            text: text.to_owned(),
            tokens,
            entities,
            keywords: Vec::new(),   // Phase B
            coref: Vec::new(),      // Phase D
            embedding: None,         // Phase C
        })
    }
}
