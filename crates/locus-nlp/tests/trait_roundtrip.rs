//! Phase A acceptance test for NLP-A.1: the trait surface is reachable
//! through the factory and produces an `NlpDoc` whose `text` matches the
//! input. Future phases extend this file with richer assertions; for now
//! we only lock the contract that lets downstream crates depend on us.

use locus_nlp::{pipeline, NlpDoc, NlpError, NlpPipeline, NimPipeline};

#[tokio::test]
async fn factory_returns_local_pipeline_that_echoes_input() {
    let p = pipeline();
    let doc: NlpDoc = p.analyze("open Slack with Sarah at 3pm").await.expect("analyze");
    assert_eq!(doc.text, "open Slack with Sarah at 3pm");
    assert!(doc.tokens.is_empty(), "Phase A: LocalPipeline carries no tokens yet");
    assert!(doc.entities.is_empty(), "Phase A: LocalPipeline carries no entities yet");
    assert!(doc.embedding.is_none(), "Phase A: no embedder wired");
}

#[tokio::test]
async fn nim_pipeline_returns_not_implemented_in_phase_a() {
    let p = NimPipeline::new("nvapi-test");
    let err = p.analyze("anything").await.expect_err("expected NotImplemented");
    assert!(matches!(err, NlpError::NotImplemented));
    let err = p.embed("anything").await.expect_err("expected NotImplemented");
    assert!(matches!(err, NlpError::NotImplemented));
}

#[tokio::test]
async fn embed_default_impl_returns_not_implemented() {
    // Sanity check on the trait's default `embed` body — guards against
    // someone accidentally implementing it as a stub `Ok(vec![])` later.
    let p = pipeline();
    let err = p.embed("anything").await.expect_err("expected NotImplemented");
    assert!(matches!(err, NlpError::NotImplemented));
}
