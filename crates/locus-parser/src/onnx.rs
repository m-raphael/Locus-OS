/// ONNX-backed intent classifier.
///
/// Activated only when the `onnx` feature is enabled AND a model file exists
/// at the path provided to `OnnxClassifier::load`. Falls back gracefully to
/// the keyword classifier via `crate::parse_keyword` at all other times (G9).
#[cfg(feature = "onnx")]
pub mod classifier {
    use ndarray::{Array1, Array2};
    use ort::{Environment, Session, SessionBuilder, Value};
    use std::path::Path;
    use std::sync::Arc;

    use crate::{IntentJson, Verb};

    // Intent template sentences — one per Verb variant.
    // At startup we embed these and cache the vectors.
    static TEMPLATES: &[(Verb, &str)] = &[
        (Verb::Open, "open show launch start something"),
        (Verb::Find, "find search look for where is"),
        (Verb::Capture, "note capture write save remember"),
        (Verb::Recover, "recover restore undo revert"),
        (Verb::Mode, "mode switch focus set change"),
    ];

    pub struct OnnxClassifier {
        _session: Session,
        template_embeddings: Vec<(Verb, Vec<f32>)>,
    }

    impl OnnxClassifier {
        pub fn load(model_path: &Path) -> anyhow::Result<Self> {
            let env = Arc::new(
                Environment::builder()
                    .with_name("locus-parser")
                    .build()?,
            );
            let session = SessionBuilder::new(&env)?
                .with_optimization_level(ort::GraphOptimizationLevel::Level1)?
                .with_model_from_file(model_path)?;

            let mut template_embeddings = Vec::new();
            for (verb, text) in TEMPLATES {
                let emb = embed(&session, text)?;
                template_embeddings.push((verb.clone(), emb));
            }

            Ok(Self {
                _session: session,
                template_embeddings,
            })
        }

        pub fn classify(&self, input: &str) -> IntentJson {
            match embed(&self._session, input) {
                Ok(emb) => {
                    let (verb, score) = best_match(&emb, &self.template_embeddings);
                    IntentJson {
                        verb,
                        subject: extract_subject_words(input),
                        modifiers: vec![],
                        confidence: score,
                        raw: input.to_string(),
                    }
                }
                Err(_) => crate::parse_keyword(input),
            }
        }
    }

    fn embed(session: &Session, text: &str) -> anyhow::Result<Vec<f32>> {
        // Minimal mean-pooling over last hidden state.
        // Real tokenization would use the tokenizers crate — this is a stub
        // that encodes character bytes into a fixed-length float array until
        // the full tokenizer is wired.
        let bytes: Vec<f32> = text
            .bytes()
            .take(64)
            .map(|b| b as f32 / 255.0)
            .collect();
        let padded: Vec<f32> = {
            let mut v = bytes;
            v.resize(64, 0.0);
            v
        };
        let arr = Array2::from_shape_vec((1, 64), padded)?;
        let input = Value::from_array(session.allocator(), &arr)?;
        let outputs = session.run(vec![input])?;
        let out: Array1<f32> = outputs[0].try_extract()?.view().to_owned().into_shape(384)?;
        Ok(out.to_vec())
    }

    fn cosine(a: &[f32], b: &[f32]) -> f32 {
        let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
        let na: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
        let nb: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
        if na == 0.0 || nb == 0.0 {
            0.0
        } else {
            dot / (na * nb)
        }
    }

    fn best_match(emb: &[f32], templates: &[(Verb, Vec<f32>)]) -> (Verb, f32) {
        templates
            .iter()
            .map(|(v, t)| (v.clone(), cosine(emb, t)))
            .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap())
            .unwrap_or((Verb::Unknown, 0.0))
    }

    fn extract_subject_words(input: &str) -> Option<String> {
        let words: Vec<&str> = input.split_whitespace().collect();
        if words.len() > 1 {
            Some(words[1..].join(" "))
        } else {
            None
        }
    }
}
