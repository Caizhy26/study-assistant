import React from "react";

export default function SubTabBar({ tabs, active, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        marginBottom: 16,
        padding: 6,
        background: "rgba(255,255,255,0.76)",
        borderRadius: 18,
        border: "1px solid rgba(223,228,242,0.9)",
        boxShadow: "0 12px 28px rgba(33,44,80,0.05)",
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            flex: 1,
            padding: "10px 8px",
            border: "none",
            borderRadius: 14,
            background: active === t.key ? "linear-gradient(135deg, #213782, #111827)" : "transparent",
            color: active === t.key ? "#f8fbff" : "rgba(26,28,28,0.58)",
            fontSize: 11,
            fontWeight: active === t.key ? 700 : 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 0.18s ease",
            boxShadow:
              active === t.key ? "0 12px 20px rgba(33,55,130,0.22)" : "none",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
