# CHANGELOG

## v2.2 - 2026-04-15

Bug 修复版本，面向 CloudBase 部署。

### 修复

- **时区 bug**：`src/utils/core.js` 的 `today()` 原先用 `toISOString().split("T")[0]` 算日期，在 UTC+8 时区凌晨 0:00–8:00 之间打开应用会返回前一天。现改为本地时间；新增 `toLocalDateKey()` 工具函数。
- **UTC 残留**：`src/utils/study.js` 的 `collectFreeSlots`、`createReviewItem` 以及 `src/App.jsx` 里 `buildSeedTasks`、`buildSeedProfile`、`seedRecords`、`seedEnergy`、`clearScheduleByRange` 中所有 `toISOString().split("T")[0]` 调用全部替换为本地日期。
- **嵌套 setState 反模式**：`src/App.jsx` 的 `deleteScheduleByTime` 和 `clearScheduleByRange` 原本在 `setOccupiedBlocks` 的 updater 函数里嵌套调用 `setTasks`。React 要求 updater 为纯函数，StrictMode 下会被调用两次，嵌套 setter 也会被重复触发。重构为先同步计算出 `nextBlocks`、再分别独立更新两个 state。
- **`createdAt` 字段类型混用**：种子数据用数字时间戳，`normalizeTaskInput` 和 `importAIPlan` 却回退到 `today()` 字符串，导致同一字段类型不一致。统一改为数字时间戳（`Date.now()`）。
- **视觉 JSON 解析脆弱**：`recognizeScheduleFromAttachment` 原先用贪婪正则 `/\{[\s\S]*\}/` 提取 JSON，遇到嵌套对象或代码块时会错。改为复用已有的 `extractJSONFromReply`（支持 ```json``` 包裹和大括号配平）。

### 新增

- **健康检查超时**：`checkAIHealth` 增加 `AbortController` 5s 默认超时。CloudBase Run 冷启动期间如果不加超时，页面会挂在 loading 状态很久。
- **后端日志**：`server/index.mjs` 在 `/api/chat` 和 `/api/vision` 的 catch 里加 `console.error`，CloudBase Run 日志面板可直接看到上游错误；服务启动时也打印当前文本/视觉接口地址和 Key 是否配置（不打印 Key 本身）。

### CloudBase Dockerfile 调整

- `server/Dockerfile` 去掉硬编码的 `ENV PORT=8787`，`EXPOSE` 改为 80。现在 Node 代码默认 80、Dockerfile 默认 80、CloudBase 监听端口默认 80，三者一致。本地想换端口通过 `docker run -e PORT=8787 -p 8787:8787` 覆盖即可。

### 未改动但值得注意

- `api/*.mjs` 和 `vercel.json`：CloudBase 部署路径不使用。若确定不上 Vercel，可直接删除这四个文件。其导出格式（`export async function POST`）是 Next.js Route Handler 约定，在 `@vercel/node` runtime 下无效；CloudBase 环境下完全不影响。

---

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
