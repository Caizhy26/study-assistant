// 通用工具：日期、格式化、默认计时器状态

export const uid = () => Math.random().toString(36).slice(2, 10);

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

export const dayNumberFromDateKey = (value) => {
    const key = toLocalDateKey(value || new Date()) || today();
    const parts = key.split("-").map((v) => Number(v));
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return Math.floor(Date.now() / 86400000);
    const [y, m, d] = parts;
    return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
};

export const diffDays = (a, b) => dayNumberFromDateKey(a) - dayNumberFromDateKey(b);

export const toDateKeyAtOffset = (value, offsetMinutes = 0, { fallback = today(), clampPast = false } = {}) => {
    const raw = value instanceof Date
        ? value
        : (/^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim())
            ? new Date(`${String(value).trim()}T00:00:00`)
            : new Date(value));
    if (Number.isNaN(raw.getTime())) return fallback;
    const shifted = new Date(raw.getTime() + Number(offsetMinutes || 0) * 60000);
    const result = toLocalDateKey(new Date(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
    return clampPast && result < fallback ? fallback : result;
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
