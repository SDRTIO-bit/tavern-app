// ============================================================
// POST /api/debug/chat — 非流式聊天测试
//
// 绕过 SSE 和 Anthropic SDK，直接用 OpenAI 格式请求。
// 确定问题在 SDK/SSE 还是其他地方。
// ============================================================

export async function POST(request: Request) {
  const apiKey = process.env.DEEPSEEK_API_KEY || '';

  if (!apiKey) {
    return Response.json({ ok: false, error: 'NO_API_KEY' }, { status: 500 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const content = body.message || '你好';

    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content }],
        max_tokens: 200,
        temperature: 0.8,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return Response.json({
        ok: false,
        status: res.status,
        error: text.slice(0, 500),
      }, { status: res.status });
    }

    const data = await res.json() as Record<string, unknown>;
    const choice = (data.choices as Array<Record<string, unknown>>)?.[0];
    const reply = (choice?.message as Record<string, string>)?.content || '';

    return Response.json({
      ok: true,
      model: data.model,
      reply,
      usage: data.usage,
    });
  } catch (err) {
    return Response.json({
      ok: false,
      error: (err as Error).message,
    }, { status: 500 });
  }
}
