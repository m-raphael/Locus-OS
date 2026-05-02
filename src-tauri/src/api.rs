use axum::{
    extract::{Path, Query, State},
    routing::{delete, get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

pub type SharedDb = Arc<Mutex<spaces_core::Db>>;

// ── Request / response body types ────────────────────────────────────────

#[derive(Deserialize, utoipa::ToSchema)]
pub struct CreateSpaceBody {
    pub description: String,
    pub mode: String,
    pub ephemeral: bool,
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct SetSpaceModeBody {
    pub mode: String,
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct CreateFlowBody {
    pub order_index: i64,
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct CreateModuleBody {
    pub component_type: String,
    pub props_json: String,
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct StoreMemoryBody {
    pub content: String,
    pub space_id: Option<String>,
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct SearchQuery {
    pub q: String,
    pub limit: Option<usize>,
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct LimitQuery {
    pub limit: Option<usize>,
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct CreateFocusGoalBody {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct CreateSimulationBody {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct HoursAheadQuery {
    pub hours_ahead: Option<i32>,
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct ParseIntentBody {
    pub input: String,
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct RunAgentBody {
    pub input: String,
    pub active_space_id: Option<String>,
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct PredictQuery {
    pub hour: i32,
    pub limit: Option<usize>,
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct SetPluginEnabledBody {
    pub enabled: bool,
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct AuditQuery {
    pub event_type: Option<String>,
    pub limit: Option<usize>,
}

// ── OpenAPI spec ──────────────────────────────────────────────────────────

#[derive(OpenApi)]
#[openapi(
    info(
        title = "Locus API",
        version = "0.1.0",
        description = "Local REST API — mirrors Tauri IPC commands. Swagger UI: http://127.0.0.1:4000/swagger-ui"
    ),
    paths(
        get_status,
        parse_intent,
        run_agent,
        list_spaces,
        create_space,
        set_space_mode,
        dismiss_space,
        list_flows,
        create_flow,
        list_modules,
        create_module,
        list_memories,
        store_memory,
        search_memories,
        forget_memory,
        list_marketplace,
        list_plugins,
        install_plugin,
        uninstall_plugin,
        set_plugin_enabled,
        list_focus_goals,
        create_focus_goal,
        get_active_focus_goal,
        activate_focus_goal,
        clear_active_focus_goal,
        list_simulations,
        create_simulation,
        run_simulation,
        get_simulation_results,
        governance_summary,
        predict_next_spaces,
        list_audit_logs,
    ),
    components(schemas(
        CreateSpaceBody,
        SetSpaceModeBody,
        CreateFlowBody,
        CreateModuleBody,
        StoreMemoryBody,
        SearchQuery,
        LimitQuery,
        CreateFocusGoalBody,
        CreateSimulationBody,
        HoursAheadQuery,
        ParseIntentBody,
        RunAgentBody,
        PredictQuery,
        SetPluginEnabledBody,
        AuditQuery,
    )),
    tags(
        (name = "system",      description = "Status, intent parsing, agent execution"),
        (name = "spaces",      description = "Space and attention mode management"),
        (name = "flows",       description = "Flow management within spaces"),
        (name = "modules",     description = "Module management within flows"),
        (name = "memory",      description = "Context memory — store, search, forget"),
        (name = "marketplace", description = "Plugin catalog"),
        (name = "plugins",     description = "Installed plugin management"),
        (name = "focus",       description = "Focus goal management"),
        (name = "simulations", description = "Predictive simulations"),
        (name = "governance",  description = "Agent governance policy"),
        (name = "audit",       description = "Audit log"),
    )
)]
pub struct ApiDoc;

// ── Type alias for handler results ───────────────────────────────────────

type ApiResult = Result<Json<serde_json::Value>, (axum::http::StatusCode, String)>;

fn db_err(e: impl ToString) -> (axum::http::StatusCode, String) {
    (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
}

fn not_found(msg: impl ToString) -> (axum::http::StatusCode, String) {
    (axum::http::StatusCode::NOT_FOUND, msg.to_string())
}

fn bad_request(msg: impl ToString) -> (axum::http::StatusCode, String) {
    (axum::http::StatusCode::BAD_REQUEST, msg.to_string())
}

// ── System ────────────────────────────────────────────────────────────────

#[utoipa::path(
    get, path = "/api/status", tag = "system",
    responses((status = 200, description = "Backend status JSON"))
)]
async fn get_status() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "ok",
        "nim_available": std::env::var("NVIDIA_API_KEY").is_ok(),
        "local_model": false,
    }))
}

#[utoipa::path(
    post, path = "/api/intent", tag = "system",
    request_body = ParseIntentBody,
    responses((status = 200, description = "Parsed intent"))
)]
async fn parse_intent(Json(body): Json<ParseIntentBody>) -> Json<serde_json::Value> {
    let result = locus_parser::parse(&body.input);
    Json(serde_json::to_value(result).unwrap_or(serde_json::Value::Null))
}

#[utoipa::path(
    post, path = "/api/agent", tag = "system",
    request_body = RunAgentBody,
    responses(
        (status = 200, description = "Agent result"),
        (status = 400, description = "Governance denial or error"),
    )
)]
async fn run_agent(State(db): State<SharedDb>, Json(body): Json<RunAgentBody>) -> ApiResult {
    let nim_key = std::env::var("NVIDIA_API_KEY").ok();
    let guard = db.lock().unwrap();
    let result = locus_agent::run(&body.input, body.active_space_id, &guard, nim_key.as_deref(), None)
        .map_err(bad_request)?;
    Ok(Json(serde_json::to_value(result).unwrap()))
}

// ── Spaces ────────────────────────────────────────────────────────────────

#[utoipa::path(
    get, path = "/api/spaces", tag = "spaces",
    responses((status = 200, description = "Array of SpaceSummary"))
)]
async fn list_spaces(State(db): State<SharedDb>) -> ApiResult {
    let v = db.lock().unwrap().list_spaces().map_err(db_err)?;
    Ok(Json(serde_json::to_value(v).unwrap()))
}

#[utoipa::path(
    post, path = "/api/spaces", tag = "spaces",
    request_body = CreateSpaceBody,
    responses((status = 200, description = "{ id: string }"))
)]
async fn create_space(State(db): State<SharedDb>, Json(b): Json<CreateSpaceBody>) -> ApiResult {
    let guard = db.lock().unwrap();
    let intent_id = guard.create_intent(&b.description).map_err(db_err)?;
    let mode = spaces_core::AttentionMode::from_str(&b.mode);
    let id = guard.create_space(&intent_id, mode, b.ephemeral).map_err(db_err)?;
    Ok(Json(serde_json::json!({ "id": id })))
}

#[utoipa::path(
    post, path = "/api/spaces/{id}/mode", tag = "spaces",
    params(("id" = String, Path, description = "Space ID")),
    request_body = SetSpaceModeBody,
    responses((status = 200, description = "{ ok: true }"))
)]
async fn set_space_mode(
    State(db): State<SharedDb>,
    Path(id): Path<String>,
    Json(b): Json<SetSpaceModeBody>,
) -> ApiResult {
    let mode = spaces_core::AttentionMode::from_str(&b.mode);
    db.lock().unwrap().update_space_mode(&id, mode).map_err(db_err)?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

#[utoipa::path(
    delete, path = "/api/spaces/{id}", tag = "spaces",
    params(("id" = String, Path, description = "Space ID")),
    responses((status = 200, description = "{ ok: true }"))
)]
async fn dismiss_space(State(db): State<SharedDb>, Path(id): Path<String>) -> ApiResult {
    db.lock().unwrap().delete_ephemeral_space(&id).map_err(db_err)?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

// ── Flows ─────────────────────────────────────────────────────────────────

#[utoipa::path(
    get, path = "/api/spaces/{space_id}/flows", tag = "flows",
    params(("space_id" = String, Path, description = "Space ID")),
    responses((status = 200, description = "Array of Flow"))
)]
async fn list_flows(State(db): State<SharedDb>, Path(space_id): Path<String>) -> ApiResult {
    let v = db.lock().unwrap().list_flows(&space_id).map_err(db_err)?;
    Ok(Json(serde_json::to_value(v).unwrap()))
}

#[utoipa::path(
    post, path = "/api/spaces/{space_id}/flows", tag = "flows",
    params(("space_id" = String, Path, description = "Space ID")),
    request_body = CreateFlowBody,
    responses((status = 200, description = "{ id: string }"))
)]
async fn create_flow(
    State(db): State<SharedDb>,
    Path(space_id): Path<String>,
    Json(b): Json<CreateFlowBody>,
) -> ApiResult {
    let id = db.lock().unwrap().add_flow(&space_id, b.order_index).map_err(db_err)?;
    Ok(Json(serde_json::json!({ "id": id })))
}

// ── Modules ───────────────────────────────────────────────────────────────

#[utoipa::path(
    get, path = "/api/flows/{flow_id}/modules", tag = "modules",
    params(("flow_id" = String, Path, description = "Flow ID")),
    responses((status = 200, description = "Array of Module"))
)]
async fn list_modules(State(db): State<SharedDb>, Path(flow_id): Path<String>) -> ApiResult {
    let v = db.lock().unwrap().list_modules(&flow_id).map_err(db_err)?;
    Ok(Json(serde_json::to_value(v).unwrap()))
}

#[utoipa::path(
    post, path = "/api/flows/{flow_id}/modules", tag = "modules",
    params(("flow_id" = String, Path, description = "Flow ID")),
    request_body = CreateModuleBody,
    responses((status = 200, description = "{ id: string }"))
)]
async fn create_module(
    State(db): State<SharedDb>,
    Path(flow_id): Path<String>,
    Json(b): Json<CreateModuleBody>,
) -> ApiResult {
    let id = db.lock().unwrap().add_module(&flow_id, &b.component_type, &b.props_json).map_err(db_err)?;
    Ok(Json(serde_json::json!({ "id": id })))
}

// ── Memory ────────────────────────────────────────────────────────────────

#[utoipa::path(
    get, path = "/api/memories", tag = "memory",
    params(("limit" = Option<usize>, Query, description = "Max results (default 12)")),
    responses((status = 200, description = "Array of Memory"))
)]
async fn list_memories(State(db): State<SharedDb>, Query(q): Query<LimitQuery>) -> ApiResult {
    let v = db.lock().unwrap().list_memories(q.limit.unwrap_or(12)).map_err(db_err)?;
    Ok(Json(serde_json::to_value(v).unwrap()))
}

#[utoipa::path(
    post, path = "/api/memories", tag = "memory",
    request_body = StoreMemoryBody,
    responses((status = 200, description = "{ id: string }"))
)]
async fn store_memory(State(db): State<SharedDb>, Json(b): Json<StoreMemoryBody>) -> ApiResult {
    let id = db.lock().unwrap().store_memory(&b.content, b.space_id.as_deref()).map_err(db_err)?;
    Ok(Json(serde_json::json!({ "id": id })))
}

#[utoipa::path(
    get, path = "/api/memories/search", tag = "memory",
    params(
        ("q" = String, Query, description = "Search query"),
        ("limit" = Option<usize>, Query, description = "Max results (default 8)"),
    ),
    responses((status = 200, description = "Matching Memory array"))
)]
async fn search_memories(State(db): State<SharedDb>, Query(q): Query<SearchQuery>) -> ApiResult {
    let v = db.lock().unwrap().search_memories(&q.q, q.limit.unwrap_or(8)).map_err(db_err)?;
    Ok(Json(serde_json::to_value(v).unwrap()))
}

#[utoipa::path(
    delete, path = "/api/memories/{id}", tag = "memory",
    params(("id" = String, Path, description = "Memory ID")),
    responses((status = 200, description = "{ ok: true }"))
)]
async fn forget_memory(State(db): State<SharedDb>, Path(id): Path<String>) -> ApiResult {
    db.lock().unwrap().forget_memory(&id).map_err(db_err)?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

// ── Marketplace ───────────────────────────────────────────────────────────

#[utoipa::path(
    get, path = "/api/marketplace", tag = "marketplace",
    responses((status = 200, description = "Array of PluginManifest"))
)]
async fn list_marketplace() -> Json<serde_json::Value> {
    Json(serde_json::to_value(crate::marketplace::built_in_catalog()).unwrap())
}

// ── Plugins ───────────────────────────────────────────────────────────────

#[utoipa::path(
    get, path = "/api/plugins", tag = "plugins",
    responses((status = 200, description = "Array of InstalledPlugin"))
)]
async fn list_plugins(State(db): State<SharedDb>) -> ApiResult {
    let v = db.lock().unwrap().list_installed_plugins().map_err(db_err)?;
    Ok(Json(serde_json::to_value(v).unwrap()))
}

#[utoipa::path(
    post, path = "/api/plugins/{id}/install", tag = "plugins",
    params(("id" = String, Path, description = "Plugin catalog ID")),
    responses((status = 200, description = "{ ok: true }"), (status = 404, description = "Not in catalog"))
)]
async fn install_plugin(State(db): State<SharedDb>, Path(id): Path<String>) -> ApiResult {
    let catalog = crate::marketplace::built_in_catalog();
    let plugin = catalog.iter().find(|p| p.id == id)
        .ok_or_else(|| not_found(format!("Plugin '{}' not in catalog", id)))?;
    let manifest_json = serde_json::to_string(plugin).unwrap();
    db.lock().unwrap().install_plugin(&plugin.id, &plugin.name, &plugin.version, &manifest_json)
        .map_err(db_err)?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

#[utoipa::path(
    delete, path = "/api/plugins/{id}", tag = "plugins",
    params(("id" = String, Path, description = "Plugin ID")),
    responses((status = 200, description = "{ ok: true }"))
)]
async fn uninstall_plugin(State(db): State<SharedDb>, Path(id): Path<String>) -> ApiResult {
    db.lock().unwrap().uninstall_plugin(&id).map_err(db_err)?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

#[utoipa::path(
    post, path = "/api/plugins/{id}/enabled", tag = "plugins",
    params(("id" = String, Path, description = "Plugin ID")),
    request_body = SetPluginEnabledBody,
    responses((status = 200, description = "{ ok: true }"))
)]
async fn set_plugin_enabled(
    State(db): State<SharedDb>,
    Path(id): Path<String>,
    Json(b): Json<SetPluginEnabledBody>,
) -> ApiResult {
    db.lock().unwrap().set_plugin_enabled(&id, b.enabled).map_err(db_err)?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

// ── Focus Goals ───────────────────────────────────────────────────────────

#[utoipa::path(
    get, path = "/api/focus-goals", tag = "focus",
    responses((status = 200, description = "Array of FocusGoal"))
)]
async fn list_focus_goals(State(db): State<SharedDb>) -> ApiResult {
    let v = db.lock().unwrap().list_focus_goals().map_err(db_err)?;
    Ok(Json(serde_json::to_value(v).unwrap()))
}

#[utoipa::path(
    post, path = "/api/focus-goals", tag = "focus",
    request_body = CreateFocusGoalBody,
    responses((status = 200, description = "{ id: string }"))
)]
async fn create_focus_goal(State(db): State<SharedDb>, Json(b): Json<CreateFocusGoalBody>) -> ApiResult {
    let id = db.lock().unwrap().create_focus_goal(&b.name, b.description.as_deref()).map_err(db_err)?;
    Ok(Json(serde_json::json!({ "id": id })))
}

#[utoipa::path(
    get, path = "/api/focus-goals/active", tag = "focus",
    responses((status = 200, description = "Active FocusGoal or null"))
)]
async fn get_active_focus_goal(State(db): State<SharedDb>) -> ApiResult {
    let v = db.lock().unwrap().get_active_focus_goal().map_err(db_err)?;
    Ok(Json(serde_json::to_value(v).unwrap()))
}

#[utoipa::path(
    post, path = "/api/focus-goals/{id}/activate", tag = "focus",
    params(("id" = String, Path, description = "Goal ID")),
    responses((status = 200, description = "{ ok: true }"))
)]
async fn activate_focus_goal(State(db): State<SharedDb>, Path(id): Path<String>) -> ApiResult {
    db.lock().unwrap().set_active_focus_goal(&id).map_err(db_err)?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

#[utoipa::path(
    delete, path = "/api/focus-goals/active", tag = "focus",
    responses((status = 200, description = "{ ok: true }"))
)]
async fn clear_active_focus_goal(State(db): State<SharedDb>) -> ApiResult {
    db.lock().unwrap().clear_active_focus_goal().map_err(db_err)?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

// ── Simulations ───────────────────────────────────────────────────────────

#[utoipa::path(
    get, path = "/api/simulations", tag = "simulations",
    responses((status = 200, description = "Array of Simulation"))
)]
async fn list_simulations(State(db): State<SharedDb>) -> ApiResult {
    let v = db.lock().unwrap().list_simulations(20).map_err(db_err)?;
    Ok(Json(serde_json::to_value(v).unwrap()))
}

#[utoipa::path(
    post, path = "/api/simulations", tag = "simulations",
    request_body = CreateSimulationBody,
    responses((status = 200, description = "{ id: string }"))
)]
async fn create_simulation(State(db): State<SharedDb>, Json(b): Json<CreateSimulationBody>) -> ApiResult {
    let id = db.lock().unwrap().create_simulation(&b.name, b.description.as_deref()).map_err(db_err)?;
    Ok(Json(serde_json::json!({ "id": id })))
}

#[utoipa::path(
    post, path = "/api/simulations/{id}/run", tag = "simulations",
    params(
        ("id" = String, Path, description = "Simulation ID"),
        ("hours_ahead" = Option<i32>, Query, description = "Hours ahead (default 0)"),
    ),
    responses((status = 200, description = "Array of [name, probability, confidence]"))
)]
async fn run_simulation(
    State(db): State<SharedDb>,
    Path(id): Path<String>,
    Query(q): Query<HoursAheadQuery>,
) -> ApiResult {
    let mut guard = db.lock().unwrap();
    let _ = guard.update_simulation_status(&id, "running");
    let results = guard.run_simulation(&id, q.hours_ahead.unwrap_or(0)).map_err(db_err)?;
    let tuples: Vec<(String, f64, f64)> = results.into_iter().collect();
    guard.store_simulation_results(&id, &tuples).map_err(db_err)?;
    let _ = guard.update_simulation_status(&id, "completed");
    Ok(Json(serde_json::to_value(&tuples).unwrap()))
}

#[utoipa::path(
    get, path = "/api/simulations/{id}/results", tag = "simulations",
    params(("id" = String, Path, description = "Simulation ID")),
    responses((status = 200, description = "Array of SimulationResult"))
)]
async fn get_simulation_results(State(db): State<SharedDb>, Path(id): Path<String>) -> ApiResult {
    let v = db.lock().unwrap().get_simulation_results(&id).map_err(db_err)?;
    Ok(Json(serde_json::to_value(v).unwrap()))
}

// ── Governance ────────────────────────────────────────────────────────────

#[utoipa::path(
    get, path = "/api/governance", tag = "governance",
    responses((status = 200, description = "GovernanceSummary"))
)]
async fn governance_summary() -> Json<serde_json::Value> {
    let s = locus_agent::governance::GovernanceEngine::default().summary();
    Json(serde_json::to_value(s).unwrap())
}

// ── Predict ───────────────────────────────────────────────────────────────

#[utoipa::path(
    get, path = "/api/predict", tag = "spaces",
    params(
        ("hour" = i32, Query, description = "Current hour 0–23"),
        ("limit" = Option<usize>, Query, description = "Max predictions (default 5)"),
    ),
    responses((status = 200, description = "Array of PredictedSpace"))
)]
async fn predict_next_spaces(State(db): State<SharedDb>, Query(q): Query<PredictQuery>) -> ApiResult {
    let v = db.lock().unwrap().predict_next_spaces(q.hour, q.limit.unwrap_or(5)).map_err(db_err)?;
    Ok(Json(serde_json::to_value(v).unwrap()))
}

// ── Audit ─────────────────────────────────────────────────────────────────

#[utoipa::path(
    get, path = "/api/audit", tag = "audit",
    params(
        ("event_type" = Option<String>, Query, description = "Filter by event type"),
        ("limit" = Option<usize>, Query, description = "Max results (default 50)"),
    ),
    responses((status = 200, description = "Array of AuditLog"))
)]
async fn list_audit_logs(State(db): State<SharedDb>, Query(q): Query<AuditQuery>) -> ApiResult {
    let v = db.lock().unwrap()
        .list_audit_logs(q.event_type.as_deref(), q.limit.unwrap_or(50))
        .map_err(db_err)?;
    Ok(Json(serde_json::to_value(v).unwrap()))
}

// ── Router ────────────────────────────────────────────────────────────────

pub async fn serve(db: SharedDb) {
    let app = Router::new()
        .merge(SwaggerUi::new("/swagger-ui").url("/api-doc/openapi.json", ApiDoc::openapi()))
        // system
        .route("/api/status", get(get_status))
        .route("/api/intent", post(parse_intent))
        .route("/api/agent", post(run_agent))
        // spaces
        .route("/api/spaces", get(list_spaces).post(create_space))
        .route("/api/spaces/{id}", delete(dismiss_space))
        .route("/api/spaces/{id}/mode", post(set_space_mode))
        .route("/api/spaces/{space_id}/flows", get(list_flows).post(create_flow))
        // flows / modules
        .route("/api/flows/{flow_id}/modules", get(list_modules).post(create_module))
        // memory
        .route("/api/memories", get(list_memories).post(store_memory))
        .route("/api/memories/search", get(search_memories))
        .route("/api/memories/{id}", delete(forget_memory))
        // marketplace / plugins
        .route("/api/marketplace", get(list_marketplace))
        .route("/api/plugins", get(list_plugins))
        .route("/api/plugins/{id}/install", post(install_plugin))
        .route("/api/plugins/{id}", delete(uninstall_plugin))
        .route("/api/plugins/{id}/enabled", post(set_plugin_enabled))
        // focus goals
        .route("/api/focus-goals", get(list_focus_goals).post(create_focus_goal))
        .route("/api/focus-goals/active", get(get_active_focus_goal).delete(clear_active_focus_goal))
        .route("/api/focus-goals/{id}/activate", post(activate_focus_goal))
        // simulations
        .route("/api/simulations", get(list_simulations).post(create_simulation))
        .route("/api/simulations/{id}/run", post(run_simulation))
        .route("/api/simulations/{id}/results", get(get_simulation_results))
        // governance / predict / audit
        .route("/api/governance", get(governance_summary))
        .route("/api/predict", get(predict_next_spaces))
        .route("/api/audit", get(list_audit_logs))
        .with_state(db);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:4000")
        .await
        .expect("[api] Failed to bind on 127.0.0.1:4000");
    eprintln!("[api] Swagger UI → http://127.0.0.1:4000/swagger-ui");
    axum::serve(listener, app).await.expect("[api] Server error");
}
