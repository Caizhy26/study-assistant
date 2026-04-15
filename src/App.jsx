import React, { useEffect, useMemo, useState } from "react";
import { STUDY_ROUTE_KEYS, TABS, PRIORITY } from "./constants/appConstants";
import { S } from "./styles/appStyles";
import { fmtFull, nowDate, addDays, today } from "./utils/core";
import { defaultTimerState } from "./hooks/useTimerState";
import { useNow } from "./hooks/useNow";
import { StatBadge } from "./components/ui";
import { useStore } from "./hooks/useStore";
import {
    defaultSchedule,
    buildMonthlyPlan,
    getWeeklyPlanMeta,
    buildWeeklyTaskSuggestions,
    recommendWhatToDo,
    getSubjectSummary,
    getIntakeCompletion,
    getSafeTab,
    getActiveMainTab,
    mergeUniqueTasks,
    normalizePlannedDate,
    normalizeRecordDate,
    replanPendingTasks,
} from "./utils/study";
import HomePage from "./pages/HomePage";
import IntakePage from "./pages/IntakePage";
import ReportPage from "./pages/ReportPage";
import StudyHub from "./components/hubs/StudyHub";
import StateHub from "./components/hubs/StateHub";
import NowPage from "./pages/NowPage";
import { uid } from "./utils/core";

function buildSeedProfile() {
    const schedule = defaultSchedule();
    Object.keys(schedule).forEach((k) => { schedule[k] = "busy"; });
    schedule["wed-evening"] = "free";
    schedule["sat-morning"] = "free";
    return {
        semesterName: "2026 春季学期",
        examGoal: "期末四门主科平均 85+",
        shortGoal: "本周吃透实变函数第二章 Lebesgue 外测度",
        longGoal: "学期末冲刺保研，数学专业课全部 85 以上",
        availableNote: "工作日晚上 + 周末全天可用，午后易困",
        subjects: [
            { id: "s1", name: "实变函数", base: "medium", weeklyHours: 8, targetScore: 88, examDate: normalizePlannedDate(addDays(45)) },
            { id: "s2", name: "抽象代数", base: "weak", weeklyHours: 6, targetScore: 85, examDate: normalizePlannedDate(addDays(50)) },
            { id: "s3", name: "复变函数", base: "medium", weeklyHours: 5, targetScore: 86, examDate: normalizePlannedDate(addDays(52)) },
            { id: "s4", name: "数理统计", base: "strong", weeklyHours: 4, targetScore: 90, examDate: normalizePlannedDate(addDays(55)) },
            { id: "s5", name: "C++ 数据结构", base: "medium", weeklyHours: 3, targetScore: 85, examDate: normalizePlannedDate(addDays(40)) },
        ],
        schedule,
    };
}

function buildSeedTasks() {
    const monday = new Date();
    const dow = monday.getDay();
    monday.setDate(monday.getDate() + (dow === 0 ? -6 : 1 - dow));
    const wd = (n) => normalizeRecordDate(addDays(n, monday));
    const todayStr = today();
    const isDone = (dateStr) => dateStr < todayStr;
    return [
        { id: "t1", title: "复变函数 Cauchy-Riemann 方程例题 5 道", subject: "复变函数", difficulty: "medium", priority: "medium", mastery: "grasp", done: isDone(wd(0)), estMinutes: 60, plannedDate: wd(0), slot: "morning", source: "ai", createdAt: Date.now() - 7 * 86400000 },
        { id: "t2", title: "数理统计 第 4.1 节 错题订正", subject: "数理统计", difficulty: "easy", priority: "low", mastery: "understand", done: false, estMinutes: 30, plannedDate: wd(0), slot: "evening", source: "user", createdAt: Date.now() - 7 * 86400000 },
        { id: "t3", title: "数理统计 MLE 笔记整理", subject: "数理统计", difficulty: "easy", priority: "low", mastery: "grasp", done: isDone(wd(1)), estMinutes: 40, plannedDate: wd(1), slot: "evening", source: "user", createdAt: Date.now() - 6 * 86400000 },
        { id: "t4", title: "实变函数 第二章习题 16-22（外测度）", subject: "实变函数", difficulty: "hard", priority: "high", mastery: "fuzzy", done: isDone(wd(3)), estMinutes: 90, plannedDate: wd(3), slot: "morning", source: "ai", createdAt: Date.now() - 5 * 86400000 },
        { id: "t5", title: "实变函数 limsup/liminf 不等式证明梳理", subject: "实变函数", difficulty: "hard", priority: "medium", mastery: "fuzzy", done: isDone(wd(4)), estMinutes: 60, plannedDate: wd(4), slot: "morning", source: "ai", createdAt: Date.now() - 4 * 86400000 },
        { id: "t6", title: "抽象代数 群论：陪集与 Lagrange 定理证明", subject: "抽象代数", difficulty: "hard", priority: "high", mastery: "understand", done: isDone(wd(4)), estMinutes: 75, plannedDate: wd(4), slot: "evening", source: "ai", createdAt: Date.now() - 4 * 86400000 },
        { id: "t7", title: "C++ 数据结构 栈与队列预习", subject: "C++ 数据结构", difficulty: "easy", priority: "low", mastery: "fuzzy", done: isDone(wd(5)), estMinutes: 45, plannedDate: wd(5), slot: "evening", source: "user", createdAt: Date.now() - 2 * 86400000 },
    ];
}

const seedRecords = () => [
    { id: "r1", subject: "实变函数", minutes: 85, date: normalizeRecordDate(addDays(-1)), note: "外测度定义 + 例 2.1" },
    { id: "r2", subject: "复变函数", minutes: 55, date: normalizeRecordDate(addDays(-1)), note: "C-R 方程 5 题完成" },
    { id: "r3", subject: "抽象代数", minutes: 70, date: normalizeRecordDate(addDays(-2)), note: "陪集概念，仍模糊" },
    { id: "r4", subject: "C++ 数据结构", minutes: 95, date: normalizeRecordDate(addDays(-2)), note: "调试链表析构函数" },
    { id: "r5", subject: "数理统计", minutes: 40, date: normalizeRecordDate(addDays(-3)), note: "MLE 例题" },
    { id: "r6", subject: "实变函数", minutes: 60, date: normalizeRecordDate(addDays(-3)), note: "Carathéodory 条件" },
];

const seedEnergy = () => [
    { id: "e1", level: "high", date: normalizeRecordDate(addDays(-3)), time: "09:00", note: "早晨状态好" },
    { id: "e2", level: "normal", date: normalizeRecordDate(addDays(-2)), time: "14:00", note: "午后偏困" },
    { id: "e3", level: "high", date: normalizeRecordDate(addDays(-2)), time: "20:00", note: "晚上效率高" },
    { id: "e4", level: "low", date: normalizeRecordDate(addDays(-1)), time: "15:00", note: "犯困" },
    { id: "e5", level: "full", date: today(), time: "09:30", note: "今天状态满格" },
];

export default function StudyAssistantHackathon() {
    const [tab, setTab] = useState("now");
    const [routeNotice, setRouteNotice] = useState("");
    const liveNow = useNow(1000);

    const [profile, setProfile] = useStore("sa3_profile_demo_v3", buildSeedProfile, { version: 3 });
    const [tasks, setTasks] = useStore("sa2_tasks_demo_v3", buildSeedTasks, { version: 3 });
    const [records, setRecords] = useStore("sa2_records_demo", seedRecords);
    const [reviews, setReviews] = useStore("sa2_reviews_demo", []);
    const [energyLog, setEnergyLog] = useStore("sa2_energy_demo", seedEnergy);
    const [timerState, setTimerState] = useStore("sa2_timer", defaultTimerState);
    const [achievements, setAchievements] = useStore("sa2_achievements", { streak: 0, lastStudyDate: null, totalMinutes: 0 });
    const [issues, setIssues] = useStore("sa3_issues", []);
    const [occupiedBlocks, setOccupiedBlocks] = useStore("sa3_occupied_blocks_v2", []);

    const todayStr = today();
    const todayRecords = records.filter((r) => r.date === todayStr);
    const todayMinutes = todayRecords.reduce((sum, r) => sum + Number(r.minutes || 0), 0);
    const todayEnergyLogs = energyLog.filter((e) => e.date === todayStr);
    const currentEnergy = todayEnergyLogs.length ? todayEnergyLogs[todayEnergyLogs.length - 1].level : "normal";

    const pendingTasks = tasks.filter((t) => !t.done).sort((a, b) => {
        if ((a.plannedDate || "") !== (b.plannedDate || "")) return (a.plannedDate || "").localeCompare(b.plannedDate || "");
        return (PRIORITY[b.priority || "medium"]?.weight || 2) - (PRIORITY[a.priority || "medium"]?.weight || 2);
    });

    const todayTasks = pendingTasks.filter((t) => t.plannedDate === todayStr);
    const dueReviews = reviews.filter((r) => !r.done && r.nextDate <= todayStr);
    const unresolvedIssues = issues.filter((i) => i.status !== "resolved");
    const intakeCompletion = getIntakeCompletion(profile);

    const monthlyPlan = useMemo(() => buildMonthlyPlan(profile, issues), [profile, issues]);
    const weeklyPlanMeta = useMemo(() => getWeeklyPlanMeta(profile, occupiedBlocks), [profile, occupiedBlocks]);
    const weeklyPreview = useMemo(() => buildWeeklyTaskSuggestions(profile, issues, currentEnergy, occupiedBlocks), [profile, issues, currentEnergy, occupiedBlocks]);
    const recommendation = useMemo(() => recommendWhatToDo(tasks, currentEnergy), [tasks, currentEnergy]);
    const subjectSummary = useMemo(() => getSubjectSummary(records), [records]);
    const safeTab = getSafeTab(tab);

    useEffect(() => {
        if (!routeNotice) return undefined;
        const timer = setTimeout(() => setRouteNotice(""), 3200);
        return () => clearTimeout(timer);
    }, [routeNotice]);

    const importAIPlan = () => {
        const aiTasks = weeklyPreview.map((item) => ({
            ...item,
            source: "ai-import",
            createdAt: Date.now(),
        }));
        setTasks((prevTasks) => mergeUniqueTasks(prevTasks, aiTasks, { replacePendingAiImport: true, fallbackSource: "ai-import" }));
        setTab("plan");
    };

    const handleReplan = () => {
        setTasks(replanPendingTasks(tasks, profile.schedule || {}, currentEnergy, occupiedBlocks));
    };

    const runOptimizer = (overrideOccupiedBlocks) => {
        const blocks = Array.isArray(overrideOccupiedBlocks) ? overrideOccupiedBlocks : occupiedBlocks;
        setTasks((prev) => replanPendingTasks(prev || [], profile.schedule || {}, currentEnergy, blocks));
    };

    const deleteScheduleById = (id) => {
        const taskId = String(id || "").trim();
        if (!taskId) return;
        setTasks((prev) => {
            const next = (prev || []).filter((task) => task.id !== taskId);
            return replanPendingTasks(next, profile.schedule || {}, currentEnergy, occupiedBlocks);
        });
    };

    const deleteScheduleByTime = (date, slot) => {
        const dateKey = normalizePlannedDate(date || today());
        const slotKey = ["morning", "afternoon", "evening"].includes(slot) ? slot : "";
        if (!slotKey) return;
        const base = (occupiedBlocks || []).slice();
        const exists = base.some((block) => block?.date === dateKey && block?.slot === slotKey);
        const nextBlocks = exists ? base : [...base, { id: uid(), title: "临时事务", date: dateKey, slot: slotKey }];
        setOccupiedBlocks(nextBlocks);
        setTasks((taskPrev) => {
            const cleared = (taskPrev || []).filter((task) => !(task.plannedDate === dateKey && (task.slot || "evening") === slotKey));
            return replanPendingTasks(cleared, profile.schedule || {}, currentEnergy, nextBlocks);
        });
    };

    const clearScheduleByRange = (startDate, endDate) => {
        const startKey = normalizePlannedDate(startDate || today());
        const endKey = normalizePlannedDate(endDate || startKey);
        const minKey = startKey <= endKey ? startKey : endKey;
        const maxKey = startKey <= endKey ? endKey : startKey;
        const start = new Date(`${minKey}T00:00:00`);
        const end = new Date(`${maxKey}T00:00:00`);
        const dayCount = Math.max(0, Math.min(30, Math.round((end - start) / 86400000)));
        const days = Array.from({ length: dayCount + 1 }, (_, index) => normalizeRecordDate(addDays(index, start)));
        const slots = ["morning", "afternoon", "evening"];
        const base = (occupiedBlocks || []).slice();
        const seen = new Set(base.map((block) => `${block?.date}|${block?.slot}`));
        const nextBlocks = base.slice();
        days.forEach((dateKey) => {
            slots.forEach((slotKey) => {
                const key = `${dateKey}|${slotKey}`;
                if (seen.has(key)) return;
                seen.add(key);
                nextBlocks.push({ id: uid(), title: "临时事务", date: dateKey, slot: slotKey });
            });
        });
        setOccupiedBlocks(nextBlocks);
        setTasks((taskPrev) => {
            const cleared = (taskPrev || []).filter((task) => {
                const plannedDate = String(task.plannedDate || "");
                return !(plannedDate && plannedDate >= minKey && plannedDate <= maxKey);
            });
            return replanPendingTasks(cleared, profile.schedule || {}, currentEnergy, nextBlocks);
        });
    };

    const context = {
        tab,
        setTab,
        profile,
        setProfile,
        tasks,
        setTasks,
        records,
        setRecords,
        reviews,
        setReviews,
        energyLog,
        setEnergyLog,
        timerState,
        setTimerState,
        achievements,
        setAchievements,
        issues,
        setIssues,
        occupiedBlocks,
        setOccupiedBlocks,
        todayStr,
        todayRecords,
        todayMinutes,
        currentEnergy,
        dueReviews,
        pendingTasks,
        todayTasks,
        monthlyPlan,
        weeklyPreview,
        weeklyPlanMeta,
        recommendation,
        intakeCompletion,
        unresolvedIssues,
        subjectSummary,
        importAIPlan,
        handleReplan,
        runOptimizer,
        deleteScheduleById,
        deleteScheduleByTime,
        clearScheduleByRange,
    };

    const activeMainTab = getActiveMainTab(tab);

    return (
        <div style={S.root}>
            <style>{`
                * { box-sizing: border-box; }
                html, body, #root { margin: 0; background: #f9f9f9; color: #111111; }
                body { font-family: 'Inter', 'Noto Sans SC', sans-serif; overflow: hidden; }
                ::selection { background: #111111; color: #ffffff; }
                ::-webkit-scrollbar { width: 8px; height: 8px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(26,28,28,0.14); border-radius: 999px; }
            `}</style>

            <header style={S.header}>
                <div style={S.headerInner}>
                    <div>
                        <h1 style={S.title}>逸仙生活学习助手</h1>
                        <p style={S.subtitle}>{fmtFull(liveNow || nowDate())}</p>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <StatBadge icon="📚" value={`${todayMinutes}分`} label="今日学习" />
                        <StatBadge icon="✓" value={pendingTasks.length} label="待办任务" />
                        <StatBadge icon="✦" value={`${achievements.streak}天`} label="连续记录" />
                    </div>
                </div>
            </header>

            <nav style={S.nav}>
                <div style={S.sidebarTop}>
                    <div style={S.sidebarBrand}>更少打扰，更快进入重点</div>
                </div>
                <div style={S.navInner}>
                    {TABS.map((item) => {
                        const isActive = activeMainTab === item.key;
                        const badgeCount = item.key === "study"
                            ? (todayTasks.length + dueReviews.length)
                            : item.key === "now" && timerState.running
                                ? 1
                                : 0;
                        return (
                            <button
                                key={item.key}
                                onClick={() => setTab(item.key)}
                                style={{
                                    ...S.navBtn,
                                    background: isActive ? "#ffffff" : "transparent",
                                    color: isActive ? "#111111" : "#6b7280",
                                    boxShadow: isActive ? "0 8px 24px rgba(26,28,28,0.05)" : "none",
                                    fontWeight: isActive ? 700 : 600,
                                }}
                            >
                                <span>{item.label}</span>
                                {badgeCount > 0 && <span style={S.dotBadge}>{badgeCount}</span>}
                            </button>
                        );
                    })}
                </div>
            </nav>

            <main style={S.main}>
                <div style={S.content}>
                    {(routeNotice || (tab !== safeTab ? `检测到无效页面“${tab}”，已自动返回默认页面。` : "")) && (
                        <div style={{ padding: "10px 12px", borderRadius: 12, background: "#ffffff", border: "1px solid rgba(198,198,198,0.18)", fontSize: 12, color: "#6b7280" }}>
                            {routeNotice || (tab !== safeTab ? `检测到无效页面“${tab}”，已自动返回默认页面。` : "")}
                        </div>
                    )}
                    <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                        {(safeTab === "home" || safeTab === "intake") && <IntakePage {...context} />}
                        {safeTab === "dashboard" && <HomePage {...context} />}
                        {STUDY_ROUTE_KEYS.has(safeTab) && <StudyHub key={safeTab} {...context} initialSubTab={safeTab === "study" ? "plan" : safeTab} />}
                        {(safeTab === "state" || safeTab === "timer" || safeTab === "energy") && (
                            <StateHub key={safeTab} {...context} initialSubTab={safeTab === "state" ? "timer" : safeTab} />
                        )}
                        {safeTab === "now" && <NowPage {...context} />}
                        {safeTab === "report" && <ReportPage {...context} />}
                    </div>
                </div>
            </main>
        </div>
    );
}
