use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct GitCommit {
    pub hash: String,
    pub author: String,
    pub email: String,
    pub date: String,
    pub message: String,
    pub files: Vec<GitFile>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitFile {
    pub status: String,
    pub path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitSubmodule {
    pub name: String,
    pub path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitStats {
    pub total_commits: usize,
    pub total_files_changed: usize,
    pub authors: Vec<String>,
    pub date_range: (String, String),
    pub sample_commits: Vec<GitCommit>, // 抽样展示，最多 50 条
    pub file_changes_summary: Vec<FileChangeSummary>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileChangeSummary {
    pub path: String,
    pub change_count: usize,
}

const FIELD_SEPARATOR: &str = "\x1e";

fn validate_path(path: &str) -> Result<(), String> {
    let p = Path::new(path);
    if !p.is_absolute() {
        return Err("路径必须是绝对路径".to_string());
    }
    if !p.is_dir() {
        return Err(format!("路径不存在或不是目录: {}", path));
    }
    Ok(())
}

fn validate_date(date: &str) -> Result<(), String> {
    if date.len() > 30 || date.contains('\n') || date.starts_with('-') {
        return Err(format!("无效的日期格式: {}", date));
    }
    Ok(())
}

#[tauri::command]
pub fn check_git_installed() -> Result<String, String> {
    let output = Command::new("git")
        .arg("--version")
        .output()
        .map_err(|e| format!("Git 未安装或无法执行: {}", e))?;

    if output.status.success() {
        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(version)
    } else {
        Err("Git 未安装，请先安装 Git".to_string())
    }
}

#[tauri::command]
pub fn get_folder_name(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    let name = p
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path.clone());
    Ok(name)
}

#[tauri::command]
pub fn validate_repo_path(path: String) -> Result<bool, String> {
    validate_path(&path)?;

    let output = Command::new("git")
        .args(["rev-parse", "--is-inside-work-tree"])
        .current_dir(&path)
        .output()
        .map_err(|e| format!("无法访问路径: {}", e))?;

    Ok(output.status.success())
}

#[tauri::command]
pub fn get_git_authors(path: String) -> Result<Vec<String>, String> {
    validate_path(&path)?;

    let output = Command::new("git")
        .args(["log", "--format=%an <%ae>", "--all"])
        .current_dir(&path)
        .output()
        .map_err(|e| format!("获取提交人失败: {}", e))?;

    if !output.status.success() {
        return Err("获取提交人列表失败".to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut authors: Vec<String> = stdout
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .collect();

    authors.sort();
    authors.dedup();
    Ok(authors)
}

#[tauri::command]
pub fn get_git_submodules(path: String) -> Result<Vec<GitSubmodule>, String> {
    validate_path(&path)?;

    let output = Command::new("git")
        .args(["submodule", "status"])
        .current_dir(&path)
        .output()
        .map_err(|e| format!("获取子模块失败: {}", e))?;

    if !output.status.success() {
        return Ok(vec![]);
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let base_path = PathBuf::from(&path);
    let submodules: Vec<GitSubmodule> = stdout
        .lines()
        .filter(|l| !l.trim().is_empty())
        .filter_map(|line| {
            let parts: Vec<&str> = line.trim().splitn(3, ' ').collect();
            if parts.len() >= 2 {
                let submodule_path = parts[1].to_string();
                let name = submodule_path
                    .split('/')
                    .last()
                    .unwrap_or(&submodule_path)
                    .to_string();
                let full_path = base_path.join(&submodule_path);
                Some(GitSubmodule {
                    name,
                    path: full_path.to_string_lossy().to_string(),
                })
            } else {
                None
            }
        })
        .collect();

    Ok(submodules)
}

#[tauri::command]
pub fn get_git_log(
    path: String,
    since: String,
    until: String,
    authors: Vec<String>,
    include_submodules: Vec<String>,
) -> Result<Vec<GitCommit>, String> {
    validate_path(&path)?;
    validate_date(&since)?;
    validate_date(&until)?;

    for author in &authors {
        if author.starts_with('-') {
            return Err(format!("无效的作者名: {}", author));
        }
    }

    let mut all_commits = Vec::new();

    let main_commits = fetch_git_log(&path, &since, &until, &authors)?;
    all_commits.extend(main_commits);

    for sub_path in include_submodules {
        if let Err(e) = validate_path(&sub_path) {
            eprintln!("子模块路径无效 ({}): {}", sub_path, e);
            continue;
        }
        match fetch_git_log(&sub_path, &since, &until, &authors) {
            Ok(sub_commits) => all_commits.extend(sub_commits),
            Err(e) => eprintln!("子模块日志获取失败 ({}): {}", sub_path, e),
        }
    }

    all_commits.sort_by(|a, b| b.date.cmp(&a.date));
    Ok(all_commits)
}

fn fetch_git_log(
    path: &str,
    since: &str,
    until: &str,
    authors: &[String],
) -> Result<Vec<GitCommit>, String> {
    let format_str = format!(
        "--pretty=format:%H{}%an{}%ae{}%ai{}%s",
        FIELD_SEPARATOR, FIELD_SEPARATOR, FIELD_SEPARATOR, FIELD_SEPARATOR
    );

    let mut args = vec![
        "log".to_string(),
        format!("--since={}", since),
        format!("--until={}", until),
        format_str,
        "--name-status".to_string(),
        "--no-merges".to_string(), // 排除合并提交，提升性能
        "--max-count=1000".to_string(), // 限制最大提交数，防止大仓库卡死
    ];

    for author in authors {
        args.push(format!("--author={}", author));
    }

    eprintln!("执行 Git 命令: git {} (path: {})", args.join(" "), path);

    let output = Command::new("git")
        .args(&args)
        .current_dir(path)
        .output()
        .map_err(|e| format!("获取 Git 日志失败: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Git log 执行失败: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    eprintln!("Git 日志输出大小: {} bytes", stdout.len());
    parse_git_log(&stdout)
}

fn parse_git_log(raw: &str) -> Result<Vec<GitCommit>, String> {
    let mut commits = Vec::new();
    let mut current_commit: Option<GitCommit> = None;

    for line in raw.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        if line.contains(FIELD_SEPARATOR) {
            if let Some(commit) = current_commit.take() {
                commits.push(commit);
            }

            let parts: Vec<&str> = line.splitn(5, FIELD_SEPARATOR).collect();
            if parts.len() == 5 {
                current_commit = Some(GitCommit {
                    hash: parts[0].to_string(),
                    author: parts[1].to_string(),
                    email: parts[2].to_string(),
                    date: parts[3].to_string(),
                    message: parts[4].to_string(),
                    files: Vec::new(),
                });
            }
        } else if let Some(ref mut commit) = current_commit {
            let parts: Vec<&str> = line.splitn(2, '\t').collect();
            if parts.len() == 2 {
                commit.files.push(GitFile {
                    status: parts[0].chars().next().unwrap_or('M').to_string(),
                    path: parts[1].to_string(),
                });
            }
        }
    }

    if let Some(commit) = current_commit {
        commits.push(commit);
    }

    Ok(commits)
}

#[tauri::command]
pub fn get_git_stats(
    path: String,
    since: String,
    until: String,
    authors: Vec<String>,
    include_submodules: Vec<String>,
) -> Result<GitStats, String> {
    validate_path(&path)?;
    validate_date(&since)?;
    validate_date(&until)?;

    for author in &authors {
        if author.starts_with('-') {
            return Err(format!("无效的作者名: {}", author));
        }
    }

    eprintln!("获取 Git 统计信息: {} ({} -> {})", path, since, until);

    // 1. 获取统计数据（不含文件列表，速度快）
    let mut stats_args = vec![
        "log".to_string(),
        format!("--since={}", since),
        format!("--until={}", until),
        "--format=%H".to_string(),
        "--no-merges".to_string(),
    ];
    for author in &authors {
        stats_args.push(format!("--author={}", author));
    }

    let output = Command::new("git")
        .args(&stats_args)
        .current_dir(&path)
        .output()
        .map_err(|e| format!("获取 Git 统计失败: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let main_commit_count = stdout.lines().filter(|l| !l.trim().is_empty()).count();

    // 2. 获取抽样数据（最多 50 条，带文件信息）
    let sample_commits = fetch_git_log_limited(&path, &since, &until, &authors, 50)?;

    // 3. 处理子模块
    let mut total_commits = main_commit_count;
    let mut all_sample_commits = sample_commits;
    
    for sub_path in include_submodules {
        if let Err(e) = validate_path(&sub_path) {
            eprintln!("子模块路径无效 ({}): {}", sub_path, e);
            continue;
        }
        
        let sub_output = Command::new("git")
            .args(&stats_args)
            .current_dir(&sub_path)
            .output();
        
        if let Ok(out) = sub_output {
            let sub_stdout = String::from_utf8_lossy(&out.stdout);
            total_commits += sub_stdout.lines().filter(|l| !l.trim().is_empty()).count();
        }
        
        if let Ok(sub_samples) = fetch_git_log_limited(&sub_path, &since, &until, &authors, 20) {
            all_sample_commits.extend(sub_samples);
        }
    }

    // 限制抽样总数
    all_sample_commits.truncate(50);
    all_sample_commits.sort_by(|a, b| b.date.cmp(&a.date));

    // 4. 统计文件变更
    let mut file_changes: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    let mut authors_set: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut dates: Vec<String> = Vec::new();

    for commit in &all_sample_commits {
        authors_set.insert(commit.author.clone());
        dates.push(commit.date.clone());
        for file in &commit.files {
            *file_changes.entry(file.path.clone()).or_insert(0) += 1;
        }
    }

    let mut file_changes_summary: Vec<FileChangeSummary> = file_changes
        .into_iter()
        .map(|(path, count)| FileChangeSummary { path, change_count: count })
        .collect();
    file_changes_summary.sort_by(|a, b| b.change_count.cmp(&a.change_count));
    file_changes_summary.truncate(20); // 只返回前 20 个最常修改的文件

    dates.sort();
    let date_range = (
        dates.first().cloned().unwrap_or(since.clone()),
        dates.last().cloned().unwrap_or(until.clone()),
    );

    let total_files_changed = all_sample_commits.iter().map(|c| c.files.len()).sum();

    Ok(GitStats {
        total_commits,
        total_files_changed,
        authors: authors_set.into_iter().collect(),
        date_range,
        sample_commits: all_sample_commits,
        file_changes_summary,
    })
}

fn fetch_git_log_limited(
    path: &str,
    since: &str,
    until: &str,
    authors: &[String],
    limit: usize,
) -> Result<Vec<GitCommit>, String> {
    let format_str = format!(
        "--pretty=format:%H{}%an{}%ae{}%ai{}%s",
        FIELD_SEPARATOR, FIELD_SEPARATOR, FIELD_SEPARATOR, FIELD_SEPARATOR
    );

    let mut args = vec![
        "log".to_string(),
        format!("--since={}", since),
        format!("--until={}", until),
        format_str,
        "--name-status".to_string(),
        "--no-merges".to_string(),
        format!("--max-count={}", limit),
    ];

    for author in authors {
        args.push(format!("--author={}", author));
    }

    let output = Command::new("git")
        .args(&args)
        .current_dir(path)
        .output()
        .map_err(|e| format!("获取 Git 日志失败: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Git log 执行失败: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    parse_git_log(&stdout)
}
