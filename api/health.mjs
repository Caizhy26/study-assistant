const TEXT_API_URL = process.env.TEXT_API_URL || process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/chat/completions";
const VISION_API_URL = process.env.VISION_API_URL || "https://api.scnet.cn/api/llm/v1/chat/completions";

export async function GET() {
  return Response.json({
    ok: true,
    mode: "vercel",
    chatConfigured: Boolean(process.env.TEXT_API_KEY || process.env.DEEPSEEK_API_KEY),
    visionConfigured: Boolean(process.env.VISION_API_KEY || process.env.SCNET_API_KEY),
    textApiUrl: TEXT_API_URL,
    visionApiUrl: VISION_API_URL,
  });
}