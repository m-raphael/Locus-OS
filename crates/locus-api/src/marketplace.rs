/// Marketplace — plugin catalog, manifest schema, OWASP permission model.
use serde::{Deserialize, Serialize};

/// Declared permissions a plugin may request.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Permission {
    Network,        // outbound HTTP/WebSocket
    Microphone,     // audio capture
    FileSystem,     // read/write user files
    Clipboard,      // read/write clipboard
    NativeApp,      // launch legacy apps
    AiInference,    // call NIM or local model
}

#[allow(dead_code)]
impl Permission {
    pub fn description(&self) -> &'static str {
        match self {
            Permission::Network     => "Make outbound network requests",
            Permission::Microphone  => "Access microphone for voice input",
            Permission::FileSystem  => "Read and write files on your device",
            Permission::Clipboard   => "Access clipboard contents",
            Permission::NativeApp   => "Launch native macOS applications",
            Permission::AiInference => "Run AI inference (local or cloud)",
        }
    }
    pub fn risk(&self) -> &'static str {
        match self {
            Permission::FileSystem | Permission::Clipboard => "HIGH",
            Permission::Network | Permission::NativeApp    => "MEDIUM",
            _                                              => "LOW",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
    pub module_type: String,
    pub permissions: Vec<Permission>,
    pub homepage: Option<String>,
}

/// Hard-coded built-in catalog for the MVP.
pub fn built_in_catalog() -> Vec<PluginManifest> {
    vec![
        PluginManifest {
            id: "locus.weather".into(),
            name: "Weather".into(),
            version: "1.0.0".into(),
            description: "Live weather conditions for your current location, surfaced directly in a Space.".into(),
            author: "Locus Team".into(),
            module_type: "WeatherModule".into(),
            permissions: vec![Permission::Network],
            homepage: None,
        },
        PluginManifest {
            id: "locus.github".into(),
            name: "GitHub".into(),
            version: "1.0.0".into(),
            description: "See open PRs, issues, and CI status for any repo without leaving your Space.".into(),
            author: "Locus Team".into(),
            module_type: "GithubModule".into(),
            permissions: vec![Permission::Network, Permission::AiInference],
            homepage: None,
        },
        PluginManifest {
            id: "locus.notes".into(),
            name: "Markdown Notes".into(),
            version: "1.0.0".into(),
            description: "A persistent Markdown editor pinned to any Space. Syncs locally.".into(),
            author: "Locus Team".into(),
            module_type: "NotesModule".into(),
            permissions: vec![Permission::FileSystem],
            homepage: None,
        },
        PluginManifest {
            id: "locus.clipboard-ai".into(),
            name: "Clipboard AI".into(),
            version: "1.0.0".into(),
            description: "Paste any clipboard content and let the agent summarise, translate, or action it.".into(),
            author: "Locus Team".into(),
            module_type: "ClipboardAiModule".into(),
            permissions: vec![Permission::Clipboard, Permission::AiInference],
            homepage: None,
        },
        PluginManifest {
            id: "locus.linear".into(),
            name: "Linear".into(),
            version: "0.9.0".into(),
            description: "Browse and update Linear issues, cycles, and projects inline.".into(),
            author: "Locus Community".into(),
            module_type: "LinearModule".into(),
            permissions: vec![Permission::Network],
            homepage: None,
        },
    ]
}
