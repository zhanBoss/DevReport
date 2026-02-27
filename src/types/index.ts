export interface FloatingBallConfig {
  size: number;
  opacity: number;
  position: { x: number; y: number };
}

export interface ReportDefaults {
  daily: number;
  weekly: number;
  monthly: number;
  quarterly: number;
  yearly: number;
}

export interface LlmConfig {
  api_key: string;
  base_url: string;
  model: string;
  timeout: number;
  temperature: number;
}

export interface SubmoduleConfig {
  path: string;
  name: string;
  enabled: boolean;
}

export interface ProjectConfig {
  id: string;
  name: string;
  repo_path: string;
  authors: string[];
  submodules: SubmoduleConfig[];
}

export interface GlobalConfig {
  floating_ball: FloatingBallConfig;
  reports: ReportDefaults;
  llm: LlmConfig;
  dark_mode: boolean;
  auto_show_ball: boolean;
  save_reports: boolean;
  projects: ProjectConfig[];
  first_launch: boolean;
}

export interface GitCommit {
  hash: string;
  author: string;
  email: string;
  date: string;
  message: string;
  files: GitFile[];
}

export interface GitFile {
  status: string;
  path: string;
}

export interface GitSubmodule {
  name: string;
  path: string;
}

export interface GitStats {
  total_commits: number;
  total_files_changed: number;
  authors: string[];
  date_range: [string, string];
  sample_commits: GitCommit[];
  file_changes_summary: FileChangeSummary[];
}

export interface FileChangeSummary {
  path: string;
  change_count: number;
}

export interface Report {
  id: string;
  project_name: string;
  project_id: string;
  report_type: ReportType;
  content: string;
  git_commits_summary: string;
  created_at: string;
  time_range: {
    since: string;
    until: string;
  };
}

export type ReportType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type TimeRangePreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'this_quarter' | 'this_year' | 'custom';

export interface StreamChunk {
  content: string;
  done: boolean;
  error: string | null;
}

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  daily: '日报',
  weekly: '周报',
  monthly: '月报',
  quarterly: '季报',
  yearly: '年报',
};

export const TIME_RANGE_LABELS: Record<TimeRangePreset, string> = {
  today: '今日',
  yesterday: '昨日',
  this_week: '本周',
  this_month: '本月',
  this_quarter: '本季度',
  this_year: '本年度',
  custom: '自定义',
};

