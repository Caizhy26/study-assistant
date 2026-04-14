import React, { useState } from "react";
import { callVisionAI, offlineScheduleRecognition, SCHEDULE_PROMPT } from "../services/aiService";
import { Card, Button } from "../components/ui";

export default function AttachmentUploader({ setProfile, onlineChatReady = false, onlineVisionReady = false }) {
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [error, setError] = useState(null);

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError(null);
        setResult(null);
        setUploading(true);

        try {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = reader.result;
                setPreviewUrl(base64);

                let parsed;
                if (onlineVisionReady) {
                    try {
                        const raw = await callVisionAI(base64, SCHEDULE_PROMPT);
                        const match = raw.match(/\{[\s\S]*\}/);
                        parsed = JSON.parse(match ? match[0] : raw);
                    } catch (apiErr) {
                        setError(`AI 识别失败（${apiErr.message}），已回退到离线模式。`);
                        parsed = offlineScheduleRecognition();
                    }
                } else {
                    if (onlineChatReady) {
                        setError("文本代理可用，但视觉代理未配置，已回退到离线识别。");
                    }
                    await new Promise((resolve) => setTimeout(resolve, 400));
                    parsed = offlineScheduleRecognition();
                }

                setResult(parsed);
                setUploading(false);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            setError(err.message);
            setUploading(false);
        }
    };

    const applySchedule = () => {
        if (!result) return;
        setProfile((prev) => ({
            ...prev,
            schedule: { ...(prev.schedule || {}), ...result.schedule },
        }));
        alert("✓ 已应用到课表！你可以在下方手动表单中查看或微调。");
    };

    return (
        <Card style={{ background: "linear-gradient(135deg, #fef3c7, #fef9c3)", border: "1px solid #fcd34d" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e", marginBottom: 6 }}>
                📎 上传课表图片 / 教材截图
            </div>
            <div style={{ fontSize: 11, color: "#a16207", marginBottom: 10, lineHeight: 1.5 }}>
                直接上传课表照片或截图，AI 会自动识别课程时间并填入。{onlineVisionReady ? "🟢 在线识别" : onlineChatReady ? "🟡 文本在线 / 图片离线模拟" : "🟡 离线模拟模式"}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <label style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", background: "#fff", border: "1.5px dashed #d97706",
                    borderRadius: 10, cursor: uploading ? "default" : "pointer", fontSize: 12,
                    color: "#92400e", fontWeight: 500,
                }}>
                    {uploading ? "⏳ 识别中..." : "📷 选择课表图片"}
                    <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} style={{ display: "none" }} />
                </label>
            </div>

            {error && (
                <div style={{
                    marginTop: 10, padding: "8px 12px", background: "#fef2f2",
                    borderRadius: 8, fontSize: 11, color: "#991b1b",
                }}>
                    ⚠️ {error}
                </div>
            )}

            {previewUrl && result && (
                <div style={{ marginTop: 12, padding: 10, background: "#fff", borderRadius: 10 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <img src={previewUrl} alt="课表预览" style={{
                            width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb",
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#111111", marginBottom: 4 }}>
                                ✓ 识别完成
                            </div>
                            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>
                                {result.note}
                            </div>
                            {result.extractedSubjects && result.extractedSubjects.length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                                    {result.extractedSubjects.map((subject) => (
                                        <span key={subject} style={{
                                            fontSize: 10, padding: "2px 8px", borderRadius: 10,
                                            background: "#f3f3f4", color: "#111111",
                                        }}>{subject}</span>
                                    ))}
                                </div>
                            )}
                            <Button onClick={applySchedule} style={{ fontSize: 11, padding: "5px 12px" }}>
                                应用到课表
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}
