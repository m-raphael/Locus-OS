use std::sync::Mutex;
use tauri::Manager;

mod commands;
use commands::AppDb;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let db_path = data_dir.join("locus.sqlite");
            let db = spaces_core::Db::open(db_path.to_str().unwrap())
                .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
            app.manage(AppDb(Mutex::new(db)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::parse_intent,
            commands::list_spaces,
            commands::create_space,
            commands::set_space_mode,
            commands::dismiss_space,
            commands::list_flows,
            commands::create_flow,
            commands::list_modules,
            commands::create_module,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Locus");
}
