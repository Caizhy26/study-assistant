import React, { useState } from "react";
import { SLOT_LABELS } from "../constants/appConstants";
import { today, fmt } from "../utils/core";
import { isAiTask, getEnergyInfo } from "../utils/study";
import { Card, Button, Tag } from "../components/ui";
import { H2, emptyText } from "../styles/appStyles";
export default function PlanPage({ monthlyPlan, weeklyPreview, weeklyPlanMeta, tasks, setTasks, importAIPlan, handleReplan, currentEnergy, setTab }) {
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
        const d = new Date(t.plannedDate);
        return d >= weekStart && d < new Date(weekStart.getTime() + 7 * 86400000);
    });
    // AI 预览任务投影到周历时的约束：
    //   1) 跳过 afternoon 槽（SLOT_TIME.afternoon 从 13:00 起绘，会侵占学生 13–14 午休）
    //   2) 每天至多保留 1 个 AI 建议，避免日程被未确认的建议填满
    //   完整的 AI 建议仍在顶部"本周 AI 计划预览"卡片中展示，用户可点击导入
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
        if (setTasks) setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, done: !t.done } : t));
    };

    const navArrowBtn = {
        background: "rgba(255,255,255,0.86)", border: "1px solid rgba(203,213,225,0.82)", borderRadius: 12,
        padding: "8px 14px", cursor: "pointer", fontSize: 12, color: "#334155",
        fontFamily: "inherit", fontWeight: 700, boxShadow: "0 10px 24px rgba(51,65,85,0.06)",
    };

    return (
        <div>
            {/* 顶部操作栏 */}
            <Card highlight style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(239,243,255,0.96))", padding: "18px 20px", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div>
                        <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 800 }}>本周安排</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", fontFamily: "'Manrope', 'Inter', 'Noto Sans SC', sans-serif", marginTop: 6 }}>📅 智能日程</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 6, lineHeight: 1.7 }}>
                            今日完成 {todayDone}/{todayAllTasks.length} · <b style={{ color: todayRate >= 80 ? "#22c55e" : todayRate >= 50 ? "#f59e0b" : "#6b7280" }}>{todayRate}%</b> · 根据空闲时段和已占用时间自动更新
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Button onClick={importAIPlan} disabled={weeklyPreview.length === 0} style={{ fontSize: 12, padding: "8px 14px" }}>导入 AI 计划</Button>
                        <Button variant="secondary" onClick={handleReplan} disabled={aiPending === 0} style={{ fontSize: 12, padding: "8px 14px" }}>重排</Button>
                    </div>
                </div>
            </Card>

            {weeklyPlanMeta?.subjectCount > 0 && !weeklyPlanMeta?.hasFreeSlots && (
                <Card style={{ padding: "14px 16px", background: "rgba(255,255,255,0.92)", borderRadius: 18 }}>
                    <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.7 }}>
                        本周暂时没有可排学习时段，AI 计划不会继续铺到下周。先去“摸底”里增加空闲时间，再重新导入会更准确。
                    </div>
                </Card>
            )}
            {weeklyPlanMeta?.isCompressed && (
                <Card style={{ padding: "14px 16px", background: "rgba(255,255,255,0.92)", borderRadius: 18 }}>
                    <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.7 }}>
                        这周可用时段不足，系统已自动压缩为 {weeklyPlanMeta.freeSlotCount} 项预览任务，另有 {weeklyPlanMeta.shortage} 项建议未排入。
                    </div>
                </Card>
            )}

            {/* 周导航 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "18px 0 14px", padding: "6px 4px", gap: 12, flexWrap: "wrap" }}>
                <button onClick={() => setWeekOffset((o) => o - 1)} style={navArrowBtn}>‹ 上周</button>
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", fontFamily: "'Manrope', 'Inter', 'Noto Sans SC', sans-serif" }}>{weekRangeLabel}</div>
                    {weekOffset !== 0 && (
                        <button onClick={() => setWeekOffset(0)} style={{
                            fontSize: 10, color: "#3b82f6", background: "none", border: "none",
                            cursor: "pointer", marginTop: 2, fontFamily: "inherit",
                        }}>回到本周</button>
                    )}
                </div>
                <button onClick={() => setWeekOffset((o) => o + 1)} style={navArrowBtn}>下周 ›</button>
            </div>

            {/* 日历主体 */}
            <div style={{ background: "rgba(255,255,255,0.96)", borderRadius: 22, overflow: "hidden", boxShadow: "0 14px 34px rgba(51,65,85,0.06)", border: "1px solid rgba(226,232,240,0.88)" }}>
                {/* 星期头部 */}
                <div style={{ display: "flex", borderBottom: "1px solid rgba(226,232,240,0.9)", background: "linear-gradient(180deg, #fbfcff 0%, #f8fafc 100%)" }}>
                    <div style={{ width: 44, flexShrink: 0 }} />
                    {weekDays.map((d, i) => {
                        const ds = d.toISOString().split("T")[0];
                        const isToday = ds === todayStr;
                        return (
                            <div key={i} style={{
                                flex: 1, textAlign: "center", padding: "8px 2px",
                                background: isToday ? "rgba(59,130,246,0.08)" : "transparent",
                                borderLeft: i === 0 ? "none" : "1px solid #f3f4f6",
                            }}>
                                <div style={{ fontSize: 10, color: isToday ? "#3b82f6" : "#9ca3af", fontWeight: 500 }}>
                                    {["一", "二", "三", "四", "五", "六", "日"][i]}
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, color: isToday ? "#3b82f6" : "#374151" }}>
                                    {d.getDate()}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* 时间网格 */}
                <div style={{ display: "flex", maxHeight: 520, overflowY: "auto" }}>
                    <div style={{ width: 44, flexShrink: 0, borderRight: "1px solid #f3f4f6" }}>
                        {HOURS.map((h) => (
                            <div key={h} style={{
                                height: HOUR_HEIGHT, fontSize: 9, color: "#9ca3af",
                                textAlign: "right", paddingRight: 6, paddingTop: 2,
                                borderBottom: "1px solid #f9fafb",
                            }}>{h}:00</div>
                        ))}
                    </div>

                    {weekDays.map((d, dayIdx) => {
                        const ds = d.toISOString().split("T")[0];
                        const isToday = ds === todayStr;
                        const dayTasks = allWeekTasks.filter((t) => t.plannedDate === ds);

                        return (
                            <div key={dayIdx} style={{
                                flex: 1, position: "relative",
                                background: isToday ? "rgba(59,130,246,0.05)" : "transparent",
                                borderLeft: dayIdx === 0 ? "none" : "1px solid #f3f4f6",
                            }}>
                                {HOURS.map((h) => (
                                    <div key={h} style={{ height: HOUR_HEIGHT, borderBottom: "1px solid #f9fafb" }} />
                                ))}

                                {(() => {
                                    // 按 slot 分组，让同一时段的任务平分槽位高度
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
                                                        position: "absolute", left: 4, right: 4,
                                                        top: slotTop + 4 + ti * each,
                                                        height: each - 4,
                                                        background: task.done ? "#f1f5f9" : color.bg,
                                                        borderLeft: `4px solid ${task.done ? "#94a3b8" : color.border}`,
                                                        borderRadius: 12, padding: "8px 9px",
                                                        fontSize: 11, lineHeight: 1.4, cursor: "pointer",
                                                        overflow: "hidden", opacity: task.done ? 0.58 : 1,
                                                        boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
                                                        display: "flex", flexDirection: "column", justifyContent: "center",
                                                    }}
                                                    title={task.title}
                                                >
                                                    <div style={{
                                                        fontWeight: 600, color: task.done ? "#6b7280" : "#1f2937",
                                                        textDecoration: task.done ? "line-through" : "none",
                                                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                                    }}>
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

            {/* 图例 */}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 10, flexWrap: "wrap" }}>
                {[
                    { label: "学习", color: "#3b82f6" },
                    { label: "复习", color: "#a855f7" },
                    { label: "考试", color: "#ef4444" },
                    { label: "休息", color: "#22c55e" },
                ].map((l) => (
                    <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6b7280" }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                        {l.label}
                    </div>
                ))}
            </div>

            {allWeekTasks.length === 0 && (
                <Card style={{ marginTop: 16, background: "rgba(255,255,255,0.92)", textAlign: "center", padding: 22 }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>📅</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e", marginBottom: 4 }}>本周还没有安排</div>
                    <div style={{ fontSize: 11, color: "#a16207", marginBottom: 10 }}>
去「计划」页补充课程与空闲时间，或点上方「导入 AI 计划」生成任务
                    </div>
                    <Button onClick={() => setTab("intake")} style={{ fontSize: 11, padding: "6px 14px" }}>去计划 →</Button>
                </Card>
            )}

            {/* 月度粗规划（移到下方） */}
            <h2 style={{ ...H2, marginTop: 22 }}>🧱 月度粗规划</h2>
            {monthlyPlan.length === 0 ? (
                <Card><div style={emptyText}>先在摸底或对话里添加课程后，这里才会生成月度方向。</div></Card>
            ) : (
                monthlyPlan.map((item) => (
                    <Card key={item.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 700 }}>{item.subject}</div>
                                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                                    基础：{item.level} · 目标：{item.targetScore} · 考试：{item.examDate ? fmt(item.examDate) : "未设置"}
                                </div>
                            </div>
                            <Tag>{item.focus}</Tag>
                        </div>
                        <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                            {item.stages.map((stage) => (
                                <div key={stage.name} style={{
                                    padding: "8px 10px", borderRadius: 10,
                                    background: "#ffffff", border: "1px solid #edf2e8",
                                }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: "#111111" }}>{stage.name}</div>
                                    <div style={{ fontSize: 11, color: "#6b6d6d", marginTop: 2 }}>{stage.content}</div>
                                </div>
                            ))}
                        </div>
                    </Card>
                ))
            )}

            <Card style={{ background: "rgba(255,255,255,0.78)", marginTop: 12 }}>
                <div style={{ fontSize: 11, color: "#92400e", lineHeight: 1.6 }}>
                    当前精力 <b>{getEnergyInfo(currentEnergy).label}</b>。状态不好时点顶部「重排」按钮，系统会把高难度内容顺延到更合适的时段。
                </div>
            </Card>
        </div>
    );
}
