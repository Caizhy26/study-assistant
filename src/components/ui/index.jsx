// 通用 UI 组件：卡片、按钮、输入框、标签、迷你图表

export function MiniBarChart({ data, height = 180 }) {
    const maxValue = Math.max(...data.map((item) => Number(item.minutes || 0)), 1);

    return (
        <div>
            <div style={{
                height,
                display: "grid",
                gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))`,
                gap: 10,
                alignItems: "end",
            }}>
                {data.map((item) => {
                    const barHeight = Math.max(8, Math.round((Number(item.minutes || 0) / maxValue) * (height - 24)));
                    return (
                        <div key={item.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                            <div style={{ fontSize: 10, color: "#6b7280", minHeight: 14 }}>
                                {item.minutes > 0 ? `${item.minutes}分` : "0"}
                            </div>
                            <div style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "flex-end",
                                justifyContent: "center",
                                height: height - 24,
                            }}>
                                <div style={{
                                    width: "100%",
                                    maxWidth: 42,
                                    minWidth: 18,
                                    height: barHeight,
                                    borderRadius: 14,
                                    background: item.minutes > 0
                                        ? "linear-gradient(180deg, #111111 0%, #4b5563 100%)"
                                        : "#e5e7eb",
                                    transition: "height 180ms ease",
                                }} />
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
        <div style={{
            background: "rgba(255,255,255,0.9)",
            borderRadius: 999,
            padding: "8px 14px",
            minWidth: 94,
            textAlign: "center",
            backdropFilter: "blur(18px)",
            boxShadow: "inset 0 0 0 1px rgba(198,198,198,0.22)",
        }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6, color: "#111111" }}>
                <span style={{ fontSize: 12, opacity: 0.5 }}>{icon}</span>
                <b style={{ fontSize: 15, fontWeight: 800, fontFamily: "'Manrope', 'Noto Sans SC', sans-serif" }}>{value}</b>
            </div>
            <div style={{ fontSize: 9, opacity: 0.5, letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 3 }}>{label}</div>
        </div>
    );
}

export function Card({ children, style, onClick, highlight = false }) {
    return (
        <div
            onClick={onClick}
            style={{
                background: highlight ? "linear-gradient(135deg, #ffffff 0%, #f3f3f4 100%)" : "rgba(255,255,255,0.88)",
                borderRadius: 28,
                padding: 18,
                border: "none",
                boxShadow: highlight
                    ? "0 24px 48px rgba(26,28,28,0.06), inset 0 0 0 1px rgba(198,198,198,0.14)"
                    : "0 12px 30px rgba(26,28,28,0.04), inset 0 0 0 1px rgba(198,198,198,0.14)",
                marginBottom: 14,
                cursor: onClick ? "pointer" : "default",
                transition: "transform 160ms ease, box-shadow 160ms ease",
                backdropFilter: "blur(18px)",
                ...style,
            }}
        >
            {children}
        </div>
    );
}

export function Button({ children, onClick, variant = "primary", disabled = false, style = {}, title }) {
    const base = {
        border: "none",
        borderRadius: 999,
        padding: "10px 16px",
        cursor: disabled ? "default" : "pointer",
        fontFamily: "inherit",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.04em",
        opacity: disabled ? 0.45 : 1,
        transition: "all 160ms ease",
        ...style,
    };
    const styles = {
        primary: { ...base, background: "linear-gradient(135deg, #000000, #3b3b3b)", color: "#f3f3f4", boxShadow: "0 12px 26px rgba(0,0,0,0.12)" },
        secondary: { ...base, background: "#e8e8e8", color: "#1a1c1c" },
        ghost: { ...base, background: "transparent", color: "#5d5f5f", padding: "6px 10px" },
        danger: { ...base, background: "#1f1f1f", color: "#ffffff" },
        warn: { ...base, background: "#efefef", color: "#1a1c1c" },
    };
    return (
        <button title={title} disabled={disabled} onClick={disabled ? undefined : onClick} style={styles[variant]}>
            {children}
        </button>
    );
}

export function Input(props) {
    return (
        <input
            {...props}
            style={{
                width: "100%",
                boxSizing: "border-box",
                border: "none",
                borderRadius: 999,
                padding: "12px 16px",
                fontFamily: "inherit",
                fontSize: 13,
                outline: "none",
                background: "rgba(255,255,255,0.92)",
                color: "#1a1c1c",
                boxShadow: "inset 0 0 0 1px rgba(198,198,198,0.22)",
                ...props.style,
            }}
        />
    );
}

export function Textarea(props) {
    return (
        <textarea
            {...props}
            style={{
                width: "100%",
                minHeight: 96,
                boxSizing: "border-box",
                border: "none",
                borderRadius: 24,
                padding: "14px 16px",
                fontFamily: "inherit",
                fontSize: 13,
                outline: "none",
                resize: "vertical",
                background: "rgba(255,255,255,0.92)",
                color: "#1a1c1c",
                boxShadow: "inset 0 0 0 1px rgba(198,198,198,0.22)",
                ...props.style,
            }}
        />
    );
}

export function Select({ children, ...props }) {
    return (
        <select
            {...props}
            style={{
                width: "100%",
                boxSizing: "border-box",
                border: "none",
                borderRadius: 999,
                padding: "12px 16px",
                fontFamily: "inherit",
                fontSize: 13,
                background: "rgba(255,255,255,0.92)",
                color: "#1a1c1c",
                outline: "none",
                boxShadow: "inset 0 0 0 1px rgba(198,198,198,0.22)",
                ...props.style,
            }}
        >
            {children}
        </select>
    );
}

export function Tag({ children, color = "#1a1c1c", bg = "#e8e8e8", style = {} }) {
    return (
        <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "6px 10px",
            borderRadius: 999,
            color,
            background: bg,
            ...style,
        }}>
            {children}
        </span>
    );
}
