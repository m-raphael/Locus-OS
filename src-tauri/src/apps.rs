/// Legacy app sandbox — enumerate, launch, and quit traditional macOS .app bundles.
use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LegacyApp {
    pub name: String,
    pub bundle_id: String,
    pub path: String,
}

/// Scan /Applications for .app bundles. Returns metadata only; no I/O beyond the scan.
pub fn scan_applications() -> Vec<LegacyApp> {
    let mut apps = Vec::new();
    let dirs = ["/Applications", "/System/Applications"];

    for dir in &dirs {
        let Ok(entries) = std::fs::read_dir(dir) else { continue };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("app") {
                continue;
            }
            let name = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_string();
            if name.is_empty() {
                continue;
            }
            let bundle_id = read_bundle_id(&path).unwrap_or_default();
            apps.push(LegacyApp {
                name,
                bundle_id,
                path: path.to_string_lossy().into_owned(),
            });
        }
    }

    apps.sort_by(|a, b| a.name.cmp(&b.name));
    apps
}

/// Read CFBundleIdentifier from an .app bundle's Info.plist via plutil.
fn read_bundle_id(app_path: &std::path::Path) -> Option<String> {
    let plist = app_path.join("Contents/Info.plist");
    let out = Command::new("defaults")
        .args(["read", plist.to_str()?, "CFBundleIdentifier"])
        .output()
        .ok()?;
    if out.status.success() {
        Some(String::from_utf8_lossy(&out.stdout).trim().to_string())
    } else {
        None
    }
}

/// Open a .app via macOS `open` command. Non-blocking.
pub fn launch_app(path: &str) -> Result<(), String> {
    Command::new("open")
        .arg(path)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// Quit a running app by bundle ID via osascript.
pub fn quit_app(bundle_id: &str) -> Result<(), String> {
    if bundle_id.is_empty() {
        return Err("empty bundle id".into());
    }
    let script = format!(r#"tell application id "{bundle_id}" to quit"#);
    let status = Command::new("osascript")
        .args(["-e", &script])
        .status()
        .map_err(|e| e.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("osascript exited with {status}"))
    }
}

/// Find the first installed app whose name fuzzy-matches the query.
pub fn find_by_name<'a>(name: &str, apps: &'a [LegacyApp]) -> Option<&'a LegacyApp> {
    let q = name.to_lowercase();
    // Exact match first
    if let Some(a) = apps.iter().find(|a| a.name.to_lowercase() == q) {
        return Some(a);
    }
    // Prefix match
    apps.iter().find(|a| a.name.to_lowercase().starts_with(&q))
}
