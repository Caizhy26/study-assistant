const VISION_API_URL = process.env.VISION_API_URL || "https://api.scnet.cn/api/llm/v1/chat/completions";
const VISION_MODEL = process.env.VISION_MODEL || "MiniMax-M2.5";
const VISION_API_KEY = process.env.VISION_API_KEY || process.env.SCNET_API_KEY || "";

export async function POST(request) {
  if (!VISION_API_KEY) {
    return Response.json({ error: "服务端未配置 VISION_API_KEY / SCNET_API_KEY" }, { status: 500 });
  }

  try {
    const body = await request.json();
    
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
    return Response.json(JSON.parse(text));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}