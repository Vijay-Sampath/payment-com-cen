import { AgentCard } from '@/types'

/**
 * Attempt to narrate a step using an LLM API.
 * Returns null if no API key is present or on any error — callers
 * should fall back to step.staticNarrative.
 */
export async function narrateStep(step: AgentCard): Promise<string | null> {
  // Check for API key — only available server-side or via env
  const apiKey = typeof process !== 'undefined'
    ? process.env?.ANTHROPIC_API_KEY ?? process.env?.NEXT_PUBLIC_ANTHROPIC_API_KEY
    : null

  if (!apiKey) return null

  try {
    const prompt = `You are an AI operations narration system for a global bank.
In 2-3 sentences, explain what just happened in plain business language.
Context: ${step.finding_summary}. Business impact: ${step.businessSignal}.
Audience: bank CIO and CFO.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    const text = data?.content?.[0]?.text
    return typeof text === 'string' ? text : null
  } catch {
    // Silent fallback — never throw
    return null
  }
}
