# DevReport - Git 提交记录智能总结工具

[English](./README_EN.md) | 简体中文

<div align="center">

![DevReport Logo](./src-tauri/icons/icon.png)

一款基于 Git 提交记录的智能工作报告生成工具，支持日报、周报、月报等多种报告类型。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-blue.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19.1-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg)](https://www.typescriptlang.org/)

</div>

## ✨ 核心特性

- 🚀 **纯前端桌面应用** - 基于 Tauri + React，无需服务端，数据完全本地存储
- 📊 **多项目支持** - 支持添加多个 Git 项目，自动识别子模块
- 🤖 **AI 智能总结** - 对接自定义 LLM API，自动生成专业工作报告
- ⏰ **跨天统计** - 支持凌晨提交记录的智能时间修正
- 📝 **多种报告类型** - 日报、周报、月报、季报、年报，灵活配置
- 🎨 **现代化 UI** - 基于 Ant Design，支持深色模式
- 🔒 **数据安全** - API Key 本地加密存储，数据隐私有保障
- 💾 **导出功能** - 支持导出为 Markdown、复制到剪贴板

## 📸 功能预览

### 主界面
- 项目管理：添加、编辑、删除 Git 项目
- 报告生成：选择时间范围，一键生成工作报告
- 历史记录：查看和管理历史生成的报告

### 核心功能
1. **项目配置**
   - 添加本地 Git 仓库路径
   - 自动识别并选择子模块
   - 筛选提交人（支持多选）
   - 独立的 LLM 配置

2. **报告生成**
   - 灵活的时间范围选择（今日、昨日、本周、本月等）
   - 跨天统计功能（解决凌晨提交统计问题）
   - 实时预览 Git 提交记录
   - 流式生成报告内容

3. **全局设置**
   - 报告默认字数配置
   - LLM 参数设置
   - 界面主题切换

## 🛠️ 技术栈

- **前端框架**: React 19.1 + TypeScript
- **桌面框架**: Tauri 2.0
- **UI 组件**: Ant Design 6.3
- **样式方案**: Tailwind CSS 4.2
- **状态管理**: Zustand 5.0
- **Markdown 渲染**: react-markdown
- **构建工具**: Vite 7.0

## 📦 安装使用

### 下载安装包

前往 [Releases](https://github.com/zhanBoss/DevReport/releases) 页面下载最新版本：

- **macOS (Apple Silicon)**: `DevReport_1.0.0_aarch64.dmg`
- **macOS (Intel)**: `DevReport_1.0.0_x64.dmg`
- **Windows**: `DevReport_1.0.0_x64.msi`
- **Linux**: `DevReport_1.0.0_amd64.deb` / `DevReport_1.0.0_x86_64.AppImage`

### 首次使用

1. 安装并启动应用
2. 点击「添加项目」，输入 Git 仓库路径
3. 配置 LLM API 参数（支持 OpenAI、国内大模型等）
4. 选择时间范围，生成第一份报告

## 🚀 开发指南

### 环境要求

- Node.js 18+ 
- Rust 1.70+
- Git 2.0+

### 本地开发

```bash
# 克隆项目
git clone https://github.com/zhanBoss/DevReport.git
cd DevReport

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建应用
npm run build
```

### 项目结构

```
DevReport/
├── src/                      # 前端源码
│   ├── components/          # React 组件
│   ├── pages/              # 页面组件
│   ├── stores/             # Zustand 状态管理
│   ├── types/              # TypeScript 类型定义
│   └── utils/              # 工具函数
├── src-tauri/              # Tauri 后端
│   ├── src/               # Rust 源码
│   ├── icons/             # 应用图标
│   └── tauri.conf.json    # Tauri 配置
├── public/                 # 静态资源
└── package.json           # 项目配置
```

## 🔧 配置说明

### LLM API 配置

应用支持对接任何兼容 OpenAI API 格式的大模型服务：

```json
{
  "apiKey": "your-api-key",
  "baseUrl": "https://api.openai.com/v1",
  "model": "gpt-3.5-turbo",
  "temperature": 0.7,
  "timeout": 30000
}
```

支持的服务商（举例）：
- OpenAI (GPT-3.5/4)
- 国内大模型（通义千问、文心一言、豆包等）
- 自建 LLM 服务

### 本地存储路径

- **macOS**: `~/Library/Application Support/com.devreport.app/`
- **Windows**: `%APPDATA%/com.devreport.app/`
- **Linux**: `~/.config/com.devreport.app/`

存储内容：
- `config.json` - 全局配置和项目配置
- `reports/` - 历史生成的报告

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: 添加某个很棒的功能'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### Commit 规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat: 新功能`
- `fix: 修复 Bug`
- `docs: 文档更新`
- `style: 代码格式调整`
- `refactor: 代码重构`
- `test: 测试相关`
- `chore: 构建/工具链相关`

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 开源。

## 🙏 致谢

- [Tauri](https://tauri.app/) - 优秀的桌面应用框架
- [React](https://react.dev/) - 强大的前端框架
- [Ant Design](https://ant.design/) - 企业级 UI 组件库
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架

## 📮 联系方式

如有问题或建议，欢迎通过以下方式联系：

- 提交 [Issue](https://github.com/zhanBoss/DevReport/issues)

---

**Star ⭐ 这个项目，如果它对你有帮助！**
