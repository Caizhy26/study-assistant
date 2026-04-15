import React, { useEffect, useMemo, useRef, useState } from "react";
import { MASTERY } from "../constants/appConstants";
import { uid, today, addDays, formatTime, defaultTimerState, toLocalDateKey } from "../utils/core";
import { getMasteryLabel, createReviewItem, playBellSound } from "../utils/study";
import { Card, Button, Input, Textarea, Select, Tag } from "../components/ui";
import { sectionTitle, emptyText, listRow } from "../styles/appStyles";
import { useLiveElapsed } from "../hooks/useLiveElapsed";
import { callAIChat } from "../services/aiService";

function buildTutorMessages({ currentSubject, selectedTask, chatMessages, userText }) {
    const system = `你是学习过程中的实时助教。请用中文回答，保持简洁、可执行、按步骤推进。
规则：
1. 优先帮用户推进“下一步”，不要长篇大论。
2. 如果信息不够，先追问最关键的一个条件。
3. 若用户是数学/理工科题目，优先给思路、检查点和易错点。
4. 不要输出 markdown 标题，不要过度格式化。`;

    const context = `当前任务：${selectedTask?.title || "未绑定任务"}\n科目：${currentSubject || "未分类"}\n`;

    return [
        { role: "system", content: system },
        { role: "system", content: context },
        ...chatMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userText },
    ];
}

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
    const chatScrollRef = useRef(null);
    const [chatMessages, setChatMessages] = useState([
        { role: "assistant", content: "我会在你专注时做实时答疑。把你卡住的步骤、思路或题目条件发给我，我会尽量给你最小下一步。", ts: Date.now() },
    ]);
    const [chatInput, setChatInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);

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

    const focusTitle = useMemo(() => {
        if (selectedTask?.title) return selectedTask.title;
        if (currentSubject) return `${currentSubject} 自主学习`;
        return "未绑定具体任务";
    }, [currentSubject, selectedTask?.title]);

    useEffect(() => {
        if (!chatScrollRef.current) return;
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }, [chatMessages, chatLoading]);

    useEffect(() => {
        if (timerState.running || elapsed > 0) return;
        setChatMessages([
            {
                role: "assistant",
                content: selectedTask?.title
                    ? `现在做的是「${selectedTask.title}」。把你卡住的地方发给我，我会尽量只给你下一步。`
                    : currentSubject
                        ? `当前科目是「${currentSubject}」。遇到不会的地方就直接问我。`
                        : "先绑定一个任务或输入学习科目，然后我可以边计时边给你实时答疑。",
                ts: Date.now(),
            },
        ]);
        setChatInput("");
    }, [currentSubject, elapsed, selectedTask?.title, timerState.running]);

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
            const isWork = (prev.pomodoroPhase || "work") === "work";
            return {
                ...prev,
                running: true,
                start: Date.now(),
                elapsed: 0,
                pomodoroPhase: isWork ? "break" : "work",
                pomodoroCompleted: isWork ? (prev.pomodoroCompleted || 0) + 1 : (prev.pomodoroCompleted || 0),
                pomodoroAccumulatedWorkSeconds: isWork
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
                        ? toLocalDateKey(addDays(1, task.plannedDate ? new Date(task.plannedDate) : new Date()))
                        : task.plannedDate,
                };
            }));
        }

        const isNewDay = achievements.lastStudyDate !== today();
        const isConsecutive = achievements.lastStudyDate === toLocalDateKey(addDays(-1));
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

    const sendChat = async () => {
        const text = chatInput.trim();
        if (!text || chatLoading) return;
        const nextUser = { role: "user", content: text, ts: Date.now() };
        setChatMessages((prev) => [...prev, nextUser]);
        setChatInput("");
        setChatLoading(true);
        try {
            const reply = await callAIChat(buildTutorMessages({
                currentSubject,
                selectedTask,
                chatMessages,
                userText: text,
            }), {
                temperature: 0.3,
                max_tokens: 900,
            });
            setChatMessages((prev) => [...prev, { role: "assistant", content: reply || "我暂时没有生成有效回复，你可以换一种说法再问我。", ts: Date.now() }]);
        } catch (err) {
            setChatMessages((prev) => [...prev, {
                role: "assistant",
                content: `在线答疑暂时不可用：${err.message || "请求失败"}。你仍然可以继续专注计时，稍后再试。`,
                ts: Date.now(),
            }]);
        } finally {
            setChatLoading(false);
        }
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
        <div style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.05fr) minmax(320px, 0.95fr)",
            gap: 18,
            alignItems: "start",
        }} className="timer-workspace-grid">
            <div style={{ minWidth: 0 }}>
                <Card style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,249,252,0.95))" }}>
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
                    padding: 30,
                    background: isRunning
                        ? "linear-gradient(135deg, #162549, #2e4f9f)"
                        : "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(236,242,255,0.96))",
                    color: isRunning ? "#fff" : "#1f2937",
                    boxShadow: isRunning
                        ? "0 24px 46px rgba(22,37,73,0.24)"
                        : "0 16px 36px rgba(51,65,85,0.08)",
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

                    <div style={{ fontSize: 12, opacity: isRunning ? 0.86 : 0.72, letterSpacing: 3, marginTop: 18, marginBottom: 14, textTransform: "uppercase" }}>{displayTitle}</div>
                    <div style={{ fontSize: 72, fontWeight: 200, letterSpacing: 4, lineHeight: 1.02, marginBottom: 10, fontVariantNumeric: "tabular-nums", fontFamily: "'Manrope', 'Inter', sans-serif" }}>{formatTime(displaySeconds)}</div>

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
                        当前内容：{focusTitle}
                        {timerState.mode === "pomodoro" ? ` · 已累计专注 ${Math.max(0, Math.round(effectiveStudySeconds / 60))} 分钟` : ""}
                    </div>
                    {timerMode === "pomodoro" && (
                        <div style={{ fontSize: 11, marginTop: 8, opacity: isRunning ? 0.78 : 0.6 }}>
                            每轮：专注 {Number(pomodoroWorkMinutes || 25)} 分钟 / 休息 {Number(pomodoroBreakMinutes || 5)} 分钟，阶段切换时会响铃提醒
                        </div>
                    )}
                </Card>

                <Card style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,249,252,0.95))" }}>
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

            <div style={{ minWidth: 0 }}>
                <Card style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: 0,
                    minHeight: 560,
                    maxHeight: "min(78vh, 900px)",
                    overflow: "hidden",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(246,249,255,0.94))",
                }} className="timer-chat-card">
                    <div style={{
                        padding: "18px 20px 16px",
                        borderBottom: "1px solid rgba(203,213,225,0.22)",
                        background: "linear-gradient(180deg, rgba(255,255,255,1), rgba(244,247,255,0.96))",
                    }}>
                        <div style={{ ...sectionTitle, marginBottom: 6 }}>实时 AI 答疑</div>
                        <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
                            右侧对话会围绕你当前的任务和科目展开，适合在专注过程中随时问一个小问题，而不打断整个学习流程。
                        </div>
                    </div>

                    <div ref={chatScrollRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 18, background: "linear-gradient(180deg, rgba(248,250,255,0.82), rgba(241,245,252,0.56))" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {chatMessages.map((msg, index) => {
                                const isUser = msg.role === "user";
                                return (
                                    <div key={`${msg.ts || index}-${index}`} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                                        <div style={{
                                            maxWidth: "86%",
                                            padding: "12px 15px",
                                            borderRadius: isUser ? "18px 18px 8px 18px" : "18px 18px 18px 8px",
                                            background: isUser
                                                ? "linear-gradient(135deg, #243d91, #0f172a)"
                                                : "rgba(255,255,255,0.98)",
                                            color: isUser ? "#ffffff" : "#111111",
                                            boxShadow: isUser
                                                ? "0 14px 28px rgba(36,61,145,0.22)"
                                                : "0 10px 24px rgba(51,65,85,0.05), inset 0 0 0 1px rgba(226,232,240,0.72)",
                                            fontSize: 13,
                                            lineHeight: 1.7,
                                            whiteSpace: "pre-wrap",
                                            wordBreak: "break-word",
                                        }}>
                                            {msg.content}
                                        </div>
                                    </div>
                                );
                            })}
                            {chatLoading && (
                                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                                    <div style={{
                                        padding: "10px 14px",
                                        borderRadius: "18px 18px 18px 6px",
                                        background: "rgba(255,255,255,0.96)",
                                        color: "#6b7280",
                                        boxShadow: "0 10px 24px rgba(26,28,28,0.05), inset 0 0 0 1px rgba(198,198,198,0.14)",
                                        fontSize: 12,
                                    }}>
                                        正在思考…
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ padding: 14, borderTop: "1px solid rgba(198,198,198,0.16)", background: "rgba(255,255,255,0.98)" }}>
                        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10, lineHeight: 1.6 }}>
                            当前上下文：{focusTitle}
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                            <Textarea
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="例如：这一步为什么不能直接换元？我现在卡在第二行。"
                                style={{ minHeight: 84, margin: 0 }}
                            />
                            <Button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} style={{ minWidth: 92, alignSelf: "stretch" }}>
                                发送
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
