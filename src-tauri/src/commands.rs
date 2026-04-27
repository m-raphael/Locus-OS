use locus_parser::IntentJson;
use spaces_core::{AttentionMode, Db, SpaceSummary};
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
