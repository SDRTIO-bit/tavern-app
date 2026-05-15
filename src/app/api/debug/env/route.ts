// ============================================================
// GET /api/debug/env — 环境变量诊断 + 连接测试
// ============================================================

export async function GET() {
  const apiKey =
    process.env.DEEPSEEK_API_KEY ||
    process.env.DEEPSEEK_KEY ||
    "";

  const hasKey = Boolean(apiKey && apiKey.startsWith('sk-') && apiKey.length > 20);

  // 尝试测试连接
  let connectionTest: { ok: boolean; error?: string; model?: string } = { ok: false };
  if (hasKey) {
    try {
      const res = await fetch('https://api.deepseek.com/anthropic/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1,
          stream: false,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const data = await res.json() as Record<string, unknown>;
        connectionTest = { ok: true, model: data.model as string };
      } else {
        const errText = await res.text().catch(() => '');
        connectionTest = { ok: false, error: `HTTP ${res.status}: ${errText.slice(0, 200)}` };
      }
    } catch (err) {
      connectionTest = { ok: false, error: (err as Error).message };
    }
  }

  return Response.json({
    // 环境变量状态
    env: {
      configured: hasKey,
      keyPreview: hasKey ? `sk-${apiKey.slice(3, 7)}...${apiKey.slice(-4)}` : null,
      keyLength: apiKey.length,
      source: process.env.DEEPSEEK_API_KEY ? '.env.local / system env' :
              process.env.DEEPSEEK_KEY ? 'DEEPSEEK_KEY' : 'none',
    },
    // DeepSeek API 连接测试
    connection: connectionTest,
    // 其他信息
    nodeEnv: process.env.NODE_ENV || 'not set',
    allDeepSeekEnvs: Object.keys(process.env).filter((k) =>
      k.toLowerCase().includes('deepseek'),
    ),
  });
}
