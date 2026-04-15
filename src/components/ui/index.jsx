// 通用 UI 组件：卡片、按钮、输入框、标签、迷你图表

const baseControl = {
    width: "100%",
    border: "1px solid rgba(198,198,198,0.4)",
    background: "#ffffff",
    color: "#111111",
    borderRadius: 12,
    padding: "10px 12px",
    fontFamily: "inherit",
    fontSize: 13,
    lineHeight: 1.4,
    outline: "none",
};

const buttonVariants = {
    primary: {
        background: "#111111",
        color: "#ffffff",
        border: "1px solid #111111",
    },
    secondary: {
        background: "#f3f3f4",
        color: "#111111",
        border: "1px solid rgba(198,198,198,0.5)",
    },
    warn: {
        background: "#fff7ed",
        color: "#b45309",
        border: "1px solid #fed7aa",
    },
    danger: {
        background: "#b91c1c",
        color: "#ffffff",
        border: "1px solid #b91c1c",
    },
    ghost: {
        background: "transparent",
        color: "#374151",
        border: "1px solid rgba(198,198,198,0.4)",
    },
};

export function MiniBarChart({ data, height = 180 }) {
    const maxValue = Math.max(...data.map((item) => Number(item.minutes || 0)), 1);

    return (
        <div>
            <div
                style={{
                    height,
                    display: "grid",
                    gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))`,
                    gap: 10,
                    alignItems: "end",
                }}
            >
                {data.map((item) => {
                    const barHeight = Math.max(8, Math.round((Number(item.minutes || 0) / maxValue) * (height - 24)));
                    return (
                        <div key={item.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                            <div style={{ fontSize: 10, color: "#6b7280", minHeight: 14 }}>
                                {item.minutes > 0 ? `${item.minutes}分` : "0"}
                            </div>
                            <div
                                style={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "flex-end",
                                    justifyContent: "center",
                                    height: height - 24,
                                }}
                            >
                                <div
                                    style={{
                                        width: "100%",
                                        maxWidth: 42,
                                        minWidth: 18,
                                        height: barHeight,
                                        borderRadius: 10,
                                        background: item.minutes > 0 ? "#111111" : "#e5e7eb",
                                        transition: "height 180ms ease",
                                    }}
                                />
                            </div>
                            <div style={{ fontSize: 11, color: "#8d8f8f" }}>{item.label}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function StatBadge({ icon, value, label }) {
    return (
        <div
            style={{
                background: "#ffffff",
                borderRadius: 12,
                padding: "10px 14px",
                minWidth: 96,
                textAlign: "center",
                border: "1px solid rgba(198,198,198,0.2)",
                boxShadow: "0 8px 24px rgba(26,28,28,0.05)",
            }}
        >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6, color: "#111111" }}>
                <span style={{ fontSize: 12, opacity: 0.5 }}>{icon}</span>
                <b style={{ fontSize: 15, fontWeight: 800, fontFamily: "'Manrope', 'Noto Sans SC', sans-serif" }}>{value}</b>
            </div>
            <div style={{ fontSize: 9, opacity: 0.55, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 4 }}>{label}</div>
        </div>
    );
}

export function Card({ children, style = {}, ...props }) {
    return (
        <div
            style={{
                background: "#ffffff",
                borderRadius: 16,
                padding: 16,
                boxShadow: "0 8px 24px rgba(26,28,28,0.05)",
                border: "1px solid rgba(198,198,198,0.18)",
                ...style,
            }}
            {...props}
        >
            {children}
        </div>
    );
}

export function Button({ children, variant = "primary", style = {}, ...props }) {
    return (
        <button
            type="button"
            style={{
                borderRadius: 10,
                padding: "9px 14px",
                fontFamily: "inherit",
                fontSize: 12,
                fontWeight: 600,
                cursor: props.disabled ? "not-allowed" : "pointer",
                opacity: props.disabled ? 0.6 : 1,
                ...buttonVariants[variant],
                ...style,
            }}
            {...props}
        >
            {children}
        </button>
    );
}

export function Input(props) {
    return <input {...props} style={{ ...baseControl, ...(props.style || {}) }} />;
}

export function Select(props) {
    return <select {...props} style={{ ...baseControl, ...(props.style || {}) }} />;
}

export function Textarea(props) {
    return <textarea {...props} style={{ ...baseControl, minHeight: 72, resize: "vertical", ...(props.style || {}) }} />;
}

export function Tag({ children, color = "#111111", bg = "#f3f3f4", style = {} }) {
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 999,
                padding: "4px 8px",
                fontSize: 11,
                fontWeight: 600,
                color,
                background: bg,
                ...style,
            }}
        >
            {children}
        </span>
    );
}
