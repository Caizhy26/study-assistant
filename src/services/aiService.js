import { DAYS, SLOTS } from "../constants/appConstants";
import { addDays, today, uid } from "../utils/core";
import { collectFreeSlots, normalizePlannedDate } from "../utils/study";

// AI/离线规则服务：对话、JSON 解析、课表识别、离线任务生成

export const DEFAULT_TEXT_API_URL = "https://api.deepseek.com/chat/completions";
export const DEFAULT_MODEL = "deepseek-chat";

// 图片识别默认保留独立视觉接口，由后端代理统一转发。
export const DEFAULT_VISION_API_URL = "https://api.scnet.cn/api/llm/v1/chat/completions";
export const DEFAULT_VISION_MODEL = "MiniMax-M2.5";

export const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export function buildApiUrl(path = "") {
    if (!path.startsWith("/")) return `${API_BASE_URL}/${path}`;
    return `${API_BASE_URL}${path}`;
}

export const AI_SYSTEM_PROMPT = `你是"小言"，一个专业的大学学习规划师。你的核心任务是通过引导式对话了解用户情况，并且直接把对话内容变成用户日程表上的具体任务。

═══ 引导式对话策略（非常重要）═══
你必须像真人学习规划师一样主动提问，按以下顺序一步步收集信息：
1. 第一步：用户学什么科目？（如果用户只说了"想学数学"，追问具体是高数还是线代）
2. 第二步：用什么教材？（同济？北大？华师？不同教材考点不同）
3. 第三步：考试时间？目标分数？当前基础？
4. 第四步：本周每天有哪些空闲时段可以学习？
5. 第五步：对哪些章节特别没把握？（针对性安排）

每轮回复只问 1-2 个最关键的问题，不要一次性抛出所有问题。

⚠️【强制规则·非常重要】只要满足以下任一条件，本轮就必须在 extractedData.newTasks 里生成 2-7 个具体任务，并把 suggestedAction 设为 "generatePlan"：
(a) 用户说了"帮我安排"/"排进日程"/"加到计划"/"生成计划"/"安排一下"等任何排期意图
(b) 用户提到具体科目 + 任意时间信息（"下周"/"周三下午"/"明天"/"这周"/"考试前"等）
(c) 已经进行了 3 轮以上对话，且至少知道一个科目（哪怕信息不全也要先排，可以在 note 里写"信息待完善"）
(d) 用户表达"我不知道怎么安排"/"你帮我看看"/"随便排"等求助语气

不要无限追问。宁可先排出粗略计划再调整，也不要只聊不排。每次生成 newTasks 时，reply 里要明确说"我已经把以下任务加进了你的日程表"。

═══ 拒绝假大空 ═══
- 绝不只给章节大纲，要拆解到具体考点、题型、易错点
- 例如复习重积分 → 极坐标换元、雅可比行列式、常见体型（体积/质心/转动惯量）、积分限陷阱
- 给的任务必须有具体时间段（周三 14:00-15:30）

═══ 删除 / 清空日程动作（新增）═══
当用户明确表达“删除今天下午的安排”“移除某个 id 的任务”“清空本周日程”这类意图时：
- 不要生成 newTasks
- 将 type 设为 "action"
- action 只能是 delete_schedule / delete_schedule_by_id / clear_schedule_range
- payload 根据动作填写：
  - delete_schedule: {"date":"YYYY-MM-DD","slot":"morning|afternoon|evening"}
  - delete_schedule_by_id: {"id":"任务id"}
  - clear_schedule_range: {"startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD"}
- extractedData 设为空对象
- suggestedAction 设为 "none"

═══ 输出 JSON 格式（严格遵守，不要多余文字）═══
{
  "type": "message|action",
  "action": "delete_schedule|delete_schedule_by_id|clear_schedule_range|",
  "payload": {},
  "reply": "给用户看的自然回复。要温暖、简洁、像学长，引导式提问或总结性确认。不要使用 markdown，不要使用 **、##、-等格式符号。",
  "extractedData": {
    "examGoal": "期末考试",
    "subjects": [{"name": "高等数学", "base": "weak|medium|strong", "examDate": "YYYY-MM-DD", "targetScore": 90, "textbook": "同济第七版"}],
    "schedule": {"mon-morning": "busy", "mon-afternoon": "free"},
    "issues": [{"subject": "高等数学", "content": "极坐标换元不熟"}],
    "newTasks": [
      {
        "title": "高数·极坐标换元专项训练",
        "subject": "高等数学",
        "plannedDate": "2026-04-15",
        "slot": "afternoon",
        "priority": "high",
        "difficulty": "hard",
        "note": "重点练习课本例 5-7 和对应习题"
      }
    ]
  },
  "suggestedAction": "none|askMore|generatePlan|replan"
}

═══ 字段填写规则 ═══
- newTasks 是核心：当用户明确表达"下周想复习 X"、"周三下午有空"、"帮我安排 Y"时，你必须在 newTasks 里生成 2-7 个具体任务填入用户日程表
- plannedDate 必须是未来真实日期（YYYY-MM-DD 格式），基于今天推算，比如"明天下午"→计算出具体日期
- slot 只能是 morning / afternoon / evening
- priority: high/medium/low，difficulty: easy/medium/hard
- subjects / schedule / issues 只包含本轮对话新确认的信息，不要重复已有的
- suggestedAction 的含义：
  - askMore：还在收集信息阶段，没生成任务
  - generatePlan：生成了 newTasks，前端会自动合并到日程
  - replan：用户说状态不好或有临时事务，需要重排
  - none：纯闲聊

═══ 今天的日期 ═══
你回复时必须按今天的日期计算 plannedDate。今天是系统自动注入的（见对话中的 system context）。

═══ 输出格式硬性约束 ═══
⚠️ 你的整条回复必须且只能是一个合法 JSON 对象，以 { 开头、以 } 结尾。
- 不要写任何前言、解释、致歉
- 不要用 \`\`\`json 代码块包裹
- 不要在 JSON 之外写任何字符
- 不要省略 extractedData 字段（即使为空也要写 {}）
- 如果生成了 newTasks，suggestedAction 必须是 "generatePlan"`;

// 从 AI 回复中稳健提取 JSON：处理 ```json 代码块、前后多余文字、嵌套大括号
export function extractJSONFromReply(raw) {
    if (!raw || typeof raw !== "string") return null;
    let s = raw.trim();
    // 去除 ```json ... ``` 或 ``` ... ``` 包裹
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    // 直接尝试
    try {
        return JSON.parse(s);
    } catch {
        // ignore and continue with brace matching fallback
    }
    // 用大括号配平的方式找最外层 JSON
    const startIndex = s.indexOf("{");
    if (startIndex < 0) return null;
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = startIndex; i < s.length; i += 1) {
        const ch = s[i];
        if (inStr) {
            if (esc) esc = false;
            else if (ch === "\\") esc = true;
            else if (ch === '"') inStr = false;
            continue;
        }
        if (ch === '"') {
            inStr = true;
            continue;
        }
        if (ch === "{") depth += 1;
        else if (ch === "}") {
            depth -= 1;
            if (depth === 0) {
                const candidate = s.slice(startIndex, i + 1);
                try {
                    return JSON.parse(candidate);
                } catch {
                    return null;
                }
            }
        }
    }
    return null;
}

// 离线 fallback：用规则引擎模拟 AI 回复
export const OFFLINE_SUBJECT_ALIASES = [
    { canonical: "数学分析", aliases: ["数学分析", "数分"] },
    { canonical: "高等数学", aliases: ["高等数学", "高数"] },
    { canonical: "线性代数", aliases: ["线性代数", "线代"] },
    { canonical: "复变函数", aliases: ["复变函数", "复变"] },
    { canonical: "实变函数", aliases: ["实变函数", "实变"] },
    { canonical: "概率论", aliases: ["概率论", "概率"] },
    { canonical: "数理统计", aliases: ["数理统计", "统计"] },
    { canonical: "抽象代数", aliases: ["抽象代数"] },
    { canonical: "微分几何", aliases: ["微分几何"] },
    { canonical: "英语", aliases: ["英语"] },
    { canonical: "物理", aliases: ["物理"] },
    { canonical: "C++ 数据结构", aliases: ["c++数据结构", "c++ 数据结构", "数据结构"] },
];

export function normalizeOfflineSubjectName(name = "") {
    const raw = String(name || "").trim();
    if (!raw) return "";
    const lower = raw.toLowerCase();
    const hit = OFFLINE_SUBJECT_ALIASES.find((item) => item.aliases.some((alias) => lower.includes(alias.toLowerCase())));
    return hit?.canonical || raw;
}

export function extractOfflineSubjectsFromText(text = "") {
    const raw = String(text || "");
    const lower = raw.toLowerCase();
    const found = [];

    OFFLINE_SUBJECT_ALIASES.forEach((item) => {
        if (item.aliases.some((alias) => lower.includes(alias.toLowerCase()))) {
            found.push(item.canonical);
        }
    });

    return [...new Set(found)];
}

export function inferOfflineBaseLevel(text = "") {
    const content = String(text || "");
    if (/薄弱|难|不会|不懂|卡住|卡了|跟不上/.test(content)) return "weak";
    if (/擅长|基础好|不错|熟练|简单/.test(content)) return "strong";
    return "medium";
}

export function buildOfflineSubjectsPayload(subjectNames = [], text = "") {
    const base = inferOfflineBaseLevel(text);
    return [...new Set(subjectNames.map((name) => normalizeOfflineSubjectName(name)).filter(Boolean))].map((name) => ({
        name,
        base,
        targetScore: 85,
        weeklyHours: 4,
        focus: "",
    }));
}

export function extractOfflineScheduleUpdates(text = "") {
    const content = String(text || "");
    const updates = {};
    const markDays = (dayKeys, slotKeys, value = "free") => {
        dayKeys.forEach((dayKey) => {
            slotKeys.forEach((slotKey) => {
                updates[`${dayKey}-${slotKey}`] = value;
            });
        });
    };

    const allDays = DAYS.map((d) => d.key);
    const weekdays = ["mon", "tue", "wed", "thu", "fri"];
    const weekend = ["sat", "sun"];

    if (/周末.*(全天|都有空|有空|可安排|能学|能安排)/.test(content)) {
        markDays(weekend, SLOTS.map((slot) => slot.key), "free");
    }
    if (/(工作日|周一到周五|周一-周五|周一至周五).*(晚上|晚间).*(有空|可安排|能学|能安排)/.test(content)) {
        markDays(weekdays, ["evening"], "free");
    }
    if (/(工作日|周一到周五|周一-周五|周一至周五).*(上午).*(有空|可安排|能学|能安排)/.test(content)) {
        markDays(weekdays, ["morning"], "free");
    }
    if (/(工作日|周一到周五|周一-周五|周一至周五).*(下午).*(有空|可安排|能学|能安排)/.test(content)) {
        markDays(weekdays, ["afternoon"], "free");
    }
    if (/(每天|平时).*(晚上|晚间).*(有空|可安排|能学|能安排)/.test(content)) {
        markDays(allDays, ["evening"], "free");
    }
    if (/(每天|平时).*(上午).*(有空|可安排|能学|能安排)/.test(content)) {
        markDays(allDays, ["morning"], "free");
    }
    if (/(每天|平时).*(下午).*(有空|可安排|能学|能安排)/.test(content)) {
        markDays(allDays, ["afternoon"], "free");
    }

    return Object.keys(updates).length > 0 ? updates : null;
}

export function getOfflineFallbackSlots(count = 4) {
    const slots = ["evening", "morning", "afternoon"];
    return Array.from({ length: Math.max(1, count) }, (_, index) => {
        const date = addDays(index + 1);
        return {
            date: toLocalDateKey(date),
            slot: slots[index % slots.length],
        };
    });
}

export function buildOfflineTaskList({ profile, preferredSubjects = [], text = "", count = 4 }) {
    const normalizedPreferred = [...new Set((preferredSubjects || []).map((name) => normalizeOfflineSubjectName(name)).filter(Boolean))];
    const subjectPool = normalizedPreferred.length > 0
        ? normalizedPreferred
        : (profile.subjects || []).map((item) => normalizeOfflineSubjectName(item.name)).filter(Boolean);

    if (subjectPool.length === 0) return [];

    const freeSlots = collectFreeSlots(profile.schedule || {}, 7).map((item) => ({
        date: normalizePlannedDate(item.date),
        slot: item.slot,
    }));
    const planningSlots = (freeSlots.length > 0 ? freeSlots : getOfflineFallbackSlots(count)).slice(0, Math.max(1, count));

    const focusWords = {
        review: /复习|回顾|巩固|错题/,
        preview: /预习/,
        drill: /刷题|练题|做题|习题/,
    };
    const taskTemplates = focusWords.preview.test(text)
        ? ["预习教材目录与核心定义", "预习例题并整理疑问", "做 3~5 道入门题热身", "写一页预习笔记"]
        : focusWords.drill.test(text)
            ? ["专项刷题 6~8 题", "典型例题精练", "错题二刷与变式训练", "限时小测 20~30 分钟"]
            : focusWords.review.test(text)
                ? ["知识框架回顾", "错题整理与重做", "核心概念口述检查", "阶段复盘与查漏补缺"]
                : ["知识框架梳理", "教材例题精练", "课后题/真题专项训练", "错题整理与回顾", "阶段自测"];

    return planningSlots.map((slotInfo, index) => {
        const subject = subjectPool[index % subjectPool.length];
        const template = taskTemplates[index % taskTemplates.length];
        const priority = index < 2 ? "high" : index < 4 ? "medium" : "low";
        const difficulty = index === 0 ? "medium" : index % 3 === 1 ? "hard" : "medium";

        return {
            title: `${subject}·${template}`,
            subject,
            plannedDate: normalizePlannedDate(slotInfo.date || today()),
            slot: SLOTS.some((slot) => slot.key === slotInfo.slot) ? slotInfo.slot : "evening",
            priority,
            difficulty,
            note: "离线模式自动生成，可继续在对话里补充教材版本、考试时间和活动/事务时间。",
        };
    });
}

export function buildOfflineConversationExtraction(chatHistory = [], profile = {}) {
    const userMessages = (chatHistory || []).filter((msg) => msg.role === "user");
    const combinedText = userMessages.map((msg) => msg.content || "").join("\n");
    const foundSubjects = extractOfflineSubjectsFromText(combinedText);
    const existingNames = new Set((profile.subjects || []).map((item) => normalizeOfflineSubjectName(item.name)));
    const newSubjectNames = foundSubjects.filter((name) => !existingNames.has(normalizeOfflineSubjectName(name)));
    const scheduleUpdates = extractOfflineScheduleUpdates(combinedText);

    const extractedData = {};
    if (newSubjectNames.length > 0) {
        extractedData.subjects = buildOfflineSubjectsPayload(newSubjectNames, combinedText);
    }
    if (scheduleUpdates) {
        extractedData.schedule = scheduleUpdates;
    }
    if (/期末|考试/.test(combinedText)) {
        extractedData.examGoal = profile.examGoal || "期末考试";
    }

    const effectiveProfile = mergeProfileSnapshot(profile, extractedData);
    const taskCount = foundSubjects.length >= 2 ? 4 : 3;
    const newTasks = buildOfflineTaskList({
        profile: effectiveProfile,
        preferredSubjects: foundSubjects,
        text: combinedText,
        count: taskCount,
    });

    if (newTasks.length > 0) {
        extractedData.newTasks = newTasks;
    }

    const summaryParts = [];
    if (newSubjectNames.length > 0) summaryParts.push(`新增课程：${newSubjectNames.join("、")}`);
    if (scheduleUpdates) summaryParts.push("已同步聊天中提到的空闲时段");

    return {
        reply: `✅ 我已根据刚才的离线对话整理出 ${newTasks.length} 个任务并加入你的日程${summaryParts.length > 0 ? `（${summaryParts.join("；")}）` : ""}。`,
        extractedData,
        suggestedAction: newTasks.length > 0 ? "generatePlan" : "none",
    };
}

export function offlineAIResponse(userText, profile) {
    const text = String(userText || "");
    const hasSubjects = (profile.subjects || []).length > 0;
    const hasSchedule = Object.values(profile.schedule || {}).some((v) => v === "free");
    const foundSubjects = extractOfflineSubjectsFromText(text);
    const existingNames = new Set((profile.subjects || []).map((item) => normalizeOfflineSubjectName(item.name)));
    const newSubjectNames = foundSubjects.filter((name) => !existingNames.has(normalizeOfflineSubjectName(name)));
    const scheduleUpdates = extractOfflineScheduleUpdates(text);

    const extractedData = {};
    if (newSubjectNames.length > 0) {
        extractedData.subjects = buildOfflineSubjectsPayload(newSubjectNames, text);
    }
    if (scheduleUpdates) {
        extractedData.schedule = scheduleUpdates;
    }
    if (/期末|考试/.test(text)) {
        extractedData.examGoal = profile.examGoal || "期末考试";
    }

    const wantsSchedule = /安排|排一下|排进|计划|日程|任务|生成|规划|加入日程|加到日程|复习|预习|刷题/.test(text);
    const mentionsTime = /今天|明天|今晚|这周|本周|下周/.test(text);
    const shouldGeneratePlan = wantsSchedule || ((foundSubjects.length > 0 || newSubjectNames.length > 0) && mentionsTime);

    if (/不懂|卡|不会|没掌握|薄弱点|难点/.test(text)) {
        extractedData.issues = [{
            subject: foundSubjects[0] || (profile.subjects || [])[0]?.name || "未分类",
            content: text.trim(),
        }];
    }

    const effectiveProfile = mergeProfileSnapshot(profile, extractedData);

    let reply = "";
    let suggestedAction = "askMore";

    if (shouldGeneratePlan) {
        const plannedSubjects = foundSubjects.length > 0
            ? foundSubjects
            : (effectiveProfile.subjects || []).slice(0, 2).map((item) => item.name);
        const newTasks = buildOfflineTaskList({
            profile: effectiveProfile,
            preferredSubjects: plannedSubjects,
            text,
            count: plannedSubjects.length >= 2 ? 4 : 3,
        });
        if (newTasks.length > 0) {
            extractedData.newTasks = newTasks;
            suggestedAction = "generatePlan";
            const addedSubjectText = newSubjectNames.length > 0 ? `，并把 ${newSubjectNames.join("、")} 加入了课程列表` : "";
            reply = `✅ 已根据离线对话为你生成 ${newTasks.length} 个任务${addedSubjectText}。\n\n去「日程 → 规划」查看日历；如果你说“周三有事”或“晚上没空”，我也能继续帮你重排。`;
        }
    }

    if (!reply && newSubjectNames.length > 0) {
        const addedSubjectText = newSubjectNames.join("、");
        reply = `✅ 已把 ${addedSubjectText} 加入课程列表。\n\n现在这些课程已经是真实写入了，不只是聊天回复。你可以继续说“帮我安排到日程里”或“这周晚上有空”，我会在离线模式下继续生成任务。`;
        suggestedAction = "none";
    } else if (!reply && scheduleUpdates) {
        reply = "✅ 我已更新你在对话里提到的空闲时段。接下来直接说“帮我生成本周计划”就行。";
        suggestedAction = "none";
    } else if (!reply && extractedData.issues?.length > 0) {
        reply = "记下这个卡点了。我会把相关内容优先安排到近期任务里。你也可以直接说“帮我围绕这个卡点排三天任务”。";
        suggestedAction = "replan";
    } else if (!reply && !hasSubjects) {
        reply = "你好呀 🌿 先告诉我这学期你主要学哪几门课，例如“我要学数分、线代、英语”。离线模式下我也能直接把课程加进去。";
    } else if (!reply && !hasSchedule) {
        reply = "课程我已经知道一些了。再告诉我你平时哪些时段有空，比如“工作日晚上有空，周末全天有空”，我就能离线帮你排任务。";
    } else if (!reply) {
        const latestKnownSubjects = foundSubjects.length > 0 ? foundSubjects : (profile.subjects || []).slice(0, 2).map((item) => item.name);
        reply = `我已记录当前信息。你可以继续说“帮我安排 ${latestKnownSubjects.join("和")} 的本周任务”，我会直接写入日程，而不只是口头回复。`;
        suggestedAction = "none";
    }

    return JSON.stringify({ reply, extractedData, suggestedAction });
}

export function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export function normalizeExtractedSubjects(names = []) {
    return (names || []).filter(Boolean).map((name) => ({
        name: normalizeOfflineSubjectName(name),
        base: "medium",
        targetScore: 85,
        weeklyHours: 4,
        focus: "",
    }));
}

export function normalizeExtractedDataPayload(data = {}) {
    const normalizedSubjects = (data.subjects || []).map((subject) => ({
        ...subject,
        name: normalizeOfflineSubjectName(subject.name),
    })).filter((subject) => subject.name);

    const normalizedIssues = (data.issues || []).map((issue) => ({
        ...issue,
        subject: normalizeOfflineSubjectName(issue.subject || normalizedSubjects[0]?.name || "未分类"),
        content: String(issue.content || issue.text || "").trim(),
    })).filter((issue) => issue.content);

    const normalizedTasks = (data.newTasks || []).map((task) => ({
        ...task,
        subject: normalizeOfflineSubjectName(task.subject || normalizedSubjects[0]?.name || "未分类"),
    })).filter((task) => task.title && task.subject);

    const normalizedOccupiedBlocks = (data.occupiedBlocks || []).map((block) => ({
        id: block.id || uid(),
        title: String(block.title || "临时事务").trim() || "临时事务",
        date: normalizePlannedDate(block.date || today()),
        slot: SLOTS.some((slot) => slot.key === block.slot) ? block.slot : "evening",
    }));

    return {
        ...data,
        subjects: normalizedSubjects,
        issues: normalizedIssues,
        newTasks: normalizedTasks,
        occupiedBlocks: normalizedOccupiedBlocks,
    };
}

export function mergeProfileSnapshot(baseProfile, data) {
    if (!data) return baseProfile;
    const normalized = normalizeExtractedDataPayload(data);
    const next = { ...baseProfile };
    if (normalized.examGoal) next.examGoal = normalized.examGoal;
    if (normalized.shortGoal) next.shortGoal = normalized.shortGoal;
    if (normalized.longGoal) next.longGoal = normalized.longGoal;
    if (normalized.subjects && normalized.subjects.length > 0) {
        const existing = baseProfile.subjects || [];
        const existingNames = new Set(existing.map((item) => normalizeOfflineSubjectName(item.name)));
        const newSubs = normalized.subjects
            .filter((subj) => !existingNames.has(normalizeOfflineSubjectName(subj.name)))
            .map((subj) => ({ id: uid(), ...subj }));
        next.subjects = [...existing, ...newSubs];
    }
    if (normalized.schedule) {
        next.schedule = { ...(baseProfile.schedule || {}), ...normalized.schedule };
    }
    return next;
}

export async function recognizeScheduleFromAttachment(dataUrl) {
    try {
        const raw = await callVisionAI(dataUrl, SCHEDULE_PROMPT);
        // 复用统一的 JSON 提取器（支持 ```json``` 包裹、前后多余文字、大括号配平），
        // 比原先的贪婪正则 /\{[\s\S]*\}/ 稳健得多。
        const parsed = extractJSONFromReply(raw);
        if (!parsed) throw new Error("视觉模型返回的内容不是合法 JSON");
        return parsed;
    } catch (err) {
        const fallback = offlineScheduleRecognition();
        return {
            ...fallback,
            note: `视觉识别失败，已使用离线模拟结果：${err.message}`,
        };
    }
}

// 文本对话：统一打到后端代理 /api/chat，避免前端裸连第三方接口
export async function callAIChat(messages, { model, temperature, max_tokens, response_format } = {}) {
    const res = await fetch(buildApiUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: model || DEFAULT_MODEL,
            messages,
            temperature,
            max_tokens,
            response_format,
        }),
    });
    if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Chat API ${res.status}: ${errText}`);
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "";
}

// 兼容旧命名，保持与 V1 代码迁移时的最小改动
export const callSCNetAI = callAIChat;

// 健康检查：让 IntakePage 判断当前是"在线代理 + 已配置 Key"还是"离线模式"
// 加 5s 超时：CloudBase Run 冷启动期间 fetch 可能挂很久，没超时会让页面卡在 loading。
export async function checkAIHealth({ timeoutMs = 5000 } = {}) {
    const fallback = { ok: false, mode: "offline", chatConfigured: false, visionConfigured: false };
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
        const res = await fetch(buildApiUrl("/api/health"), {
            method: "GET",
            signal: controller?.signal,
        });
        if (!res.ok) return fallback;
        const data = await res.json();
        return {
            ok: Boolean(data?.ok),
            mode: data?.mode || "proxy",
            chatConfigured: Boolean(data?.chatConfigured),
            visionConfigured: Boolean(data?.visionConfigured),
            textApiUrl: data?.textApiUrl,
            visionApiUrl: data?.visionApiUrl,
        };
    } catch {
        return fallback;
    } finally {
        if (timer) clearTimeout(timer);
    }
}

export async function callVisionAI(imageBase64, prompt) {
    const res = await fetch(buildApiUrl("/api/vision"), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: DEFAULT_VISION_MODEL,
            prompt,
            imageBase64,
        }),
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Vision API ${res.status}: ${errText}`);
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "";
}

export const callSCNetVision = callVisionAI;

// 离线模拟：预设一个典型的大学生课表
export function offlineScheduleRecognition() {
    return {
        schedule: {
            "mon-morning": "busy", "mon-afternoon": "busy", "mon-evening": "free",
            "tue-morning": "busy", "tue-afternoon": "free", "tue-evening": "free",
            "wed-morning": "busy", "wed-afternoon": "busy", "wed-evening": "free",
            "thu-morning": "free", "thu-afternoon": "busy", "thu-evening": "free",
            "fri-morning": "busy", "fri-afternoon": "free", "fri-evening": "free",
            "sat-morning": "free", "sat-afternoon": "free", "sat-evening": "free",
            "sun-morning": "free", "sun-afternoon": "free", "sun-evening": "free",
        },
        extractedSubjects: ["数学分析", "线性代数", "英语"],
        note: "📷 这是离线模拟结果。若要使用真实图片识别，请启动后端代理并在服务端配置视觉模型 Key。",
    };
}

export const SCHEDULE_PROMPT = `这是一张大学生课表截图。请分析图片中的课程安排，严格按以下JSON格式返回（不要任何额外说明）：
{
  "schedule": {
    "mon-morning": "busy|free", "mon-afternoon": "busy|free", "mon-evening": "busy|free",
    "tue-morning": "...", "tue-afternoon": "...", "tue-evening": "...",
    "wed-morning": "...", "wed-afternoon": "...", "wed-evening": "...",
    "thu-morning": "...", "thu-afternoon": "...", "thu-evening": "...",
    "fri-morning": "...", "fri-afternoon": "...", "fri-evening": "...",
    "sat-morning": "...", "sat-afternoon": "...", "sat-evening": "...",
    "sun-morning": "...", "sun-afternoon": "...", "sun-evening": "..."
  },
  "extractedSubjects": ["课程名1", "课程名2"],
  "note": "识别备注，例如这张课表显示周一到周五白天基本排满"
}
规则：
- 上午=8:00-12:00，下午=13:00-17:00，晚上=18:00-22:00
- 该时段有任何一门课 → busy，完全没课 → free
- extractedSubjects 列出识别到的所有不重复课程名`;
