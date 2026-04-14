import React, { useMemo } from "react";
import { Card, MiniBarChart, Tag } from "../components/ui";
import { getLastNDaysStudyData, getMasteryLabel } from "../utils/study";
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

  return (
    <div>
      <h2 style={H2}>📊 今日学习报告</h2>

      <Card style={{ background: "linear-gradient(135deg, #ffffff, #f3f3f4)" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#111111" }}>{todayMinutes}</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>今日学习分钟</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#111111" }}>{weeklyTotalMinutes}</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>近 7 天总分钟</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#111111" }}>
              {cumulativeMinutes || achievements.totalMinutes || 0}
            </div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>累计学习分钟</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#111111" }}>{completionRate}%</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>任务完成率</div>
          </div>
        </div>
      </Card>

      <Card>
        <div style={sectionTitle}>近 7 天学习时长</div>
        <MiniBarChart data={weeklyData} />
        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
          }}
        >
          <div style={{ padding: 14, borderRadius: 20, background: "#f3f3f4" }}>
            <div style={{ fontSize: 11, color: "#6b7280" }}>周均学习</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6, color: "#111111" }}>
              {averageDailyMinutes} 分 / 天
            </div>
          </div>
          <div style={{ padding: 14, borderRadius: 20, background: "#f3f3f4" }}>
            <div style={{ fontSize: 11, color: "#6b7280" }}>最长单日</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6, color: "#111111" }}>
              {Math.max(...weeklyData.map((item) => item.minutes), 0)} 分
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div style={sectionTitle}>连续学习</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: "#ef4444" }}>{achievements.streak} 天</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
          累计学习 {cumulativeMinutes || achievements.totalMinutes || 0} 分钟
        </div>
      </Card>

      <Card>
        <div style={sectionTitle}>今日记录</div>
        {todayRecords.length === 0 ? (
          <div style={emptyText}>今天还没有形成学习记录。</div>
        ) : (
          todayRecords.map((record) => (
            <div key={record.id} style={listRow}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {record.subject} · {record.content || record.note || "学习记录"}
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                  掌握度：{getMasteryLabel(record.mastery || "understand")}
                </div>
              </div>
              <Tag>{record.minutes} 分</Tag>
            </div>
          ))
        )}
      </Card>

      <Card>
        <div style={sectionTitle}>科目投入分布</div>
        {subjectSummary.length === 0 ? (
          <div style={emptyText}>暂无统计。</div>
        ) : (
          subjectSummary.slice(0, 6).map((item) => (
            <div key={item.subject} style={listRow}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{item.subject}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{item.sessions} 次学习</div>
              </div>
              <Tag>{item.minutes} 分</Tag>
            </div>
          ))
        )}
      </Card>

      <Card style={{ background: unresolvedIssues.length ? "#f3f3f4" : "#ffffff" }}>
        <div style={sectionTitle}>待解决薄弱点</div>
        {unresolvedIssues.length === 0 ? (
          <div style={emptyText}>目前没有未解决卡点，继续保持。</div>
        ) : (
          unresolvedIssues.slice(0, 6).map((issue) => (
            <div key={issue.id} style={listRow}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{issue.subject}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{issue.content}</div>
              </div>
              <Tag color="#c2410c" bg="#ffedd5">
                待跟进
              </Tag>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

const H2 = {
  margin: "0 0 12px",
  fontSize: 16,
  fontWeight: 800,
  letterSpacing: "-0.01em",
  color: "#111111",
  fontFamily: "'Manrope', 'Noto Sans SC', sans-serif",
};

const sectionTitle = {
  fontSize: 13,
  fontWeight: 800,
  marginBottom: 12,
  color: "#111111",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const emptyText = {
  fontSize: 12,
  color: "#8d8f8f",
  textAlign: "center",
  padding: "10px 0",
};

const listRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
  padding: "10px 0",
};
