// 通用工具：日期、格式化、默认计时器状态

export const uid = () => Math.random().toString(36).slice(2, 10);

// 把 Date 对象转成 "YYYY-MM-DD" 字符串，使用**本地时区**。
// 之前用 toISOString().split("T")[0] 会按 UTC 算，导致中国用户凌晨 0:00-8:00
// 之间打开应用时 today() 返回前一天，进而让任务匹配、记录归档都出错。
export const toLocalDateKey = (input = new Date()) => {
    const d = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

export const today = () => toLocalDateKey(new Date());
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
