import React, { useState } from "react";
import { SLOT_LABELS } from "../constants/appConstants";
import { today } from "../utils/core";
import { isAiTask, normalizeRecordDate } from "../utils/study";
import { Button, Card } from "../components/ui";

export default function PlanPage({ weeklyPreview, weeklyPlanMeta, tasks, setTasks, importAIPlan, handleReplan, setTab }) {
    const aiPending = tasks.filter((t) => !t.done && isAiTask(t)).length;
    const [weekOffset, setWeekOffset] = useState(0);

    const getWeekStart = (offset = 0) => {
        const now = new Date();
        const day = now.getDay() || 7;
        const mon = new Date(now);
        mon.setDate(now.getDate() - day + 1 + offset * 7);
        mon.setHours(0, 0, 0, 0);
        return mon;
    };

    const weekStart = getWeekStart(weekOffset);
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
    });
    const todayStr = today();
    const weekRangeLabel = `${weekStart.getMonth() + 1}月${weekStart.getDate()}日 - ${weekDays[6].getMonth() + 1}月${weekDays[6].getDate()}日`;

    const SLOT_TIME = {
        morning: { startHour: 8, endHour: 12 },
        afternoon: { startHour: 13, endHour: 17 },
        evening: { startHour: 18, endHour: 22 },
    };

    const getTaskColor = (task) => {
        const text = (task.title || "") + (task.subject || "");
        if (/考试|测验|模拟/.test(text)) return { bg: "#fee2e2", border: "#ef4444" };
        if (/复习|错题|回顾/.test(text)) return { bg: "#f3e8ff", border: "#a855f7" };
        if (/休息|运动|放松/.test(text)) return { bg: "#efefef", border: "#22c55e" };
        return { bg: "#dbeafe", border: "#3b82f6" };
    };

    const todayAllTasks = tasks.filter((t) => t.plannedDate === todayStr);
    const todayDone = todayAllTasks.filter((t) => t.done).length;
    const todayRate = todayAllTasks.length > 0 ? Math.round((todayDone / todayAllTasks.length) * 100) : 0;

    const userWeekTasks = tasks.filter((t) => {
        if (!t.plannedDate) return false;
        const dateKey = normalizeRecordDate(t.plannedDate);
        return dateKey >= normalizeRecordDate(weekStart) && dateKey <= normalizeRecordDate(weekDays[6]);
    });

    const aiPerDay = {};
    const aiWeekTasks = weeklyPreview.filter((t) => {
        if (tasks.find((x) => x.id === t.id)) return false;
        if (t.slot === "afternoon") return false;
        const key = t.plannedDate || "";
        const userCount = userWeekTasks.filter((u) => u.plannedDate === key).length;
        aiPerDay[key] = aiPerDay[key] || 0;
        if (userCount + aiPerDay[key] >= 1) return false;
        aiPerDay[key] += 1;
        return true;
    });
    const allWeekTasks = [...userWeekTasks, ...aiWeekTasks];

    const HOURS = Array.from({ length: 15 }, (_, i) => i + 8);
    const HOUR_HEIGHT = 48;

    const toggleDone = (taskId) => {
        if (setTasks) setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)));
    };

    const navArrowBtn = {
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: "6px 12px",
        cursor: "pointer",
        fontSize: 12,
        color: "#4b5563",
        fontFamily: "inherit",
        fontWeight: 500,
    };

    return (
        <div style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column", gap: 10 }}>
            <Card style={{ padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "nowrap" }}>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#111111" }}>周视图</div>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                            今日完成 {todayDone}/{todayAllTasks.length} · <b style={{ color: todayRate >= 80 ? "#22c55e" : todayRate >= 50 ? "#f59e0b" : "#6b7280" }}>{todayRate}%</b> · {weeklyPlanMeta?.isCompressed ? "可用时段不足，已压缩建议" : "按空闲时段排程"}
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "nowrap" }}>
                        <Button onClick={importAIPlan} disabled={weeklyPreview.length === 0} style={{ fontSize: 12, padding: "6px 12px" }}>导入 AI 计划</Button>
                        <Button variant="secondary" onClick={handleReplan} disabled={aiPending === 0} style={{ fontSize: 12, padding: "6px 12px" }}>重排</Button>
                    </div>
                </div>
            </Card>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px" }}>
                <button onClick={() => setWeekOffset((o) => o - 1)} style={navArrowBtn}>‹ 上周</button>
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#111111" }}>{weekRangeLabel}</div>
                    {weekOffset !== 0 && (
                        <button
                            onClick={() => setWeekOffset(0)}
                            style={{
                                fontSize: 10,
                                color: "#3b82f6",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                marginTop: 2,
                                fontFamily: "inherit",
                            }}
                        >
                            回到本周
                        </button>
                    )}
                </div>
                <button onClick={() => setWeekOffset((o) => o + 1)} style={navArrowBtn}>下周 ›</button>
            </div>

            <div style={{ flex: 1, minHeight: 0, background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 10px rgba(26,28,28,0.04)", border: "1px solid #e5e7eb" }}>
                <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", background: "#fafbf8" }}>
                    <div style={{ width: 44, flexShrink: 0 }} />
                    {weekDays.map((d, i) => {
                        const ds = normalizeRecordDate(d);
                        const isToday = ds === todayStr;
                        return (
                            <div key={i} style={{ flex: 1, textAlign: "center", padding: "8px 2px", background: isToday ? "#f3f3f4" : "transparent", borderLeft: i === 0 ? "none" : "1px solid #f3f4f6" }}>
                                <div style={{ fontSize: 10, color: isToday ? "#3b82f6" : "#9ca3af", fontWeight: 500 }}>{["一", "二", "三", "四", "五", "六", "日"][i]}</div>
                                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, color: isToday ? "#3b82f6" : "#374151" }}>{d.getDate()}</div>
                            </div>
                        );
                    })}
                </div>

                <div style={{ display: "flex", height: "100%", minHeight: 0, overflowY: "auto" }}>
                    <div style={{ width: 44, flexShrink: 0, borderRight: "1px solid #f3f4f6" }}>
                        {HOURS.map((h) => (
                            <div key={h} style={{ height: HOUR_HEIGHT, fontSize: 9, color: "#9ca3af", textAlign: "right", paddingRight: 6, paddingTop: 2, borderBottom: "1px solid #f9fafb" }}>{h}:00</div>
                        ))}
                    </div>

                    {weekDays.map((d, dayIdx) => {
                        const ds = normalizeRecordDate(d);
                        const isToday = ds === todayStr;
                        const dayTasks = allWeekTasks.filter((t) => t.plannedDate === ds);
                        return (
                            <div key={dayIdx} style={{ flex: 1, position: "relative", background: isToday ? "rgba(59,130,246,0.04)" : "transparent", borderLeft: dayIdx === 0 ? "none" : "1px solid #f3f4f6" }}>
                                {HOURS.map((h) => <div key={h} style={{ height: HOUR_HEIGHT, borderBottom: "1px solid #f9fafb" }} />)}
                                {(() => {
                                    const bySlot = {};
                                    dayTasks.forEach((t) => {
                                        const k = t.slot || "morning";
                                        (bySlot[k] = bySlot[k] || []).push(t);
                                    });
                                    const blocks = [];
                                    Object.keys(bySlot).forEach((slotKey) => {
                                        const slot = SLOT_TIME[slotKey] || SLOT_TIME.morning;
                                        const slotTop = (slot.startHour - 8) * HOUR_HEIGHT;
                                        const slotHeight = (slot.endHour - slot.startHour) * HOUR_HEIGHT;
                                        const list = bySlot[slotKey];
                                        const each = (slotHeight - 6) / list.length;
                                        list.forEach((task, ti) => {
                                            const color = getTaskColor(task);
                                            blocks.push(
                                                <div
                                                    key={`${task.id}-${ti}`}
                                                    onClick={() => toggleDone(task.id)}
                                                    style={{
                                                        position: "absolute",
                                                        left: 3,
                                                        right: 3,
                                                        top: slotTop + 3 + ti * each,
                                                        height: each - 3,
                                                        background: task.done ? "#f3f4f6" : color.bg,
                                                        borderLeft: `4px solid ${task.done ? "#9ca3af" : color.border}`,
                                                        borderRadius: 8,
                                                        padding: "6px 8px",
                                                        fontSize: 11,
                                                        lineHeight: 1.35,
                                                        cursor: "pointer",
                                                        overflow: "hidden",
                                                        opacity: task.done ? 0.55 : 1,
                                                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        justifyContent: "center",
                                                    }}
                                                    title={task.title}
                                                >
                                                    <div style={{ fontWeight: 600, color: task.done ? "#6b7280" : "#1f2937", textDecoration: task.done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {task.done && "✓ "}{task.title}
                                                    </div>
                                                    {task.subject && (
                                                        <div style={{ color: "#6b7280", fontSize: 10, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                            {task.subject} · {SLOT_LABELS[slotKey] || ""}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        });
                                    });
                                    return blocks;
                                })()}
                            </div>
                        );
                    })}
                </div>
            </div>

            {allWeekTasks.length === 0 && (
                <Card style={{ marginTop: 6, background: "#f3f3f4", textAlign: "center", padding: 12 }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>📅</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e", marginBottom: 4 }}>本周还没有安排</div>
                    <div style={{ fontSize: 11, color: "#a16207", marginBottom: 10 }}>
                        去「计划」和 AI 聊聊，或点上方「导入 AI 计划」生成任务
                    </div>
                    <Button onClick={() => setTab("intake")} style={{ fontSize: 11, padding: "6px 14px" }}>去计划 →</Button>
                </Card>
            )}
        </div>
    );
}
