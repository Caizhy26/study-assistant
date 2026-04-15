# v2.2 UI Simplify Merge Notes

本次迁移以 `study-assistant-v2_2` 为底座，吸收了队友 `reactproject1(3)` 中更适合长期使用的界面收口与日期处理思路，保留原有后端代理与 `/api/*` 链路。

## 已迁入

### 第一类（高优先级）
- 更统一、朴素的基础控件样式：`src/components/ui/index.jsx`
- 更简洁的整体壳层布局：`src/styles/appStyles.js`
- 新增公共文字样式：`src/styles/commonStyles.js`
- `NowPage` 改成更聚焦的“现在该做什么”入口
- `PlanPage` 改成更聚焦的周视图布局
- `ReportPage` 改成折叠块结构，降低首屏信息密度
- 新增本地日期工具与更多本地日期写法：`src/utils/core.js`
- 替换了一批 `toISOString().split("T")[0]` 的日期写法

### 第二类（可选但已迁入）
- 新增 `src/hooks/useNow.js`
- 新增 `src/hooks/useTimerState.js`
- `App.jsx` 改成更简洁的导航：现在 / 计划 / 日程 / 报告
- `StudyHub` / `StateHub` 改成更稳定的满高滚动布局

## 保留未回退的内容
- `server/index.mjs`
- `api/chat.mjs`
- `api/health.mjs`
- `api/vision.mjs`
- 现有后端代理与环境变量方案
- occupiedBlocks / 删除日程 / 重排逻辑

## 没有直接照搬的内容
- 队友版前端直连模型 API 的写法
- 彻底删除 EnergyPage 的行为（页面仍在项目中，但不再作为主导航入口）
- 彻底删除 HomePage 文件（文件保留，但不再是主入口）
- 完全删掉长期规划解释信息

## 已知风险 / 后续建议
- 还有少量页面如果继续深挖，可能存在更多日期工具可以统一；本次先修了高频路径。
- 当前主导航更简洁，但旧页面文件仍保留，后续可以继续做清理。
- 由于上传包未携带完整可执行依赖，本次在容器内无法完成 `vite build`；已用 TypeScript transpile 方式做过 JSX 级语法校验。
