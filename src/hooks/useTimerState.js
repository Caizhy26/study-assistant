export function defaultTimerState() {
    return {
        running: false,
        start: null,
        elapsed: 0,
        subject: "",
        linkedTaskId: "",
        mode: "stopwatch",
        pomodoroPhase: "work",
        pomodoroWorkSeconds: 25 * 60,
        pomodoroBreakSeconds: 5 * 60,
        pomodoroCompleted: 0,
        pomodoroAccumulatedWorkSeconds: 0,
    };
}
