use std::sync::{Arc, Mutex};
use tauri::Manager;

mod api;
mod commands;
mod apps;
mod marketplace;
use commands::{AppDb, AppGovernance};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let db_path = data_dir.join("locus.sqlite");
            let db = spaces_core::Db::open(db_path.to_str().unwrap())
                .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
            if let Ok(count) = db.cleanup_ephemeral_spaces(24) {
                if count > 0 { eprintln!("[cleanup] Removed {} old ephemeral spaces", count); }
            }
            let db_arc = Arc::new(Mutex::new(db));
            tauri::async_runtime::spawn(api::serve(db_arc.clone()));
            app.manage(AppDb(db_arc));
            app.manage(AppGovernance(locus_agent::governance::GovernanceEngine::default()));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::run_agent,
            commands::backend_status,
            commands::list_legacy_apps,
            commands::launch_legacy_app,
            commands::quit_legacy_app,
            commands::store_memory,
            commands::search_memories,
            commands::list_memories,
            commands::forget_memory,
            commands::push_signal,
            commands::poll_signals,
            commands::cleanup_signals,
            commands::parse_intent,
            commands::list_spaces,
            commands::create_space,
            commands::set_space_mode,
            commands::dismiss_space,
            commands::list_flows,
            commands::create_flow,
            commands::list_modules,
            commands::create_module,
            commands::governance_summary,
            commands::run_orchestrator,
            commands::list_marketplace,
            commands::install_plugin,
            commands::uninstall_plugin,
            commands::list_installed_plugins,
            commands::set_plugin_enabled,
            commands::record_visit,
            commands::predict_next_spaces,
            commands::create_focus_goal,
            commands::list_focus_goals,
            commands::get_active_focus_goal,
            commands::set_active_focus_goal,
            commands::clear_active_focus_goal,
            commands::create_simulation,
            commands::list_simulations,
            commands::run_simulation,
            commands::get_simulation_results,
            commands::log_audit_event,
            commands::list_audit_logs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Locus");
}
