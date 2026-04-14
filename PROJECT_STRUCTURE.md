# 项目结构（PROJECT_STRUCTURE）

本文档用于协作开发时快速理解代码分层、文件职责与影响范围。
与 V1（纯前端版）相比，V2 最关键的变化是：**前端不再直连第三方模型，统一打到后端代理 `/api/*`，Key 放在服务端环境变量里**。

## 一、目录树

```text
.
├─ server/
│  └─ index.mjs             # 后端代理：/api/health, /api/chat, /api/vision
├─ .env.example             # Key 与端口模板（复制为 .env 后填写）
├─ vite.config.js           # 前端 dev 时 /api 反代到 http://localhost:8787
└─ src/
   ├─ main.jsx
   ├─ App.jsx
   ├─ index.css
   ├─ constants/
   │  └─ appConstants.js    # DAYS / SLOTS / SLOT_LABELS 等全局常量
   ├─ services/
   │  └─ aiService.js       # AI 调用统一入口 + 离线 fallback + JSON 提取
   ├─ hooks/
   │  ├─ useStore.js        # localStorage 持久化的通用状态 Hook
   │  ├─ useNow.js          # 定时更新"当前时间戳"
   │  └─ useTimerState.js   # 计时器默认结构
   ├─ utils/
   │  ├─ core.js            # uid / today / fmt / addDays 等日期与 id 工具
   │  └─ study.js           # 任务去重合并、周/月规划、重排、复习与报告统计
   ├─ styles/
   │  ├─ appStyles.js       # App 壳层布局样式
   │  └─ commonStyles.js    # 多页面复用的样式常量
   ├─ components/
   │  ├─ ui.jsx             # Card / Button / Input / Select / Tag / MiniBarChart 等
   │  ├─ AttachmentUploader.jsx  # 图片上传 + 视觉识别触发
   │  └─ hubs/
   │     ├─ StudyHub.jsx    # "日程"域：plan / tasks / review 子路由容器
   │     ├─ StateHub.jsx    # "学习"域：timer / energy 子路由容器
   │     └─ SubTabBar.jsx   # Hub 内的二级 Tab 组件
   └─ pages/
      ├─ HomePage.jsx       # 总览
      ├─ IntakePage.jsx     # AI 摸底对话（走 /api/chat）
      ├─ IntakeFormPage.jsx # 摸底手动表单
      ├─ NowPage.jsx        # 现在做什么
      ├─ PlanPage.jsx       # 周日历 + 月度粗规划
      ├─ TasksPage.jsx      # 任务清单
      ├─ ReviewPage.jsx     # 复习队列
      ├─ TimerPage.jsx      # 计时器 + 学习反馈
      ├─ EnergyPage.jsx     # 精力记录
      └─ ReportPage.jsx     # 学习报告
```

## 二、文件功能清单

| 文件路径 | 核心功能（1 句话） | 主要依赖 | 被谁引用 |
|---|---|---|---|
| `server/index.mjs` | 后端代理：从服务端环境变量读 Key，再转发到 DeepSeek / 视觉接口；暴露 `/api/health`、`/api/chat`、`/api/vision` | Node 原生 http | 独立进程 |
| `vite.config.js` | 前端 dev 端口 52475，`/api` 反代到 `localhost:8787` | Vite | 开发服务器 |
| `.env.example` | 列出 `DEEPSEEK_API_KEY`、`VISION_API_KEY`、`PORT`、`VITE_API_BASE_URL` 等配置 | 文本 | 手工复制为 `.env` |
| `src/main.jsx` | 应用入口 | React、`App.jsx` | 入口 |
| `src/App.jsx` | 顶层状态 + Tab 路由 + 装配各页面与 Hub | `hooks/*`、`utils/study.js`、`styles/appStyles.js`、`components/ui.jsx`、`components/hubs/*`、`pages/**` | `main.jsx` |
| `src/constants/appConstants.js` | 全局常量：DAYS / SLOTS / SLOT_LABELS | JS 常量 | `services/aiService.js`、各页面 |
| `src/services/aiService.js` | **AI 统一入口**：`callAIChat` → `/api/chat`，`callVisionAI` → `/api/vision`，`checkAIHealth` → `/api/health`；以及 JSON 提取、离线 fallback、摸底 prompt | React 无关；`constants`、`utils` | `pages/IntakePage.jsx`、`components/AttachmentUploader.jsx` |
| `src/hooks/useStore.js` | localStorage 持久化 Hook | React | `App.jsx`、`pages/IntakePage.jsx` 等 |
| `src/hooks/useNow.js` | 每秒自增的 now 时间戳 | React | `App.jsx` |
| `src/hooks/useTimerState.js` | 计时器默认状态（普通 + 番茄钟） | JS | `App.jsx`、`TimerPage.jsx` |
| `src/utils/core.js` | `uid` / `today` / `fmt` / `addDays` 等纯函数 | JS | 几乎所有业务文件 |
| `src/utils/study.js` | 任务去重合并、周/月规划、重排、复习间隔、报告统计 | `utils/core.js`、`constants` | `App.jsx`、多数页面 |
| `src/components/ui.jsx` | 通用 UI 基础组件 | React | 所有页面 |
| `src/components/AttachmentUploader.jsx` | 课表图片上传 → 触发 `callVisionAI` | `services/aiService.js` | `IntakePage.jsx` |
| `src/components/hubs/StudyHub.jsx` | plan / tasks / review 三子页切换 | `pages/PlanPage`、`TasksPage`、`ReviewPage`、`SubTabBar` | `App.jsx` |
| `src/components/hubs/StateHub.jsx` | timer / energy 两子页切换 | `pages/TimerPage`、`EnergyPage`、`SubTabBar` | `App.jsx` |
| `src/components/hubs/SubTabBar.jsx` | Hub 内的二级 Tab 栏 | React | 两个 Hub |
| `src/pages/IntakePage.jsx` | AI 摸底对话 + 图片识别课表 + 自动合并任务；启动时调 `checkAIHealth()` 显示"在线/离线"状态 | `services/aiService.js`、`useStore`、`components/ui.jsx`、`IntakeFormPage` | `App.jsx` |
| `src/pages/IntakeFormPage.jsx` | 手动录入科目、课表等信息 | `components/ui.jsx`、`useStore` | `IntakePage.jsx` |
| `src/pages/HomePage.jsx` | 总览页 | `components/ui.jsx`、`utils/study.js` | `App.jsx` |
| `src/pages/NowPage.jsx` | "现在做什么"推荐 | `components/ui.jsx`、`utils/study.js` | `App.jsx` |
| `src/pages/PlanPage.jsx` | 周日历 + 月度粗规划 + 导入/重排入口 | `components/ui.jsx`、`utils/study.js` | `StudyHub.jsx` |
| `src/pages/TasksPage.jsx` | 任务清单：增删改筛选、完成/卡住/顺延 | `components/ui.jsx`、`utils/study.js` | `StudyHub.jsx` |
| `src/pages/ReviewPage.jsx` | 复习队列：按间隔推进 nextDate | `components/ui.jsx`、`utils/study.js` | `StudyHub.jsx` |
| `src/pages/TimerPage.jsx` | 计时器（普通/番茄钟）+ 学习反馈写入 records/reviews/issues/tasks/achievements | `hooks/useTimerState.js`、`components/ui.jsx`、`utils/study.js` | `StateHub.jsx` |
| `src/pages/EnergyPage.jsx` | 精力记录 + 触发按精力重排 | `components/ui.jsx`、`utils/study.js` | `StateHub.jsx` |
| `src/pages/ReportPage.jsx` | 今日 / 近 7 天学习报告 | `components/ui.jsx`、`utils/study.js` | `App.jsx` |

## 三、协作标注

### 核心公共文件（改前需通知队友）

- `src/App.jsx`（顶层状态、Tab 路由、context 装配）
- `src/services/aiService.js`（AI 调用与离线 fallback 的唯一入口，Prompt 与 JSON 结构也在这）
- `src/utils/study.js`（规划算法/数据结构）
- `src/hooks/useStore.js`（localStorage 数据兼容）
- `src/components/ui.jsx`、`src/styles/*`（全局样式/组件一致性）
- `src/constants/appConstants.js`（DAYS/SLOTS 改了会全站炸）
- `server/index.mjs`（接口契约）

### 修改时容易影响其他地方的文件

- `src/pages/IntakePage.jsx`：AI 对话 / 图片识别 / 合并写入 profile/tasks/issues 的关键链路
- `src/pages/TimerPage.jsx`：写 records/reviews/issues/tasks/achievements，多处页面读这些数据
- `src/pages/PlanPage.jsx`：展示与修改 tasks 的 done 状态，依赖 weeklyPreview 投影规则

### 独立页面（可并行修改）

- `HomePage.jsx`、`NowPage.jsx`、`ReportPage.jsx`
- `TasksPage.jsx`、`ReviewPage.jsx`、`EnergyPage.jsx`

涉及写入数据结构字段（如 tasks/records 字段名）时仍需同步。

## 四、与 V1 的映射关系

| V1 位置 | V2 位置 | 备注 |
|---|---|---|
| `src/pages/home/IntakePage.jsx` 里的 `callSCNetAI` | `src/services/aiService.js` 的 `callAIChat`（`callSCNetAI` 作为别名保留） | 改走 `/api/chat` |
| `src/pages/home/IntakePage.jsx` 里的 `callSCNetVision` | `src/services/aiService.js` 的 `callVisionAI`（`callSCNetVision` 别名保留） | 改走 `/api/vision` |
| 浏览器 localStorage 里的 `sa_api_key` | 服务端 `.env` 的 `DEEPSEEK_API_KEY` | 不再暴露给前端 |
| `src/pages/study/StudyHub.jsx` | `src/components/hubs/StudyHub.jsx` | 升级为通用组件 |
| `src/pages/state/StateHub.jsx` | `src/components/hubs/StateHub.jsx` | 同上 |
| `src/utils/planning.js` | 拆成 `src/utils/core.js` + `src/utils/study.js` | 关注点分离 |
| `src/pages/home/*.jsx`、`state/*.jsx`、`study/*.jsx` | 统一放在 `src/pages/` | 扁平化，由 Hub/App 按需聚合 |

## 五、启动与部署速查

本地开发：

```bash
# 终端 1
npm run dev:backend        # 监听 8787
# 终端 2
npm run dev:frontend       # 监听 52475，/api 自动反代
```

部署：

- **同域部署**：把 `vite build` 产物交给任意静态服务器，反向代理把 `/api/*` 转到 `server/index.mjs`（8787）。
- **分域部署**：前端构建前设置 `VITE_API_BASE_URL=https://你的后端域名`，后端独立部署并开放 CORS。
