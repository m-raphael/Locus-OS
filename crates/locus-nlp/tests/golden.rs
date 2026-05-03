//! Golden fixture tests for the LocalPipeline NER + POS output.
//!
//! Each fixture under `tests/fixtures/*.json` declares an input string
//! and a list of expected entities. A test passes if every expected
//! entity appears in the pipeline output with:
//!   - the correct `EntityLabel`
//!   - case-insensitive substring match on `text`
//!   - score ≥ 0.5
//!
//! Extra entities are allowed — we don't want flake when the model evolves.
//!
//! ## Skipping when models are absent
//!
//! By default these tests **skip with a warning** when the ONNX models
//! aren't on disk yet. This keeps `cargo test` green for new contributors
//! who haven't run `scripts/fetch-nlp-models.sh`. Set
//! `LOCUS_NLP_REQUIRE_MODELS=1` in CI to flip skips into hard failures.

use std::fs;
use std::path::PathBuf;

use locus_nlp::EntityLabel;
use serde::Deserialize;

#[derive(Deserialize)]
struct Fixture {
    input: String,
    expected_entities: Vec<ExpectedEntity>,
}

#[derive(Deserialize)]
struct ExpectedEntity {
    text: String,
    label: String,
}

fn label_from_str(s: &str) -> EntityLabel {
    match s {
        "Person"  => EntityLabel::Person,
        "Org"     => EntityLabel::Org,
        "Loc"     => EntityLabel::Loc,
        "Time"    => EntityLabel::Time,
        "Date"    => EntityLabel::Date,
        "Money"   => EntityLabel::Money,
        "Product" => EntityLabel::Product,
        _         => EntityLabel::Misc,
    }
}

fn fixtures_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests").join("fixtures")
}

fn models_present() -> bool {
    let dir = std::env::var("LOCUS_MODEL_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| {
            directories::ProjectDirs::from("", "", "locus")
                .map(|d| d.cache_dir().join("models"))
                .unwrap_or_else(|| PathBuf::from(".cache/locus/models"))
        });
    ["pos.onnx", "pos_tokenizer.json", "ner.onnx", "ner_tokenizer.json"]
        .iter()
        .all(|n| dir.join(n).exists())
}

fn require_models_or_skip(test_name: &str) -> bool {
    if models_present() { return true; }
    let strict = std::env::var("LOCUS_NLP_REQUIRE_MODELS").as_deref() == Ok("1");
    if strict {
        panic!(
            "{test_name}: NLP models not found and LOCUS_NLP_REQUIRE_MODELS=1.\n\
             Run `scripts/fetch-nlp-models.sh` or set LOCUS_MODEL_DIR to a \
             directory containing pos.onnx / pos_tokenizer.json / ner.onnx / \
             ner_tokenizer.json."
        );
    }
    eprintln!("[skip] {test_name}: NLP models not found — run scripts/fetch-nlp-models.sh");
    false
}

async fn run_fixture(name: &str) {
    if !require_models_or_skip(&format!("golden::{name}")) { return; }

    let path = fixtures_dir().join(format!("{name}.json"));
    let raw = fs::read_to_string(&path).expect("read fixture");
    let fix: Fixture = serde_json::from_str(&raw).expect("parse fixture");

    let pipeline = locus_nlp::pipeline();
    let doc = pipeline.analyze(&fix.input).await.expect("analyze");

    for expected in &fix.expected_entities {
        let want_label = label_from_str(&expected.label);
        let want_text = expected.text.to_ascii_lowercase();
        let hit = doc.entities.iter().any(|e| {
            e.label == want_label
                && e.score >= 0.5
                && (e.text.to_ascii_lowercase().contains(&want_text)
                    || want_text.contains(&e.text.to_ascii_lowercase()))
        });
        assert!(
            hit,
            "fixture {name}: missing expected entity {:?} ({:?}). Got: {:?}",
            expected.text,
            expected.label,
            doc.entities.iter()
                .map(|e| format!("{}({:?},{:.2})", e.text, e.label, e.score))
                .collect::<Vec<_>>(),
        );
    }
}

#[tokio::test]
async fn golden_open_slack_with_sarah() {
    run_fixture("open_slack_with_sarah").await;
}

#[tokio::test]
async fn golden_remind_me_friday() {
    run_fixture("remind_me_friday").await;
}

#[tokio::test]
async fn golden_summarise_doc_for_anna() {
    run_fixture("summarise_doc_for_anna").await;
}
