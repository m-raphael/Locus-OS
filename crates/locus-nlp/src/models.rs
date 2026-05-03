//! Model loading, cache directory resolution, and download helpers.
//!
//! Phase A ships a lightweight loader that reads ONNX models and tokenizer
//! files from a configurable directory. The full download-via-GitHub-Releases
//! path is stubbed — local development uses `LOCUS_MODEL_DIR` to point at a
//! directory with the pre-downloaded ONNX files.

use std::path::{Path, PathBuf};

use crate::pipeline::{NlpError, Result};

/// Resolve the directory where models are stored.
///
/// Honour `$LOCUS_MODEL_DIR` when set (CI / power-user override). Otherwise
/// fall back to `$XDG_CACHE_HOME/locus/models/` (macOS: `~/Library/Caches/
/// locus/models/`).
pub fn model_dir() -> PathBuf {
    if let Ok(dir) = std::env::var("LOCUS_MODEL_DIR") {
        return PathBuf::from(dir);
    }
    let cache = directories::ProjectDirs::from("", "", "locus")
        .map(|d| d.cache_dir().to_path_buf())
        .unwrap_or_else(|| {
            let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".into());
            PathBuf::from(home).join(".cache").join("locus")
        });
    cache.join("models")
}

/// Ensure the model directory exists, creating it if necessary.
pub fn ensure_model_dir() -> Result<PathBuf> {
    let dir = model_dir();
    std::fs::create_dir_all(&dir).map_err(|e| {
        NlpError::ModelMissing(format!("failed to create model dir {:?}: {e}", dir))
    })?;
    Ok(dir)
}

/// Check that a file at `path` has the expected SHA-256 digest.
///
/// Returns `Ok(true)` if the digest matches, `Ok(false)` if it doesn't,
/// and `Err` if the file can't be read (not found, permissions, …).
pub fn verify_sha256(path: &Path, expected_hex: &str) -> std::result::Result<bool, NlpError> {
    use sha2::Digest;
    let bytes = std::fs::read(path).map_err(|e| {
        NlpError::ModelMissing(format!("can't read {:?} for checksum: {e}", path))
    })?;
    let actual = hex::encode(sha2::Sha256::digest(&bytes));
    Ok(actual.eq_ignore_ascii_case(expected_hex))
}

/// Resolve a model file by name, optionally verifying its SHA-256 digest.
///
/// 1. Check `$LOCUS_MODEL_DIR/<name>` (if the env var is set).
/// 2. Check `$XDG_CACHE_HOME/locus/models/<name>`.
/// 3. If neither exists and a `sha256` is supplied, attempt to download from
///    GitHub Releases (stubbed in Phase A — returns `ModelMissing`).
///
/// Returns the path if the file exists (and optionally passes SHA check).
pub fn resolve_model(name: &str, sha256: Option<&str>) -> Result<PathBuf> {
    let dir = model_dir();
    let path = dir.join(name);

    if path.exists() {
        if let Some(digest) = sha256 {
            let ok = verify_sha256(&path, digest).unwrap_or(false);
            if !ok {
                tracing::warn!(
                    "SHA-256 mismatch for {:?}, expected {digest}",
                    path
                );
                // Fall through — caller may want to re-download.
                return Err(NlpError::ModelMissing(format!(
                    "checksum mismatch for {}",
                    name
                )));
            }
        }
        return Ok(path);
    }

    // Stub: the download-from-GitHub-Releases path will be wired here.
    Err(NlpError::ModelMissing(format!(
        "model file not found at {:?}. Set LOCUS_MODEL_DIR or run the download helper.",
        path
    )))
}
