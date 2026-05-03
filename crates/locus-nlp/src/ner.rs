//! NER tagger backed by a distilled BERT ONNX model fine-tuned on
//! OntoNotes-5.
//!
//! Tokenises input text, runs tract ONNX inference, BIO-decodes the label
//! sequence, maps to [`EntityLabel`], and applies score thresholding.

use std::path::Path;

use tokenizers::Tokenizer;
use tract_onnx::prelude::*;

use crate::pipeline::{Entity, EntityLabel, NlpError, Result};

/// Concrete runnable for a TypedModel.
type RunnableModel = SimplePlan<TypedFact, Box<dyn TypedOp>, TypedModel>;

/// BIO-encoded OntoNotes-5 labels (alphabetical, as HuggingFace ONNX
/// exports sort them). Used to map argmax indices back to label strings.
const BIO_LABELS: &[&str] = &[
    "B-DATE", "B-EVENT", "B-FAC", "B-GPE", "B-LANGUAGE", "B-LAW", "B-LOC",
    "B-MONEY", "B-NORP", "B-ORDINAL", "B-ORG", "B-PERCENT", "B-PERSON",
    "B-PRODUCT", "B-QUANTITY", "B-TIME", "B-WORK_OF_ART",
    "I-DATE", "I-EVENT", "I-FAC", "I-GPE", "I-LANGUAGE", "I-LAW", "I-LOC",
    "I-MONEY", "I-NORP", "I-ORDINAL", "I-ORG", "I-PERCENT", "I-PERSON",
    "I-PRODUCT", "I-QUANTITY", "I-TIME", "I-WORK_OF_ART",
    "O",
];

fn bio_to_entity(label: &str) -> Option<EntityLabel> {
    let core = label.strip_prefix("B-").or_else(|| label.strip_prefix("I-"))?;
    match core {
        "PERSON" => Some(EntityLabel::Person),
        "ORG" | "NORP" => Some(EntityLabel::Org),
        "GPE" | "LOC" | "FAC" => Some(EntityLabel::Loc),
        "DATE" => Some(EntityLabel::Date),
        "TIME" => Some(EntityLabel::Time),
        "MONEY" | "PERCENT" | "QUANTITY" => Some(EntityLabel::Money),
        "PRODUCT" | "WORK_OF_ART" => Some(EntityLabel::Product),
        _ => Some(EntityLabel::Misc),
    }
}

fn softmax(logits: &[f32]) -> Vec<f32> {
    let max = logits.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
    let exps: Vec<f32> = logits.iter().map(|v| (v - max).exp()).collect();
    let sum: f32 = exps.iter().sum();
    exps.iter().map(|e| e / sum).collect()
}

pub struct NerTagger {
    model: RunnableModel,
    tokenizer: Tokenizer,
}

impl NerTagger {
    /// Load the NER tagger from a directory containing `ner.onnx` and
    /// `ner_tokenizer.json`.
    pub fn load(model_dir: &Path) -> Result<Self> {
        let model_path = model_dir.join("ner.onnx");
        let tokenizer_path = model_dir.join("ner_tokenizer.json");

        let model = tract_onnx::onnx()
            .model_for_path(&model_path)
            .map_err(|e| NlpError::ModelMissing(format!("ner.onnx: {e}")))?
            .into_optimized()
            .map_err(|e| NlpError::ModelMissing(format!("ner optimize: {e}")))?
            .into_runnable()
            .map_err(|e| NlpError::ModelMissing(format!("ner compile: {e}")))?;

        let tokenizer = Tokenizer::from_file(&tokenizer_path)
            .map_err(|e| NlpError::ModelMissing(format!("ner_tokenizer.json: {e}")))?;

        Ok(Self { model, tokenizer })
    }

    /// Run NER on `text` and return extracted entities (score ≥ 0.5).
    pub fn tag(&self, text: &str) -> Result<Vec<Entity>> {
        let encoding = self
            .tokenizer
            .encode(text, false)
            .map_err(|e| NlpError::Inference(format!("tokenize: {e}")))?;

        let ids: Vec<i64> = encoding.get_ids().iter().map(|&id| id as i64).collect();
        let attention: Vec<i64> = encoding
            .get_attention_mask()
            .iter()
            .map(|&m| m as i64)
            .collect();
        let seq_len = ids.len();

        if seq_len == 0 {
            return Ok(Vec::new());
        }

        let input_ids =
            tract_ndarray::Array2::from_shape_vec((1, seq_len), ids)
                .map_err(|e| NlpError::Inference(e.to_string()))?;
        let attention_mask =
            tract_ndarray::Array2::from_shape_vec((1, seq_len), attention)
                .map_err(|e| NlpError::Inference(e.to_string()))?;

        let result = self
            .model
            .run(tvec!(
                input_ids.into_tensor().into(),
                attention_mask.into_tensor().into(),
            ))
            .map_err(|e| NlpError::Inference(format!("tract: {e}")))?;

        let logits = result[0]
            .to_array_view::<f32>()
            .map_err(|e| NlpError::Inference(format!("output: {e}")))?;
        // (1, seq_len, num_labels)

        let num_labels = BIO_LABELS.len();
        let seq = logits.shape()[1];

        // Per-token softmax -> (argmax_index, probability).
        let mut token_probs: Vec<(usize, f32)> = Vec::with_capacity(seq);
        for s in 0..seq {
            let slice: Vec<f32> = (0..num_labels).map(|l| logits[[0, s, l]]).collect();
            let scores = softmax(&slice);
            let (best_idx, best_score) = scores
                .iter()
                .enumerate()
                .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal))
                .map(|(i, s)| (i, *s))
                .unwrap_or((num_labels - 1, 0.0));
            token_probs.push((best_idx, best_score));
        }

        // Collapse subwords: keep only the first subword's prediction per
        // word (subsequent pieces get dropped).
        let word_ids = encoding.get_word_ids();
        let mut word_preds: Vec<(usize, f32)> = Vec::new();
        {
            let mut seen = std::collections::HashSet::new();
            for (i, &wid) in word_ids.iter().enumerate() {
                if wid.is_none() {
                    continue;
                }
                if seen.insert(wid.unwrap()) {
                    word_preds.push(token_probs[i]);
                }
            }
        }

        // Map word positions to byte offsets (first subword per word).
        let offsets = encoding.get_offsets();
        let mut word_offset: Vec<(usize, usize)> = Vec::new(); // (start, end)
        {
            let mut prev: Option<u32> = None;
            for (i, &wid) in word_ids.iter().enumerate() {
                if wid.is_none() {
                    continue;
                }
                let w = wid.unwrap();
                if Some(w) != prev {
                    if i < offsets.len() {
                        word_offset.push((offsets[i].0, offsets[i].1));
                    }
                    prev = Some(w);
                } else if let Some(last) = word_offset.last_mut() {
                    if i < offsets.len() {
                        last.1 = offsets[i].1;
                    }
                }
            }
        }

        // BIO span decoder.
        struct Span {
            label: EntityLabel,
            scores: Vec<f32>,
            start: usize,
            end: usize,
        }

        let mut spans: Vec<Span> = Vec::new();

        for (wpos, &(label_idx, score)) in word_preds.iter().enumerate() {
            let label_str = BIO_LABELS.get(label_idx).unwrap_or(&"O");
            let (w_start, w_end) = word_offset.get(wpos).copied().unwrap_or((0, 0));
            let _text_slice = &text[w_start..w_end];

            if *label_str == "O" {
                continue;
            }

            let is_begin = label_str.starts_with("B-");
            let el = bio_to_entity(label_str);

            if is_begin {
                // Close previous span if one is open.
                if let Some(span) = spans.last_mut() {
                    if span.end == w_start || span.label != el.unwrap_or(EntityLabel::Misc) {
                        // Don't merge with previous (different type or gap).
                    } else {
                        // Same type adjacent — but B-X always starts new.
                    }
                }
                if let Some(el) = el {
                    spans.push(Span {
                        label: el,
                        scores: vec![score],
                        start: w_start,
                        end: w_end,
                    });
                }
            } else {
                // I- continuation.
                if let Some(span) = spans.last_mut() {
                    if span.end == w_start && el.map(|e| e == span.label).unwrap_or(false) {
                        span.scores.push(score);
                        span.end = w_end;
                    } else {
                        // I- without matching open span -> treat as B-.
                        if let Some(el) = el {
                            spans.push(Span {
                                label: el,
                                scores: vec![score],
                                start: w_start,
                                end: w_end,
                            });
                        }
                    }
                } else if let Some(el) = el {
                    spans.push(Span {
                        label: el,
                        scores: vec![score],
                        start: w_start,
                        end: w_end,
                    });
                }
            }
        }

        // Convert to entities with score thresholding.
        let entities: Vec<Entity> = spans
            .into_iter()
            .filter_map(|s| {
                let mean = s.scores.iter().sum::<f32>() / s.scores.len() as f32;
                if mean < 0.5 {
                    return None;
                }
                Some(Entity {
                    start: s.start,
                    end: s.end,
                    text: text[s.start..s.end].to_string(),
                    label: s.label,
                    score: mean,
                    linked_id: None,
                })
            })
            .collect();

        Ok(entities)
    }
}
