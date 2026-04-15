# Beautify Notes

本次美化版基于 v2.2 后端代理主线制作，未回退为前端直连 API。

## 主要调整
- 优化全局背景、顶部 Header、左侧侧栏层次
- 统一 Card / Button / Input / Tag 等基础控件风格
- 重做 NowPage 首屏层级，让“开始学习”成为主动作
- 优化 PlanPage 的周视图、顶部操作条和任务块质感
- 重做 ReportPage 为更清晰的概览 + 折叠块结构
- 优化 TimerPage 的双栏工作台视觉，保留左侧专注 / 右侧 AI 聊天
- 修正全局根容器样式，避免页面出现奇怪的固定宽度和文字居中问题

## 验证结果
在干净目录重新安装依赖后，以下命令均已通过：

```bash
npm install
npm run build
npm run lint
```

## 注意
压缩包中不包含 node_modules，拿到后请先执行 `npm install`。
