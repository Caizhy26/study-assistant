# 本次迁移说明：队友新版本「删除 / 清空日程」能力并入 v2.1 后端代理主线

## 迁移了哪些功能

### 1. 自然语言删除 / 清空日程
已把队友新版本中的以下能力迁入当前带后端代理的主线：

- 删除指定任务：`删除 id: xxx`
- 删除指定时段：`删除今天下午`、`删除 2026-04-15 晚上`
- 清空一个时间范围：`清空本周`

实现位置：
- `src/pages/IntakePage.jsx`
- `src/App.jsx`

### 2. App 层新增真正执行删除的系统函数
新增了：
- `deleteScheduleById(id)`
- `deleteScheduleByTime(date, slot)`
- `clearScheduleByRange(startDate, endDate)`
- `runOptimizer(overrideOccupiedBlocks)`

这些函数不只是删一条聊天记录，而是会真正修改任务数据，并触发重排。

### 3. 引入 occupiedBlocks 作为时间封锁约束
新增本地状态：
- `occupiedBlocks`

删除某个时段或清空某个时间范围后，会把这些时间块记录为“临时事务”，后续排程会避开这些时间。

实现位置：
- `src/App.jsx`
- `src/utils/study.js`

### 4. study 排程逻辑支持避开 occupiedBlocks
以下函数已经改为支持 `occupiedBlocks`：
- `collectCurrentWeekFreeSlots(schedule, occupiedBlocks)`
- `getWeeklyPlanMeta(profile, occupiedBlocks)`
- `collectFreeSlots(schedule, days, occupiedBlocks)`
- `buildWeeklyTaskSuggestions(profile, issues, currentEnergy, occupiedBlocks)`
- `replanPendingTasks(tasks, schedule, currentEnergy, occupiedBlocks)`

这意味着删除后的时间不会在重排时又被立刻占回去。

### 5. IntakePage 支持本地优先解析删除动作
现在即使 AI 没有参与，或当前后端 / 模型暂时异常，只要用户输入能匹配规则，也会直接执行删除操作。

新增本地规则：
- `normalizeSlotText()`
- `parseDateFromText()`
- `parseActionFromUserText()`
- `runAction()`

### 6. AI system prompt 已补充 action 协议
`src/services/aiService.js` 中的 `AI_SYSTEM_PROMPT` 已补充删除 / 清空日程相关协议，允许在线模型返回：

- `type: "action"`
- `action: "delete_schedule" | "delete_schedule_by_id" | "clear_schedule_range"`
- `payload: {}`

当前前端已经兼容解析并执行这些动作。

### 7. Intake 页面会展示已记录的事务占用
在 `IntakePage` 里新增了“已记录的事务占用”展示，便于确认哪些时间已被封锁。

---

## 队友新版本这次的主要改动（总结）

相对上一版队友前端版本，这次核心改动集中在三处：

1. **新增删除日程能力**
   - 能通过自然语言删除指定时段或清空某段时间
   - 不再只会“加任务”，开始具备“撤销 / 调整”的能力

2. **App 层补齐真正的数据修改逻辑**
   - 聊天页不只是回复文字，而是能驱动系统动作

3. **PROJECT_STRUCTURE.md 文档同步更新**
   - 开始把控制流、策略层、action bridge 讲清楚，协作维护性更好

---

## 队友新版本里存在的 bug / 风险

### 1. 仍然是前端直连第三方 API
队友新版本本身仍然没有后端代理层，还是纯前端直连：
- 文本接口直接打第三方
- 图片接口直接打第三方
- API Key 仍可能保存在前端侧

这会带来：
- 密钥安全问题
- 正式部署不稳定
- 线上可维护性差

本次迁移已保留你当前 v2.1 的后端代理主线，没有回退到前端直连。

### 2. 删除指令的自然语言识别还比较窄
当前规则主要支持：
- 今天 / 明天 / 后天
- 明确的 `YYYY-MM-DD`
- 上午 / 下午 / 晚上
- 本周

但像下面这些表达仍不稳定：
- `删掉周三晚上的安排`
- `把下周二下午的学习先拿掉`
- `这两天先别排`

也就是说，本地规则已够用，但离“自然语言完全鲁棒”还有差距。

### 3. 清空本周会把整个范围都封锁
`clearScheduleByRange()` 的语义不是“只删掉已有任务”，而是：
- 删除已有任务
- 并把整个范围所有时段加入 occupiedBlocks

这很适合“这周都没法学”的场景；
但如果用户其实只是想“清空已排任务、稍后重新安排”，就会显得过重。

### 4. 大文件继续变重
这个问题在队友版本里仍然存在，尤其是：
- `IntakePage.jsx`
- `App.jsx`

业务能力虽然增强了，但控制流仍然集中在大文件里，后面最好继续拆：
- action parser
- action executor
- AI response adapter
- occupiedBlocks store helper

### 5. 删除 by id 对普通用户不够友好
虽然支持 `删除 id: xxx`，但普通用户通常并不知道任务 id。
实际更适合后续补充：
- 根据日期 + 科目 + 标题片段删除
- 在任务卡片上加直接删除按钮

---

## 本次迁移后仍然已知的限制

1. 目前本地规则删除日期解析还不支持“周三/周五”这类星期表达
2. `occupiedBlocks` 已经会影响排程，但计划页和任务页目前还没有单独的“占用块编辑 UI”
3. 由于你上传包自带的 `node_modules` 缺少 `rolldown` 原生 binding，当前环境里无法直接完成 `vite build`；
   但相关源码已通过 ESLint 检查。建议本地先删除旧 `node_modules` 再重新 `npm install`

---

## 建议的下一步

1. 给计划页 / 任务页增加“删除 / 解封某个 occupied block”的可视化入口
2. 补充对“周三晚上 / 下周二下午”这类自然语言时间解析
3. 把 IntakePage 里的 action 解析和执行拆成独立模块
4. 给删除操作加二次确认或撤销（undo）机制
