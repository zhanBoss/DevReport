use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Serialize, Deserialize)]
pub struct LlmRequest {
    pub api_key: String,
    pub base_url: String,
    pub model: String,
    pub prompt: String,
    pub temperature: f64,
    pub timeout: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StreamChunk {
    pub content: String,
    pub done: bool,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn stream_llm_request(app: AppHandle, request: LlmRequest) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(request.timeout as u64))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))?;

    let url = format!(
        "{}/chat/completions",
        request.base_url.trim_end_matches('/')
    );

    let body = serde_json::json!({
        "model": request.model,
        "messages": [
            {
                "role": "user",
                "content": request.prompt
            }
        ],
        "temperature": request.temperature,
        "stream": true
    });

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", request.api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            let _ = app.emit(
                "llm-stream",
                StreamChunk {
                    content: String::new(),
                    done: true,
                    error: Some(format!("请求失败: {}", e)),
                },
            );
            format!("LLM 请求失败: {}", e)
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let error_body = response.text().await.unwrap_or_default();
        let error_msg = format!("LLM API 返回错误 ({}): {}", status, error_body);
        let _ = app.emit(
            "llm-stream",
            StreamChunk {
                content: String::new(),
                done: true,
                error: Some(error_msg.clone()),
            },
        );
        return Err(error_msg);
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("读取流失败: {}", e))?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(newline_pos) = buffer.find('\n') {
            let line = buffer[..newline_pos].trim().to_string();
            buffer = buffer[newline_pos + 1..].to_string();

            if line.is_empty() {
                continue;
            }

            let data = match line.strip_prefix("data: ") {
                Some(d) => d,
                None => continue,
            };

            if data == "[DONE]" {
                let _ = app.emit(
                    "llm-stream",
                    StreamChunk {
                        content: String::new(),
                        done: true,
                        error: None,
                    },
                );
                return Ok(());
            }

            if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                if let Some(content) = json["choices"][0]["delta"]["content"].as_str() {
                    let _ = app.emit(
                        "llm-stream",
                        StreamChunk {
                            content: content.to_string(),
                            done: false,
                            error: None,
                        },
                    );
                }
            }
        }
    }

    let _ = app.emit(
        "llm-stream",
        StreamChunk {
            content: String::new(),
            done: true,
            error: None,
        },
    );

    Ok(())
}
