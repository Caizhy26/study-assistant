import React, { useMemo, useState } from "react";
import { Card, MiniBarChart, Tag } from "../components/ui";
import { getLastNDaysStudyData, getMasteryLabel } from "../utils/study";
import { H2, emptyText, listRow } from "../styles/commonStyles";

function Block({ title, open, onToggle, children }) {
    return (
        <Card style={{ padding: 0, overflow: "hidden" }}>
            <button
                type="button"
                onClick={onToggle}
                style={{
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    background: "#fff",
                    padding: "12px 14px",
                    fontFamily: "inherit",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                }}
            >
                {open ? "▾" : "▸"} {title}
            </button>
            {open && <div style={{ padding: "0 14px 14px" }}>{children}</div>}
        </Card>
    );
}

export default function ReportPage({ todayRecords, todayMinutes, tasks, achievements, unresolvedIssues, subjectSummary, records }) {
    const [open, setOpen] = useState({
        overall: true,
        weekly: true,
        today: false,
        subjects: false,
        issues: false,
    });

    const completed = tasks.filter((t) => t.done).length;
    const total = tasks.length;
    const completionRate = total ? Math.round((completed / total) * 100) : 0;
    const weeklyData = useMemo(() => getLastNDaysStudyData(records || [], 7), [records]);
    const weeklyTotalMinutes = weeklyData.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
    const cumulativeMinutes = (records || []).reduce((sum, item) => sum + Number(item.minutes || 0), 0);
    const averageDailyMinutes = weeklyData.length ? Math.round(weeklyTotalMinutes / weeklyData.length) : 0;

    return (
        <div style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 style={H2}>📊 学习报告</h2>

            <Block title="总体" open={open.overall} onToggle={() => setOpen((s) => ({ ...s, overall: !s.overall }))}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                    <Card style={{ padding: 12 }}>今日学习 {todayMinutes} 分钟</Card>
                    <Card style={{ padding: 12 }}>近 7 天 {weeklyTotalMinutes} 分钟</Card>
                    <Card style={{ padding: 12 }}>累计 {cumulativeMinutes || achievements.totalMinutes || 0} 分钟</Card>
                    <Card style={{ padding: 12 }}>完成率 {completionRate}%</Card>
                    <Card style={{ padding: 12 }}>连续 {achievements.streak} 天</Card>
                    <Card style={{ padding: 12 }}>日均 {averageDailyMinutes} 分钟</Card>
                </div>
            </Block>

            <Block title="近 7 天学习时长" open={open.weekly} onToggle={() => setOpen((s) => ({ ...s, weekly: !s.weekly }))}>
                <MiniBarChart data={weeklyData} />
            </Block>

            <Block title="今日记录" open={open.today} onToggle={() => setOpen((s) => ({ ...s, today: !s.today }))}>
                {todayRecords.length === 0 ? (
                    <div style={emptyText}>今天还没有形成学习记录。</div>
                ) : (
                    todayRecords.map((record) => (
                        <div key={record.id} style={{ ...listRow, padding: "10px 0" }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700 }}>{record.subject} · {record.content || record.note || "学习记录"}</div>
                                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>掌握度：{getMasteryLabel(record.mastery || "understand")}</div>
                            </div>
                            <Tag>{record.minutes} 分</Tag>
                        </div>
                    ))
                )}
            </Block>

            <Block title="科目投入分布" open={open.subjects} onToggle={() => setOpen((s) => ({ ...s, subjects: !s.subjects }))}>
                {subjectSummary.length === 0 ? (
                    <div style={emptyText}>暂无统计。</div>
                ) : (
                    subjectSummary.slice(0, 6).map((item) => (
                        <div key={item.subject} style={{ ...listRow, padding: "10px 0" }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700 }}>{item.subject}</div>
                                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{item.sessions} 次学习</div>
                            </div>
                            <Tag>{item.minutes} 分</Tag>
                        </div>
                    ))
                )}
            </Block>

            <Block title="待解决薄弱点" open={open.issues} onToggle={() => setOpen((s) => ({ ...s, issues: !s.issues }))}>
                {unresolvedIssues.length === 0 ? (
                    <div style={emptyText}>目前没有未解决卡点，继续保持。</div>
                ) : (
                    unresolvedIssues.slice(0, 6).map((issue) => (
                        <div key={issue.id} style={{ ...listRow, padding: "10px 0" }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700 }}>{issue.subject}</div>
                                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{issue.content}</div>
                            </div>
                            <Tag color="#c2410c" bg="#ffedd5">待跟进</Tag>
                        </div>
                    ))
                )}
            </Block>
        </div>
    );
}
