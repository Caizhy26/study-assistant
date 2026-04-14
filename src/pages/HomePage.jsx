import React, { useState } from "react";
import { SLOT_LABELS, PRIORITY } from "../constants/appConstants";
import { fmt, formatTime } from "../utils/core";
import { getEnergyInfo } from "../utils/study";
import { Card, Button, Tag } from "../components/ui";
import { H2, emptyText } from "../styles/appStyles";
import { useTimerDisplay } from "../hooks/useLiveElapsed";
export default function HomePage({
    intakeCompletion,
    profile,
    todayTasks,
    dueReviews,
    recommendation,
    currentEnergy,
    unresolvedIssues,
    weeklyPreview,
    weeklyPlanMeta,
    importAIPlan,
    setTab,
    timerState,
    subjectSummary,
}) {
    const energy = getEnergyInfo(currentEnergy);
    const [showAllSubjects, setShowAllSubjects] = useState(false);
    const visibleSubjectSummary = showAllSubjects ? subjectSummary : subjectSummary.slice(0, 3);
    // 只在计时器运行时才会每秒刷新，否则静默
    const { displaySeconds: timerDisplaySeconds, displayLabel: timerDisplayLabel } = useTimerDisplay(timerState);

    return (
        <div>
            <Card style={{ background: "linear-gradient(135deg, #ffffff, #f3f3f4)" }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>产品定位</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#111111" }}>
                    目标拆解 + 个性化学习规划 + 进度跟进 + 动态调整
                </div>
                <div style={{ fontSize: 12, color: "#5b665f", marginTop: 8, lineHeight: 1.7 }}>
                    优先跑通学生真实场景：先摸底，再排计划，学后反馈，最后根据掌握度和临时情况自动微调。
                </div>
            </Card>

            {timerState.running && (
                <Card
                    onClick={() => setTab("timer")}
                    style={{ background: "linear-gradient(135deg, #000000, #3b3b3b)", color: "#fff" }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <div style={{ fontSize: 12, opacity: 0.85 }}>{timerDisplayLabel}</div>
                            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{formatTime(timerDisplaySeconds)}</div>
                            <div style={{ fontSize: 12, opacity: 0.88, marginTop: 4 }}>
                                {timerState.subject || "未绑定任务"}
                                {timerState.mode === "pomodoro" ? ` · ${timerState.pomodoroPhase === "break" ? "休息阶段" : "专注阶段"}` : ""}
                            </div>
                        </div>
                        <div style={{ fontSize: 34 }}>⏱️</div>
                    </div>
                </Card>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Card onClick={() => setTab("intake")} style={{ marginBottom: 0 }}>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>摸底完成度</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#111111", marginTop: 4 }}>{intakeCompletion}%</div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                        {(profile.subjects || []).length} 门课程已录入
                    </div>
                </Card>

                <Card onClick={() => setTab("energy")} style={{ marginBottom: 0 }}>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>当前精力</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: energy.color, marginTop: 4 }}>
                        {energy.emoji} {energy.label}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>{energy.suggest}</div>
                </Card>
            </div>

            <Card highlight onClick={() => setTab("now")}>
                <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>现在做什么</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#111111" }}>{recommendation.message}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                    {recommendation.energyAdvice.tips.join(" · ")}
                </div>
            </Card>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h2 style={H2}>🤖 本周 AI 计划预览</h2>
                <Button variant="secondary" onClick={importAIPlan} disabled={weeklyPreview.length === 0}>导入本周计划</Button>
            </div>
            {weeklyPreview.length === 0 ? (
                <Card>
                    <div style={emptyText}>
                        {weeklyPlanMeta?.subjectCount > 0 && !weeklyPlanMeta?.hasFreeSlots
                            ? "这周没有可排的空闲时段，先去“摸底”里调整课表后再生成计划。"
                            : "先去“摸底”里补充课程与课表，系统才好生成计划。"}
                    </div>
                </Card>
            ) : (
                <>
                    {weeklyPlanMeta?.isCompressed && (
                        <Card style={{ padding: "12px 14px", background: "rgba(255,255,255,0.92)" }}>
                            <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.7 }}>
                                本周空闲时段只有 {weeklyPlanMeta.freeSlotCount} 格，系统已自动压缩计划；仍有 {weeklyPlanMeta.shortage} 项需求未排入，建议补充可用时段后再导入。
                            </div>
                        </Card>
                    )}
                    {weeklyPreview.slice(0, 4).map((task) => (
                        <Card key={task.id} style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700 }}>{task.title}</div>
                                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                                        {task.subject} · {fmt(task.plannedDate)} {SLOT_LABELS[task.slot]}
                                    </div>
                                </div>
                                <Tag color={PRIORITY[task.priority].color} bg="#fff5f5">{PRIORITY[task.priority].label}</Tag>
                            </div>
                        </Card>
                    ))}
                </>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Card onClick={() => setTab("tasks")} style={{ marginBottom: 0 }}>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>今天待推进</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "#111111", marginTop: 6 }}>{todayTasks.length}</div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>已按空闲时段排布</div>
                </Card>
                <Card onClick={() => setTab("review")} style={{ marginBottom: 0 }}>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>今日待复习</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "#c2410c", marginTop: 6 }}>{dueReviews.length}</div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>结合遗忘曲线安排</div>
                </Card>
            </div>

            {unresolvedIssues.length > 0 && (
                <>
                    <h2 style={{ ...H2, marginTop: 14 }}>🧩 近期卡点</h2>
                    {unresolvedIssues.slice(0, 3).map((issue) => (
                        <Card key={issue.id} style={{ borderLeft: "3px solid #ef4444" }}>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>{issue.subject || "未分类"}</div>
                            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{issue.content}</div>
                        </Card>
                    ))}
                </>
            )}

            {subjectSummary.length > 0 && (
                <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 14 }}>
                        <h2 style={{ ...H2, marginTop: 0, marginBottom: 0 }}>📈 学习投入最多的科目</h2>
                        {subjectSummary.length > 3 && (
                            <Button variant="ghost" onClick={() => setShowAllSubjects((prev) => !prev)} style={{ padding: "6px 10px" }}>
                                {showAllSubjects ? "收起" : "查看更多"}
                            </Button>
                        )}
                    </div>
                    <div style={{ marginTop: 10 }}>
                        {visibleSubjectSummary.map((item) => (
                            <Card key={item.subject} style={{ padding: "12px 14px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ fontSize: 13, fontWeight: 700 }}>{item.subject}</span>
                                    <span style={{ fontSize: 12, color: "#111111" }}>{item.minutes} 分钟</span>
                                </div>
                            </Card>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
