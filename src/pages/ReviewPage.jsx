import React from "react";
import { SR_INTERVALS } from "../constants/appConstants";
import { today, addDays, fmt } from "../utils/core";
import { Card, Button, Tag } from "../components/ui";
import { H2, sectionTitle, emptyText, listRow } from "../styles/appStyles";
export default function ReviewPage({ reviews, setReviews, issues, setIssues }) {
    const due = reviews.filter((r) => !r.done && r.nextDate <= today());
    const upcoming = reviews.filter((r) => !r.done && r.nextDate > today()).sort((a, b) => a.nextDate.localeCompare(b.nextDate));

    const completeReview = (id) => {
        setReviews(reviews.map((review) => {
            if (review.id !== id) return review;
            const nextCount = review.count + 1;
            if (nextCount >= SR_INTERVALS.length) return { ...review, done: true };
            return {
                ...review,
                count: nextCount,
                nextDate: addDays(SR_INTERVALS[nextCount]).toISOString().split("T")[0],
            };
        }));
    };

    const resolveRelatedIssue = (topic, subject) => {
        setIssues(issues.map((issue) => {
            if (issue.subject === subject && topic.includes(issue.content)) return { ...issue, status: "resolved" };
            return issue;
        }));
    };

    return (
        <div>
            <Card style={{ background: "linear-gradient(135deg, #f3f3f4, #f3f3f4)" }}>
                <div style={sectionTitle}>复习与查漏补缺</div>
                <div style={{ fontSize: 12, color: "#92400e", lineHeight: 1.7 }}>
                    学习记录、卡点反馈会自动沉淀成复习队列。这样不是单纯“记一笔”，而是能把未掌握内容继续追回来。
                </div>
            </Card>

            <h2 style={H2}>🔴 今日待复习（{due.length}）</h2>
            {due.length === 0 ? (
                <Card><div style={emptyText}>今天没有到期复习。</div></Card>
            ) : (
                due.map((review) => (
                    <Card key={review.id} style={{ borderLeft: "3px solid #ef4444" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700 }}>{review.topic}</div>
                                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                                    {review.subject} · 第 {review.count + 1}/{SR_INTERVALS.length} 次
                                </div>
                            </div>
                            <Button onClick={() => { completeReview(review.id); resolveRelatedIssue(review.topic, review.subject); }}>
                                已复习
                            </Button>
                        </div>
                    </Card>
                ))
            )}

            <h2 style={H2}>🟡 即将到期</h2>
            {upcoming.length === 0 ? (
                <Card><div style={emptyText}>暂无即将到期项目。</div></Card>
            ) : (
                upcoming.slice(0, 10).map((review) => (
                    <Card key={review.id} style={{ padding: "12px 14px" }}>
                        <div style={listRow}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700 }}>{review.topic}</div>
                                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{review.subject}</div>
                            </div>
                            <Tag>{fmt(review.nextDate)}</Tag>
                        </div>
                    </Card>
                ))
            )}
        </div>
    );
}
