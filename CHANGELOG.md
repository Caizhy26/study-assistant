# CHANGELOG

## v2.1 - 2026-04-14

- 修复 `src/pages/IntakePage.jsx` 导入 `callAIChat` / `checkAIHealth` 但 `aiService.js` 未导出导致的运行时错误。
- 在 `src/services/aiService.js` 中实现 `callAIChat`（走 `/api/chat`）和 `checkAIHealth`（走 `/api/health`），并保留 `callSCNetAI` 别名以兼容 V1 迁移代码。
- 补充 `PROJECT_STRUCTURE.md`，按 V2 实际目录重写，并追加与 V1 的映射关系。

---

此文件解释 Visual Studio 如何创建项目。

以下工具用于生成此项目:
- create-vite

以下为生成此项目的步骤:
- 使用 create-vite: `npm init --yes vite@latest reactproject1 -- --template=react  --no-rolldown --no-immediate`. 创建 react 项目
- 正在使用端口更新 `vite.config.js`。
- 创建项目文件 (`reactproject1.esproj`)。
- 创建 `launch.json` 以启用调试。
- 向解决方案添加项目。
- 写入此文件。
