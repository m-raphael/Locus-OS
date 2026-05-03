use crate::apps::{self, LegacyApp};
use crate::marketplace::{PluginManifest, built_in_catalog};
use locus_agent::{AgentAction, AgentResult, governance::{GovernanceEngine, GovernanceSummary, PolicyDecision}, orchestrator::OrchestratorResult, scheduler::BackendStatus};
use tauri::Manager;
use locus_parser::IntentJson;
use spaces_core::{AttentionMode, AuditLog, CollabSignal, Db, Flow, FocusGoal, InstalledPlugin, Memory, Module, PredictedSpace, Simulation, SimulationResult, SpaceSummary};
use spaces_core::GraphDb;
use tauri::State;

pub struct AppDb(pub Db);
pub struct AppGovernance(pub GovernanceEngine);
pub struct AppGraph(pub Option<GraphDb>);

#[tauri::command]
pub fn parse_intent(input: String) -> IntentJson {
    locus_parser::parse(&input)
}

#[tauri::command]
pub async fn list_spaces(db: State<'_, AppDb>) -> Result<Vec<SpaceSummary>, String> {
    db.0.list_spaces().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_space(
    db: State<'_, AppDb>,
    description: String,
    mode: String,
    ephemeral: bool,
) -> Result<String, String> {
    let intent_id = db.0.create_intent(&description).await.map_err(|e| e.to_string())?;
    let mode_enum = AttentionMode::from_str(&mode);
    // Log structural metadata only — never the user-supplied description, which
    // can contain PII or secrets.
    let details = format!("mode={mode_enum:?} ephemeral={ephemeral} desc_len={}", description.len());
    let space_id = db.0.create_space(&intent_id, mode_enum, ephemeral).await
        .map_err(|e| e.to_string())?;
    let _ = db.0.log_audit_event(
        "space_created",
        Some("locus_user"),
        Some(&space_id),
        Some(&details),
    ).await;
    Ok(space_id)
}

#[tauri::command]
pub async fn set_space_mode(
    db: State<'_, AppDb>,
    space_id: String,
    mode: String,
) -> Result<(), String> {
    let amode = AttentionMode::from_str(&mode);
    db.0.update_space_mode(&space_id, amode).await.map_err(|e| e.to_string())?;
    let _ = db.0.log_audit_event("mode_changed", Some("locus_user"), Some(&space_id), Some(&format!("mode={mode}"))).await;
    Ok(())
}

#[tauri::command]
pub async fn run_agent(
    db: State<'_, AppDb>,
    gov: State<'_, AppGovernance>,
    input: String,
    active_space_id: Option<String>,
    app: tauri::AppHandle,
) -> Result<AgentResult, String> {
    let nim_key_check = std::env::var("NVIDIA_API_KEY").ok();
    let active_goal = db.0.get_active_focus_goal().await.ok().flatten();
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
            let intent_id = db.0.create_intent(&found.name).await.map_err(|e| e.to_string())?;
            let space_id = db.0
                .create_space(&intent_id, spaces_core::AttentionMode::Open, false)
                .await
                .map_err(|e| e.to_string())?;
            db.0.add_flow(&space_id, 0).await.map_err(|e| e.to_string())?;
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
    let result = locus_agent::run(
        &input,
        active_space_id,
        &db.0,
        nim_key.as_deref(),
        model_path.as_deref(),
    )
    .await
    .map_err(|e| e.to_string())?;

    // Auto-store every successful Space creation as a memory for future recall
    if let Some(ref space_id) = result.new_space_id {
        let _ = db.0.store_memory(&input, Some(space_id)).await;
    }

    Ok(result)
}

#[tauri::command]
pub fn list_legacy_apps() -> Vec<LegacyApp> {
    apps::scan_applications()
}

#[tauri::command]
pub async fn launch_legacy_app(db: State<'_, AppDb>, path: String) -> Result<(), String> {
    apps::launch_app(&path)?;
    let _ = db.0.log_audit_event("legacy_app_launched", Some("locus_user"), None, Some(&path)).await;
    Ok(())
}

#[tauri::command]
pub async fn quit_legacy_app(db: State<'_, AppDb>, bundle_id: String) -> Result<(), String> {
    apps::quit_app(&bundle_id)?;
    let _ = db.0.log_audit_event("legacy_app_quit", Some("locus_user"), None, Some(&bundle_id)).await;
    Ok(())
}

// ── Context memory (item 6 / N3) ─────────────────────────────────────────

#[tauri::command]
pub async fn store_memory(db: State<'_, AppDb>, content: String, space_id: Option<String>) -> Result<String, String> {
    let id = db.0.store_memory(&content, space_id.as_deref()).await.map_err(|e| e.to_string())?;
    // Log only the length — memory content can include PII/secrets and is
    // already retrievable from the Memory node when authorized.
    let _ = db.0.log_audit_event("memory_stored", Some("locus_user"), Some(&id), Some(&format!("len={}", content.len()))).await;
    Ok(id)
}

#[tauri::command]
pub async fn search_memories(db: State<'_, AppDb>, query: String, limit: Option<usize>) -> Result<Vec<Memory>, String> {
    db.0.search_memories(&query, limit.unwrap_or(8)).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_memories(db: State<'_, AppDb>, limit: Option<usize>) -> Result<Vec<Memory>, String> {
    db.0.list_memories(limit.unwrap_or(12)).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn forget_memory(db: State<'_, AppDb>, id: String) -> Result<(), String> {
    db.0.forget_memory(&id).await.map_err(|e| e.to_string())?;
    let _ = db.0.log_audit_event("memory_forgotten", Some("locus_user"), Some(&id), None).await;
    Ok(())
}

// ── Live collab signaling (item 8 / N5) ──────────────────────────────────

#[tauri::command]
pub async fn push_signal(db: State<'_, AppDb>, room_id: String, peer_id: String, kind: String, payload: String) -> Result<String, String> {
    db.0.push_signal(&room_id, &peer_id, &kind, &payload).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn poll_signals(db: State<'_, AppDb>, room_id: String, peer_id: String, since_ts: i64) -> Result<Vec<CollabSignal>, String> {
    db.0.poll_signals(&room_id, &peer_id, since_ts).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn cleanup_signals(db: State<'_, AppDb>, room_id: String) -> Result<(), String> {
    db.0.cleanup_signals(&room_id, 300).await.map_err(|e| e.to_string())
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
pub async fn dismiss_space(db: State<'_, AppDb>, space_id: String) -> Result<(), String> {
    db.0.delete_ephemeral_space(&space_id).await.map_err(|e| e.to_string())?;
    let _ = db.0.log_audit_event("space_dismissed", Some("locus_user"), Some(&space_id), None).await;
    Ok(())
}

#[tauri::command]
pub async fn list_flows(db: State<'_, AppDb>, space_id: String) -> Result<Vec<Flow>, String> {
    db.0.list_flows(&space_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_flow(
    db: State<'_, AppDb>,
    space_id: String,
    order_index: i64,
) -> Result<String, String> {
    db.0.add_flow(&space_id, order_index).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_modules(db: State<'_, AppDb>, flow_id: String) -> Result<Vec<Module>, String> {
    db.0.list_modules(&flow_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_module(
    db: State<'_, AppDb>,
    flow_id: String,
    component_type: String,
    props_json: String,
) -> Result<String, String> {
    db.0.add_module(&flow_id, &component_type, &props_json).await.map_err(|e| e.to_string())
}

// ── Governance (N15 / G5) ─────────────────────────────────────────────────

#[tauri::command]
pub fn governance_summary(gov: State<AppGovernance>) -> GovernanceSummary {
    gov.0.summary()
}

// ── Multi-agent orchestrator (N12 / G2) ───────────────────────────────────

#[tauri::command]
pub async fn run_orchestrator(
    db: State<'_, AppDb>,
    input: String,
    active_space_id: Option<String>,
    app: tauri::AppHandle,
) -> Result<OrchestratorResult, String> {
    let nim_key = std::env::var("NVIDIA_API_KEY").ok();
    let model_path = app
        .path()
        .app_data_dir()
        .ok()
        .map(|d| d.join("models").join("locus-intent.mlmodel"));
    Ok(locus_agent::orchestrator::orchestrate(
        &input,
        active_space_id,
        &db.0,
        nim_key.as_deref(),
        model_path.as_deref(),
    ).await)
}

// ── Marketplace (item 9) ──────────────────────────────────────────────────

#[tauri::command]
pub fn list_marketplace() -> Vec<PluginManifest> {
    built_in_catalog()
}

#[tauri::command]
pub async fn install_plugin(db: State<'_, AppDb>, id: String) -> Result<(), String> {
    let catalog = built_in_catalog();
    let plugin = catalog.iter().find(|p| p.id == id)
        .ok_or_else(|| format!("Plugin '{}' not found in catalog", id))?;
    let manifest_json = serde_json::to_string(plugin).map_err(|e| e.to_string())?;
    db.0.install_plugin(&plugin.id, &plugin.name, &plugin.version, &manifest_json)
        .await
        .map_err(|e| e.to_string())?;
    let _ = db.0.log_audit_event("plugin_installed", Some("locus_user"), Some(&id), Some(&plugin.name)).await;
    Ok(())
}

#[tauri::command]
pub async fn uninstall_plugin(db: State<'_, AppDb>, id: String) -> Result<(), String> {
    db.0.uninstall_plugin(&id).await.map_err(|e| e.to_string())?;
    let _ = db.0.log_audit_event("plugin_uninstalled", Some("locus_user"), Some(&id), None).await;
    Ok(())
}

#[tauri::command]
pub async fn list_installed_plugins(db: State<'_, AppDb>) -> Result<Vec<InstalledPlugin>, String> {
    db.0.list_installed_plugins().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_plugin_enabled(db: State<'_, AppDb>, id: String, enabled: bool) -> Result<(), String> {
    db.0.set_plugin_enabled(&id, enabled).await.map_err(|e| e.to_string())?;
    let _ = db.0.log_audit_event("plugin_toggled", Some("locus_user"), Some(&id), Some(&format!("enabled={enabled}"))).await;
    Ok(())
}

// ── Predictive Spaces (item 10 / N6) ─────────────────────────────────────

#[tauri::command]
pub async fn record_visit(db: State<'_, AppDb>, description: String, visited_at: i64, hour_of_day: i32) -> Result<String, String> {
    db.0.record_visit(&description, visited_at, hour_of_day).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn predict_next_spaces(db: State<'_, AppDb>, current_hour: i32, limit: Option<usize>) -> Result<Vec<PredictedSpace>, String> {
    db.0.predict_next_spaces(current_hour, limit.unwrap_or(5)).await.map_err(|e| e.to_string())
}

// ── Focus Goals (item 11 / N7) ───────────────────────────────────────────

#[tauri::command]
pub async fn create_focus_goal(db: State<'_, AppDb>, name: String, description: Option<String>) -> Result<String, String> {
    let id = db.0.create_focus_goal(&name, description.as_deref()).await.map_err(|e| e.to_string())?;
    let _ = db.0.log_audit_event("focus_goal_created", Some("locus_user"), Some(&id), Some(&name)).await;
    Ok(id)
}

#[tauri::command]
pub async fn list_focus_goals(db: State<'_, AppDb>) -> Result<Vec<FocusGoal>, String> {
    db.0.list_focus_goals().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_active_focus_goal(db: State<'_, AppDb>) -> Result<Option<FocusGoal>, String> {
    db.0.get_active_focus_goal().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_active_focus_goal(db: State<'_, AppDb>, id: String) -> Result<(), String> {
    db.0.set_active_focus_goal(&id).await.map_err(|e| e.to_string())?;
    let _ = db.0.log_audit_event("focus_goal_activated", Some("locus_user"), Some(&id), None).await;
    Ok(())
}

#[tauri::command]
pub async fn clear_active_focus_goal(db: State<'_, AppDb>) -> Result<(), String> {
    db.0.clear_active_focus_goal().await.map_err(|e| e.to_string())?;
    let _ = db.0.log_audit_event("focus_goal_cleared", Some("locus_user"), None, None).await;
    Ok(())
}

#[tauri::command]
pub async fn create_simulation(db: State<'_, AppDb>, name: String, description: Option<String>) -> Result<String, String> {
    let id = db.0.create_simulation(&name, description.as_deref()).await.map_err(|e| e.to_string())?;
    let _ = db.0.log_audit_event("simulation_created", Some("locus_user"), Some(&id), Some(&name)).await;
    Ok(id)
}

#[tauri::command]
pub async fn list_simulations(db: State<'_, AppDb>, limit: Option<usize>) -> Result<Vec<Simulation>, String> {
    db.0.list_simulations(limit.unwrap_or(20)).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn run_simulation(db: State<'_, AppDb>, id: String, hours_ahead: Option<i32>) -> Result<Vec<SimulationResult>, String> {
    let _ = db.0.update_simulation_status(&id, "running").await;
    let results = db.0.run_simulation(&id, hours_ahead.unwrap_or(0)).await.map_err(|e| e.to_string())?;
    let tuples: Vec<(String, f64, f64)> = results.into_iter().map(|(name, prob, conf)| (name, prob, conf)).collect();
    db.0.store_simulation_results(&id, &tuples).await.map_err(|e| e.to_string())?;
    let _ = db.0.update_simulation_status(&id, "completed").await;
    let _ = db.0.log_audit_event("simulation_executed", Some("locus_user"), Some(&id), None).await;
    db.0.get_simulation_results(&id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_simulation_results(db: State<'_, AppDb>, id: String) -> Result<Vec<SimulationResult>, String> {
    db.0.get_simulation_results(&id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn log_audit_event(
    db: State<'_, AppDb>,
    eventType: String,
    actor: Option<String>,
    resourceId: Option<String>,
    details: Option<String>,
) -> Result<String, String> {
    db.0.log_audit_event(
        &eventType,
        actor.as_deref(),
        resourceId.as_deref(),
        details.as_deref(),
    ).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_audit_logs(
    db: State<'_, AppDb>,
    eventType: Option<String>,
    limit: Option<usize>,
) -> Result<Vec<AuditLog>, String> {
    db.0.list_audit_logs(eventType.as_deref(), limit.unwrap_or(50)).await.map_err(|e| e.to_string())
}

// ── Graph queries (Neo4j — returns empty vec if Neo4j is offline) ─────────

#[tauri::command]
pub async fn graph_related_spaces(
    graph: State<'_, AppGraph>,
    space_id: String,
    limit: Option<usize>,
) -> Result<Vec<String>, String> {
    match &graph.0 {
        Some(g) => Ok(g.related_spaces(&space_id, limit.unwrap_or(5)).await),
        None => Ok(vec![]),
    }
}

#[tauri::command]
pub async fn graph_attention_path(
    graph: State<'_, AppGraph>,
    space_id: String,
    mode: String,
) -> Result<Vec<String>, String> {
    match &graph.0 {
        Some(g) => Ok(g.attention_path(&space_id, &mode).await),
        None => Ok(vec![]),
    }
}

#[tauri::command]
pub async fn graph_record_transition(
    graph: State<'_, AppGraph>,
    from_id: String,
    to_id: String,
) -> Result<(), String> {
    if let Some(g) = &graph.0 {
        g.record_transition(&from_id, &to_id).await;
    }
    Ok(())
}
