import React, { useMemo, useState } from "react";
import { Card, MiniBarChart, Tag, Button } from "../components/ui";
import { getLastNDaysStudyData, getMasteryLabel } from "../utils/study";
import { H2, sectionTitle, emptyText, listRow } from "../styles/appStyles";

function FoldBlock({ title, extra, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          padding: "18px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        <div>
          <div style={{ ...sectionTitle, marginBottom: 6 }}>{title}</div>
          {extra ? <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.7 }}>{extra}</div> : null}
        </div>
        <div style={{ fontSize: 18, color: "#64748b" }}>{open ? "▾" : "▸"}</div>
      </button>
      {open ? <div style={{ padding: "0 20px 20px" }}>{children}</div> : null}
    </Card>
  );
}

function SummaryCard({ label, value, note }) {
  return (
    <div style={{
      padding: "16px 18px",
      borderRadius: 18,
      background: "rgba(255,255,255,0.78)",
      border: "1px solid rgba(226,232,240,0.9)",
    }}>
      <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginTop: 8, fontFamily: "'Manrope', 'Inter', 'Noto Sans SC', sans-serif" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 8, lineHeight: 1.7 }}>{note}</div>
    </div>
  );
}

export default function ReportPage({
  todayRecords,
  todayMinutes,
  tasks,
  achievements,
  unresolvedIssues,
  subjectSummary,
  records,
}) {
  const completed = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const completionRate = total ? Math.round((completed / total) * 100) : 0;
  const weeklyData = useMemo(() => getLastNDaysStudyData(records || [], 7), [records]);
  const weeklyTotalMinutes = weeklyData.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
  const cumulativeMinutes = (records || []).reduce((sum, item) => sum + Number(item.minutes || 0), 0);
  const averageDailyMinutes = weeklyData.length ? Math.round(weeklyTotalMinutes / weeklyData.length) : 0;

  const summaryCards = [
    { label: "今日学习", value: `${todayMinutes} 分钟`, note: todayRecords.length ? `共 ${todayRecords.length} 条记录` : "今天还没开始" },
    { label: "近 7 天", value: `${weeklyTotalMinutes} 分钟`, note: `日均 ${averageDailyMinutes} 分钟` },
    { label: "任务完成率", value: `${completionRate}%`, note: `${completed}/${total || 0} 项已完成` },
    { label: "连续学习", value: `${achievements.streak} 天`, note: `累计 ${(cumulativeMinutes || achievements.totalMinutes || 0)} 分钟` },
  ];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card
        highlight
        style={{
          padding: 24,
          background: "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(237,242,255,0.96))",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <div style={sectionTitle}>学习报告</div>
            <h2 style={H2}>最近这段时间，你的学习节奏怎么样？</h2>
            <div style={{ fontSize: 13, lineHeight: 1.8, color: "#5b6477", maxWidth: 680 }}>
              首屏只保留最关键的投入指标，下面的模块再按需展开。这样你能更快看出最近的学习强度、任务进度和薄弱点，而不是被大量统计一次性淹没。
            </div>
          </div>
          <Button variant="secondary" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>回到顶部</Button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 18 }}>
          {summaryCards.map((item) => <SummaryCard key={item.label} {...item} />)}
        </div>
      </Card>

      <FoldBlock title="近 7 天学习时长" extra="快速看出这一周的投入趋势和波峰波谷">
        <MiniBarChart data={weeklyData} />
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <SummaryCard label="周均学习" value={`${averageDailyMinutes} 分`} note="按 7 天平均计算" />
          <SummaryCard label="最长单日" value={`${Math.max(...weeklyData.map((item) => item.minutes), 0)} 分`} note="本周最高学习时长" />
        </div>
      </FoldBlock>

      <FoldBlock title="今日记录" extra={todayRecords.length ? `共 ${todayRecords.length} 条` : "今天还没有形成记录"}>
        {todayRecords.length === 0 ? (
          <div style={emptyText}>今天还没有形成学习记录。</div>
        ) : (
          todayRecords.map((record) => (
            <div key={record.id} style={listRow}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                  {record.subject} · {record.content || record.note || "学习记录"}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                  掌握度：{getMasteryLabel(record.mastery || "understand")}
                </div>
              </div>
              <Tag>{record.minutes} 分</Tag>
            </div>
          ))
        )}
      </FoldBlock>

      <FoldBlock title="科目投入分布" extra="帮助你判断最近时间都花在了哪里" defaultOpen={false}>
        {subjectSummary.length === 0 ? (
          <div style={emptyText}>暂无统计。</div>
        ) : (
          subjectSummary.slice(0, 6).map((item) => (
            <div key={item.subject} style={listRow}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{item.subject}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{item.sessions} 次学习</div>
              </div>
              <Tag>{item.minutes} 分</Tag>
            </div>
          ))
        )}
      </FoldBlock>

      <FoldBlock title="待解决薄弱点" extra={unresolvedIssues.length ? `${unresolvedIssues.length} 个待跟进` : "目前没有未解决卡点"} defaultOpen={false}>
        {unresolvedIssues.length === 0 ? (
          <div style={emptyText}>目前没有未解决卡点，继续保持。</div>
        ) : (
          unresolvedIssues.slice(0, 6).map((issue) => (
            <div key={issue.id} style={listRow}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{issue.subject}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{issue.content}</div>
              </div>
              <Tag color="#b45309" bg="#fff7ed" style={{ borderColor: "#fed7aa" }}>
                待跟进
              </Tag>
            </div>
          ))
        )}
      </FoldBlock>
    </div>
  );
}
