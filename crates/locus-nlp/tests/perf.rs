//! Performance smoke benchmark for the LocalPipeline.
//!
//! Runs the three golden inputs through `analyze` 50 times each and asserts:
//!   - cold first-call latency        < 1 000 ms
//!   - warm p95 over 50 iterations    <   150 ms (per call)
//!
//! Marked `#[ignore]` so it does not slow down regular `cargo test`. Run
//! deliberately with:
//!
//!     cargo test --release -p locus-nlp -- --ignored perf
//!
//! Skips with a warning when ONNX models aren't present unless
//! LOCUS_NLP_REQUIRE_MODELS=1 (mirrors the golden tests' policy).

use std::path::PathBuf;
use std::time::Instant;


const COLD_BUDGET_MS: u128 = 1_000;
const WARM_P95_BUDGET_MS: u128 = 150;
const WARM_ITERS: usize = 50;

const INPUTS: &[&str] = &[
    "open Slack with Sarah at 3pm",
    "remind me to call mum on Friday",
    "summarise the Q2 report for Anna",
];

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

#[tokio::test]
#[ignore]
async fn nlp_perf_smoke() {
    if !models_present() {
        let strict = std::env::var("LOCUS_NLP_REQUIRE_MODELS").as_deref() == Ok("1");
        if strict {
            panic!("perf: NLP models not found and LOCUS_NLP_REQUIRE_MODELS=1");
        }
        eprintln!("[skip] perf: NLP models not found — run scripts/fetch-nlp-models.sh");
        return;
    }

    let pipeline = locus_nlp::pipeline();

    // Cold first-call: measure right after construction. The first analyze
    // also pays the model-load cost, which is what we want to bound.
    let cold_start = Instant::now();
    let _ = pipeline.analyze(INPUTS[0]).await.expect("cold analyze");
    let cold_ms = cold_start.elapsed().as_millis();
    assert!(
        cold_ms < COLD_BUDGET_MS,
        "cold first-call took {cold_ms} ms (budget {COLD_BUDGET_MS} ms)"
    );

    // Warm: run WARM_ITERS round-robin over the three inputs. Collect
    // per-call latencies and check p95.
    let mut durations_ms: Vec<u128> = Vec::with_capacity(WARM_ITERS);
    for i in 0..WARM_ITERS {
        let input = INPUTS[i % INPUTS.len()];
        let t = Instant::now();
        let _ = pipeline.analyze(input).await.expect("warm analyze");
        durations_ms.push(t.elapsed().as_millis());
    }

    durations_ms.sort_unstable();
    let p95_idx = ((durations_ms.len() as f64 * 0.95).ceil() as usize).saturating_sub(1);
    let p95 = durations_ms[p95_idx];
    let median = durations_ms[durations_ms.len() / 2];

    eprintln!(
        "[perf] cold={cold_ms} ms · warm median={median} ms · warm p95={p95} ms over {} iters",
        WARM_ITERS
    );

    assert!(
        p95 < WARM_P95_BUDGET_MS,
        "warm p95 = {p95} ms (budget {WARM_P95_BUDGET_MS} ms). Distribution: {:?}",
        durations_ms,
    );
}
