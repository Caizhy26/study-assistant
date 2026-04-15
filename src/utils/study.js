import {
  BASE_LEVELS,
  DAYS,
  DIFFICULTY,
  ENERGY_LEVELS,
  MASTERY,
  PRIORITY,
  SLOT_LABELS,
  SLOTS,
  SR_INTERVALS,
  STATE_ROUTE_KEYS,
  STUDY_ROUTE_KEYS,
  VALID_TAB_KEYS,
} from "../constants/appConstants";
import { addDays, diffDays, fmt, today, toLocalDateKey, uid } from "./core";

// 学习业务逻辑：任务、规划、精力、复习、统计

export function isAiTask(task) {
    return ["ai", "ai-chat", "ai-import"].includes(task?.source);
}

export function toDateKey(value, { fallback = today(), clampPast = false } = {}) {
    if (!value) return fallback;

    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return fallback;
        const y = value.getFullYear();
        const m = String(value.getMonth() + 1).padStart(2, "0");
        const d = String(value.getDate()).padStart(2, "0");
        const result = `${y}-${m}-${d}`;
        return clampPast && result < fallback ? fallback : result;
    }

    const raw = String(value).trim();
    if (!raw) return fallback;

    let parsed = null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        parsed = new Date(`${raw}T00:00:00`);
    } else {
        parsed = new Date(raw);
    }

    if (Number.isNaN(parsed.getTime())) return fallback;

    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    const result = `${y}-${m}-${d}`;
    return clampPast && result < fallback ? fallback : result;
}

export function normalizePlannedDate(value) {
    return toDateKey(value, { fallback: today(), clampPast: true });
}

export function normalizeRecordDate(value) {
    return toDateKey(value, { fallback: today(), clampPast: false });
}

export function getWeekStartDate(base = new Date()) {
    const d = new Date(base);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function buildOccupiedSlotSet(occupiedBlocks = []) {
    const set = new Set();
    (occupiedBlocks || []).forEach((block) => {
        const dateKey = String(block?.date || '').trim();
        const slotKey = String(block?.slot || '').trim();
        if (!dateKey || !slotKey) return;
        set.add(`${dateKey}|${slotKey}`);
    });
    return set;
}

export function isOccupiedSlot(occupiedSet, dateKey, slotKey) {
    if (!occupiedSet || !dateKey || !slotKey) return false;
    return occupiedSet.has(`${dateKey}|${slotKey}`);
}

export function collectCurrentWeekFreeSlots(schedule, occupiedBlocks = []) {
    const result = [];
    const weekStart = getWeekStartDate(new Date());
    const todayKey = today();
    const occupiedSet = buildOccupiedSlotSet(occupiedBlocks);

    for (let i = 0; i < 7; i += 1) {
        const date = addDays(i, weekStart);
        const dateKey = toDateKey(date, { fallback: todayKey });
        if (dateKey < todayKey) continue;
        const dayKey = getWeekdayKey(date);
        SLOTS.forEach((slot) => {
            if (schedule?.[`${dayKey}-${slot.key}`] === "free" && !isOccupiedSlot(occupiedSet, dateKey, slot.key)) {
                result.push({
                    date: dateKey,
                    slot: slot.key,
                    label: `${fmt(date)} ${SLOT_LABELS[slot.key]}`,
                });
            }
        });
    }

    return result;
}

export function countDesiredWeeklyTasks(subjects = []) {
    return subjects.reduce((sum, subject) => {
        const baseQuota = Number(subject.weeklyHours || 0) > 0
            ? Number(subject.weeklyHours)
            : (subject.base === "weak" ? 4 : subject.base === "medium" ? 3 : 2);
        return sum + Math.max(2, Math.min(baseQuota, 7));
    }, 0);
}

export function getWeeklyPlanMeta(profile, occupiedBlocks = []) {
    const subjects = (profile?.subjects || []).slice();
    const freeSlots = collectCurrentWeekFreeSlots(profile?.schedule || {}, occupiedBlocks);
    const desiredTasks = countDesiredWeeklyTasks(subjects);
    const shortage = Math.max(desiredTasks - freeSlots.length, 0);

    return {
        subjectCount: subjects.length,
        freeSlotCount: freeSlots.length,
        desiredTasks,
        shortage,
        isCompressed: freeSlots.length > 0 && shortage > 0,
        hasFreeSlots: freeSlots.length > 0,
    };
}

export function normalizeTaskText(text) {
    return String(text || "")
        .toLowerCase()
        .replace(/[·•\-—_]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function normalizeTaskInput(task = {}, fallbackSource = "manual") {
    return {
        ...task,
        id: task.id || uid(),
        title: String(task.title || "").trim(),
        subject: String(task.subject || "").trim(),
        deadline: task.deadline ? normalizePlannedDate(task.deadline) : "",
        plannedDate: normalizePlannedDate(task.plannedDate || today()),
        slot: SLOTS.some((item) => item.key === task.slot) ? task.slot : "evening",
        priority: PRIORITY[task.priority] ? task.priority : "medium",
        difficulty: DIFFICULTY[task.difficulty] ? task.difficulty : "medium",
        done: Boolean(task.done),
        blocked: Boolean(task.blocked),
        source: task.source || fallbackSource,
        // 统一成数字时间戳，和 buildSeedTasks 里 Date.now() 保持一致，
        // 避免字符串 "2026-04-15" 和数字时间戳混用导致排序/比较异常。
        createdAt: typeof task.createdAt === "number" ? task.createdAt : (task.createdAt ? Date.parse(task.createdAt) || Date.now() : Date.now()),
    };
}

export function createTaskFingerprint(task) {
    const normalized = normalizeTaskInput(task, task?.source || "manual");
    return [
        normalizeTaskText(normalized.subject),
        normalizeTaskText(normalized.title),
        normalized.plannedDate || "",
        normalized.slot || "",
    ].join("|");
}

export function mergeUniqueTasks(existingTasks = [], incomingTasks = [], { replacePendingAiImport = false, fallbackSource = "manual" } = {}) {
    const baseTasks = replacePendingAiImport
        ? existingTasks.filter((task) => task.source !== "ai-import" || task.done)
        : existingTasks.slice();

    const seen = new Set(baseTasks.map((task) => createTaskFingerprint(task)));
    const merged = baseTasks.slice();

    incomingTasks.forEach((task) => {
        const normalized = normalizeTaskInput(task, task?.source || fallbackSource);
        if (!normalized.title) return;
        const key = createTaskFingerprint(normalized);
        if (seen.has(key)) return;
        seen.add(key);
        merged.push(normalized);
    });

    return merged;
}

export function getSafeTab(tab) {
    if (VALID_TAB_KEYS.has(tab)) return tab;
    return "now";
}

export function getActiveMainTab(tab) {
    if (tab === "now") return "now";
    if (tab === "intake" || tab === "home") return "intake";
    if (STUDY_ROUTE_KEYS.has(tab)) return "study";
    if (STATE_ROUTE_KEYS.has(tab)) return "now";
    if (tab === "dashboard") return "study";
    return getSafeTab(tab);
}

export function defaultSchedule() {
    const schedule = {};
    DAYS.forEach((d, dayIndex) => {
        SLOTS.forEach((slot) => {
            const defaultBusy = dayIndex < 5 && slot.key !== "evening";
            schedule[`${d.key}-${slot.key}`] = defaultBusy ? "busy" : "free";
        });
    });
    return schedule;
}

export function scheduleLabel(v) {
    return v === "busy" ? "有课/忙" : "可安排";
}

export function nextScheduleState(v) {
    return v === "busy" ? "free" : "busy";
}

export function getWeekdayKey(date) {
    const day = date.getDay();
    return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][day];
}

export function getEnergyInfo(key) {
    return ENERGY_LEVELS.find((e) => e.key === key) || ENERGY_LEVELS[2];
}

export function getMasteryLabel(key) {
    return MASTERY.find((m) => m.key === key)?.label || key;
}

export function getIntakeCompletion(profile) {
    let score = 0;
    if (profile.examGoal?.trim()) score += 1;
    if (profile.shortGoal?.trim()) score += 1;
    if (profile.longGoal?.trim()) score += 1;
    if ((profile.subjects || []).length > 0) score += 2;
    const freeCount = Object.values(profile.schedule || {}).filter((v) => v === "free").length;
    if (freeCount > 0) score += 2;
    return Math.min(100, Math.round((score / 7) * 100));
}

export function getSubjectPriority(subject) {
    const baseScore = BASE_LEVELS[subject.base || "medium"]?.weight || 2;
    const weekly = Number(subject.weeklyHours || 0);
    const target = Number(subject.targetScore || 0);
    let score = baseScore * 14 + Math.min(weekly, 8) * 4 + Math.min(Math.max(target - 60, 0), 40) / 4;
    if (subject.examDate) {
        const days = diffDays(subject.examDate, today());
        if (days <= 7) score += 24;
        else if (days <= 14) score += 16;
        else if (days <= 30) score += 10;
    }
    return score;
}

export function collectFreeSlots(schedule, days = 7, occupiedBlocks = []) {
    const result = [];
    const occupiedSet = buildOccupiedSlotSet(occupiedBlocks);
    for (let i = 0; i < days; i += 1) {
        const date = addDays(i);
        // 用本地时区的日期 key，避免 toISOString 在凌晨把日期算到前一天
        const dateKey = toLocalDateKey(date);
        const dayKey = getWeekdayKey(date);
        SLOTS.forEach((slot) => {
            if (schedule?.[`${dayKey}-${slot.key}`] === "free" && !isOccupiedSlot(occupiedSet, dateKey, slot.key)) {
                result.push({
                    date: dateKey,
                    slot: slot.key,
                    label: `${fmt(date)} ${SLOT_LABELS[slot.key]}`,
                });
            }
        });
    }
    return result;
}

export function buildMonthlyPlan(profile, issues = []) {
    const subjects = (profile.subjects || []).slice().sort((a, b) => getSubjectPriority(b) - getSubjectPriority(a));
    return subjects.map((subject) => {
        const weakCount = issues.filter((i) => i.subject === subject.name && i.status !== "resolved").length;
        const focus = weakCount > 0 ? `优先解决 ${weakCount} 个卡点/错题` : (subject.focus || "基础梳理 + 题型训练");
        const daysLeft = subject.examDate ? diffDays(subject.examDate, today()) : null;

        let stage1 = "完成章节摸底与基础知识清点";
        let stage2 = "围绕题型做专项训练";
        let stage3 = "错题回炉 + 模拟冲刺";

        if (subject.base === "weak") {
            stage1 = "优先补基础，建立知识框架";
            stage2 = "典型例题 + 高频题型巩固";
            stage3 = "错题重做 + 查漏补缺";
        }

        if (daysLeft !== null && daysLeft <= 14) {
            stage1 = "快速回顾高频考点";
            stage2 = "真题 / 模拟卷限时训练";
            stage3 = "考前复盘与易错点回炉";
        }

        return {
            id: subject.id,
            subject: subject.name,
            level: BASE_LEVELS[subject.base || "medium"].label,
            targetScore: subject.targetScore || "—",
            examDate: subject.examDate || "",
            focus,
            stages: [
                { name: "第 1 阶段", content: stage1 },
                { name: "第 2 阶段", content: stage2 },
                { name: "第 3 阶段", content: stage3 },
            ],
        };
    });
}

export function taskTemplate(subject, index, issueText) {
    if (issueText) return `解决卡点：${issueText}`;
    const templates = [
        "章节摸底与知识框架梳理",
        "核心知识点精讲 + 笔记整理",
        "典型例题训练",
        "作业/真题专项突破",
        "错题复盘与归纳",
        "阶段性自测",
    ];
    return `${subject.name} · ${templates[index % templates.length]}`;
}

export function buildWeeklyTaskSuggestions(profile, issues = [], currentEnergy = "normal", occupiedBlocks = []) {
    const subjects = (profile.subjects || []).slice().sort((a, b) => getSubjectPriority(b) - getSubjectPriority(a));
    const freeSlots = collectCurrentWeekFreeSlots(profile.schedule || {}, occupiedBlocks);
    const unresolved = issues.filter((i) => i.status !== "resolved");
    const issueBySubject = unresolved.reduce((acc, item) => {
        if (!acc[item.subject]) acc[item.subject] = [];
        acc[item.subject].push(item);
        return acc;
    }, {});

    if (subjects.length === 0 || freeSlots.length === 0) return [];

    const quotas = {};
    subjects.forEach((s) => {
        const baseQuota = Number(s.weeklyHours || 0) > 0 ? Number(s.weeklyHours) : (s.base === "weak" ? 4 : s.base === "medium" ? 3 : 2);
        quotas[s.id] = Math.max(2, Math.min(baseQuota, 7));
    });

    const tasks = [];
    let subjectIndex = 0;
    let loopGuard = 0;

    freeSlots.forEach((slot, slotIndex) => {
        loopGuard = 0;
        while (subjects.length > 0 && quotas[subjects[subjectIndex % subjects.length].id] <= 0 && loopGuard < subjects.length + 1) {
            subjectIndex += 1;
            loopGuard += 1;
        }

        const subject = subjects[subjectIndex % subjects.length];
        if (!subject || quotas[subject.id] <= 0) return;

        const issueText = issueBySubject[subject.name]?.length ? issueBySubject[subject.name].shift()?.content : "";
        const basePriority = getSubjectPriority(subject);
        const hardPreferred = slot.slot === "morning";
        const lowEnergy = currentEnergy === "low" || currentEnergy === "empty";

        let difficulty = hardPreferred ? "hard" : slot.slot === "afternoon" ? "medium" : "easy";
        if (subject.base === "strong" && difficulty === "hard") difficulty = "medium";
        if (lowEnergy && difficulty === "hard") difficulty = "medium";

        let priority = "medium";
        if (basePriority >= 40) priority = "high";
        else if (basePriority <= 18) priority = "low";

        tasks.push({
            id: uid(),
            title: taskTemplate(subject, slotIndex, issueText),
            subject: subject.name,
            priority,
            difficulty,
            deadline: subject.examDate || "",
            plannedDate: slot.date,
            slot: slot.slot,
            done: false,
            source: "ai",
            blocked: false,
            createdAt: Date.now(),
            masteryExpected: subject.base === "weak" ? "understand" : "grasp",
            note: issueText ? `来自卡点反馈：${issueText}` : (subject.focus || ""),
        });

        quotas[subject.id] -= 1;
        subjectIndex += 1;
    });

    return tasks;
}

export function getEnergyAdvice(level) {
    const current = getEnergyInfo(level);
    if (level === "full" || level === "high") {
        return {
            shouldRest: false,
            tips: ["优先推进主线章节", "趁状态好先做最难的一项", current.suggest],
        };
    }
    if (level === "normal") {
        return {
            shouldRest: false,
            tips: ["先做一项 30~60 分钟的明确任务", "可以切换到整理或巩固任务", current.suggest],
        };
    }
    if (level === "low") {
        return {
            shouldRest: true,
            tips: ["先休息 10~20 分钟", "改做复习、错题整理、笔记归纳", current.suggest],
        };
    }
    return {
        shouldRest: true,
        tips: ["先恢复状态，再安排任务", "不建议硬扛高难度内容", current.suggest],
    };
}

export function recommendWhatToDo(tasks, currentEnergy) {
    const pending = tasks.filter((t) => !t.done);
    const advice = getEnergyAdvice(currentEnergy);

    if (pending.length === 0) {
        return {
            action: advice.shouldRest ? "rest" : "free",
            message: advice.shouldRest ? "先休息一下" : "今天的计划已经很完整了",
            energyAdvice: advice,
            alternativeTasks: [],
            task: null,
        };
    }

    const scored = pending.map((task) => {
        let score = (PRIORITY[task.priority || "medium"]?.weight || 2) * 10 + (DIFFICULTY[task.difficulty || "medium"]?.weight || 2) * 4;

        if (task.deadline) {
            const days = diffDays(task.deadline, today());
            if (days <= 3) score += 16;
            else if (days <= 7) score += 10;
            else if (days <= 14) score += 5;
        }

        if (task.plannedDate === today()) score += 10;
        if (task.slot === "morning" && (currentEnergy === "full" || currentEnergy === "high")) score += 8;
        if (task.slot === "evening" && (currentEnergy === "low" || currentEnergy === "normal")) score += 4;
        if ((currentEnergy === "low" || currentEnergy === "empty") && task.difficulty === "hard") score -= 12;
        if (task.blocked) score -= 6;

        return { task, score };
    }).sort((a, b) => b.score - a.score);

    const task = scored[0]?.task || null;
    return {
        action: advice.shouldRest && task?.difficulty === "hard" ? "lightWork" : "work",
        message: task ? `建议先做：${task.title}` : "暂无合适任务",
        energyAdvice: advice,
        alternativeTasks: scored.slice(1, 4).map((x) => x.task),
        task,
    };
}

export function replanPendingTasks(tasks, schedule, currentEnergy, occupiedBlocks = []) {
    const pending = tasks.filter((t) => !t.done).sort((a, b) => {
        const p = (PRIORITY[b.priority || "medium"]?.weight || 2) - (PRIORITY[a.priority || "medium"]?.weight || 2);
        if (p !== 0) return p;
        return (DIFFICULTY[b.difficulty || "medium"]?.weight || 2) - (DIFFICULTY[a.difficulty || "medium"]?.weight || 2);
    });

    const freeSlots = collectFreeSlots(schedule, 10, occupiedBlocks);
    const lowEnergy = currentEnergy === "low" || currentEnergy === "empty";
    const assignmentMap = {};
    let pointer = 0;

    pending.forEach((task) => {
        let selectedSlot = freeSlots[pointer];
        if (!selectedSlot) return;

        if (lowEnergy && task.difficulty === "hard") {
            const betterSlotIndex = freeSlots.findIndex((slot, idx) => idx >= pointer && slot.slot !== "evening");
            if (betterSlotIndex >= 0) {
                selectedSlot = freeSlots[betterSlotIndex];
                pointer = betterSlotIndex;
            }
        }

        assignmentMap[task.id] = {
            plannedDate: selectedSlot.date,
            slot: selectedSlot.slot,
        };
        pointer += 1;
    });

    return tasks.map((task) => {
        if (task.done || !assignmentMap[task.id]) return task;
        return {
            ...task,
            plannedDate: assignmentMap[task.id].plannedDate,
            slot: assignmentMap[task.id].slot,
            blocked: false,
        };
    });
}

export function getSubjectSummary(records) {
    const map = {};
    records.forEach((r) => {
        const key = r.subject || "未分类";
        if (!map[key]) map[key] = { subject: key, minutes: 0, sessions: 0 };
        map[key].minutes += Number(r.minutes || 0);
        map[key].sessions += 1;
    });
    return Object.values(map).sort((a, b) => b.minutes - a.minutes);
}

export function createReviewItem(subject, topic) {
    const nextDate = addDays(SR_INTERVALS[0]);
    return {
        id: uid(),
        topic,
        subject,
        learnDate: today(),
        nextDate: toDateKey(nextDate),
        count: 0,
        done: false,
    };
}

export function playBellSound() {
    if (typeof window === "undefined") return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    try {
        const ctx = new AudioCtx();
        const tones = [880, 1174, 1568];
        const now = ctx.currentTime;

        tones.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now + index * 0.16);
            gain.gain.setValueAtTime(0.0001, now + index * 0.16);
            gain.gain.exponentialRampToValueAtTime(0.18, now + index * 0.16 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.16 + 0.22);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + index * 0.16);
            osc.stop(now + index * 0.16 + 0.24);
        });

        setTimeout(() => {
            if (ctx.state !== "closed") ctx.close();
        }, 1200);
    } catch {
        // ignore audio failures
    }
}

export function getLastNDaysStudyData(records, days = 7) {
    return Array.from({ length: days }, (_, index) => {
        const date = addDays(index - (days - 1));
        const dateStr = normalizeRecordDate(date);
        const minutes = records
            .filter((item) => normalizeRecordDate(item.date) === dateStr)
            .reduce((sum, item) => sum + Number(item.minutes || 0), 0);

        return {
            date: dateStr,
            label: `${date.getMonth() + 1}/${date.getDate()}`,
            minutes,
        };
    });
}
