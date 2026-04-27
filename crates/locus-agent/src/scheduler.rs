/// Backend selection scheduler.
///
/// Priority (highest first):
///   NPU  — local Apple Neural Engine via Core ML model (privacy-first, fastest)
///   NIM  — NVIDIA cloud inference (smartest, needs key + network)
///   Keyword — deterministic fallback (always available, offline)
use std::path::Path;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Backend {
    Npu,
    Nim,
    Keyword,
}

impl Backend {
    pub fn label(&self) -> &'static str {
        match self {
            Backend::Npu => "NPU",
            Backend::Nim => "NIM",
            Backend::Keyword => "KEY",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackendStatus {
    pub selected: Backend,
    pub npu_available: bool,
    pub nim_available: bool,
    pub arch: String,
}

/// True on Apple Silicon (proxy for ANE presence).
pub fn is_apple_silicon() -> bool {
    std::env::consts::ARCH == "aarch64"
}

/// Best-effort TCP reachability check — non-blocking, 800 ms timeout.
pub fn is_network_reachable() -> bool {
    use std::{net::TcpStream, time::Duration};
    TcpStream::connect_timeout(
        &"8.8.8.8:53".parse().unwrap(),
        Duration::from_millis(800),
    )
    .is_ok()
}

/// Select the best backend given current environment.
pub fn select(nim_api_key: Option<&str>, npu_model_path: Option<&Path>) -> Backend {
    if is_apple_silicon() {
        if let Some(p) = npu_model_path {
            if p.exists() {
                return Backend::Npu;
            }
        }
    }
    if let Some(key) = nim_api_key {
        if !key.is_empty() && is_network_reachable() {
            return Backend::Nim;
        }
    }
    Backend::Keyword
}

/// Full status snapshot — used by the `backend_status` Tauri command.
pub fn status(nim_api_key: Option<&str>, npu_model_path: Option<&Path>) -> BackendStatus {
    let npu_available = is_apple_silicon()
        && npu_model_path.map(|p| p.exists()).unwrap_or(false);
    let nim_available =
        nim_api_key.map(|k| !k.is_empty()).unwrap_or(false) && is_network_reachable();
    BackendStatus {
        selected: select(nim_api_key, npu_model_path),
        npu_available,
        nim_available,
        arch: std::env::consts::ARCH.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keyword_when_no_key_no_model() {
        assert_eq!(select(None, None), Backend::Keyword);
    }

    #[test]
    fn keyword_when_empty_key() {
        assert_eq!(select(Some(""), None), Backend::Keyword);
    }

    #[test]
    fn npu_requires_model_file_to_exist() {
        // A path that definitely doesn't exist should not activate NPU
        let p = std::path::PathBuf::from("/nonexistent/model.mlmodel");
        let backend = select(None, Some(&p));
        assert_eq!(backend, Backend::Keyword);
    }

    #[test]
    fn status_fields_consistent() {
        let s = status(None, None);
        assert!(!s.npu_available);
        assert!(!s.nim_available);
        assert_eq!(s.selected, Backend::Keyword);
        assert!(!s.arch.is_empty());
    }

    #[test]
    fn apple_silicon_detection_returns_bool() {
        // Just ensure it doesn't panic
        let _ = is_apple_silicon();
    }
}
