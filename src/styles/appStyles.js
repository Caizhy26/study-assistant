// 页面级样式对象

export const H2 = {
    margin: "0 0 12px",
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: "-0.01em",
    color: "#111111",
    fontFamily: "'Manrope', 'Noto Sans SC', sans-serif",
};

export const sectionTitle = {
    fontSize: 13,
    fontWeight: 800,
    marginBottom: 12,
    color: "#111111",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
};

export const emptyText = {
    fontSize: 12,
    color: "#8d8f8f",
    textAlign: "center",
    padding: "10px 0",
};

export const listRow = {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    padding: "10px 0",
};

export const S = {
    root: {
        minHeight: "100vh",
        background: "#f9f9f9",
        fontFamily: "'Inter', 'Noto Sans SC', sans-serif",
        color: "#1a1c1c",
    },
    header: {
        position: "sticky",
        top: 0,
        zIndex: 30,
        background: "rgba(249,249,249,0.84)",
        backdropFilter: "blur(18px)",
        padding: "24px 28px 18px 284px",
    },
    headerInner: {
        maxWidth: 1160,
        margin: "0 auto",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
    },
    kicker: {
        margin: 0,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.2em",
        color: "rgba(26,28,28,0.44)",
        textTransform: "uppercase",
    },
    title: {
        margin: "4px 0 0",
        fontSize: 34,
        lineHeight: 1,
        fontWeight: 800,
        letterSpacing: "-0.04em",
        fontFamily: "'Manrope', 'Noto Sans SC', sans-serif",
        color: "#111111",
    },
    subtitle: {
        margin: "8px 0 0",
        fontSize: 11,
        color: "rgba(26,28,28,0.46)",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
    },
    statusPill: {
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 999,
        background: "#f3f3f4",
        color: "rgba(26,28,28,0.58)",
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.18em",
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 999,
        background: "#19b46b",
        display: "inline-block",
    },
    statsRow: {
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
    },
    main: {
        marginLeft: 248,
        width: "calc(100vw - 248px)",
        maxWidth: "calc(100vw - 248px)",
        padding: "22px 28px 72px",
        minHeight: "calc(100vh - 120px)",
    },
    nav: {
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        width: 248,
        background: "#f3f3f4",
        padding: "34px 14px 24px",
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        gap: 24,
    },
    sidebarTop: {
        padding: "4px 18px 12px",
    },
    sidebarBrand: {
        fontFamily: "'Manrope', 'Noto Sans SC', sans-serif",
        fontSize: 18,
        lineHeight: 1.35,
        fontWeight: 800,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#111111",
    },
    sidebarCaption: {
        marginTop: 12,
        fontSize: 10,
        color: "rgba(26,28,28,0.42)",
        letterSpacing: "0.24em",
        textTransform: "uppercase",
    },
    navInner: {
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "0 2px",
    },
    navBtn: {
        width: "100%",
        background: "none",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 12,
        padding: "14px 16px",
        position: "relative",
        fontFamily: "inherit",
        borderRadius: 999,
        textAlign: "left",
    },
    dotBadge: {
        position: "absolute",
        top: "50%",
        right: 12,
        transform: "translateY(-50%)",
        minWidth: 18,
        height: 18,
        borderRadius: 999,
        background: "#111111",
        color: "#ffffff",
        fontSize: 9,
        fontWeight: 800,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 5px",
    },
    sidebarFooter: {
        marginTop: "auto",
        padding: "0 10px",
    },
    footerPill: {
        background: "#111111",
        color: "#f3f3f4",
        borderRadius: 999,
        padding: "14px 18px",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textAlign: "center",
        textTransform: "uppercase",
        boxShadow: "0 16px 32px rgba(0,0,0,0.10)",
    },
};

/* ═══════════════════════════════════════════════════════════
   新增：AI 对话式摸底页（v4）
   
   说明：
   - 通过和 AI 对话来收集用户学习情况，AI 会主动提问
   - AI 回复使用 JSON 结构化输出：{ reply, nextQuestion, extractedData, actions }
   - 提取的数据自动 merge 进 profile，驱动规划页和任务页
   - 顶部提供"切换到手动表单"按钮，保底可用
   - 未配置 API Key 时使用离线规则引擎（rule-based fallback），保证 Demo 始终可跑
   ═══════════════════════════════════════════════════════════ */

// ─── 在线 AI 配置 ───
// 文本对话：默认走 DeepSeek Chat Completions
// 浏览器 localStorage：
// - sa_api_key: DeepSeek 文本对话 Key
// - sa_vision_api_key: （可选）SCNet/兼容视觉模型 Key，用于图片识别
