use crate::apps::{self, LegacyApp};
use crate::marketplace::{PluginManifest, built_in_catalog};
use locus_agent::{AgentAction, AgentResult, governance::{GovernanceEngine, GovernanceSummary, PolicyDecision}, orchestrator::OrchestratorResult, scheduler::BackendStatus};
use tauri::Manager;
use locus_parser::IntentJson;
use spaces_core::{AttentionMode, CollabSignal, Db, Flow, InstalledPlugin, Memory, Module, SpaceSummary};
use std::sync::Mutex;
use tauri::State;

pub struct AppDb(pub Mutex<Db>);
pub struct AppGovernance(pub GovernanceEngine);

#[tauri::command]
pub fn parse_intent(input: String) -> IntentJson {
    locus_parser::parse(&input)
}

#[tauri::command]
pub fn list_spaces(db: State<AppDb>) -> Result<Vec<SpaceSummary>, String> {
    db.0.lock().unwrap().list_spaces().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_space(
    db: State<AppDb>,
    description: String,
    mode: String,
    ephemeral: bool,
) -> Result<String, String> {
    let db = db.0.lock().unwrap();
    let intent_id = db.create_intent(&description).map_err(|e| e.to_string())?;
    let mode = AttentionMode::from_str(&mode);
    db.create_space(&intent_id, mode, ephemeral)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_space_mode(
    db: State<AppDb>,
    space_id: String,
    mode: String,
) -> Result<(), String> {
    let mode = AttentionMode::from_str(&mode);
    db.0.lock()
        .unwrap()
        .update_space_mode(&space_id, mode)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn run_agent(
    db: State<AppDb>,
    gov: State<AppGovernance>,
    input: String,
    active_space_id: Option<String>,
    app: tauri::AppHandle,
) -> Result<AgentResult, String> {
    let nim_key_check = std::env::var("NVIDIA_API_KEY").ok();
    if let PolicyDecision::Deny(reason) = gov.0.check(&input, nim_key_check.is_some(), false) {
        return Err(reason);
    }
    // Legacy app intercept: "open <AppName>" → LaunchLegacyApp if found
    let lower = input.trim().to_lowercase();
    if lower.starts_with("open ") || lower.starts_with("launch ") {
        let query = lower
            .trim_start_matches("open ")
            .trim_start_matches("launch ")
            .trim();
        let installed = apps::scan_applications();
        if let Some(found) = apps::find_by_name(query, &installed) {
            let _ = apps::launch_app(&found.path);
            // Create a Space in DB to represent the legacy app context
            let db_guard = db.0.lock().unwrap();
            let intent_id = db_guard.create_intent(&found.name).map_err(|e| e.to_string())?;
            let space_id = db_guard
                .create_space(&intent_id, spaces_core::AttentionMode::Open, false)
                .map_err(|e| e.to_string())?;
            db_guard.add_flow(&space_id, 0).map_err(|e| e.to_string())?;
            return Ok(AgentResult {
                action: AgentAction::LaunchLegacyApp {
                    name: found.name.clone(),
                    path: found.path.clone(),
                },
                confidence: 0.95,
                message: format!("Opening {}", found.name),
                new_space_id: Some(space_id),
                suggested_next: None,
            });
        }
    }

    let nim_key = std::env::var("NVIDIA_API_KEY").ok();
    let model_path = app
        .path()
        .app_data_dir()
        .ok()
        .map(|d| d.join("models").join("locus-intent.mlmodel"));
    let db = db.0.lock().unwrap();
    let result = locus_agent::run(
        &input,
        active_space_id,
        &db,
        nim_key.as_deref(),
        model_path.as_deref(),
    )
    .map_err(|e| e.to_string())?;

    // Auto-store every successful Space creation as a memory for future recall
    if let Some(ref space_id) = result.new_space_id {
        let _ = db.store_memory(&input, Some(space_id));
    }

    Ok(result)
}

#[tauri::command]
pub fn list_legacy_apps() -> Vec<LegacyApp> {
    apps::scan_applications()
}

#[tauri::command]
pub fn launch_legacy_app(path: String) -> Result<(), String> {
    apps::launch_app(&path)
}

#[tauri::command]
pub fn quit_legacy_app(bundle_id: String) -> Result<(), String> {
    apps::quit_app(&bundle_id)
}

// ── Context memory (item 6 / N3) ─────────────────────────────────────────

#[tauri::command]
pub fn store_memory(db: State<AppDb>, content: String, space_id: Option<String>) -> Result<String, String> {
    db.0.lock().unwrap().store_memory(&content, space_id.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_memories(db: State<AppDb>, query: String, limit: Option<usize>) -> Result<Vec<Memory>, String> {
    db.0.lock().unwrap().search_memories(&query, limit.unwrap_or(8)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_memories(db: State<AppDb>, limit: Option<usize>) -> Result<Vec<Memory>, String> {
    db.0.lock().unwrap().list_memories(limit.unwrap_or(12)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn forget_memory(db: State<AppDb>, id: String) -> Result<(), String> {
    db.0.lock().unwrap().forget_memory(&id).map_err(|e| e.to_string())
}

// ── Live collab signaling (item 8 / N5) ──────────────────────────────────

#[tauri::command]
pub fn push_signal(db: State<AppDb>, room_id: String, peer_id: String, kind: String, payload: String) -> Result<String, String> {
    db.0.lock().unwrap().push_signal(&room_id, &peer_id, &kind, &payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn poll_signals(db: State<AppDb>, room_id: String, peer_id: String, since_ts: i64) -> Result<Vec<CollabSignal>, String> {
    db.0.lock().unwrap().poll_signals(&room_id, &peer_id, since_ts).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn cleanup_signals(db: State<AppDb>, room_id: String) -> Result<(), String> {
    db.0.lock().unwrap().cleanup_signals(&room_id, 300).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn backend_status(app: tauri::AppHandle) -> BackendStatus {
    let nim_key = std::env::var("NVIDIA_API_KEY").ok();
    let model_path = app
        .path()
        .app_data_dir()
        .ok()
        .map(|d| d.join("models").join("locus-intent.mlmodel"));
    locus_agent::scheduler::status(nim_key.as_deref(), model_path.as_deref())
}

#[tauri::command]
pub fn dismiss_space(db: State<AppDb>, space_id: String) -> Result<(), String> {
    db.0.lock()
        .unwrap()
        .delete_ephemeral_space(&space_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_flows(db: State<AppDb>, space_id: String) -> Result<Vec<Flow>, String> {
    db.0.lock()
        .unwrap()
        .list_flows(&space_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_flow(
    db: State<AppDb>,
    space_id: String,
    order_index: i64,
) -> Result<String, String> {
    db.0.lock()
        .unwrap()
        .add_flow(&space_id, order_index)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_modules(db: State<AppDb>, flow_id: String) -> Result<Vec<Module>, String> {
    db.0.lock()
        .unwrap()
        .list_modules(&flow_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_module(
    db: State<AppDb>,
    flow_id: String,
    component_type: String,
    props_json: String,
) -> Result<String, String> {
    db.0.lock()
        .unwrap()
        .add_module(&flow_id, &component_type, &props_json)
        .map_err(|e| e.to_string())
}

// ── Governance (N15 / G5) ─────────────────────────────────────────────────

#[tauri::command]
pub fn governance_summary(gov: State<AppGovernance>) -> GovernanceSummary {
    gov.0.summary()
}

// ── Multi-agent orchestrator (N12 / G2) ───────────────────────────────────

#[tauri::command]
pub fn run_orchestrator(
    db: State<AppDb>,
    input: String,
    active_space_id: Option<String>,
    app: tauri::AppHandle,
) -> OrchestratorResult {
    let nim_key = std::env::var("NVIDIA_API_KEY").ok();
    let model_path = app
        .path()
        .app_data_dir()
        .ok()
        .map(|d| d.join("models").join("locus-intent.mlmodel"));
    let db = db.0.lock().unwrap();
    locus_agent::orchestrator::orchestrate(
        &input,
        active_space_id,
        &db,
        nim_key.as_deref(),
        model_path.as_deref(),
    )
}

// ── Marketplace (item 9) ──────────────────────────────────────────────────

#[tauri::command]
pub fn list_marketplace() -> Vec<PluginManifest> {
    built_in_catalog()
}

#[tauri::command]
pub fn install_plugin(db: State<AppDb>, id: String) -> Result<(), String> {
    let catalog = built_in_catalog();
    let plugin = catalog.iter().find(|p| p.id == id)
        .ok_or_else(|| format!("Plugin '{}' not found in catalog", id))?;
    let manifest_json = serde_json::to_string(plugin).map_err(|e| e.to_string())?;
    db.0.lock().unwrap()
        .install_plugin(&plugin.id, &plugin.name, &plugin.version, &manifest_json)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn uninstall_plugin(db: State<AppDb>, id: String) -> Result<(), String> {
    db.0.lock().unwrap().uninstall_plugin(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_installed_plugins(db: State<AppDb>) -> Result<Vec<InstalledPlugin>, String> {
    db.0.lock().unwrap().list_installed_plugins().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_plugin_enabled(db: State<AppDb>, id: String, enabled: bool) -> Result<(), String> {
    db.0.lock().unwrap().set_plugin_enabled(&id, enabled).map_err(|e| e.to_string())
}
