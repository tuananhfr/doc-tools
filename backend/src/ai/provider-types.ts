/**
 * Provider types a user may add, mirroring goclaw/ui/web/src/constants/providers.ts.
 * Left out on purpose: `ollama`, `claude_cli`, `acp` (GoClaw skips its SSRF check or runs a
 * program on its own host for them) and `chatgpt_oauth` (needs an OAuth flow on the GoClaw host).
 * `apiBase` is always sent: GoClaw's OpenAI client otherwise defaults to api.openai.com.
 */
export const PROVIDER_TYPES = [
  { type: 'openai_compat', label: 'OpenAI / tương thích OpenAI', apiBase: 'https://api.openai.com/v1', customBase: true },
  { type: 'anthropic_native', label: 'Anthropic (Claude)', apiBase: 'https://api.anthropic.com', customBase: false },
  { type: 'gemini_native', label: 'Google Gemini', apiBase: 'https://generativelanguage.googleapis.com/v1beta/openai', customBase: false },
  { type: 'openrouter', label: 'OpenRouter', apiBase: 'https://openrouter.ai/api/v1', customBase: false },
  { type: 'groq', label: 'Groq', apiBase: 'https://api.groq.com/openai/v1', customBase: false },
  { type: 'deepseek', label: 'DeepSeek', apiBase: 'https://api.deepseek.com/v1', customBase: false },
  { type: 'mistral', label: 'Mistral AI', apiBase: 'https://api.mistral.ai/v1', customBase: false },
  { type: 'xai', label: 'xAI (Grok)', apiBase: 'https://api.x.ai/v1', customBase: false },
  { type: 'minimax_native', label: 'MiniMax', apiBase: 'https://api.minimax.io/v1', customBase: false },
  { type: 'novita', label: 'Novita AI', apiBase: 'https://api.novita.ai/openai', customBase: false },
  { type: 'cohere', label: 'Cohere', apiBase: 'https://api.cohere.ai/compatibility/v1', customBase: false },
  { type: 'perplexity', label: 'Perplexity', apiBase: 'https://api.perplexity.ai', customBase: false },
  { type: 'dashscope', label: 'DashScope (Qwen)', apiBase: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', customBase: false },
  { type: 'bailian', label: 'Bailian Coding', apiBase: 'https://coding-intl.dashscope.aliyuncs.com/v1', customBase: false },
  { type: 'yescale', label: 'YesScale', apiBase: 'https://api.yescale.one/v1', customBase: false },
  { type: 'zai', label: 'Z.ai API', apiBase: 'https://api.z.ai/api/paas/v4', customBase: false },
  { type: 'zai_coding', label: 'Z.ai Coding Plan', apiBase: 'https://api.z.ai/api/coding/paas/v4', customBase: false },
  { type: 'byteplus', label: 'BytePlus ModelArk', apiBase: 'https://ark.ap-southeast.bytepluses.com/api/v3', customBase: false },
  { type: 'byteplus_coding', label: 'BytePlus Coding Plan', apiBase: 'https://ark.ap-southeast.bytepluses.com/api/coding/v3', customBase: false },
  { type: 'ollama_cloud', label: 'Ollama Cloud', apiBase: 'https://ollama.com/v1', customBase: false },
] as const

export type ProviderType = (typeof PROVIDER_TYPES)[number]['type']

export function providerType(value: unknown) {
  return PROVIDER_TYPES.find((entry) => entry.type === value) ?? null
}
