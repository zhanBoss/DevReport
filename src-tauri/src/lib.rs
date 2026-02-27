mod commands;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec![])))
        .invoke_handler(tauri::generate_handler![
            commands::git::check_git_installed,
            commands::git::get_git_log,
            commands::git::get_git_stats,
            commands::git::get_git_authors,
            commands::git::get_git_submodules,
            commands::git::validate_repo_path,
            commands::git::get_folder_name,
            commands::config::load_config,
            commands::config::save_config,
            commands::config::get_config_path,
            commands::llm::stream_llm_request,
            commands::config::get_autostart_enabled,
            commands::config::set_autostart_enabled,
        ])
        .setup(|app| {
            if let Some(main_window) = app.get_webview_window("main") {
                main_window.set_title("DevReport - Git 工作报告生成器").ok();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
