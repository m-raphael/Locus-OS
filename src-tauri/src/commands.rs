use crate::apps::{self, LegacyApp};
use crate::marketplace::{PluginManifest, built_in_catalog};
use locus_agent::{AgentAction, AgentResult, governance::{GovernanceEngine, GovernanceSummary, PolicyDecision}, orchestrator::OrchestratorResult, scheduler::BackendStatus};
use tauri::Manager;
use locus_parser::IntentJson;
use spaces_core::{AttentionMode, AuditLog, CollabSignal, Db, Flow, FocusGoal, InstalledPlugin, Memory, Module, PredictedSpace, Simulation, SimulationResult, SpaceSummary};
use std::sync::{Arc, Mutex};
use tauri::State;

pub struct AppDb(pub Arc<Mutex<Db>>);
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
    let details = format!("{description} | mode={mode:?} ephemeral={ephemeral}");
    let space_id = db.create_space(&intent_id, mode, ephemeral)
        .map_err(|e| e.to_string())?;
    let _ = db.log_audit_event(
        "space_created",
        Some("locus_user"),
        Some(&space_id),
        Some(&details),
    );
    Ok(space_id)
}

#[tauri::command]
pub fn set_space_mode(
    db: State<AppDb>,
    space_id: String,
    mode: String,
) -> Result<(), String> {
    let amode = AttentionMode::from_str(&mode);
    let guard = db.0.lock().unwrap();
    guard.update_space_mode(&space_id, amode).map_err(|e| e.to_string())?;
    let _ = guard.log_audit_event("mode_changed", Some("locus_user"), Some(&space_id), Some(&format!("mode={mode}")));
    Ok(())
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
    let db_guard = db.0.lock().unwrap();
    let active_goal = db_guard.get_active_focus_goal().ok().flatten();
    drop(db_guard);
    if let PolicyDecision::Deny(reason) = gov.0.check(&input, nim_key_check.is_some(), false) {
        if active_goal.is_some() {
            // Focus goal overrides governance denial
            eprintln!("[focus] Governance override by goal '{}'", active_goal.as_ref().unwrap().name);
        } else {
            return Err(reason);
        }
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
                    bundle_id: found.bundle_id.clone(),
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
pub fn launch_legacy_app(db: State<AppDb>, path: String) -> Result<(), String> {
    apps::launch_app(&path)?;
    let _ = db.0.lock().unwrap().log_audit_event("legacy_app_launched", Some("locus_user"), None, Some(&path));
    Ok(())
}

#[tauri::command]
pub fn quit_legacy_app(db: State<AppDb>, bundle_id: String) -> Result<(), String> {
    apps::quit_app(&bundle_id)?;
    let _ = db.0.lock().unwrap().log_audit_event("legacy_app_quit", Some("locus_user"), None, Some(&bundle_id));
    Ok(())
}

// ── Context memory (item 6 / N3) ─────────────────────────────────────────

#[tauri::command]
pub fn store_memory(db: State<AppDb>, content: String, space_id: Option<String>) -> Result<String, String> {
    let guard = db.0.lock().unwrap();
    let id = guard.store_memory(&content, space_id.as_deref()).map_err(|e| e.to_string())?;
    let _ = guard.log_audit_event("memory_stored", Some("locus_user"), Some(&id), Some(&content));
    Ok(id)
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
    let guard = db.0.lock().unwrap();
    guard.forget_memory(&id).map_err(|e| e.to_string())?;
    let _ = guard.log_audit_event("memory_forgotten", Some("locus_user"), Some(&id), None);
    Ok(())
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
    let guard = db.0.lock().unwrap();
    guard.delete_ephemeral_space(&space_id).map_err(|e| e.to_string())?;
    let _ = guard.log_audit_event("space_dismissed", Some("locus_user"), Some(&space_id), None);
    Ok(())
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
    let guard = db.0.lock().unwrap();
    guard.install_plugin(&plugin.id, &plugin.name, &plugin.version, &manifest_json)
        .map_err(|e| e.to_string())?;
    let _ = guard.log_audit_event("plugin_installed", Some("locus_user"), Some(&id), Some(&plugin.name));
    Ok(())
}

#[tauri::command]
pub fn uninstall_plugin(db: State<AppDb>, id: String) -> Result<(), String> {
    let guard = db.0.lock().unwrap();
    guard.uninstall_plugin(&id).map_err(|e| e.to_string())?;
    let _ = guard.log_audit_event("plugin_uninstalled", Some("locus_user"), Some(&id), None);
    Ok(())
}

#[tauri::command]
pub fn list_installed_plugins(db: State<AppDb>) -> Result<Vec<InstalledPlugin>, String> {
    db.0.lock().unwrap().list_installed_plugins().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_plugin_enabled(db: State<AppDb>, id: String, enabled: bool) -> Result<(), String> {
    let guard = db.0.lock().unwrap();
    guard.set_plugin_enabled(&id, enabled).map_err(|e| e.to_string())?;
    let _ = guard.log_audit_event("plugin_toggled", Some("locus_user"), Some(&id), Some(&format!("enabled={enabled}")));
    Ok(())
}

// ── Predictive Spaces (item 10 / N6) ─────────────────────────────────────

#[tauri::command]
pub fn record_visit(db: State<AppDb>, description: String, visited_at: i64, hour_of_day: i32) -> Result<String, String> {
    db.0.lock().unwrap().record_visit(&description, visited_at, hour_of_day).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn predict_next_spaces(db: State<AppDb>, current_hour: i32, limit: Option<usize>) -> Result<Vec<PredictedSpace>, String> {
    db.0.lock().unwrap().predict_next_spaces(current_hour, limit.unwrap_or(5)).map_err(|e| e.to_string())
}

// ── Focus Goals (item 11 / N7) ───────────────────────────────────────────

#[tauri::command]
pub fn create_focus_goal(db: State<AppDb>, name: String, description: Option<String>) -> Result<String, String> {
    let guard = db.0.lock().unwrap();
    let id = guard.create_focus_goal(&name, description.as_deref()).map_err(|e| e.to_string())?;
    let _ = guard.log_audit_event("focus_goal_created", Some("locus_user"), Some(&id), Some(&name));
    Ok(id)
}

#[tauri::command]
pub fn list_focus_goals(db: State<AppDb>) -> Result<Vec<FocusGoal>, String> {
    db.0.lock().unwrap().list_focus_goals().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_active_focus_goal(db: State<AppDb>) -> Result<Option<FocusGoal>, String> {
    db.0.lock().unwrap().get_active_focus_goal().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_active_focus_goal(db: State<AppDb>, id: String) -> Result<(), String> {
    let guard = db.0.lock().unwrap();
    guard.set_active_focus_goal(&id).map_err(|e| e.to_string())?;
    let _ = guard.log_audit_event("focus_goal_activated", Some("locus_user"), Some(&id), None);
    Ok(())
}

#[tauri::command]
pub fn clear_active_focus_goal(db: State<AppDb>) -> Result<(), String> {
    let guard = db.0.lock().unwrap();
    guard.clear_active_focus_goal().map_err(|e| e.to_string())?;
    let _ = guard.log_audit_event("focus_goal_cleared", Some("locus_user"), None, None);
    Ok(())
}

#[tauri::command]
pub fn create_simulation(db: State<AppDb>, name: String, description: Option<String>) -> Result<String, String> {
    let guard = db.0.lock().unwrap();
    let id = guard.create_simulation(&name, description.as_deref()).map_err(|e| e.to_string())?;
    let _ = guard.log_audit_event("simulation_created", Some("locus_user"), Some(&id), Some(&name));
    Ok(id)
}

#[tauri::command]
pub fn list_simulations(db: State<AppDb>, limit: Option<usize>) -> Result<Vec<Simulation>, String> {
    db.0.lock().unwrap().list_simulations(limit.unwrap_or(20)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn run_simulation(db: State<AppDb>, id: String, hours_ahead: Option<i32>) -> Result<Vec<SimulationResult>, String> {
    let mut guard = db.0.lock().unwrap();
    let _ = guard.update_simulation_status(&id, "running");
    let results = guard.run_simulation(&id, hours_ahead.unwrap_or(0)).map_err(|e| e.to_string())?;
    let tuples: Vec<(String, f64, f64)> = results.into_iter().map(|(name, prob, conf)| (name, prob, conf)).collect();
    guard.store_simulation_results(&id, &tuples).map_err(|e| e.to_string())?;
    let _ = guard.update_simulation_status(&id, "completed");
    let _ = guard.log_audit_event("simulation_executed", Some("locus_user"), Some(&id), None);
    guard.get_simulation_results(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_simulation_results(db: State<AppDb>, id: String) -> Result<Vec<SimulationResult>, String> {
    db.0.lock().unwrap().get_simulation_results(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn log_audit_event(
    db: State<AppDb>,
    eventType: String,
    actor: Option<String>,
    resourceId: Option<String>,
    details: Option<String>,
) -> Result<String, String> {
    db.0.lock().unwrap().log_audit_event(
        &eventType,
        actor.as_deref(),
        resourceId.as_deref(),
        details.as_deref(),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_audit_logs(
    db: State<AppDb>,
    eventType: Option<String>,
    limit: Option<usize>,
) -> Result<Vec<AuditLog>, String> {
    db.0.lock().unwrap().list_audit_logs(eventType.as_deref(), limit.unwrap_or(50)).map_err(|e| e.to_string())
}
