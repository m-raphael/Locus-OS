//! POS tagger backed by a distilled BERT ONNX model.
//!
//! Tokenises input text with a WordPiece tokenizer (`tokenizers` crate),
//! runs a tract ONNX session to get per-subword logits, performs argmax to
//! pick the UPOS tag, then reassembles subword pieces into surface tokens.

use std::path::Path;

use tokenizers::Tokenizer;
use tract_onnx::prelude::*;

use crate::pipeline::{NlpError, PosTag, Result, Token};

/// Concrete runnable for a TypedModel — the output of `.into_runnable()`.
type RunnableModel = SimplePlan<TypedFact, Box<dyn TypedOp>, TypedModel>;

/// The 17 UPOS tags that the model emits (in alphabetical order).
const UPOS_LABELS: &[&str] = &[
    "ADJ", "ADP", "ADV", "AUX", "CCONJ", "DET", "INTJ", "NOUN", "NUM",
    "PART", "PRON", "PROPN", "PUNCT", "SCONJ", "SYM", "VERB", "X",
];

fn upos_to_postag(label: &str) -> PosTag {
    match label {
        "NOUN" | "PROPN" => PosTag::Noun,
        "VERB" | "AUX" => PosTag::Verb,
        "ADJ" => PosTag::Adj,
        "ADV" => PosTag::Adv,
        "PRON" => PosTag::Pron,
        "DET" => PosTag::Det,
        "ADP" | "SCONJ" => PosTag::Prep,
        "CCONJ" => PosTag::Conj,
        "NUM" => PosTag::Num,
        "PUNCT" => PosTag::Punct,
        _ => PosTag::Other,
    }
}

pub struct PosTagger {
    model: RunnableModel,
    tokenizer: Tokenizer,
}

impl PosTagger {
    /// Load the POS tagger from a directory containing:
    /// - `pos.onnx`  — the INT8-quantised ONNX model
    /// - `pos_tokenizer.json` — the HuggingFace tokeniser JSON (WordPiece)
    pub fn load(model_dir: &Path) -> Result<Self> {
        let model_path = model_dir.join("pos.onnx");
        let tokenizer_path = model_dir.join("pos_tokenizer.json");

        let model = tract_onnx::onnx()
            .model_for_path(&model_path)
            .map_err(|e| NlpError::ModelMissing(format!("failed to load pos.onnx: {e}")))?
            .into_optimized()
            .map_err(|e| NlpError::ModelMissing(format!("optimize model: {e}")))?
            .into_runnable()
            .map_err(|e| NlpError::ModelMissing(format!("compile model: {e}")))?;

        let tokenizer = Tokenizer::from_file(&tokenizer_path).map_err(|e| {
            NlpError::ModelMissing(format!("failed to load pos_tokenizer.json: {e}"))
        })?;

        Ok(Self { model, tokenizer })
    }

    /// Run POS tagging on `text` and return a `Token` per surface word.
    pub fn tag(&self, text: &str) -> Result<Vec<Token>> {
        let encoding = self
            .tokenizer
            .encode(text, false)
            .map_err(|e| NlpError::Inference(format!("tokenize: {e}")))?;

        let ids: Vec<i64> = encoding.get_ids().iter().map(|&id| id as i64).collect();
        let attention_mask: Vec<i64> =
            encoding.get_attention_mask().iter().map(|&m| m as i64).collect();
        let seq_len = ids.len();

        if seq_len == 0 {
            return Ok(Vec::new());
        }

        // Build tract input tensors: shape (1, seq_len), i64.
        let input_ids = tract_ndarray::Array2::from_shape_vec((1, seq_len), ids)
            .map_err(|e| NlpError::Inference(e.to_string()))?;

        let attention = tract_ndarray::Array2::from_shape_vec((1, seq_len), attention_mask)
            .map_err(|e| NlpError::Inference(e.to_string()))?;

        // Run inference — model output shape: (1, seq_len, num_labels=17).
        let result = self
            .model
            .run(tvec!(
                input_ids.into_tensor().into(),
                attention.into_tensor().into(),
            ))
            .map_err(|e| NlpError::Inference(format!("tract run: {e}")))?;

        let output = result[0]
            .to_array_view::<f32>()
            .map_err(|e| NlpError::Inference(format!("output view: {e}")))?;
        // output shape: (1, seq_len, num_labels)

        let num_labels = UPOS_LABELS.len();
        let seq = output.shape()[1];

        let mut predictions: Vec<usize> = Vec::with_capacity(seq);
        for s in 0..seq {
            let mut best_idx = 0usize;
            let mut best_val = f32::NEG_INFINITY;
            for l in 0..num_labels {
                let v = output[[0, s, l]];
                if v > best_val {
                    best_val = v;
                    best_idx = l;
                }
            }
            predictions.push(best_idx);
        }

        // Subword reassembly: merge "##" pieces back into the preceding word.
        let word_ids = encoding.get_word_ids();
        let tokens = encoding.get_tokens();

        let mut surface_tokens: Vec<Token> = Vec::new();
        let mut current_word: Option<(usize, usize, String, usize)> = None;

        for (i, (&word_id, token)) in word_ids.iter().zip(tokens.iter()).enumerate() {
            if word_id == None {
                continue; // [CLS], [SEP], [PAD]
            }

            let offsets = encoding.get_offsets();
            let (start, end) = if i < offsets.len() {
                offsets[i]
            } else {
                (0, 0)
            };

            match current_word.take() {
                None => {
                    current_word = Some((start, end, token.to_string(), predictions[i]));
                }
                Some((cs, ce, mut acc, tag)) => {
                    if token.starts_with("##") {
                        acc.push_str(token.trim_start_matches("##"));
                        current_word = Some((cs, end, acc, tag));
                    } else {
                        // Push accumulated word, start new one.
                        let pos = UPOS_LABELS
                            .get(tag)
                            .map(|l| upos_to_postag(l))
                            .unwrap_or(PosTag::Other);
                        if acc != "[UNK]" {
                            surface_tokens.push(Token {
                                start: cs,
                                end: ce,
                                surface: acc,
                                lemma: None,
                                pos,
                            });
                        }
                        current_word = Some((start, end, token.to_string(), predictions[i]));
                    }
                }
            }
        }

        // Flush the last word.
        if let Some((cs, ce, acc, tag)) = current_word.take() {
            let pos = UPOS_LABELS
                .get(tag)
                .map(|l| upos_to_postag(l))
                .unwrap_or(PosTag::Other);
            if acc != "[UNK]" {
                surface_tokens.push(Token {
                    start: cs,
                    end: ce,
                    surface: acc,
                    lemma: None,
                    pos,
                });
            }
        }

        Ok(surface_tokens)
    }
}
