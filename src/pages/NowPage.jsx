import React from "react";
import { SLOT_LABELS } from "../constants/appConstants";
import { getEnergyInfo } from "../utils/study";
import { Card, Button, Tag } from "../components/ui";
import { sectionTitle } from "../styles/appStyles";

function Metric({ label, value }) {
    return (
        <div style={{
            padding: "14px 16px",
            borderRadius: 18,
            background: "rgba(255,255,255,0.82)",
            border: "1px solid rgba(226,232,240,0.9)",
        }}>
            <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginTop: 8 }}>{value}</div>
        </div>
    );
}

export default function NowPage({ recommendation, currentEnergy, setTab, handleReplan }) {
    const energy = getEnergyInfo(currentEnergy);
    const task = recommendation.task;

    return (
        <div style={{ display: "grid", gap: 18 }}>
            <Card
                highlight
                style={{
                    padding: 24,
                    background: recommendation.action === "rest"
                        ? "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(255,244,236,0.96))"
                        : "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(237,242,255,0.98))",
                }}
            >
                <div style={{ display: "grid", gap: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
                        <div style={{ flex: "1 1 520px", minWidth: 0 }}>
                            <div style={sectionTitle}>现在该做什么</div>
                            <div style={{ fontSize: 30, lineHeight: 1.18, fontWeight: 800, color: "#0f172a", fontFamily: "'Manrope', 'Inter', 'Noto Sans SC', sans-serif" }}>
                                {recommendation.message}
                            </div>
                            <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.85, color: "#5b6477", maxWidth: 760 }}>
                                {task
                                    ? `建议你直接从「${task.title}」开始，先用一个完整番茄钟把最关键的那一步推进下去。学习页右侧还有实时 AI 助教，卡住时不用退出专注流。`
                                    : `${energy.suggest} 先把节奏稳住，再决定是否需要重排本周安排。`}
                            </div>
                        </div>

                        <div style={{
                            minWidth: 124,
                            minHeight: 124,
                            borderRadius: 28,
                            display: "grid",
                            placeItems: "center",
                            background: recommendation.action === "rest"
                                ? "linear-gradient(135deg, #fff6ec, #ffe1bd)"
                                : "linear-gradient(135deg, #eef4ff, #d8e5ff)",
                            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.72)",
                            fontSize: 48,
                        }}>
                            {recommendation.action === "rest" ? "☕" : "🎯"}
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                        <Metric label="当前状态" value={`${energy.emoji} ${energy.label}`} />
                        <Metric label="建议动作" value={recommendation.action === "rest" ? "先恢复节奏" : "直接开始学习"} />
                        <Metric label="建议时段" value={task?.slot ? SLOT_LABELS[task.slot] || task.slot : "现在即可开始"} />
                        <Metric label="优先内容" value={task?.subject || "先整理计划"} />
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Button onClick={() => setTab("state")} style={{ minWidth: 132 }}>开始学习</Button>
                        <Button variant="secondary" onClick={() => setTab("intake")}>调整/生成计划</Button>
                        <Button variant="ghost" onClick={handleReplan}>重排本周安排</Button>
                    </div>
                </div>
            </Card>

            <div className="now-secondary-grid" style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 16 }}>
                <Card style={{ marginBottom: 0 }}>
                    <div style={sectionTitle}>当前推荐任务</div>
                    {task ? (
                        <div style={{ display: "grid", gap: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                                <div>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", lineHeight: 1.45 }}>{task.title}</div>
                                    <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        {task.subject ? <Tag>{task.subject}</Tag> : null}
                                        {task.slot ? <Tag bg="#eef2ff" color="#334155">{SLOT_LABELS[task.slot] || task.slot}</Tag> : null}
                                        {task.priority ? <Tag bg="#fff7ed" color="#b45309">{task.priority}</Tag> : null}
                                    </div>
                                </div>
                                {task.estMinutes ? <Tag bg="#ecfeff" color="#155e75">约 {task.estMinutes} 分钟</Tag> : null}
                            </div>
                            <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.8 }}>
                                优先把这件事做完，再考虑切换到别的内容。这样更容易保持专注，也能让后续 AI 重排更稳定。
                            </div>
                        </div>
                    ) : (
                        <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.8 }}>
                            目前还没有可直接推荐的任务。先去「计划」页补充课程与安排，再回来开始学习会更准确。
                        </div>
                    )}
                </Card>

                <Card style={{ marginBottom: 0 }}>
                    <div style={sectionTitle}>系统提示</div>
                    <div style={{ display: "grid", gap: 12 }}>
                        <div style={{ padding: 14, borderRadius: 16, background: "#f8fafc", border: "1px solid rgba(226,232,240,0.9)" }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>学习页支持实时答疑</div>
                            <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", lineHeight: 1.7 }}>
                                进入学习页后，右侧 AI 助手会带着当前任务上下文回答问题，不用再切回摸底页。
                            </div>
                        </div>
                        <div style={{ padding: 14, borderRadius: 16, background: "#fffaf0", border: "1px solid rgba(251,191,36,0.18)" }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>想调整安排？</div>
                            <div style={{ marginTop: 6, fontSize: 12, color: "#9a3412", lineHeight: 1.7 }}>
                                你可以直接去计划页重排，或在聊天里告诉系统“这周三晚上没空”“清空本周”。
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
