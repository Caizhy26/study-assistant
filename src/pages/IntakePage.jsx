import React, { useEffect, useRef, useState } from "react";
import { SLOT_LABELS } from "../constants/appConstants";
import { useStore } from "../hooks/useStore";
import { uid, today, fmt } from "../utils/core";
import { mergeUniqueTasks } from "../utils/study";
import {
    extractJSONFromReply,
    callAIChat,
    AI_SYSTEM_PROMPT,
    buildOfflineConversationExtraction,
    offlineAIResponse,
    fileToDataUrl,
    normalizeExtractedSubjects,
    mergeProfileSnapshot,
    recognizeScheduleFromAttachment,
    normalizeExtractedDataPayload,
    checkAIHealth,
} from "../services/aiService";
import { Card, Button, Input, Tag } from "../components/ui";
import IntakeFormPage from "./IntakeFormPage";

export default function IntakePage({ profile, setProfile, intakeCompletion, setTasks, tasks, importAIPlan, handleReplan, setIssues, setTab, occupiedBlocks = [], setOccupiedBlocks, deleteScheduleById, deleteScheduleByTime, clearScheduleByRange, runOptimizer }) {
    const [mode, setMode] = useState("chat");
    const [chatHistory, setChatHistory] = useStore("sa_chat_history_v2", [
        { role: "assistant", content: `你好呀 🌿 我是小言，你的 AI 学习规划师。

我会通过几个问题了解你的情况，然后直接把学习计划排到你的日程表上（你可以去「日程 → 规划」Tab 看日历视图）。

先问第一个：这学期你主要在学哪几门课？最让你头疼或最想提分的是哪一门？` }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [showBackendInfo, setShowBackendInfo] = useState(false);
    const [backendStatus, setBackendStatus] = useState({ ok: false, mode: "offline", chatConfigured: false, visionConfigured: false });
    const [pendingAttachment, setPendingAttachment] = useState(null);
    const [attachmentError, setAttachmentError] = useState("");
    const fileInputRef = useRef(null);

    useEffect(() => {
        let disposed = false;
        checkAIHealth().then((status) => {
            if (!disposed) setBackendStatus(status);
        });
        return () => {
            disposed = true;
        };
    }, []);

    const onlineChatReady = backendStatus.ok && backendStatus.chatConfigured;
    const onlineVisionReady = backendStatus.ok && backendStatus.visionConfigured;

    const mergeExtractedData = (data) => {
        if (!data) return;
        const normalized = normalizeExtractedDataPayload(data);
        setProfile((prev) => mergeProfileSnapshot(prev, normalized));
        if (normalized.issues && normalized.issues.length > 0 && setIssues) {
            setIssues((prev) => [
                ...prev,
                ...normalized.issues.map((issue) => ({
                    id: uid(),
                    ...issue,
                    status: "open",
                    createdAt: today(),
                })),
            ]);
        }
        if (normalized.occupiedBlocks && normalized.occupiedBlocks.length > 0 && setOccupiedBlocks) {
            setOccupiedBlocks((prev) => {
                const base = (prev || []).slice();
                const seen = new Set(base.map((block) => `${block?.date}|${block?.slot}`));
                const next = base.slice();
                normalized.occupiedBlocks.forEach((block) => {
                    const key = `${block.date}|${block.slot}`;
                    if (seen.has(key)) return;
                    seen.add(key);
                    next.push(block);
                });
                return next;
            });
            if (runOptimizer) {
                const existing = Array.isArray(occupiedBlocks) ? occupiedBlocks : [];
                const seen = new Set(existing.map((block) => `${block?.date}|${block?.slot}`));
                const mergedBlocks = existing.slice();
                normalized.occupiedBlocks.forEach((block) => {
                    const key = `${block.date}|${block.slot}`;
                    if (seen.has(key)) return;
                    seen.add(key);
                    mergedBlocks.push(block);
                });
                runOptimizer(mergedBlocks);
            }
        }
        if (normalized.newTasks && normalized.newTasks.length > 0 && setTasks) {
            setTasks((prev) => mergeUniqueTasks(prev || [], normalized.newTasks.map((task) => ({
                ...task,
                source: "ai-chat",
                note: task.note || "",
            })), { fallbackSource: "ai-chat" }));
        }
    };

    const normalizeSlotText = (value) => {
        const raw = String(value || "").trim();
        if (["morning", "afternoon", "evening"].includes(raw)) return raw;
        if (raw === "上午") return "morning";
        if (raw === "下午") return "afternoon";
        if (raw === "晚上" || raw === "晚间") return "evening";
        return "";
    };

    const parseDateFromText = (value) => {
        const text = String(value || "");
        const explicit = text.match(/\d{4}-\d{2}-\d{2}/);
        if (explicit) return explicit[0];
        if (/后天/.test(text)) return new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0];
        if (/明天/.test(text)) return new Date(Date.now() + 86400000).toISOString().split("T")[0];
        if (/今天/.test(text)) return today();
        return "";
    };

    const parseActionFromUserText = (value) => {
        const text = String(value || "").trim();
        if (!text) return null;

        const idMatch = text.match(/(?:删除|移除).{0,6}(?:id|ID)\s*[:：]?\s*([a-zA-Z0-9_-]+)/);
        if (idMatch) return { type: "action", action: "delete_schedule_by_id", payload: { id: idMatch[1] } };

        if (/清空|删除/.test(text) && /(本周|这周)/.test(text)) {
            const startDate = new Date(`${today()}T00:00:00`);
            const dow = startDate.getDay() || 7;
            const weekStart = new Date(startDate);
            weekStart.setDate(startDate.getDate() - dow + 1);
            const startKey = weekStart.toISOString().split("T")[0];
            const endDate = new Date(weekStart);
            endDate.setDate(weekStart.getDate() + 6);
            const endKey = endDate.toISOString().split("T")[0];
            return { type: "action", action: "clear_schedule_range", payload: { startDate: startKey, endDate: endKey } };
        }

        const slotMatch = text.match(/(上午|下午|晚上|晚间|morning|afternoon|evening)/);
        const slot = normalizeSlotText(slotMatch ? slotMatch[1] : "");
        const date = parseDateFromText(text);
        if (/删除|移除|清空/.test(text) && date && slot) {
            return { type: "action", action: "delete_schedule", payload: { date, slot } };
        }

        return null;
    };

    const runAction = (actionObj) => {
        const action = actionObj?.action;
        const payload = actionObj?.payload || {};
        if (action === "delete_schedule_by_id") {
            if (deleteScheduleById) deleteScheduleById(payload.id);
            return true;
        }
        if (action === "delete_schedule") {
            if (deleteScheduleByTime) deleteScheduleByTime(payload.date, payload.slot);
            return true;
        }
        if (action === "clear_schedule_range") {
            if (clearScheduleByRange) clearScheduleByRange(payload.startDate, payload.endDate);
            return true;
        }
        return false;
    };

    const handlePickAttachment = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAttachmentError("");
        try {
            const dataUrl = await fileToDataUrl(file);
            setPendingAttachment({
                name: file.name,
                type: file.type || "image/*",
                dataUrl,
            });
        } catch (err) {
            setAttachmentError(`附件读取失败：${err.message}`);
        } finally {
            if (e.target) e.target.value = "";
        }
    };

    const clearPendingAttachment = () => {
        setPendingAttachment(null);
        setAttachmentError("");
    };

    const handleSend = async () => {
        const text = input.trim();
        if ((!text && !pendingAttachment) || loading) return;

        const attachment = pendingAttachment ? { ...pendingAttachment } : null;
        setInput("");
        setPendingAttachment(null);
        setAttachmentError("");

        const localAction = text ? parseActionFromUserText(text) : null;
        if (!attachment && localAction) {
            const userMessage = { role: "user", content: text, attachment: null };
            const newHistory = [...chatHistory, userMessage];
            setChatHistory(newHistory);
            const applied = runAction(localAction);
            setChatHistory((prev) => [...prev, {
                role: "assistant",
                content: applied
                    ? "✅ 已执行日程删除操作，并已重新计算后续安排。"
                    : "⚠️ 没能识别要删除的具体时间。你可以说：删除今天下午 / 删除 2026-04-15 晚上 / 清空本周。",
            }]);
            if (applied && setTab) setTimeout(() => setTab("plan"), 220);
            return;
        }

        const userMessage = {
            role: "user",
            content: text || (attachment ? "已发送一张图片，请帮我结合图片分析。" : ""),
            attachment: attachment ? { name: attachment.name, type: attachment.type, dataUrl: attachment.dataUrl } : null,
        };
        const newHistory = [...chatHistory, userMessage];
        setChatHistory(newHistory);
        setLoading(true);

        try {
            let rawReply;
            let effectiveProfile = profile;
            let attachmentContext = "";
            let attachmentIntro = "";
            let serviceNotice = "";
            let usedOnlineChat = false;

            if (attachment?.dataUrl) {
                const recognized = await recognizeScheduleFromAttachment(attachment.dataUrl);
                const attachmentData = {
                    schedule: recognized.schedule,
                    subjects: normalizeExtractedSubjects(recognized.extractedSubjects),
                };
                effectiveProfile = mergeProfileSnapshot(profile, attachmentData);
                mergeExtractedData(attachmentData);
                attachmentIntro = `📎 已收到图片附件：${attachment.name || "未命名图片"}。
${recognized.note || "我已经参考图片内容补充信息。"}`;
                attachmentContext = `用户刚上传了一张图片，识别结果如下：${JSON.stringify(recognized)}`;
            }

            const historyForAPI = newHistory.slice(-10).map((msg) => ({
                role: msg.role,
                content: `${msg.content || ""}${msg.attachment ? `
[附件：${msg.attachment.name || "图片"}]` : ""}`.trim(),
            }));

            if (onlineChatReady) {
                try {
                    const todayDate = today();
                    const weekdayName = new Date().toLocaleDateString("zh-CN", { weekday: "long" });
                    const existingTasksSummary = (tasks || [])
                        .filter((task) => !task.done && task.plannedDate >= todayDate)
                        .slice(0, 10)
                        .map((task) => `${task.plannedDate} ${SLOT_LABELS[task.slot] || ""} ${task.title}`)
                        .join("; ") || "无";
                    const messagesForAPI = [
                        { role: "system", content: AI_SYSTEM_PROMPT },
                        { role: "system", content: `今天是 ${todayDate}（${weekdayName}）。请基于这个日期计算 plannedDate。` },
                        { role: "system", content: `当前用户画像：${JSON.stringify(effectiveProfile)}` },
                        { role: "system", content: `用户已有未完成任务：${existingTasksSummary}（不要重复创建）` },
                        ...(attachmentContext ? [{ role: "system", content: attachmentContext }] : []),
                        ...historyForAPI,
                    ];
                    rawReply = await callAIChat(messagesForAPI);
                    usedOnlineChat = true;
                } catch (err) {
                    serviceNotice = `⚠️ 在线模型暂时不可用，已自动切换为离线模式：${err.message}`;
                    rawReply = offlineAIResponse(text || "我刚上传了一张课表图片", effectiveProfile);
                }
            } else {
                if (!backendStatus.ok) {
                    serviceNotice = "⚠️ 当前没有检测到后端代理，已自动使用离线模式。部署网站后若要真正连上 API，请同时部署后端并配置环境变量。";
                }
                await new Promise((resolve) => setTimeout(resolve, 300));
                rawReply = offlineAIResponse(text || "我刚上传了一张课表图片", effectiveProfile);
            }

            const tryParsed = extractJSONFromReply(rawReply);
            let parsed = tryParsed && typeof tryParsed === "object"
                ? {
                    type: tryParsed.type || "message",
                    action: tryParsed.action || "",
                    payload: tryParsed.payload || {},
                    reply: tryParsed.reply || rawReply,
                    extractedData: normalizeExtractedDataPayload(tryParsed.extractedData || {}),
                    suggestedAction: tryParsed.suggestedAction || "none",
                }
                : { type: "message", action: "", payload: {}, reply: rawReply, extractedData: null, suggestedAction: "none" };

            const wantsSchedule = /安排|排|计划|日程|加进|加到|帮我|生成|规划/.test(text || "");
            const hasNewTasks = parsed.extractedData?.newTasks?.length > 0;
            if (usedOnlineChat && wantsSchedule && !hasNewTasks) {
                try {
                    const todayDate2 = today();
                    const forceMessages = [
                        { role: "system", content: AI_SYSTEM_PROMPT },
                        { role: "system", content: `今天是 ${todayDate2}。` },
                        { role: "system", content: `当前用户画像：${JSON.stringify(effectiveProfile)}` },
                        {
                            role: "user",
                            content: `以下是我和你的最近对话（JSON 数组）：
${JSON.stringify(newHistory.slice(-8))}

请你只输出 JSON，不要任何解释。基于上述对话，立刻在 extractedData.newTasks 里生成 3-7 个具体可执行的学习任务（即使信息不全也要先排，note 里标"信息待完善"）。每个任务必须包含 title / subject / plannedDate（未来真实日期）/ slot / priority / difficulty。suggestedAction 设为 "generatePlan"。reply 字段写一句"我已根据我们的对话把以下任务加入了你的日程"。`,
                        },
                    ];
                    const forceRaw = await callAIChat(forceMessages);
                    const forceParsed = extractJSONFromReply(forceRaw);
                    if (forceParsed?.extractedData?.newTasks?.length > 0) {
                        const normalizedForceData = normalizeExtractedDataPayload(forceParsed.extractedData);
                        parsed = {
                            ...parsed,
                            extractedData: {
                                ...(parsed.extractedData || {}),
                                ...normalizedForceData,
                                newTasks: normalizedForceData.newTasks,
                            },
                            suggestedAction: "generatePlan",
                            reply: `${parsed.reply ? `${parsed.reply}

` : ""}✅ 我已根据我们的对话生成了 ${normalizedForceData.newTasks.length} 个任务并加入你的日程，可在「日程 → 规划」查看。`,
                        };
                    }
                } catch {
                    // ignore fallback extraction failure
                }
            }

            if (parsed.extractedData) mergeExtractedData(parsed.extractedData);

            const actionApplied = (parsed.type === "action" || parsed.action) ? runAction(parsed) : false;
            const assistantFallbackReply = actionApplied ? "✅ 已执行日程删除操作，并已重新计算后续安排。" : "";
            const assistantContent = [attachmentIntro, serviceNotice, parsed.reply || assistantFallbackReply].filter(Boolean).join("\n\n");
            setChatHistory([...newHistory, { role: "assistant", content: assistantContent }]);

            const generatedTaskCount = parsed.extractedData?.newTasks?.length || 0;
            if ((parsed.suggestedAction === "generatePlan" && generatedTaskCount > 0) || actionApplied) {
                if (setTab) setTimeout(() => setTab("plan"), 300);
            }
            if (parsed.suggestedAction === "replan" && handleReplan) {
                setTimeout(() => handleReplan(), 500);
            }
        } catch (err) {
            setChatHistory([...newHistory, {
                role: "assistant",
                content: `⚠️ 抱歉，这次处理失败了：${err.message}

你可以继续发送消息，系统仍然会尽量用离线模式帮你整理课程和任务。`,
            }]);
        } finally {
            setLoading(false);
        }
    };

    const extractTasksNow = async () => {
        if (loading) return;
        if (chatHistory.length < 2) {
            alert("先和我聊几句你的学习情况吧～");
            return;
        }

        setLoading(true);
        try {
            let parsed;
            let usedOnline = false;

            if (onlineChatReady) {
                try {
                    const todayDate = today();
                    const forceMessages = [
                        { role: "system", content: AI_SYSTEM_PROMPT },
                        { role: "system", content: `今天是 ${todayDate}。` },
                        { role: "system", content: `当前用户画像：${JSON.stringify(profile)}` },
                        {
                            role: "user",
                            content: `以下是我和你的全部对话（JSON）：
${JSON.stringify(chatHistory.slice(-20))}

请你只输出 JSON，不要任何解释、不要 markdown 代码块。基于以上对话，立刻在 extractedData.newTasks 里生成 4-8 个具体可执行的学习任务（信息不全时也要先排，note 标"信息待完善"）。每个任务包含 title / subject / plannedDate(未来真实日期 YYYY-MM-DD) / slot(morning|afternoon|evening) / priority / difficulty / note。suggestedAction 设为 "generatePlan"。reply 写一句"我已根据我们的对话把以下任务加入了你的日程"。`,
                        },
                    ];
                    const raw = await callAIChat(forceMessages);
                    parsed = extractJSONFromReply(raw);
                    usedOnline = true;
                } catch {
                    parsed = buildOfflineConversationExtraction(chatHistory.slice(-20), profile);
                }
            } else {
                parsed = buildOfflineConversationExtraction(chatHistory.slice(-20), profile);
            }

            const normalizedData = normalizeExtractedDataPayload(parsed?.extractedData || {});
            const newTasks = normalizedData.newTasks || [];
            if (newTasks.length > 0) {
                mergeExtractedData(normalizedData);
                setChatHistory((prev) => [...prev, {
                    role: "assistant",
                    content: `${usedOnline ? "✅" : "✅ 离线模式也已经"}根据我们的对话生成了 ${newTasks.length} 个任务并加入你的日程：

${newTasks.map((task) => `• ${task.plannedDate} ${SLOT_LABELS[task.slot] || task.slot} — ${task.title}`).join("\n")}

可去「日程 → 规划」查看完整日历。`,
                }]);
                if (setTab) setTimeout(() => setTab("plan"), 300);
            } else {
                setChatHistory((prev) => [...prev, {
                    role: "assistant",
                    content: usedOnline
                        ? "⚠️ 这次没能成功生成任务，可能是对话内容还太少。再告诉我一下：你想优先安排哪门课？这周哪几天下午/晚上有空？"
                        : "⚠️ 离线模式这次还没整理出可执行任务。你可以再明确一点，例如：我要学数分和线代；这周晚上有空；帮我安排 4 个任务。",
                }]);
            }
        } catch (err) {
            alert(`抽取失败：${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const resetChat = () => {
        if (confirm("重新开始对话？之前的对话历史会被清空（但已收集的信息保留）")) {
            setChatHistory([
                { role: "assistant", content: "我们重新开始吧 🌿 这学期你主要在学哪几门课？" },
            ]);
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", background: "#fff", borderRadius: 14,
                marginBottom: 10, boxShadow: "0 1px 4px rgba(26,28,28,0.05)",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 18,
                        background: "linear-gradient(135deg, #2f3131, #5d5f5f)",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                    }}>🌿</div>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#111111" }}>
                            小言 {onlineChatReady ? "🟢" : "🟡"}
                        </div>
                        <div style={{ fontSize: 10, color: "#6b7280" }}>
                            {onlineChatReady ? `在线代理${onlineVisionReady ? " + 图片识别" : ""}` : "离线模式"} · 摸底完成 {intakeCompletion}%
                        </div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setShowBackendInfo((prev) => !prev)} style={{
                        background: "none", border: "1px solid rgba(198,198,198,0.16)", borderRadius: 8,
                        padding: "4px 8px", cursor: "pointer", fontSize: 12,
                    }} title="查看后端连接说明">⚙️</button>
                    <button onClick={extractTasksNow} disabled={loading} style={{
                        background: "#efefef", border: "1px solid #86efac", borderRadius: 8,
                        padding: "4px 10px", cursor: loading ? "wait" : "pointer", fontSize: 12,
                        color: "#3a3c3c", fontWeight: 600,
                    }} title="把刚才的对话内容生成具体任务，加入日程表">📅 生成日程</button>
                    <button onClick={resetChat} style={{
                        background: "none", border: "1px solid rgba(198,198,198,0.16)", borderRadius: 8,
                        padding: "4px 8px", cursor: "pointer", fontSize: 12,
                    }} title="重置对话">🔄</button>
                    <button onClick={() => setMode(mode === "chat" ? "collapsed" : "chat")} style={{
                        background: "none", border: "1px solid rgba(198,198,198,0.16)", borderRadius: 8,
                        padding: "4px 10px", cursor: "pointer", fontSize: 11, color: "#6b7280",
                    }}>{mode === "chat" ? "收起对话 ▲" : "展开对话 ▼"}</button>
                </div>
            </div>

            {showBackendInfo && (
                <Card style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                    <div style={{ fontSize: 12, color: "#92400e", marginBottom: 8, fontWeight: 600 }}>
                        后端代理状态
                    </div>
                    <div style={{ fontSize: 11, color: "#a16207", marginBottom: 8, lineHeight: 1.7 }}>
                        这个版本已经移除了前端直连第三方模型和浏览器保存 API Key 的做法。

                        现在前端统一请求 /api/chat 和 /api/vision；真正的 Key 需要配置在服务端环境变量里。

                        当前状态：{backendStatus.ok ? "已检测到后端代理" : "未检测到后端代理，将自动离线运行"}。
                    </div>
                    <div style={{ fontSize: 11, color: "#92400e", marginBottom: 6 }}>
                        聊天代理：{onlineChatReady ? "已就绪" : "未就绪"} ｜ 图片识别：{onlineVisionReady ? "已就绪" : "未就绪"}
                    </div>
                    <Button onClick={async () => setBackendStatus(await checkAIHealth())}>重新检测</Button>
                </Card>
            )}

            {(profile.subjects || []).length > 0 && (
                <Card style={{ padding: "10px 14px", background: "#f3f3f4", border: "1px solid rgba(198,198,198,0.16)" }}>
                    <div style={{ fontSize: 11, color: "#2f3131", marginBottom: 6, fontWeight: 600 }}>
                        📋 已收集信息
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {(profile.subjects || []).map((subject) => (
                            <Tag key={subject.id} color="#111111" bg="#fff">
                                {subject.name}{subject.examDate ? ` · ${fmt(subject.examDate)}` : ""}
                            </Tag>
                        ))}
                    </div>
                </Card>
            )}

            {(occupiedBlocks || []).length > 0 && (
                <Card style={{ padding: "10px 14px", background: "#f8fafc", border: "1px solid rgba(198,198,198,0.16)" }}>
                    <div style={{ fontSize: 11, color: "#334155", marginBottom: 6, fontWeight: 600 }}>
                        🗂️ 已记录的事务占用
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {(occupiedBlocks || []).slice(-8).map((block) => (
                            <Tag key={block.id || `${block.date}-${block.slot}`} color="#0f172a" bg="#fff">
                                {block.date} · {SLOT_LABELS[block.slot] || block.slot} · {block.title || "临时事务"}
                            </Tag>
                        ))}
                    </div>
                </Card>
            )}

            {mode === "chat" && (
                <>
                    <div style={{
                        maxHeight: 340, overflowY: "auto", padding: "10px 4px",
                        display: "flex", flexDirection: "column", gap: 10, minHeight: 200,
                    }}>
                        {chatHistory.map((msg, index) => (
                            <div key={index} style={{
                                display: "flex",
                                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                            }}>
                                <div style={{
                                    maxWidth: "85%",
                                    padding: "10px 14px",
                                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                                    background: msg.role === "user" ? "linear-gradient(135deg, #111111, #2f3131)" : "#fff",
                                    color: msg.role === "user" ? "#fff" : "#1f2937",
                                    fontSize: 13, lineHeight: 1.6,
                                    boxShadow: "0 1px 3px rgba(26,28,28,0.05)",
                                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                                }}>
                                    {msg.attachment?.dataUrl && (
                                        <div style={{ marginBottom: msg.content ? 8 : 0 }}>
                                            <img src={msg.attachment.dataUrl} alt={msg.attachment.name || "附件"} style={{
                                                width: 140, maxWidth: "100%", borderRadius: 10, display: "block",
                                                border: msg.role === "user" ? "1px solid rgba(255,255,255,0.28)" : "1px solid #e5e7eb",
                                            }} />
                                            <div style={{ fontSize: 10, opacity: msg.role === "user" ? 0.9 : 0.65, marginTop: 4 }}>
                                                📎 {msg.attachment.name || "图片附件"}
                                            </div>
                                        </div>
                                    )}
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div style={{ display: "flex", justifyContent: "flex-start" }}>
                                <div style={{
                                    padding: "10px 14px", borderRadius: "16px 16px 16px 4px",
                                    background: "#fff", color: "#9ca3af", fontSize: 13,
                                    boxShadow: "0 1px 3px rgba(26,28,28,0.05)",
                                }}>
                                    小言正在思考 <span style={{ animation: "blink 1s infinite" }}>●●●</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                        {[
                            "我这学期学数分和线代",
                            "数分最难，我基础薄弱",
                            "周一到周五上午都有课",
                            "期末在6月中旬，想考90分",
                            "一致收敛的证明我不会",
                        ].map((q) => (
                            <button key={q} onClick={() => setInput(q)} style={{
                                background: "#fff", border: "1px solid rgba(198,198,198,0.16)", borderRadius: 14,
                                padding: "4px 10px", fontSize: 11, cursor: "pointer", color: "#2f3131",
                                fontFamily: "inherit",
                            }}>{q}</button>
                        ))}
                    </div>

                    {pendingAttachment && (
                        <div style={{
                            display: "flex", alignItems: "center", gap: 10, marginBottom: 8,
                            padding: 10, background: "#fff7e6", border: "1px solid #fde7b0", borderRadius: 12,
                        }}>
                            <img src={pendingAttachment.dataUrl} alt={pendingAttachment.name || "待发送附件"} style={{
                                width: 56, height: 56, objectFit: "cover", borderRadius: 10, border: "1px solid #e5e7eb",
                            }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#92400e" }}>待发送图片</div>
                                <div style={{ fontSize: 11, color: "#a16207", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {pendingAttachment.name || "未命名图片"}
                                </div>
                            </div>
                            <Button variant="ghost" onClick={clearPendingAttachment} style={{ color: "#b45309" }}>移除</Button>
                        </div>
                    )}
                    {attachmentError && (
                        <div style={{ marginBottom: 8, fontSize: 11, color: "#b91c1c" }}>⚠️ {attachmentError}</div>
                    )}
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePickAttachment} style={{ display: "none" }} />
                        <button
                            type="button"
                            onClick={() => !loading && fileInputRef.current?.click()}
                            disabled={loading}
                            style={{
                                width: 42, height: 42, borderRadius: 12, border: "1px solid #d7e0ce",
                                background: "#fff", cursor: loading ? "default" : "pointer", fontSize: 18,
                                flexShrink: 0, opacity: loading ? 0.6 : 1,
                            }}
                            title="选择图片"
                        >📎</button>
                        <Input
                            placeholder="告诉小言你的学习情况..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            style={{ flex: 1 }}
                            disabled={loading}
                        />
                        <Button onClick={handleSend} disabled={loading || (!input.trim() && !pendingAttachment)}>
                            {loading ? "..." : "发送"}
                        </Button>
                    </div>
                </>
            )}

            <div style={{
                display: "flex", alignItems: "center", gap: 10,
                margin: "18px 0 12px", color: "#9ca3af", fontSize: 11,
            }}>
                <div style={{ flex: 1, height: 1, background: "rgba(198,198,198,0.24)" }} />
                <span>✍️ 也可以手动填写或编辑</span>
                <div style={{ flex: 1, height: 1, background: "rgba(198,198,198,0.24)" }} />
            </div>

            <div style={{
                display: "flex", gap: 8, marginBottom: 12, padding: 10,
                background: "#f3f3f4", borderRadius: 10, border: "1px solid rgba(198,198,198,0.16)",
            }}>
                <div style={{ flex: 1, fontSize: 11, color: "#2f3131", lineHeight: 1.5 }}>
                    💡 手动修改科目或课表后，点右边按钮让助手重新生成规划 / 重排任务
                </div>
                <Button
                    variant="primary"
                    onClick={() => {
                        if (importAIPlan) importAIPlan();
                        if (handleReplan) handleReplan();
                    }}
                    style={{ fontSize: 11, padding: "6px 12px", whiteSpace: "nowrap" }}
                >
                    应用到计划
                </Button>
            </div>

            <IntakeFormPage
                profile={profile}
                setProfile={setProfile}
                intakeCompletion={intakeCompletion}
            />
        </div>
    );
}
