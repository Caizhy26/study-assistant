import React from "react";

export default function SubTabBar({ tabs, active, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        marginBottom: 16,
        padding: 6,
        background: "#f3f3f4",
        borderRadius: 999,
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
            borderRadius: 999,
            background: active === t.key ? "#ffffff" : "transparent",
            color: active === t.key ? "#111111" : "rgba(26,28,28,0.52)",
            fontSize: 11,
            fontWeight: active === t.key ? 700 : 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 0.18s ease",
            boxShadow:
              active === t.key ? "0 8px 18px rgba(26,28,28,0.05)" : "none",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
