use locus_agent::AgentResult;
use locus_parser::IntentJson;
use spaces_core::{AttentionMode, Db, Flow, Module, SpaceSummary};
use std::sync::Mutex;
use tauri::State;

pub struct AppDb(pub Mutex<Db>);

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
    input: String,
    active_space_id: Option<String>,
) -> Result<AgentResult, String> {
    let nim_key = std::env::var("NVIDIA_API_KEY").ok();
    let db = db.0.lock().unwrap();
    locus_agent::run(&input, active_space_id, &db, nim_key.as_deref())
        .map_err(|e| e.to_string())
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
