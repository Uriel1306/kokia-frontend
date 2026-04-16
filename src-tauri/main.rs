#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri::api::process::Command;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // מוצא את הנתיב לקובץ ה-backend.js שנארוז כ-Resource
            let resource_path = app.path_resolver()
                .resolve_resource("backend.js")
                .expect("failed to resolve backend.js");

            // מפעיל את ה-bun.exe (ה-sidecar) ומעביר לו את הקובץ להרצה
            Command::new_sidecar("bun")
                .expect("failed to setup sidecar")
                .args([resource_path.to_str().unwrap()])
                .spawn()
                .expect("failed to spawn backend server");

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}