import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { GlobalConfig, ProjectConfig } from "@/types";

interface AppState {
  config: GlobalConfig | null;
  loading: boolean;
  currentPage: string;
  gitInstalled: boolean;
  gitVersion: string;

  loadConfig: () => Promise<void>;
  saveConfig: (config: GlobalConfig) => Promise<void>;
  setCurrentPage: (page: string) => void;
  addProject: (project: ProjectConfig) => Promise<void>;
  updateProject: (project: ProjectConfig) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  checkGitInstalled: () => Promise<void>;
  markFirstLaunchDone: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  config: null,
  loading: true,
  currentPage: "home",
  gitInstalled: false,
  gitVersion: "",

  loadConfig: async () => {
    try {
      set({ loading: true });
      const config = await invoke<GlobalConfig>("load_config");
      set({ config, loading: false });
    } catch (error) {
      console.error("加载配置失败:", error);
      set({ loading: false });
    }
  },

  saveConfig: async (config: GlobalConfig) => {
    try {
      await invoke("save_config", { config });
      set({ config });
    } catch (error) {
      console.error("保存配置失败:", error);
    }
  },

  setCurrentPage: (page: string) => {
    set({ currentPage: page });
  },

  addProject: async (project: ProjectConfig) => {
    const { config } = get();
    if (!config) return;
    const updated = {
      ...config,
      projects: [...config.projects, project],
    };
    await get().saveConfig(updated);
  },

  updateProject: async (project: ProjectConfig) => {
    const { config } = get();
    if (!config) return;
    const updated = {
      ...config,
      projects: config.projects.map((p) => (p.id === project.id ? project : p)),
    };
    await get().saveConfig(updated);
  },

  deleteProject: async (id: string) => {
    const { config } = get();
    if (!config) return;
    const updated = {
      ...config,
      projects: config.projects.filter((p) => p.id !== id),
    };
    await get().saveConfig(updated);
  },

  checkGitInstalled: async () => {
    try {
      const version = await invoke<string>("check_git_installed");
      set({ gitInstalled: true, gitVersion: version });
    } catch {
      set({ gitInstalled: false, gitVersion: "" });
    }
  },

  markFirstLaunchDone: async () => {
    const { config } = get();
    if (!config) return;
    const updated = { ...config, first_launch: false };
    await get().saveConfig(updated);
  },
}));
