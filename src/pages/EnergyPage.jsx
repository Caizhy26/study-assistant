import React from "react";
import { ENERGY_LEVELS } from "../constants/appConstants";
import { uid, today } from "../utils/core";
import { getEnergyInfo } from "../utils/study";
import { Card, Button, Tag } from "../components/ui";
import { sectionTitle, emptyText, listRow } from "../styles/appStyles";
export default function EnergyPage({ energyLog, setEnergyLog, currentEnergy, handleReplan }) {
    const todayLogs = energyLog.filter((item) => item.date === today());
    const latest = todayLogs[todayLogs.length - 1] || null;
    const current = getEnergyInfo(currentEnergy);

    const logEnergy = (level) => {
        setEnergyLog([
            ...energyLog,
            {
                id: uid(),
                date: today(),
                level,
                time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
            },
        ]);
    };

    const deleteEnergyLog = (id) => {
        setEnergyLog(energyLog.filter((item) => item.id !== id));
    };

    return (
        <div>
            <Card style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>现在你的状态如何？</div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                    {ENERGY_LEVELS.map((item) => (
                        <button
                            key={item.key}
                            onClick={() => logEnergy(item.key)}
                            style={{
                                border: `2px solid ${item.color}`,
                                borderRadius: 14,
                                padding: "12px 16px",
                                background: latest?.level === item.key ? item.color : "transparent",
                                color: latest?.level === item.key ? "#fff" : item.color,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 4,
                                cursor: "pointer",
                                fontFamily: "inherit",
                                fontSize: 12,
                            }}
                        >
                            <span style={{ fontSize: 24 }}>{item.emoji}</span>
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>
            </Card>

            <Card style={{ background: "linear-gradient(135deg, #f3f3f4, #f3f3f4)" }}>
                <div style={sectionTitle}>当前建议</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: current.color }}>
                    {current.emoji} {current.label}
                </div>
                <div style={{ fontSize: 12, color: "#6b6d6d", marginTop: 6, lineHeight: 1.7 }}>
                    {current.suggest}
                </div>
                <Button variant="secondary" onClick={handleReplan} style={{ marginTop: 12 }}>
                    用这个状态重排任务
                </Button>
            </Card>

            <Card>
                <div style={sectionTitle}>今日精力记录</div>
                {todayLogs.length === 0 ? (
                    <div style={emptyText}>今天还没有记录精力。</div>
                ) : (
                    todayLogs.map((item) => (
                        <div key={item.id} style={listRow}>
                            <div style={{ fontSize: 12 }}>{item.time}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Tag color={getEnergyInfo(item.level).color}>{getEnergyInfo(item.level).emoji} {getEnergyInfo(item.level).label}</Tag>
                                <button
                                    onClick={() => deleteEnergyLog(item.id)}
                                    style={{
                                        border: "none", background: "transparent", cursor: "pointer",
                                        color: "#9ca3af", fontSize: 16, padding: "2px 6px", lineHeight: 1,
                                        fontFamily: "inherit",
                                    }}
                                    title="删除这条记录"
                                >×</button>
                            </div>
                        </div>
                    ))
                )}
            </Card>
        </div>
    );
}
