use regex::Regex;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ParsedFile {
    pub original_filename: String,
    pub extension: String,
    pub episode: Option<i32>,
    pub season: Option<i32>,
    pub guessed_title: String,
}

pub fn parse_filename(filename: &str) -> ParsedFile {
    let path = Path::new(filename);
    let base_name = path.file_name().and_then(|s| s.to_str()).unwrap_or(filename);
    
    let (name_without_ext, ext) = match base_name.rfind('.') {
        Some(idx) => (&base_name[..idx], &base_name[idx + 1..]),
        None => (base_name, ""),
    };

    let clean_name = sanitize_noise(name_without_ext);

    let mut episode_num: Option<i32> = None;
    let mut season_num: Option<i32> = Some(1);

    let re_s_e = Regex::new(r"(?i)(?:^|[\s._\-\[\(])(?:season|s)[\s._-]*(?P<season>\d{1,2})[\s._-]*(?:episode|ep|e)[\s._-]*(?P<episode>\d{1,4})(?:v\d+)?(?:[\s._\-\]\.]|$)").unwrap();
    let re_ep_jp = Regex::new(r"第\s*(?P<episode>\d{1,4})(?:v\d+)?\s*話").unwrap();
    let re_ep_jp_short = Regex::new(r"(?:^|[\s._\-\[\(])(?P<episode>\d{1,4})(?:v\d+)?\s*話").unwrap();
    let re_ep_word = Regex::new(r"(?i)(?:^|[\s._\-\[\(])(?:ep|episode)[\s._-]*#?(?P<episode>\d{1,4})(?:v\d+)?(?:[\s._\-\]\.]|$)").unwrap();
    let re_hash = Regex::new(r"#\s*(?P<episode>\d{1,4})(?:v\d+)?(?:[\s._\-\]\.]|$)").unwrap();
    let re_bracket = Regex::new(r"[\[\(【](?P<episode>\d{1,3})(?:v\d+)?[\]\)】]").unwrap();
    let re_dash = Regex::new(r"(?:^|[\s._\-\[])-\s*(?P<episode>\d{1,3})(?:v\d+)?(?:[\s._\-\]\.]|$)").unwrap();
    let re_standalone_num = Regex::new(r"(?:^|[\s._\-\[])(?P<episode>\d{1,3})(?:v\d+)?(?:[\s._\-\]\.]|$)").unwrap();

    if let Some(caps) = re_s_e.captures(&clean_name) {
        if let Some(ep) = caps.name("episode") {
            episode_num = ep.as_str().parse().ok();
        }
        if let Some(s) = caps.name("season") {
            season_num = s.as_str().parse().ok();
        }
    } else if let Some(caps) = re_ep_jp.captures(&clean_name) {
        if let Some(ep) = caps.name("episode") {
            episode_num = ep.as_str().parse().ok();
        }
    } else if let Some(caps) = re_ep_jp_short.captures(&clean_name) {
        if let Some(ep) = caps.name("episode") {
            episode_num = ep.as_str().parse().ok();
        }
    } else if let Some(caps) = re_ep_word.captures(&clean_name) {
        if let Some(ep) = caps.name("episode") {
            episode_num = ep.as_str().parse().ok();
        }
    } else if let Some(caps) = re_hash.captures(&clean_name) {
        if let Some(ep) = caps.name("episode") {
            episode_num = ep.as_str().parse().ok();
        }
    } else if let Some(caps) = re_bracket.captures(&clean_name) {
        if let Some(ep) = caps.name("episode") {
            episode_num = ep.as_str().parse().ok();
        }
    } else if let Some(caps) = re_dash.captures(&clean_name) {
        if let Some(ep) = caps.name("episode") {
            episode_num = ep.as_str().parse().ok();
        }
    } else if let Some(caps) = re_standalone_num.captures(&clean_name) {
        if let Some(ep) = caps.name("episode") {
            episode_num = ep.as_str().parse().ok();
        }
    }

    if season_num == Some(1) {
        let re_season_only = Regex::new(r"(?i)(?:^|[\s._\-\[\(])(?:season[\s._-]*(?P<season>\d{1,2})|(?P<season2>\d{1,2})(?:st|nd|rd|th)?[\s._-]*season)(?:[\s._\-\]\.]|$)").unwrap();
        if let Some(caps) = re_season_only.captures(name_without_ext) {
            if let Some(s) = caps.name("season").or_else(|| caps.name("season2")) {
                season_num = s.as_str().parse().ok();
            }
        }
    }

    let re_tags = Regex::new(r"\[.*?\]|\(.*?\)|【.*?】").unwrap();
    let title_clean = re_tags.replace_all(name_without_ext, "").trim().to_string();
    let parts: Vec<&str> = title_clean.split(|c| c == '-' || c == '_').collect();
    let guessed_title = if !parts.is_empty() && !parts[0].trim().is_empty() {
        parts[0].trim().to_string()
    } else {
        title_clean
    };

    ParsedFile {
        original_filename: base_name.to_string(),
        extension: ext.to_string(),
        episode: episode_num,
        season: season_num,
        guessed_title,
    }
}

fn sanitize_noise(s: &str) -> String {
    let re_noise = Regex::new(r"(?i)\b\d{3,4}p\b|\b\d{1,2}bit\b|\b\d{2,3}fps\b|\b(?:x264|x265|hevc|h264|h265|aac|flac|web-dl|bdrip|hdtv|bluray)\b|\[[a-f0-9]{8}\]").unwrap();
    re_noise.replace_all(s, "").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_episode_parsing_patterns() {
        assert_eq!(parse_filename("[SubGroup] Frieren - 05 [1080p].mp4").episode, Some(5));
        assert_eq!(parse_filename("Frieren_S02E12_1080p.mkv").episode, Some(12));
        assert_eq!(parse_filename("Frieren_S02E12_1080p.mkv").season, Some(2));
        assert_eq!(parse_filename("ダンジョン飯 第14話 「◯◯」.mp4").episode, Some(14));
        assert_eq!(parse_filename("Anime_Name_EP08_x265.mkv").episode, Some(8));
        assert_eq!(parse_filename("Anime Name #03 (BD 1080p).mkv").episode, Some(3));
        assert_eq!(parse_filename("Anime Name - 01話.mp4").episode, Some(1));
        assert_eq!(parse_filename("[Group] Title [09] [A1B2C3D4].mkv").episode, Some(9));

        assert_eq!(parse_filename("[Group] Anime Title - 01v2 [1080p].mkv").episode, Some(1));
        assert_eq!(parse_filename("Anime_S01E05v2_x264.mp4").episode, Some(5));
        assert_eq!(parse_filename("ダンジョン飯 第02v3話.mp4").episode, Some(2));
        assert_eq!(parse_filename("Title [03v2].mkv").episode, Some(3));
    }
}
