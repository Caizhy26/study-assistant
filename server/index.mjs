import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function loadEnvFile(filename) {
    const fullPath = path.join(projectRoot, filename);
    if (!existsSync(fullPath)) return;
    const content = readFileSync(fullPath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq <= 0) continue;
        const key = line.slice(0, eq).trim();
        const value = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
        if (!(key in process.env)) process.env[key] = value;
    }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const PORT = Number(process.env.PORT || 80);
const TEXT_API_URL = process.env.TEXT_API_URL || process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/chat/completions";
const TEXT_MODEL = process.env.TEXT_MODEL || "deepseek-chat";
const TEXT_API_KEY = process.env.TEXT_API_KEY || process.env.DEEPSEEK_API_KEY || "";
const VISION_API_URL = process.env.VISION_API_URL || "https://api.scnet.cn/api/llm/v1/chat/completions";
const VISION_MODEL = process.env.VISION_MODEL || "MiniMax-M2.5";
const VISION_API_KEY = process.env.VISION_API_KEY || process.env.SCNET_API_KEY || "";

function setCors(res) {
    res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function sendJson(res, statusCode, payload) {
    setCors(res);
    res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, message) {
    setCors(res);
    res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(message);
}

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => {
            try {
                const raw = Buffer.concat(chunks).toString("utf8") || "{}";
                resolve(JSON.parse(raw));
            } catch (error) {
                reject(new Error("请求体不是合法 JSON"));
            }
        });
        req.on("error", reject);
    });
}

async function proxyChat(body) {
    if (!TEXT_API_KEY) {
        throw new Error("服务端未配置 TEXT_API_KEY / DEEPSEEK_API_KEY");
    }

    const response = await fetch(TEXT_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${TEXT_API_KEY}`,
        },
        body: JSON.stringify({
            model: body.model || TEXT_MODEL,
            messages: body.messages || [],
            temperature: body.temperature ?? 0.3,
            max_tokens: body.max_tokens ?? 2000,
            response_format: body.response_format ?? { type: "json_object" },
        }),
    });

    const text = await response.text();
    if (!response.ok) {
        throw new Error(`上游文本接口 ${response.status}: ${text}`);
    }
    return JSON.parse(text);
}

async function proxyVision(body) {
    if (!VISION_API_KEY) {
        throw new Error("服务端未配置 VISION_API_KEY / SCNET_API_KEY");
    }

    const response = await fetch(VISION_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${VISION_API_KEY}`,
        },
        body: JSON.stringify({
            model: body.model || VISION_MODEL,
            messages: [
                { role: "system", content: "你是一个OCR+结构化提取助手，严格按JSON格式返回。" },
                {
                    role: "user",
                    content: [
                        { type: "text", text: body.prompt || "请识别图片中的内容并返回 JSON。" },
                        { type: "image_url", image_url: { url: body.imageBase64 } },
                    ],
                },
            ],
            temperature: 0.2,
            max_tokens: 1200,
        }),
    });

    const text = await response.text();
    if (!response.ok) {
        throw new Error(`上游视觉接口 ${response.status}: ${text}`);
    }
    return JSON.parse(text);
}

const server = http.createServer(async (req, res) => {
    setCors(res);

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === "/api/health" && req.method === "GET") {
        sendJson(res, 200, {
            ok: true,
            mode: "proxy",
            chatConfigured: Boolean(TEXT_API_KEY),
            visionConfigured: Boolean(VISION_API_KEY),
            textApiUrl: TEXT_API_URL,
            visionApiUrl: VISION_API_URL,
        });
        return;
    }

    if (req.url === "/api/chat" && req.method === "POST") {
        try {
            const body = await readJsonBody(req);
            const data = await proxyChat(body);
            sendJson(res, 200, data);
        } catch (error) {
            // 打到 stderr，CloudBase Run 日志面板里能看到真实错误
            console.error("[/api/chat] proxy failed:", error?.message || error);
            sendJson(res, 500, { error: error.message });
        }
        return;
    }

    if (req.url === "/api/vision" && req.method === "POST") {
        try {
            const body = await readJsonBody(req);
            const data = await proxyVision(body);
            sendJson(res, 200, data);
        } catch (error) {
            console.error("[/api/vision] proxy failed:", error?.message || error);
            sendJson(res, 500, { error: error.message });
        }
        return;
    }

    sendText(res, 404, "Not found");
});

server.listen(PORT, () => {
    console.log(`AI proxy server running at http://localhost:${PORT}`);
    console.log(`  textApiUrl   = ${TEXT_API_URL}`);
    console.log(`  textModel    = ${TEXT_MODEL}`);
    console.log(`  chatConfigured   = ${Boolean(TEXT_API_KEY)}`);
    console.log(`  visionApiUrl = ${VISION_API_URL}`);
    console.log(`  visionModel  = ${VISION_MODEL}`);
    console.log(`  visionConfigured = ${Boolean(VISION_API_KEY)}`);
});
