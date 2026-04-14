import React from "react";
import { SLOT_LABELS, DIFFICULTY } from "../constants/appConstants";
import { fmt } from "../utils/core";
import { getEnergyInfo } from "../utils/study";
import { Card, Button, Tag } from "../components/ui";
import { sectionTitle, listRow } from "../styles/appStyles";
export default function NowPage({ recommendation, currentEnergy, setTab, handleReplan }) {
    const energy = getEnergyInfo(currentEnergy);

    return (
        <div>
            <Card
                style={{
                    textAlign: "center",
                    padding: 24,
                    background: recommendation.action === "rest"
                        ? "linear-gradient(135deg, #f3f3f4, #ffedd5)"
                        : "linear-gradient(135deg, #f3f3f4, #efefef)",
                }}
            >
                <div style={{ fontSize: 42 }}>{recommendation.action === "rest" ? "☕" : "🎯"}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>AI 当前建议</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#111111", marginTop: 6 }}>
                    {recommendation.message}
                </div>
                <div style={{ fontSize: 12, color: energy.color, marginTop: 8 }}>
                    {energy.emoji} {energy.label} · {energy.suggest}
                </div>

                {recommendation.task && (
                    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 14 }}>
                        <Button onClick={() => setTab("timer")}>开始这个任务</Button>
                        <Button variant="secondary" onClick={handleReplan}>换一种安排</Button>
                    </div>
                )}
            </Card>

            <Card>
                <div style={sectionTitle}>精力适配建议</div>
                <div style={{ display: "grid", gap: 8 }}>
                    {recommendation.energyAdvice.tips.map((tip) => (
                        <div key={tip} style={{
                            padding: "10px 12px",
                            borderRadius: 12,
                            background: "#ffffff",
                            fontSize: 12,
                            color: "#6b6d6d",
                        }}>
                            {tip}
                        </div>
                    ))}
                </div>
            </Card>

            {recommendation.task && (
                <Card>
                    <div style={sectionTitle}>为什么推荐这项</div>
                    <div style={{ fontSize: 12, color: "#6b6d6d", lineHeight: 1.8 }}>
                        系统综合了任务优先级、截止时间、难度、你当前精力以及计划时段做出推荐。现在优先推进这项，最不容易打乱整体复习节奏。
                    </div>
                </Card>
            )}

            {recommendation.alternativeTasks?.length > 0 && (
                <Card>
                    <div style={sectionTitle}>备选任务</div>
                    {recommendation.alternativeTasks.map((task) => (
                        <div key={task.id} style={listRow}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700 }}>{task.title}</div>
                                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>
                                    {task.subject} · {task.plannedDate ? `${fmt(task.plannedDate)} ${SLOT_LABELS[task.slot] || ""}` : "未安排"}
                                </div>
                            </div>
                            <Tag>{DIFFICULTY[task.difficulty || "medium"].label}</Tag>
                        </div>
                    ))}
                </Card>
            )}
        </div>
    );
}
