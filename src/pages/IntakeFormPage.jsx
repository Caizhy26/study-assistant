import React, { useState } from "react";
import { DAYS, SLOTS, BASE_LEVELS } from "../constants/appConstants";
import { uid, fmt } from "../utils/core";
import { normalizePlannedDate, normalizeTaskText, scheduleLabel, nextScheduleState } from "../utils/study";
import { Card, Button, Input, Textarea, Select, Tag } from "../components/ui";
import { sectionTitle, emptyText } from "../styles/appStyles";
export default function IntakeFormPage({ profile, setProfile, intakeCompletion }) {
    const [subjectForm, setSubjectForm] = useState({
        name: "",
        targetScore: "",
        examDate: "",
        base: "medium",
        weeklyHours: 3,
        focus: "",
    });
    const [subjectFormError, setSubjectFormError] = useState("");

    const addSubject = () => {
        const name = subjectForm.name.trim();
        const weeklyHours = Number(subjectForm.weeklyHours);
        const targetScore = subjectForm.targetScore === "" ? "" : Number(subjectForm.targetScore);
        const normalizedExamDate = subjectForm.examDate ? normalizePlannedDate(subjectForm.examDate) : "";
        const duplicated = (profile.subjects || []).some((subject) => normalizeTaskText(subject.name) === normalizeTaskText(name));

        if (!name) {
            setSubjectFormError("请先填写课程名。\n");
            return;
        }
        if (!Number.isFinite(weeklyHours) || weeklyHours < 1 || weeklyHours > 40) {
            setSubjectFormError("每周投入时长请填写 1~40 之间的数字。\n");
            return;
        }
        if (subjectForm.targetScore !== "" && (!Number.isFinite(targetScore) || targetScore < 0 || targetScore > 100)) {
            setSubjectFormError("目标分请填写 0~100 之间的数字。\n");
            return;
        }
        if (subjectForm.examDate && normalizedExamDate !== subjectForm.examDate) {
            setSubjectFormError("考试日期不能早于今天，请重新选择。\n");
            return;
        }
        if (duplicated) {
            setSubjectFormError("同名课程已存在，请直接修改原课程或更换名称。\n");
            return;
        }

        setSubjectFormError("");
        setProfile({
            ...profile,
            subjects: [
                ...(profile.subjects || []),
                {
                    id: uid(),
                    ...subjectForm,
                    name,
                    targetScore: subjectForm.targetScore === "" ? "" : targetScore,
                    examDate: normalizedExamDate,
                    weeklyHours,
                },
            ],
        });
        setSubjectForm({
            name: "",
            targetScore: "",
            examDate: "",
            base: "medium",
            weeklyHours: 3,
            focus: "",
        });
    };

    const removeSubject = (id) => {
        setProfile({
            ...profile,
            subjects: (profile.subjects || []).filter((s) => s.id !== id),
        });
    };

    const updateScheduleCell = (dayKey, slotKey) => {
        const key = `${dayKey}-${slotKey}`;
        setProfile({
            ...profile,
            schedule: {
                ...(profile.schedule || {}),
                [key]: nextScheduleState(profile.schedule?.[key] || "free"),
            },
        });
    };

    const freeCount = Object.values(profile.schedule || {}).filter((v) => v === "free").length;

    return (
        <div>
            <Card style={{ background: "linear-gradient(135deg, #f3f3f4, #f3f3f4)" }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>引导式学习摸底</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#111111" }}>先了解你，再给你排计划</div>
                <div style={{ fontSize: 12, color: "#6b6d6d", marginTop: 8, lineHeight: 1.7 }}>
                    按课程、目标、课表、可用学习时段、基础强弱收集信息。完成度越高，后续 AI 规划越贴合真实情况。
                </div>
                <div style={{ marginTop: 10 }}>
                    <Tag>{`摸底完成度 ${intakeCompletion}%`}</Tag>
                </div>
            </Card>

            <Card>
                <div style={sectionTitle}>1. 学期目标</div>
                <Input
                    placeholder="本学期总目标（如：高数 85+，英语四级通过）"
                    value={profile.examGoal || ""}
                    onChange={(e) => setProfile({ ...profile, examGoal: e.target.value })}
                />
                <Input
                    placeholder="短期目标（如：两周内完成概率论前三章）"
                    value={profile.shortGoal || ""}
                    onChange={(e) => setProfile({ ...profile, shortGoal: e.target.value })}
                    style={{ marginTop: 8 }}
                />
                <Textarea
                    placeholder="长期目标（如：保持绩点、考研基础铺垫）"
                    value={profile.longGoal || ""}
                    onChange={(e) => setProfile({ ...profile, longGoal: e.target.value })}
                    style={{ marginTop: 8 }}
                />
            </Card>

            <Card>
                <div style={sectionTitle}>2. 课程与考试信息</div>
                <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 8 }}>
                    <Input
                        placeholder="课程名"
                        value={subjectForm.name}
                        onChange={(e) => {
                            if (subjectFormError) setSubjectFormError("");
                            setSubjectForm({ ...subjectForm, name: e.target.value });
                        }}
                    />
                    <Input
                        placeholder="目标分"
                        value={subjectForm.targetScore}
                        onChange={(e) => {
                            if (subjectFormError) setSubjectFormError("");
                            setSubjectForm({ ...subjectForm, targetScore: e.target.value });
                        }}
                    />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                    <Input
                        type="date"
                        value={subjectForm.examDate}
                        onChange={(e) => {
                            if (subjectFormError) setSubjectFormError("");
                            setSubjectForm({ ...subjectForm, examDate: e.target.value });
                        }}
                    />
                    <Select
                        value={subjectForm.base}
                        onChange={(e) => {
                            if (subjectFormError) setSubjectFormError("");
                            setSubjectForm({ ...subjectForm, base: e.target.value });
                        }}
                    >
                        {Object.entries(BASE_LEVELS).map(([key, item]) => (
                            <option key={key} value={key}>{item.label}</option>
                        ))}
                    </Select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 8, marginTop: 8 }}>
                    <Input
                        type="number"
                        min="1"
                        max="40"
                        value={subjectForm.weeklyHours}
                        onChange={(e) => {
                            if (subjectFormError) setSubjectFormError("");
                            setSubjectForm({ ...subjectForm, weeklyHours: e.target.value });
                        }}
                        placeholder="每周希望投入小时数"
                    />
                    <Input
                        placeholder="薄弱模块/重点（可选）"
                        value={subjectForm.focus}
                        onChange={(e) => {
                            if (subjectFormError) setSubjectFormError("");
                            setSubjectForm({ ...subjectForm, focus: e.target.value });
                        }}
                    />
                </div>

                <Button onClick={addSubject} style={{ width: "100%", marginTop: 10 }}>添加课程</Button>
                {subjectFormError && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "#b91c1c", lineHeight: 1.6 }}>{subjectFormError}</div>
                )}

                {(profile.subjects || []).length === 0 ? (
                    <div style={{ ...emptyText, marginTop: 10 }}>还没有课程信息。</div>
                ) : (
                    <div style={{ marginTop: 12 }}>
                        {(profile.subjects || []).map((subject) => (
                            <Card key={subject.id} style={{ padding: "12px 14px", marginBottom: 8, background: "#fcfdfb" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, fontWeight: 700 }}>{subject.name}</div>
                                        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                                            {BASE_LEVELS[subject.base]?.label} · 目标 {subject.targetScore || "—"} 分 · 每周 {subject.weeklyHours || "—"} 小时
                                        </div>
                                        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                                            考试日期：{subject.examDate ? fmt(subject.examDate) : "未设置"}
                                        </div>
                                    </div>
                                    <Button variant="ghost" onClick={() => removeSubject(subject.id)} style={{ color: "#c0392b" }}>删除</Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </Card>

            <Card>
                <div style={sectionTitle}>3. 每周课表 / 可用学习时段</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
                    点击方格切换“有课/忙”与“可安排”。系统会尽量避开忙碌时段排计划。
                </div>

                <div style={{ overflowX: "auto" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "54px repeat(7, 1fr)", gap: 6, minWidth: 540 }}>
                        <div />
                        {DAYS.map((day) => (
                            <div key={day.key} style={{ textAlign: "center", fontSize: 12, color: "#6b7280", paddingBottom: 4 }}>
                                {day.label}
                            </div>
                        ))}

                        {SLOTS.map((slot) => (
                            <div key={slot.key} style={{ display: "contents" }}>
                                <div style={{ display: "flex", alignItems: "center", fontSize: 12, color: "#6b7280" }}>
                                    {slot.label}
                                </div>
                                {DAYS.map((day) => {
                                    const key = `${day.key}-${slot.key}`;
                                    const value = profile.schedule?.[key] || "free";
                                    const busy = value === "busy";
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => updateScheduleCell(day.key, slot.key)}
                                            style={{
                                                minHeight: 46,
                                                borderRadius: 12,
                                                border: `1px solid ${busy ? "#fca5a5" : "#bbf7d0"}`,
                                                background: busy ? "#fff1f2" : "#f3f3f4",
                                                color: busy ? "#b91c1c" : "#3a3c3c",
                                                fontSize: 11,
                                                fontFamily: "inherit",
                                                cursor: "pointer",
                                            }}
                                        >
                                            {scheduleLabel(value)}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                <Textarea
                    placeholder="补充说明（如：周三晚上社团活动，周末白天可学习 4 小时）"
                    value={profile.availableNote || ""}
                    onChange={(e) => setProfile({ ...profile, availableNote: e.target.value })}
                    style={{ marginTop: 12 }}
                />

                <div style={{ marginTop: 10 }}>
                    <Tag>{`未来 1 周可排学习时段：约 ${freeCount} 格`}</Tag>
                </div>
            </Card>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   PlanPage v8：苹果日历风格周视图
   ═══════════════════════════════════════════════════════════ */
