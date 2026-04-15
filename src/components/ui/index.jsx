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
                            <div style={{ fontSize: 10, color: "#64748b", minHeight: 14 }}>
                                {item.minutes > 0 ? `${item.minutes}分` : "0"}
                            </div>
                            <div style={{ width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", height: height - 24 }}>
                                <div style={{
                                    width: "100%",
                                    maxWidth: 42,
                                    minWidth: 18,
                                    height: barHeight,
                                    borderRadius: 14,
                                    background: item.minutes > 0
                                        ? "linear-gradient(180deg, #5b7cfa 0%, #243d91 100%)"
                                        : "#e2e8f0",
                                    transition: "height 180ms ease",
                                    boxShadow: item.minutes > 0 ? "0 10px 18px rgba(59,92,214,0.22)" : "none",
                                }} />
                            </div>
                            <div style={{ fontSize: 11, color: "#94a3b8" }}>{item.label}</div>
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
            background: "rgba(255,255,255,0.78)",
            borderRadius: 999,
            padding: "9px 14px",
            minWidth: 98,
            textAlign: "center",
            backdropFilter: "blur(14px)",
            boxShadow: "0 8px 18px rgba(51,65,85,0.08), inset 0 0 0 1px rgba(255,255,255,0.68)",
        }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6, color: "#0f172a" }}>
                <span style={{ fontSize: 12, opacity: 0.56 }}>{icon}</span>
                <b style={{ fontSize: 15, fontWeight: 800, fontFamily: "'Manrope', 'Inter', 'Noto Sans SC', sans-serif" }}>{value}</b>
            </div>
            <div style={{ fontSize: 9, opacity: 0.58, letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 3 }}>{label}</div>
        </div>
    );
}

export function Card({ children, style, onClick, highlight = false }) {
    return (
        <div
            onClick={onClick}
            style={{
                background: highlight
                    ? "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(244,247,255,0.94))"
                    : "rgba(255,255,255,0.92)",
                borderRadius: 22,
                padding: 18,
                border: "1px solid rgba(226,232,240,0.88)",
                boxShadow: highlight
                    ? "0 18px 42px rgba(51,65,85,0.08)"
                    : "0 10px 28px rgba(51,65,85,0.05)",
                marginBottom: 14,
                cursor: onClick ? "pointer" : "default",
                transition: "transform 160ms ease, box-shadow 160ms ease",
                ...style,
            }}
        >
            {children}
        </div>
    );
}

export function Button({ children, onClick, variant = "primary", disabled = false, style = {}, title, type = "button" }) {
    const base = {
        borderRadius: 12,
        padding: "10px 14px",
        cursor: disabled ? "default" : "pointer",
        fontFamily: "inherit",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.02em",
        opacity: disabled ? 0.45 : 1,
        transition: "all 160ms ease",
        border: "1px solid transparent",
        ...style,
    };
    const styles = {
        primary: { ...base, background: "linear-gradient(135deg, #243d91, #0f172a)", color: "#f8fbff", boxShadow: "0 12px 24px rgba(36,61,145,0.22)" },
        secondary: { ...base, background: "#f8fafc", color: "#334155", border: "1px solid rgba(203,213,225,0.8)" },
        ghost: { ...base, background: "transparent", color: "#64748b", border: "1px solid rgba(203,213,225,0.55)" },
        danger: { ...base, background: "#ef4444", color: "#ffffff", boxShadow: "0 10px 20px rgba(239,68,68,0.22)" },
        warn: { ...base, background: "#fff7ed", color: "#b45309", border: "1px solid #fed7aa" },
    };
    return (
        <button type={type} title={title} disabled={disabled} onClick={disabled ? undefined : onClick} style={styles[variant]}>
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
                border: "1px solid rgba(203,213,225,0.9)",
                borderRadius: 14,
                padding: "11px 13px",
                fontFamily: "inherit",
                fontSize: 13,
                outline: "none",
                background: "#ffffff",
                color: "#0f172a",
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
                border: "1px solid rgba(203,213,225,0.9)",
                borderRadius: 14,
                padding: "13px 14px",
                fontFamily: "inherit",
                fontSize: 13,
                outline: "none",
                resize: "vertical",
                background: "#ffffff",
                color: "#0f172a",
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
                border: "1px solid rgba(203,213,225,0.9)",
                borderRadius: 14,
                padding: "11px 13px",
                fontFamily: "inherit",
                fontSize: 13,
                background: "#ffffff",
                color: "#0f172a",
                outline: "none",
                ...props.style,
            }}
        >
            {children}
        </select>
    );
}

export function Tag({ children, color = "#334155", bg = "#f8fafc", style = {} }) {
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
            border: "1px solid rgba(203,213,225,0.75)",
            ...style,
        }}>
            {children}
        </span>
    );
}
