use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri_plugin_autostart::ManagerExt;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct GlobalConfig {
    pub floating_ball: FloatingBallConfig,
    pub reports: ReportDefaults,
    pub llm: LlmConfig,
    pub dark_mode: bool,
    pub auto_show_ball: bool,
    pub projects: Vec<ProjectConfig>,
    pub first_launch: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FloatingBallConfig {
    pub size: u32,
    pub opacity: u32,
    pub position: Position,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReportDefaults {
    pub daily: u32,
    pub weekly: u32,
    pub monthly: u32,
    pub quarterly: u32,
    pub yearly: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectConfig {
    pub id: String,
    pub name: String,
    pub repo_path: String,
    pub authors: Vec<String>,
    pub submodules: Vec<SubmoduleConfig>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SubmoduleConfig {
    pub path: String,
    pub name: String,
    pub enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LlmConfig {
    pub api_key: String,
    pub base_url: String,
    pub model: String,
    pub timeout: u32,
    pub temperature: f64,
}

impl Default for GlobalConfig {
    fn default() -> Self {
        Self {
            floating_ball: FloatingBallConfig {
                size: 50,
                opacity: 80,
                position: Position { x: -1.0, y: -1.0 },
            },
            reports: ReportDefaults {
                daily: 100,
                weekly: 300,
                monthly: 500,
                quarterly: 800,
                yearly: 1000,
            },
            llm: LlmConfig {
                api_key: String::new(),
                base_url: "https://api.openai.com/v1".to_string(),
                model: "gpt-3.5-turbo".to_string(),
                timeout: 30,
                temperature: 0.7,
            },
            dark_mode: true,
            auto_show_ball: true,
            projects: vec![],
            first_launch: true,
        }
    }
}

fn get_config_dir() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir()
        .ok_or("无法获取配置目录")?
        .join("dev-report");
    
    fs::create_dir_all(&config_dir)
        .map_err(|e| format!("创建配置目录失败: {}", e))?;
    
    Ok(config_dir)
}

fn get_config_file_path() -> Result<PathBuf, String> {
    Ok(get_config_dir()?.join("config.json"))
}

#[tauri::command]
pub fn get_config_path() -> Result<String, String> {
    let path = get_config_file_path()?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn load_config() -> Result<GlobalConfig, String> {
    let config_path = get_config_file_path()?;
    
    if !config_path.exists() {
        let default_config = GlobalConfig::default();
        let json = serde_json::to_string_pretty(&default_config)
            .map_err(|e| format!("序列化配置失败: {}", e))?;
        fs::write(&config_path, json)
            .map_err(|e| format!("写入配置文件失败: {}", e))?;
        return Ok(default_config);
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("读取配置文件失败: {}", e))?;
    
    let mut config: GlobalConfig = serde_json::from_str(&content)
        .map_err(|e| format!("解析配置文件失败: {}", e))?;
    
    // 数据迁移：更新旧的字数配置为新的推荐值
    let mut need_save = false;
    
    if config.reports.daily == 300 {
        config.reports.daily = 100;
        need_save = true;
    }
    if config.reports.weekly == 800 {
        config.reports.weekly = 300;
        need_save = true;
    }
    if config.reports.monthly == 1500 {
        config.reports.monthly = 500;
        need_save = true;
    }
    if config.reports.quarterly == 3000 {
        config.reports.quarterly = 800;
        need_save = true;
    }
    if config.reports.yearly == 5000 {
        config.reports.yearly = 1000;
        need_save = true;
    }
    
    if need_save {
        eprintln!("检测到旧的字数配置，已自动更新为推荐值");
        let _ = save_config(config.clone());
    }
    
    // 数据迁移：如果全局 LLM 配置为空但项目中有 LLM 配置，则迁移第一个
    if config.llm.api_key.is_empty() || config.llm.model.is_empty() {
        // 尝试从原始 JSON 解析旧结构
        if let Ok(mut raw_json) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(projects) = raw_json.get_mut("projects").and_then(|p| p.as_array_mut()) {
                for project in projects.iter_mut() {
                    if let Some(llm) = project.get("llm").and_then(|l| l.as_object()) {
                        if let (Some(api_key), Some(base_url), Some(model)) = (
                            llm.get("api_key").and_then(|k| k.as_str()),
                            llm.get("base_url").and_then(|u| u.as_str()),
                            llm.get("model").and_then(|m| m.as_str()),
                        ) {
                            if !api_key.is_empty() && !model.is_empty() {
                                config.llm.api_key = api_key.to_string();
                                config.llm.base_url = base_url.to_string();
                                config.llm.model = model.to_string();
                                if let Some(timeout) = llm.get("timeout").and_then(|t| t.as_u64()) {
                                    config.llm.timeout = timeout as u32;
                                }
                                if let Some(temp) = llm.get("temperature").and_then(|t| t.as_f64()) {
                                    config.llm.temperature = temp;
                                }
                                eprintln!("已从项目配置迁移 LLM 配置到全局");
                                
                                // 保存迁移后的配置
                                let _ = save_config(config.clone());
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
    
    Ok(config)
}

#[tauri::command]
pub fn save_config(config: GlobalConfig) -> Result<(), String> {
    let config_path = get_config_file_path()?;
    
    let json = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("序列化配置失败: {}", e))?;
    
    fs::write(&config_path, json)
        .map_err(|e| format!("保存配置文件失败: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub fn get_autostart_enabled(app: tauri::AppHandle) -> Result<bool, String> {
    let autostart_manager = app.autolaunch();
    autostart_manager
        .is_enabled()
        .map_err(|e| format!("获取自启动状态失败: {}", e))
}

#[tauri::command]
pub fn set_autostart_enabled(app: tauri::AppHandle, enable: bool) -> Result<(), String> {
    let autostart_manager = app.autolaunch();
    
    if enable {
        autostart_manager
            .enable()
            .map_err(|e| format!("启用自启动失败: {}", e))
    } else {
        autostart_manager
            .disable()
            .map_err(|e| format!("禁用自启动失败: {}", e))
    }
}
