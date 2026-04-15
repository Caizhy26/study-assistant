import React from "react";
import { Button, Card } from "../components/ui";
import { emptyText } from "../styles/commonStyles";
import { fmt } from "../utils/core";
import { getEnergyInfo } from "../utils/study";

export default function NowPage({ recommendation, setTab, setTimerState, timerState }) {
    const task = recommendation.task;
    const energy = getEnergyInfo(recommendation?.energyAdvice?.level || recommendation?.currentEnergy || "normal");

    const handleStart = () => {
        if (!task) return;
        setTimerState({
            ...timerState,
            linkedTaskId: task.id,
            subject: task.subject || timerState.subject || "",
        });
        setTab("timer");
    };

    return (
        <div style={{ height: "100%", overflow: "hidden" }}>
            <Card
                style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    textAlign: "center",
                    padding: 24,
                    background: recommendation.action === "rest"
                        ? "linear-gradient(135deg, #f3f3f4, #ffedd5)"
                        : "linear-gradient(135deg, #f3f3f4, #efefef)",
                }}
            >
                <div style={{ fontSize: 26, fontWeight: 800, color: "#111111", marginBottom: 10 }}>
                    现在该做什么
                </div>

                {task ? (
                    <div
                        style={{
                            background: "rgba(255,255,255,0.92)",
                            borderRadius: 18,
                            padding: "14px 16px",
                            textAlign: "left",
                            boxShadow: "inset 0 0 0 1px rgba(198,198,198,0.16)",
                        }}
                    >
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#111111", lineHeight: 1.45 }}>{task.title}</div>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {task.subject || "未分类"}
                            {task.plannedDate ? ` · ${fmt(task.plannedDate)}` : ""}
                            {task.estMinutes ? ` · 预计 ${task.estMinutes} 分钟` : ""}
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12, color: energy.color }}>
                            {energy.emoji} {energy.label} · {energy.suggest}
                        </div>
                        <div style={{ marginTop: 14, display: "flex", justifyContent: "center" }}>
                            <Button onClick={handleStart} style={{ padding: "11px 28px" }}>开始</Button>
                        </div>
                    </div>
                ) : (
                    <div style={emptyText}>
                        {recommendation.message || "当前没有可执行任务。先去“计划”整理课程和安排。"}
                    </div>
                )}

                <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                    <Button variant="secondary" onClick={() => setTab("intake")} style={{ padding: "9px 18px" }}>
                        调整/生成计划
                    </Button>
                    <Button variant="ghost" onClick={() => setTab("plan")} style={{ padding: "9px 12px" }}>
                        查看日程
                    </Button>
                </div>
            </Card>
        </div>
    );
}
