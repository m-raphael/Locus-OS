use tauri::Manager;

mod api;
mod commands;
mod apps;
mod gql;
mod marketplace;
use commands::{AppDb, AppGovernance, AppGraph, AppNlp};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load .env from CWD or repo root if present. Existing process env wins.
    // Searches: ./.env, then walks parents looking for .env (handy when launched
    // from src-tauri/ during dev).
    match dotenvy::dotenv() {
        Ok(path) => eprintln!("[env] loaded {}", path.display()),
        Err(_) => eprintln!("[env] no .env file found — using process environment only"),
    }

    tauri::Builder::default()
        .setup(|app| {
            let neo4j_uri = std::env::var("NEO4J_URI").unwrap_or_else(|_| "bolt://127.0.0.1:7687".into());
            let neo4j_user = std::env::var("NEO4J_USER").unwrap_or_else(|_| "neo4j".into());
            let neo4j_pass = std::env::var("NEO4J_PASSWORD")
                .map_err(|_| "NEO4J_PASSWORD is required (copy .env.example to .env and set it)")?;
            // Refuse the well-known default — protects users who accidentally
            // ship their app pointed at a Neo4j with factory credentials.
            if neo4j_pass == "neo4j" || neo4j_pass == "changeme" {
                return Err("NEO4J_PASSWORD is set to a default placeholder; choose a real password".into());
            }

            let db = tauri::async_runtime::block_on(
                spaces_core::Db::connect(&neo4j_uri, &neo4j_user, &neo4j_pass)
            ).map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
            eprintln!("[db] Neo4j connected at {neo4j_uri}");

            if let Ok(count) = tauri::async_runtime::block_on(db.cleanup_ephemeral_spaces(24)) {
                if count > 0 { eprintln!("[cleanup] Removed {} old ephemeral spaces", count); }
            }

            // Optional secondary GraphDb wrapper used by graph traversal queries.
            // Re-uses the same Neo4j endpoint; falls back to None if unreachable.
            let graph = tauri::async_runtime::block_on(
                spaces_core::GraphDb::try_connect(&neo4j_uri, &neo4j_user, &neo4j_pass)
            ).ok();

            // Spawn embedded HTTP server hosting GraphQL + GraphiQL playground.
            let nlp = locus_nlp::pipeline();
            tauri::async_runtime::spawn(api::serve(db.clone(), graph.clone(), nlp.clone()));

            app.manage(AppDb(db));
            app.manage(AppGraph(graph));
            app.manage(AppGovernance(locus_agent::governance::GovernanceEngine::default()));
            app.manage(AppNlp(nlp));
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
            commands::graph_related_spaces,
            commands::graph_attention_path,
            commands::graph_record_transition,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Locus");
}
