import { useEffect, useState } from "react";

// 只在计时器运行中才 setInterval，避免整棵组件树每秒重渲染
export function useLiveElapsed(timerState) {
    const running = !!(timerState?.running && timerState?.start);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!running) return undefined;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [running]);

    const base = Number(timerState?.elapsed) || 0;
    if (!running) return base;
    return Math.max(0, Math.floor((now - timerState.start) / 1000)) + base;
}

// 计算番茄钟/秒表的显示秒数、阶段总秒数、标签，全部基于 useLiveElapsed
export function useTimerDisplay(timerState) {
    const elapsed = useLiveElapsed(timerState);
    const mode = timerState?.mode || "stopwatch";
    const phase = timerState?.pomodoroPhase || "work";
    const phaseTotal = mode === "pomodoro"
        ? (phase === "break"
            ? (timerState?.pomodoroBreakSeconds || 5 * 60)
            : (timerState?.pomodoroWorkSeconds || 25 * 60))
        : 0;
    const displaySeconds = mode === "pomodoro" ? Math.max(0, phaseTotal - elapsed) : elapsed;
    const displayLabel = mode === "pomodoro"
        ? (phase === "break" ? "番茄休息" : "番茄专注")
        : "正在学习";
    return { elapsed, phaseTotal, displaySeconds, displayLabel };
}
