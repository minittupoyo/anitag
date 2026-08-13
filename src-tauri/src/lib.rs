mod annict;
mod parser;
mod renamer;

use annict::{fetch_annict_works, EpisodeNode, WorkItem};
use parser::parse_filename;
use renamer::{execute_rename_items, generate_preview, undo_last_rename_session, ExecuteResult, PreviewItem, DEFAULT_FORMAT};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri_plugin_store::StoreExt;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub size_bytes: u64,
    pub parsed: parser::ParsedFile,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScanResult {
    pub directory: String,
    pub count: usize,
    pub most_common_title: String,
    pub files: Vec<FileInfo>,
}

const STORE_PATH: &str = "anitag_secure_store.bin";
const TOKEN_KEY: &str = "annict_access_token";

#[tauri::command]
fn scan_directory(path: String) -> Result<ScanResult, String> {
    let dir_path = Path::new(&path);
    if !dir_path.exists() {
        return Err(format!("指定されたパスが存在しません: {}", path));
    }

    let mut files = Vec::new();
    let mut guessed_titles = Vec::new();

    if dir_path.is_file() {
        let name = dir_path.file_name().and_then(|s| s.to_str()).unwrap_or("").to_string();
        let metadata = dir_path.metadata().map_err(|e| e.to_string())?;
        let parsed = parse_filename(&name);
        if !parsed.guessed_title.is_empty() {
            guessed_titles.push(parsed.guessed_title.clone());
        }
        files.push(FileInfo {
            path: dir_path.to_string_lossy().to_string(),
            name,
            size_bytes: metadata.len(),
            parsed,
        });
    } else if let Ok(entries) = fs::read_dir(dir_path) {
        let mut entry_list: Vec<_> = entries.filter_map(|e| e.ok()).collect();
        entry_list.sort_by_key(|e| e.file_name());

        for entry in entry_list {
            let p = entry.path();
            if p.is_file() {
                let name = p.file_name().and_then(|s| s.to_str()).unwrap_or("").to_string();
                if name.starts_with('.') {
                    continue;
                }
                let metadata = p.metadata().map_err(|e| e.to_string())?;
                let parsed = parse_filename(&name);
                if !parsed.guessed_title.is_empty() {
                    guessed_titles.push(parsed.guessed_title.clone());
                }
                files.push(FileInfo {
                    path: p.to_string_lossy().to_string(),
                    name,
                    size_bytes: metadata.len(),
                    parsed,
                });
            }
        }
    }

    let most_common_title = if !guessed_titles.is_empty() {
        use std::collections::HashMap;
        let mut counts = HashMap::new();
        for t in &guessed_titles {
            *counts.entry(t).or_insert(0) += 1;
        }
        counts.into_iter().max_by_key(|&(_, count)| count).map(|(t, _)| t.clone()).unwrap_or_default()
    } else {
        String::new()
    };

    Ok(ScanResult {
        directory: dir_path.to_string_lossy().to_string(),
        count: files.len(),
        most_common_title,
        files,
    })
}

#[tauri::command]
async fn search_annict_cmd(
    app: tauri::AppHandle,
    query: String,
    custom_token: Option<String>,
) -> Result<Vec<WorkItem>, String> {
    let token = if let Some(t) = custom_token {
        if !t.trim().is_empty() {
            Some(t)
        } else {
            get_saved_token(&app)
        }
    } else {
        get_saved_token(&app)
    };

    fetch_annict_works(&query, token).await
}

fn get_saved_token(app: &tauri::AppHandle) -> Option<String> {
    if let Ok(store) = app.store(PathBuf::from(STORE_PATH)) {
        if let Some(val) = store.get(TOKEN_KEY) {
            if let Some(s) = val.as_str() {
                if !s.trim().is_empty() {
                    return Some(s.trim().to_string());
                }
            }
        }
    }
    None
}

#[tauri::command]
fn save_annict_token_cmd(app: tauri::AppHandle, token: String) -> Result<(), String> {
    let store = app.store(PathBuf::from(STORE_PATH)).map_err(|e| format!("ストアへのアクセスエラー: {}", e))?;
    store.set(TOKEN_KEY, serde_json::json!(token.trim()));
    store.save().map_err(|e| format!("トークンの保存に失敗しました: {}", e))?;
    Ok(())
}

#[tauri::command]
fn get_annict_token_cmd(app: tauri::AppHandle) -> Result<Option<String>, String> {
    Ok(get_saved_token(&app))
}

#[tauri::command]
fn preview_rename_cmd(
    file_paths: Vec<String>,
    work_title: String,
    episodes: Vec<EpisodeNode>,
    pattern: Option<String>,
) -> Vec<PreviewItem> {
    let pat = pattern.unwrap_or_else(|| DEFAULT_FORMAT.to_string());
    generate_preview(&file_paths, &work_title, &episodes, &pat)
}

#[tauri::command]
fn execute_rename_cmd(items: Vec<PreviewItem>) -> ExecuteResult {
    execute_rename_items(&items)
}

#[tauri::command]
fn undo_rename_cmd() -> ExecuteResult {
    undo_last_rename_session()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            search_annict_cmd,
            save_annict_token_cmd,
            get_annict_token_cmd,
            preview_rename_cmd,
            execute_rename_cmd,
            undo_rename_cmd
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
