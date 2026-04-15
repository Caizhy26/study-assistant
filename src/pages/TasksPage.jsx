import React, { useMemo, useState } from "react";
import { SLOTS, SLOT_LABELS, PRIORITY, DIFFICULTY } from "../constants/appConstants";
import { uid, today, addDays, fmt } from "../utils/core";
import { isAiTask } from "../utils/study";
import { Card, Button, Input, Select, Tag } from "../components/ui";
import { sectionTitle, emptyText } from "../styles/appStyles";

export default function TasksPage({ tasks, setTasks, profile, setTab }) {
    const [filter, setFilter] = useState("pending");
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 20;
    const [form, setForm] = useState({
        title: "",
        subject: "",
        deadline: "",
        priority: "medium",
        difficulty: "medium",
        plannedDate: today(),
        slot: "evening",
    });

    const addTask = () => {
        if (!form.title.trim()) return;
        setTasks([
            ...tasks,
            {
                id: uid(),
                title: form.title.trim(),
                subject: form.subject,
                deadline: form.deadline,
                priority: form.priority,
                difficulty: form.difficulty,
                plannedDate: form.plannedDate,
                slot: form.slot,
                done: false,
                source: "manual",
                blocked: false,
                createdAt: today(),
            },
        ]);
        setForm({
            title: "",
            subject: "",
            deadline: "",
            priority: "medium",
            difficulty: "medium",
            plannedDate: today(),
            slot: "evening",
        });
    };

    const filtered = filter === "pending"
        ? tasks.filter((task) => !task.done)
        : filter === "done"
            ? tasks.filter((task) => task.done)
            : tasks;

    const sortedFiltered = useMemo(() => (
        filtered
            .slice()
            .sort((a, b) => {
                if ((a.plannedDate || "") !== (b.plannedDate || "")) return (a.plannedDate || "").localeCompare(b.plannedDate || "");
                return (PRIORITY[b.priority || "medium"]?.weight || 2) - (PRIORITY[a.priority || "medium"]?.weight || 2);
            })
    ), [filtered]);

    const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const visibleTasks = sortedFiltered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const markDone = (id) => {
        setTasks(tasks.map((task) => task.id === id ? { ...task, done: true, blocked: false } : task));
    };

    const toggleBlocked = (id) => {
        setTasks(tasks.map((task) => task.id === id ? { ...task, blocked: !task.blocked } : task));
    };

    const postpone = (id) => {
        setTasks(tasks.map((task) => {
            if (task.id !== id) return task;
            const base = task.plannedDate ? new Date(task.plannedDate) : new Date();
            return {
                ...task,
                plannedDate: addDays(1, base).toISOString().split("T")[0],
            };
        }));
    };

    const removeTask = (id) => setTasks(tasks.filter((task) => task.id !== id));

    return (
        <div>
            <Card style={{ background: "linear-gradient(135deg, #f9fafb, #f3f3f4)" }}>
                <div style={sectionTitle}>手动补充任务</div>
                <div style={{ display: "grid", gap: 8 }}>
                    <Input
                        placeholder="任务名称"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <Select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
                            <option value="">选择课程（可选）</option>
                            {(profile.subjects || []).map((subject) => <option key={subject.id} value={subject.name}>{subject.name}</option>)}
                        </Select>
                        <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                            {Object.entries(PRIORITY).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
                        </Select>
                        <Select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                            {Object.entries(DIFFICULTY).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
                        </Select>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <Input type="date" value={form.plannedDate} onChange={(e) => setForm({ ...form, plannedDate: e.target.value })} />
                        <Select value={form.slot} onChange={(e) => setForm({ ...form, slot: e.target.value })}>
                            {SLOTS.map((slot) => <option key={slot.key} value={slot.key}>{slot.label}</option>)}
                        </Select>
                    </div>
                    <Button onClick={addTask}>添加任务</Button>
                </div>
            </Card>

            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                {[
                    { key: "pending", label: "待办" },
                    { key: "done", label: "已完成" },
                    { key: "all", label: "全部" },
                ].map((item) => (
                    <Button
                        key={item.key}
                        variant={filter === item.key ? "primary" : "secondary"}
                        onClick={() => {
                            setFilter(item.key);
                            setPage(1);
                        }}
                        style={{ padding: "7px 12px" }}
                    >
                        {item.label}
                    </Button>
                ))}
                <div style={{ flex: 1 }} />
                <Button variant="ghost" onClick={() => setTab("plan")}>回到 AI 规划 →</Button>
            </div>

            {sortedFiltered.length === 0 ? (
                <Card><div style={emptyText}>当前没有任务。</div></Card>
            ) : (
                <>
                    {visibleTasks.map((task) => (
                        <Card key={task.id} style={{ opacity: task.done ? 0.58 : 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontSize: 13,
                                        fontWeight: 700,
                                        textDecoration: task.done ? "line-through" : "none",
                                    }}>
                                        {task.title}
                                    </div>
                                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                                        {task.subject || "未分类"} · {task.plannedDate ? `${fmt(task.plannedDate)} ${SLOT_LABELS[task.slot] || ""}` : "未安排"}
                                        {task.deadline ? ` · 截止 ${fmt(task.deadline)}` : ""}
                                    </div>
                                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                                        <Tag color={PRIORITY[task.priority || "medium"].color} bg="#fff5f5">{PRIORITY[task.priority || "medium"].label}</Tag>
                                        <Tag>{DIFFICULTY[task.difficulty || "medium"].label}</Tag>
                                        <Tag>{isAiTask(task) ? "AI 生成" : "手动添加"}</Tag>
                                        {task.blocked && <Tag color="#b91c1c" bg="#fff1f2">卡住了</Tag>}
                                    </div>
                                </div>
                            </div>

                            {!task.done && (
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                                    <Button onClick={() => markDone(task.id)} style={{ padding: "7px 12px" }}>完成</Button>
                                    <Button variant="secondary" onClick={() => toggleBlocked(task.id)} style={{ padding: "7px 12px" }}>
                                        {task.blocked ? "取消卡住" : "标记卡住"}
                                    </Button>
                                    <Button variant="warn" onClick={() => postpone(task.id)} style={{ padding: "7px 12px" }}>顺延 1 天</Button>
                                    <Button variant="ghost" onClick={() => removeTask(task.id)} style={{ color: "#c0392b" }}>删除</Button>
                                </div>
                            )}
                        </Card>
                    ))}
                    {totalPages > 1 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 10 }}>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>第 {currentPage} / {totalPages} 页 · 共 {sortedFiltered.length} 条任务</div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <Button variant="secondary" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={currentPage <= 1} style={{ padding: "7px 12px" }}>上一页</Button>
                                <Button variant="secondary" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage >= totalPages} style={{ padding: "7px 12px" }}>下一页</Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
