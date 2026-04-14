// 通用工具：日期、格式化、默认计时器状态

export const uid = () => Math.random().toString(36).slice(2, 10);
export const today = () => new Date().toISOString().split("T")[0];
export const nowDate = () => new Date();
export const addDays = (n, base = new Date()) => {
    const d = new Date(base);
    d.setDate(d.getDate() + n);
    return d;
};
export const fmt = (d) => {
    if (!d) return "未设置";
    return new Date(d).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
};
export const fmtFull = (d) => new Date(d).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
});
export const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
        ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
        : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

export function defaultTimerState() {
    return {
        running: false,
        start: null,
        subject: "",
        elapsed: 0,
        linkedTaskId: "",
        mode: "stopwatch",
        pomodoroPhase: "work",
        pomodoroWorkSeconds: 25 * 60,
        pomodoroBreakSeconds: 5 * 60,
        pomodoroCompleted: 0,
        pomodoroAccumulatedWorkSeconds: 0,
    };
}
