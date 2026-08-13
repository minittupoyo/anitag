use crate::annict::EpisodeNode;
use crate::parser::{parse_filename, ParsedFile};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

pub const DEFAULT_FORMAT: &str = "{work_title} - 第{ep_num:02d}話 「{ep_title}」.{ext}";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreviewItem {
    pub original_path: String,
    pub original_filename: String,
    pub directory: String,
    pub new_filename: String,
    pub new_path: String,
    pub parsed: ParsedFile,
    pub is_changed: bool,
    pub has_conflict: bool,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenameRecord {
    pub from: String,
    pub to: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistorySession {
    pub timestamp: String,
    pub records: Vec<RenameRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecuteResult {
    pub success_count: usize,
    pub error_count: usize,
    pub records: Vec<RenameRecord>,
    pub errors: Vec<String>,
}

pub fn sanitize_filename(filename: &str) -> String {
    let invalid_chars = [
        ('/', "／"),
        ('\\', "＼"),
        (':', "："),
        ('*', "＊"),
        ('?', "？"),
        ('"', "”"),
        ('<', "＜"),
        ('>', "＞"),
        ('|', "｜"),
    ];

    let mut result = filename.to_string();
    for (invalid, replacement) in invalid_chars {
        result = result.replace(invalid, replacement);
    }
    result.trim().to_string()
}

pub fn format_new_filename(
    parsed: &ParsedFile,
    work_title: &str,
    episodes_map: &HashMap<i32, String>,
    pattern: &str,
) -> String {
    let ep_num = parsed.episode.unwrap_or(1);
    let season_num = parsed.season.unwrap_or(1);
    let ext = &parsed.extension;

    let default_title = format!("第{}話", ep_num);
    let ep_title = episodes_map.get(&ep_num).unwrap_or(&default_title);

    let mut formatted = pattern.to_string();
    formatted = formatted.replace("{work_title}", work_title);
    formatted = formatted.replace("{ep_title}", ep_title);
    formatted = formatted.replace("{ext}", ext);

    formatted = formatted.replace("{ep_num:02d}", &format!("{:02}", ep_num));
    formatted = formatted.replace("{ep_num}", &ep_num.to_string());
    formatted = formatted.replace("{season:02d}", &format!("{:02}", season_num));
    formatted = formatted.replace("{season}", &season_num.to_string());

    sanitize_filename(&formatted)
}

pub fn generate_preview(
    file_paths: &[String],
    work_title: &str,
    episodes: &[EpisodeNode],
    pattern: &str,
) -> Vec<PreviewItem> {
    let mut ep_map: HashMap<i32, String> = HashMap::new();
    for ep in episodes {
        if let Some(num) = ep.number {
            let title = ep.title.clone().or_else(|| ep.number_text.clone()).unwrap_or_else(|| format!("第{}話", num));
            ep_map.insert(num, title);
        }
    }

    let mut items = Vec::new();

    for path_str in file_paths {
        let path = Path::new(path_str);
        if !path.is_file() {
            continue;
        }

        let filename = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
        let parent = path.parent().unwrap_or(Path::new(""));

        let parsed = parse_filename(filename);
        let new_name = format_new_filename(&parsed, work_title, &ep_map, pattern);
        let new_path = parent.join(&new_name);

        let is_changed = filename != new_name;
        let has_conflict = new_path.exists() && is_changed;

        let status = if is_changed && !has_conflict {
            "ready"
        } else if !is_changed {
            "unchanged"
        } else {
            "conflict"
        };

        items.push(PreviewItem {
            original_path: path.to_string_lossy().to_string(),
            original_filename: filename.to_string(),
            directory: parent.to_string_lossy().to_string(),
            new_filename: new_name,
            new_path: new_path.to_string_lossy().to_string(),
            parsed,
            is_changed,
            has_conflict,
            status: status.to_string(),
        });
    }

    items
}

fn get_history_file_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".anitag_history.json")
}

pub fn execute_rename_items(items: &[PreviewItem]) -> ExecuteResult {
    let mut renamed_records = Vec::new();
    let mut errors = Vec::new();

    for item in items {
        if !item.is_changed || item.has_conflict {
            continue;
        }

        let orig_path = Path::new(&item.original_path);
        let new_path = Path::new(&item.new_path);

        if !orig_path.exists() {
            errors.push(format!("File does not exist: {}", item.original_path));
            continue;
        }

        match fs::rename(orig_path, new_path) {
            Ok(_) => {
                renamed_records.push(RenameRecord {
                    from: item.original_path.clone(),
                    to: item.new_path.clone(),
                });
            }
            Err(e) => {
                errors.push(format!("Rename failed ({}): {}", item.original_filename, e));
            }
        }
    }

    if !renamed_records.is_empty() {
        save_history(&renamed_records);
    }

    ExecuteResult {
        success_count: renamed_records.len(),
        error_count: errors.len(),
        records: renamed_records,
        errors,
    }
}

fn save_history(records: &[RenameRecord]) {
    let history_path = get_history_file_path();
    let mut history: Vec<HistorySession> = Vec::new();

    if history_path.exists() {
        if let Ok(content) = fs::read_to_string(&history_path) {
            if let Ok(parsed) = serde_json::from_str(&content) {
                history = parsed;
            }
        }
    }

    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    history.push(HistorySession {
        timestamp: now,
        records: records.to_vec(),
    });

    if let Ok(serialized) = serde_json::to_string_pretty(&history) {
        let _ = fs::write(&history_path, serialized);
    }
}

pub fn undo_last_rename_session() -> ExecuteResult {
    let history_path = get_history_file_path();
    if !history_path.exists() {
        return ExecuteResult {
            success_count: 0,
            error_count: 1,
            records: vec![],
            errors: vec!["History file does not exist".to_string()],
        };
    }

    let mut history: Vec<HistorySession> = match fs::read_to_string(&history_path) {
        Ok(c) => serde_json::from_str(&c).unwrap_or_default(),
        Err(_) => vec![],
    };

    if history.is_empty() {
        return ExecuteResult {
            success_count: 0,
            error_count: 1,
            records: vec![],
            errors: vec!["No history to undo".to_string()],
        };
    }

    let last_session = history.pop().unwrap();
    let mut undone_records = Vec::new();
    let mut errors = Vec::new();

    for rec in last_session.records.iter().rev() {
        let curr_p = Path::new(&rec.to);
        let orig_p = Path::new(&rec.from);

        if !curr_p.exists() {
            errors.push(format!("File to restore does not exist: {}", rec.to));
            continue;
        }

        match fs::rename(curr_p, orig_p) {
            Ok(_) => {
                undone_records.push(RenameRecord {
                    from: rec.to.clone(),
                    to: rec.from.clone(),
                });
            }
            Err(e) => {
                errors.push(format!("Undo failed ({}): {}", rec.to, e));
            }
        }
    }

    if let Ok(serialized) = serde_json::to_string_pretty(&history) {
        let _ = fs::write(&history_path, serialized);
    }

    ExecuteResult {
        success_count: undone_records.len(),
        error_count: errors.len(),
        records: undone_records,
        errors,
    }
}
