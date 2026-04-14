// 全局常量：枚举、路由、标签定义

export const DAYS = [
    { key: "mon", label: "周一" },
    { key: "tue", label: "周二" },
    { key: "wed", label: "周三" },
    { key: "thu", label: "周四" },
    { key: "fri", label: "周五" },
    { key: "sat", label: "周六" },
    { key: "sun", label: "周日" },
];

export const SLOTS = [
    { key: "morning", label: "上午" },
    { key: "afternoon", label: "下午" },
    { key: "evening", label: "晚上" },
];

export const SLOT_LABELS = {
    morning: "上午",
    afternoon: "下午",
    evening: "晚上",
};

export const ENERGY_LEVELS = [
    { key: "full", label: "满格", emoji: "🔋", color: "#22c55e", suggest: "适合做高难度新内容与难题攻坚" },
    { key: "high", label: "高效", emoji: "⚡", color: "#84cc16", suggest: "适合主线学习，推进核心章节" },
    { key: "normal", label: "平稳", emoji: "🌤️", color: "#eab308", suggest: "适合常规任务、整理笔记、刷题巩固" },
    { key: "low", label: "低谷", emoji: "🌙", color: "#f97316", suggest: "适合复习、整理错题、短时轻任务" },
    { key: "empty", label: "耗尽", emoji: "😴", color: "#ef4444", suggest: "优先休息，不建议继续硬扛难任务" },
];

export const PRIORITY = {
    high: { label: "紧急", color: "#ef4444", weight: 3 },
    medium: { label: "一般", color: "#f59e0b", weight: 2 },
    low: { label: "低优", color: "#6b7280", weight: 1 },
};

export const DIFFICULTY = {
    hard: { label: "困难", weight: 3 },
    medium: { label: "中等", weight: 2 },
    easy: { label: "简单", weight: 1 },
};

export const MASTERY = [
    { key: "new", label: "未学", color: "#d1d5db" },
    { key: "fuzzy", label: "模糊", color: "#ef4444" },
    { key: "understand", label: "理解", color: "#f59e0b" },
    { key: "grasp", label: "掌握", color: "#22c55e" },
    { key: "master", label: "熟练", color: "#3b82f6" },
];

export const BASE_LEVELS = {
    weak: { label: "薄弱", weight: 3, color: "#ef4444" },
    medium: { label: "一般", weight: 2, color: "#f59e0b" },
    strong: { label: "较强", weight: 1, color: "#22c55e" },
};

export const SR_INTERVALS = [1, 3, 7, 14, 30];

export const TABS = [
    { key: "home", label: "对话", icon: "💬" },
    { key: "dashboard", label: "总览", icon: "🏠" },
    { key: "study", label: "日程", icon: "📚" },
    { key: "state", label: "学习", icon: "🔋" },
    { key: "report", label: "报告", icon: "📊" },
];

// 学习页子 tab
export const STUDY_SUBTABS = [
    { key: "plan", label: "🗓️ 规划" },
    { key: "tasks", label: "✅ 任务" },
    { key: "review", label: "📖 复习" },
];

// 状态页子 tab
export const STATE_SUBTABS = [
    { key: "timer", label: "⏱️ 计时" },
    { key: "energy", label: "🔋 精力" },
];

export const STUDY_ROUTE_KEYS = new Set(["study", "plan", "tasks", "review"]);
export const STATE_ROUTE_KEYS = new Set(["state", "timer", "energy", "now"]);
export const VALID_TAB_KEYS = new Set(["home", "dashboard", "study", "state", "report", "intake", "plan", "tasks", "review", "timer", "energy", "now"]);
