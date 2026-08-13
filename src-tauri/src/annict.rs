use serde::{Deserialize, Serialize};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EpisodeNode {
    pub annict_id: Option<i64>,
    pub number: Option<i32>,
    pub number_text: Option<String>,
    pub title: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkItem {
    pub annict_id: i64,
    pub title: String,
    pub media: Option<String>,
    pub season_year: Option<i32>,
    pub episodes_count: usize,
    pub episodes: Vec<EpisodeNode>,
}

pub async fn fetch_annict_works(query: &str, token_opt: Option<String>) -> Result<Vec<WorkItem>, String> {
    let client = reqwest::Client::new();
    
    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    
    // トークン選択優先度: パラメータ指定 > 環境変数 ANNICT_TOKEN > デフォルト
    let token = token_opt.unwrap_or_else(|| {
        std::env::var("ANNICT_TOKEN").unwrap_or_else(|_| "qHvIU5zBQj8PPZX2x-jburnxQV0M59CKsaKdushlg34".to_string())
    });

    let trimmed_token = token.trim();
    if !trimmed_token.is_empty() {
        if let Ok(val) = HeaderValue::from_str(&format!("Bearer {}", trimmed_token)) {
            headers.insert(AUTHORIZATION, val);
        }
    }

    let graphql_query = serde_json::json!({
        "query": r#"
            query SearchWorks($titles: [String!]) {
                searchWorks(
                    orderBy: { direction: ASC, field: CREATED_AT }
                    titles: $titles
                ) {
                    edges {
                        node {
                            annictId
                            title
                            media
                            seasonYear
                            episodesCount
                            episodes(orderBy: { direction: ASC, field: SORT_NUMBER }) {
                                edges {
                                    node {
                                        annictId
                                        number
                                        numberText
                                        title
                                    }
                                }
                            }
                        }
                    }
                }
            }
        "#,
        "variables": {
            "titles": [query]
        }
    });

    let res = client
        .post("https://api.annict.com/graphql")
        .headers(headers)
        .json(&graphql_query)
        .send()
        .await
        .map_err(|e| format!("Annict API リクエスト失敗: {}", e))?;

    let json_val: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("JSONレスポンスのパースエラー: {}", e))?;

    if let Some(errors) = json_val["errors"].as_array() {
        if !errors.is_empty() {
            let msg = errors[0]["message"].as_str().unwrap_or("APIエラー");
            return Err(format!("Annict API エラー: {}", msg));
        }
    }

    let mut works = Vec::new();

    if let Some(edges) = json_val["data"]["searchWorks"]["edges"].as_array() {
        for edge in edges {
            let node = &edge["node"];
            let annict_id = node["annictId"].as_i64().unwrap_or(0);
            let title = node["title"].as_str().unwrap_or("").to_string();
            let media = node["media"].as_str().map(|s| s.to_string());
            let season_year = node["seasonYear"].as_i64().map(|y| y as i32);

            let mut episodes = Vec::new();
            if let Some(ep_edges) = node["episodes"]["edges"].as_array() {
                for ep_edge in ep_edges {
                    let ep_node = &ep_edge["node"];
                    episodes.push(EpisodeNode {
                        annict_id: ep_node["annictId"].as_i64(),
                        number: ep_node["number"].as_i64().map(|n| n as i32),
                        number_text: ep_node["numberText"].as_str().map(|s| s.to_string()),
                        title: ep_node["title"].as_str().map(|s| s.to_string()),
                    });
                }
            }

            works.push(WorkItem {
                annict_id,
                title,
                media,
                season_year,
                episodes_count: episodes.len(),
                episodes,
            });
        }
    }

    Ok(works)
}
