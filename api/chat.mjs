const TEXT_API_URL = process.env.TEXT_API_URL || process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/chat/completions";
const TEXT_MODEL = process.env.TEXT_MODEL || "deepseek-chat";
const TEXT_API_KEY = process.env.TEXT_API_KEY || process.env.DEEPSEEK_API_KEY || "";

export async function POST(request) {
  if (!TEXT_API_KEY) {
    return Response.json({ error: "服务端未配置 TEXT_API_KEY / DEEPSEEK_API_KEY" }, { status: 500 });
  }

  try {
    const body = await request.json();
    
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
    return Response.json(JSON.parse(text));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}