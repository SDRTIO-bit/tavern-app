// ============================================================
// GET /api/debug/ping — 最简 DeepSeek API 连通性测试
//
// 不依赖任何 SDK，纯 fetch。
// 浏览器直接访问 http://localhost:3000/api/debug/ping
// ============================================================

export async function GET() {
  const apiKey = process.env.DEEPSEEK_API_KEY || '';

  if (!apiKey || !apiKey.startsWith('sk-')) {
    return Response.json({
      ok: false,
      step: 'env_check',
      error: 'DEEPSEEK_API_KEY not found or invalid format. Expected sk-...',
      envKeys: Object.keys(process.env).filter((k) =>
        k.toLowerCase().includes('deepseek') || k.toLowerCase().includes('api_key'),
      ),
    }, { status: 500 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return Response.json({
        ok: false,
        step: 'api_call',
        status: res.status,
        error: text.slice(0, 500),
      }, { status: 500 });
    }

    const data = await res.json() as Record<string, unknown>;
    const content = (data.choices as Array<Record<string, unknown>>)?.[0]
      ?.message as Record<string, string> | undefined;

    return Response.json({
      ok: true,
      step: 'done',
      model: data.model,
      reply: content?.content?.slice(0, 100) || '(empty)',
      usage: data.usage,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({
      ok: false,
      step: 'network',
      error: msg,
    }, { status: 500 });
  }
}
