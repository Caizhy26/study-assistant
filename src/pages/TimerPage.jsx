import React, { useEffect, useRef, useState } from "react";
import { MASTERY } from "../constants/appConstants";
import { uid, today, addDays, formatTime, defaultTimerState } from "../utils/core";
import { getMasteryLabel, createReviewItem, playBellSound } from "../utils/study";
import { Card, Button, Input, Textarea, Select, Tag } from "../components/ui";
import { sectionTitle, emptyText, listRow } from "../styles/appStyles";
import { useLiveElapsed } from "../hooks/useLiveElapsed";
export default function TimerPage({
    timerState,
    setTimerState,
    tasks,
    setTasks,
    records,
    setRecords,
    reviews,
    setReviews,
    achievements,
    setAchievements,
    issues,
    setIssues,
}) {
    // 计时数据：只在 timerState.running 为 true 时才每秒刷新
    const elapsed = useLiveElapsed(timerState);
    const pendingTasks = tasks.filter((t) => !t.done);
    const [selectedTaskId, setSelectedTaskId] = useState(timerState.linkedTaskId || "");
    const [manualSubject, setManualSubject] = useState(timerState.subject || "");
    const [showLog, setShowLog] = useState(false);
    const [summary, setSummary] = useState("");
    const [issueText, setIssueText] = useState("");
    const [mastery, setMastery] = useState("understand");
    const [timerMode, setTimerMode] = useState(timerState.mode || "stopwatch");
    const [pomodoroWorkMinutes, setPomodoroWorkMinutes] = useState(Math.max(1, Math.round((timerState.pomodoroWorkSeconds || 25 * 60) / 60)));
    const [pomodoroBreakMinutes, setPomodoroBreakMinutes] = useState(Math.max(1, Math.round((timerState.pomodoroBreakSeconds || 5 * 60) / 60)));
    const [sessionStudySeconds, setSessionStudySeconds] = useState(0);
    const transitionLockRef = useRef(false);

    const selectedTask = pendingTasks.find((t) => t.id === selectedTaskId);
    const currentSubject = selectedTask?.subject || manualSubject || timerState.subject || "";
    const pomodoroPhase = timerState.pomodoroPhase || "work";
    const pomodoroPhaseTotal = timerState.mode === "pomodoro"
        ? (pomodoroPhase === "break" ? (timerState.pomodoroBreakSeconds || pomodoroBreakMinutes * 60) : (timerState.pomodoroWorkSeconds || pomodoroWorkMinutes * 60))
        : 0;
    const pomodoroRemaining = timerState.mode === "pomodoro"
        ? Math.max(0, pomodoroPhaseTotal - elapsed)
        : 0;
    const effectiveStudySeconds = timerState.mode === "pomodoro"
        ? (timerState.pomodoroAccumulatedWorkSeconds || 0) + (pomodoroPhase === "work" ? Math.min(elapsed, pomodoroPhaseTotal || 0) : 0)
        : elapsed;

    useEffect(() => {
        if (timerState.mode !== "pomodoro" || !timerState.running || pomodoroPhaseTotal <= 0) {
            transitionLockRef.current = false;
            return;
        }

        if (elapsed < pomodoroPhaseTotal) {
            transitionLockRef.current = false;
            return;
        }

        if (transitionLockRef.current) return;
        transitionLockRef.current = true;
        playBellSound();

        const finishedWork = (timerState.pomodoroPhase || "work") === "work";
        if (finishedWork) {
            const workSec = timerState.pomodoroWorkSeconds || 25 * 60;
            const minutes = Math.max(1, Math.round(workSec / 60));
            const subject = currentSubject || "未分类";
            const content = selectedTask?.title || "番茄钟专注（自动记录）";
            setRecords((prev) => [
                ...prev,
                {
                    id: uid(),
                    date: today(),
                    subject,
                    content,
                    minutes,
                    mastery: "understand",
                    time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
                },
            ]);
        }

        setTimerState((prev) => {
            const finishedWork = (prev.pomodoroPhase || "work") === "work";
            return {
                ...prev,
                running: true,
                start: Date.now(),
                elapsed: 0,
                pomodoroPhase: finishedWork ? "break" : "work",
                pomodoroCompleted: finishedWork ? (prev.pomodoroCompleted || 0) + 1 : (prev.pomodoroCompleted || 0),
                pomodoroAccumulatedWorkSeconds: finishedWork
                    ? (prev.pomodoroAccumulatedWorkSeconds || 0) + (prev.pomodoroWorkSeconds || 25 * 60)
                    : (prev.pomodoroAccumulatedWorkSeconds || 0),
            };
        });
    }, [currentSubject, elapsed, pomodoroPhaseTotal, selectedTask?.title, setRecords, setTimerState, timerState.mode, timerState.pomodoroPhase, timerState.pomodoroWorkSeconds, timerState.running]);

    const start = () => {
        const workSeconds = Math.max(1, Number(pomodoroWorkMinutes || 25)) * 60;
        const breakSeconds = Math.max(1, Number(pomodoroBreakMinutes || 5)) * 60;

        setSessionStudySeconds(0);
        setTimerState({
            ...defaultTimerState(),
            running: true,
            start: Date.now(),
            subject: currentSubject,
            elapsed: 0,
            linkedTaskId: selectedTaskId,
            mode: timerMode,
            pomodoroPhase: "work",
            pomodoroWorkSeconds: workSeconds,
            pomodoroBreakSeconds: breakSeconds,
            pomodoroCompleted: 0,
            pomodoroAccumulatedWorkSeconds: 0,
        });
    };

    const pause = () => setTimerState((prev) => ({
        ...prev,
        running: false,
        elapsed,
        start: null,
        linkedTaskId: selectedTaskId,
        subject: currentSubject || prev.subject,
    }));

    const resume = () => setTimerState((prev) => ({
        ...prev,
        running: true,
        start: Date.now(),
        linkedTaskId: selectedTaskId,
        subject: currentSubject || prev.subject,
    }));

    const resetTimer = () => {
        setTimerState(defaultTimerState());
        setSelectedTaskId("");
        setManualSubject("");
    };

    const stop = () => {
        const secondsToSave = Math.max(0, effectiveStudySeconds);
        setTimerState((prev) => ({ ...prev, running: false, start: null, elapsed }));
        setSessionStudySeconds(secondsToSave);

        if (secondsToSave >= 60) setShowLog(true);
        else {
            setShowLog(false);
            resetTimer();
        }
    };

    const saveRecord = () => {
        const minutes = Math.max(1, Math.round((sessionStudySeconds || effectiveStudySeconds) / 60));
        const subject = currentSubject || "未分类";
        const content = summary.trim() || selectedTask?.title || (timerMode === "pomodoro" ? "番茄钟学习记录" : "学习记录");

        setRecords([
            ...records,
            {
                id: uid(),
                date: today(),
                subject,
                content,
                minutes,
                mastery,
                time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
            },
        ]);

        const newReviews = [];
        if (content) newReviews.push(createReviewItem(subject, content));
        if (issueText.trim()) newReviews.push(createReviewItem(subject, `复盘：${issueText.trim()}`));
        if (newReviews.length > 0) setReviews([...reviews, ...newReviews]);

        if (issueText.trim()) {
            setIssues([
                ...issues,
                {
                    id: uid(),
                    subject,
                    content: issueText.trim(),
                    type: "block",
                    createdAt: today(),
                    status: "open",
                },
            ]);
        }

        if (selectedTaskId) {
            setTasks(tasks.map((task) => {
                if (task.id !== selectedTaskId) return task;
                if (mastery === "grasp" || mastery === "master") {
                    return { ...task, done: true, blocked: false };
                }
                return {
                    ...task,
                    blocked: mastery === "fuzzy" || mastery === "new" ? true : task.blocked,
                    plannedDate: mastery === "fuzzy" || mastery === "new"
                        ? addDays(1, task.plannedDate ? new Date(task.plannedDate) : new Date()).toISOString().split("T")[0]
                        : task.plannedDate,
                };
            }));
        }

        const isNewDay = achievements.lastStudyDate !== today();
        const isConsecutive = achievements.lastStudyDate === addDays(-1).toISOString().split("T")[0];
        setAchievements({
            streak: isNewDay ? (isConsecutive ? achievements.streak + 1 : 1) : achievements.streak,
            lastStudyDate: today(),
            totalMinutes: Number(achievements.totalMinutes || 0) + minutes,
        });

        resetTimer();
        setSummary("");
        setIssueText("");
        setMastery("understand");
        setSessionStudySeconds(0);
        setShowLog(false);
    };

    if (showLog) {
        return (
            <div>
                <Card style={{ textAlign: "center", background: "linear-gradient(135deg, #ffffff, #f3f3f4)" }}>
                    <div style={{ fontSize: 42 }}>🎉</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#111111", marginTop: 6 }}>
                        本次学习 {Math.max(1, Math.round((sessionStudySeconds || effectiveStudySeconds) / 60))} 分钟
                    </div>
                    <div style={{ fontSize: 12, color: "#6b6d6d", marginTop: 6 }}>
                        学后反馈会直接影响后续计划与复习安排
                    </div>
                </Card>

                <Card>
                    <div style={sectionTitle}>学习反馈</div>
                    <Input
                        placeholder="今天主要学了什么？"
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                    />
                    <Textarea
                        placeholder="有卡点/错题/作业难点吗？可粘贴一句描述"
                        value={issueText}
                        onChange={(e) => setIssueText(e.target.value)}
                        style={{ marginTop: 8 }}
                    />

                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 12, marginBottom: 6 }}>掌握程度</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {MASTERY.map((m) => (
                            <Button
                                key={m.key}
                                variant={mastery === m.key ? "primary" : "secondary"}
                                onClick={() => setMastery(m.key)}
                                style={{
                                    background: mastery === m.key ? m.color : undefined,
                                    color: mastery === m.key ? "#fff" : undefined,
                                    padding: "7px 10px",
                                }}
                            >
                                {m.label}
                            </Button>
                        ))}
                    </div>

                    <Button onClick={saveRecord} style={{ width: "100%", marginTop: 14 }}>
                        保存记录并更新后续安排
                    </Button>
                </Card>
            </div>
        );
    }

    const isRunning = timerState.running;
    const isPaused = !timerState.running && elapsed > 0;
    const activeMode = isRunning || isPaused ? timerState.mode : timerMode;
    const displaySeconds = activeMode === "pomodoro" ? (isRunning || isPaused ? pomodoroRemaining : Number(pomodoroWorkMinutes || 25) * 60) : elapsed;
    const displayTitle = activeMode === "pomodoro"
        ? ((isRunning || isPaused ? pomodoroPhase : "work") === "break" ? "休息倒计时" : "专注倒计时")
        : "正计时";

    return (
        <div>
            <Card>
                <div style={sectionTitle}>计时模式</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[
                        { key: "stopwatch", label: "普通计时" },
                        { key: "pomodoro", label: "番茄钟" },
                    ].map((item) => (
                        <Button
                            key={item.key}
                            variant={timerMode === item.key ? "primary" : "secondary"}
                            onClick={() => !isRunning && !isPaused && setTimerMode(item.key)}
                            disabled={isRunning || isPaused}
                        >
                            {item.label}
                        </Button>
                    ))}
                </div>

                {timerMode === "pomodoro" && (
                    <div style={{
                        marginTop: 14,
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: 10,
                    }}>
                        <Input
                            type="number"
                            min="1"
                            max="180"
                            value={pomodoroWorkMinutes}
                            disabled={isRunning || isPaused}
                            onChange={(e) => setPomodoroWorkMinutes(e.target.value)}
                            placeholder="专注分钟"
                        />
                        <Input
                            type="number"
                            min="1"
                            max="60"
                            value={pomodoroBreakMinutes}
                            disabled={isRunning || isPaused}
                            onChange={(e) => setPomodoroBreakMinutes(e.target.value)}
                            placeholder="休息分钟"
                        />
                    </div>
                )}
            </Card>

            <Card style={{
                textAlign: "center",
                padding: 24,
                background: isRunning ? "linear-gradient(135deg, #111111, #3d6d21)" : "#f7faf6",
                color: isRunning ? "#fff" : "#1f2937",
            }}>
                <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                    <Tag color={activeMode === "pomodoro" ? "#ffffff" : "#111111"} bg={activeMode === "pomodoro" && isRunning ? "rgba(255,255,255,0.16)" : "#efefef"}>
                        {activeMode === "pomodoro" ? "番茄钟" : "普通计时"}
                    </Tag>
                    {activeMode === "pomodoro" && (
                        <Tag color={isRunning ? "#ffffff" : (pomodoroPhase === "break" ? "#166534" : "#111111")} bg={isRunning ? "rgba(255,255,255,0.16)" : (pomodoroPhase === "break" ? "#dcfce7" : "#efefef")}>
                            {pomodoroPhase === "break" ? "休息阶段" : "专注阶段"}
                        </Tag>
                    )}
                    {activeMode === "pomodoro" && (
                        <Tag color={isRunning ? "#ffffff" : "#111111"} bg={isRunning ? "rgba(255,255,255,0.16)" : "#efefef"}>
                            已完成 {timerState.pomodoroCompleted || 0} 个番茄
                        </Tag>
                    )}
                </div>

                <div style={{ fontSize: 12, opacity: isRunning ? 0.85 : 0.75, letterSpacing: 3, marginTop: 18, marginBottom: 14, textTransform: "uppercase" }}>{displayTitle}</div>
                <div style={{ fontSize: 64, fontWeight: 200, letterSpacing: 4, lineHeight: 1.1, marginBottom: 8, fontVariantNumeric: "tabular-nums" }}>{formatTime(displaySeconds)}</div>

                {!isRunning && !isPaused && (
                    <>
                        <Select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)} style={{ marginTop: 12 }}>
                            <option value="">绑定一个待办任务（可选）</option>
                            {pendingTasks.map((task) => (
                                <option key={task.id} value={task.id}>
                                    {task.title}
                                </option>
                            ))}
                        </Select>
                        <Input
                            placeholder="或手动输入学习科目"
                            value={manualSubject}
                            onChange={(e) => setManualSubject(e.target.value)}
                            style={{ marginTop: 8, textAlign: "center" }}
                        />
                    </>
                )}

                <div style={{ marginTop: 18, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                    {!isRunning && !isPaused && <Button onClick={start} style={{ padding: "11px 28px", borderRadius: 999 }}>开始学习</Button>}
                    {isRunning && (
                        <>
                            <Button onClick={pause} style={{ background: "rgba(255,255,255,0.18)", color: "#fff", borderRadius: 999 }}>暂停</Button>
                            <Button onClick={stop} variant="danger" style={{ borderRadius: 999 }}>结束</Button>
                        </>
                    )}
                    {isPaused && (
                        <>
                            <Button onClick={resume} style={{ borderRadius: 999 }}>继续</Button>
                            <Button onClick={stop} variant="danger" style={{ borderRadius: 999 }}>结束</Button>
                        </>
                    )}
                </div>

                <div style={{ fontSize: 12, marginTop: 12, opacity: isRunning ? 0.82 : 0.75 }}>
                    当前科目：{currentSubject || "未设置"}
                    {timerState.mode === "pomodoro" ? ` · 已累计专注 ${Math.max(0, Math.round(effectiveStudySeconds / 60))} 分钟` : ""}
                </div>
                {timerMode === "pomodoro" && (
                    <div style={{ fontSize: 11, marginTop: 8, opacity: isRunning ? 0.78 : 0.6 }}>
                        每轮：专注 {Number(pomodoroWorkMinutes || 25)} 分钟 / 休息 {Number(pomodoroBreakMinutes || 5)} 分钟，阶段切换时会响铃提醒
                    </div>
                )}
            </Card>

            <Card>
                <div style={sectionTitle}>最近学习记录</div>
                {records.length === 0 ? (
                    <div style={emptyText}>还没有学习记录。</div>
                ) : (
                    [...records].reverse().slice(0, 5).map((record) => (
                        <div key={record.id} style={listRow}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700 }}>{record.subject} · {record.content}</div>
                                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                                    {record.date} {record.time} · 掌握度：{getMasteryLabel(record.mastery)}
                                </div>
                            </div>
                            <Tag>{record.minutes} 分</Tag>
                        </div>
                    ))
                )}
            </Card>
        </div>
    );
}
