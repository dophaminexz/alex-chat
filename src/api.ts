// =============================================================================
// API Layer — Google Gemini + OpenRouter + SambaNova (with auto-modes and key rotation)
// =============================================================================

export type ThemeMode = 'dark' | 'light';

export interface ThemeConfig { mode: ThemeMode; }

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  responseImages?: string[];
  model?: string;
  timestamp: number;
  isStreaming?: boolean;
  isError?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  model: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppConfig {
  googleKeys: string[];
  openrouterKey: string;
  sambaKey: string;
  systemPrompt: string;
  googleModels: string[];
  openrouterModels: string[];
  sambaModels: string[];
  theme: ThemeConfig;
  includeTime: boolean;
  includeDate: boolean;
  memories: string[];
}

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'error' | 'warn';
  message: string;
}

// =============================================================================
// Auto Mode Definitions
// =============================================================================

export interface AutoModeConfig {
  label: string;
  description: string;
  provider: 'google' | 'openrouter' | 'sambanova';
  models: string[];
}

export const AUTO_MODES: Record<string, AutoModeConfig> = {
  'auto-gemini-flash': {
    label: 'Gemini Fast',
    description: 'Flash models · auto-fallback',
    provider: 'google',
    models: [
      'gemini-flash-latest',
      'gemini-3-flash-preview',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
    ],
  },
  'auto-gemini-pro': {
    label: 'Gemini Pro',
    description: 'Pro models · best quality',
    provider: 'google',
    models: [
      'gemini-3-pro-preview',
      'gemini-2.5-pro',
    ],
  },
  'auto-openrouter': {
    label: 'OpenRouter',
    description: 'Random free model',
    provider: 'openrouter',
    models: [],
  },
  'auto-samba': {
    label: 'SambaNova',
    description: 'Fast inference · auto-fallback',
    provider: 'sambanova',
    models: [
      'DeepSeek-R1-0528',
      'DeepSeek-V3.1',
      'DeepSeek-V3-0324',
      'gpt-oss-120b',
    ],
  },
  'auto-search': {
    label: 'AI Search',
    description: 'Google Search · grounded answers',
    provider: 'google',
    models: [],
  },
};

export function isAutoMode(model: string): boolean {
  return model in AUTO_MODES;
}

// =============================================================================
// Default Models
// =============================================================================

export const DEFAULT_GOOGLE_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
];

export const DEFAULT_OPENROUTER_MODELS = [
  'deepseek/deepseek-r1-0528:free',
  'tngtech/deepseek-r1t2-chimera:free',
];

export const DEFAULT_SAMBA_MODELS = [
  'DeepSeek-R1-0528',
  'DeepSeek-V3-0324',
  'DeepSeek-V3.1',
  'gpt-oss-120b',
];

export const DEFAULT_GOOGLE_KEYS: string[] = [];
export const DEFAULT_OPENROUTER_KEY = '';
export const DEFAULT_SAMBA_KEY = '';
export const DEFAULT_THEME: ThemeConfig = { mode: 'dark' };

export const DEFAULT_SYSTEM_PROMPT = `ПРАВИЛА ОФОРМЛЕНИЯ:
1. Используй LaTeX для формул: $inline$ или $$block$$.
2. Используй Markdown для форматирования текста.
3. Для таблиц используй Markdown формат (| col | col |).
4. Если просят построить график, составь Markdown таблицу значений (X | Y) с минимум 10 точками.
5. Для кода используй блоки \`\`\`язык ... \`\`\`.`;

// =============================================================================
// Build effective system prompt (with time, date, memories)
// =============================================================================

export function buildEffectiveSystemPrompt(config: AppConfig): string {
  const contextParts: string[] = [];

  if (config.includeDate) {
    const dateStr = new Date().toLocaleDateString('ru-RU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    contextParts.push(`Текущая дата: ${dateStr}`);
  }

  if (config.includeTime) {
    const timeStr = new Date().toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
    contextParts.push(`Текущее время: ${timeStr}`);
  }

  if (config.memories.length > 0) {
    contextParts.push(
      `ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ (запомни и учитывай):\n${config.memories.map(m => `- ${m}`).join('\n')}`
    );
  }

  let prompt = config.systemPrompt;
  if (contextParts.length > 0) {
    prompt = contextParts.join('\n') + '\n\n' + prompt;
  }

  return prompt;
}

// =============================================================================
// Utility Functions
// =============================================================================

export function isGoogleModel(model: string): boolean {
  if (isAutoMode(model)) return AUTO_MODES[model].provider === 'google';
  return model.startsWith('gemini');
}

export function isSambaModel(model: string): boolean {
  if (isAutoMode(model)) return AUTO_MODES[model].provider === 'sambanova';
  return /^(DeepSeek-|gpt-oss-)/.test(model);
}

export function isImageCapableModel(model: string): boolean {
  return model.includes('image');
}

export function getModelShortName(model: string): string {
  if (model === 'auto-gemini-flash') return 'Auto: Flash';
  if (model === 'auto-gemini-pro') return 'Auto: Pro';
  if (model === 'auto-openrouter') return 'Auto: OpenRouter';
  if (model === 'auto-samba') return 'Auto: Samba';
  if (model === 'auto-search') return 'AI Search';
  if (model.includes('/')) return model.split('/').pop()?.replace(':free', '') || model;
  return model;
}

export function getModelDotColor(model: string): string {
  if (model === 'auto-gemini-flash') return 'bg-amber-400';
  if (model === 'auto-gemini-pro') return 'bg-violet-400';
  if (model === 'auto-openrouter') return 'bg-emerald-400';
  if (model === 'auto-samba') return 'bg-orange-400';
  if (model === 'auto-search') return 'bg-cyan-400';
  if (isGoogleModel(model)) return 'bg-blue-400';
  if (isSambaModel(model)) return 'bg-orange-400';
  return 'bg-emerald-400';
}

function uid(): string { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

// =============================================================================
// Message conversion helpers
// =============================================================================

function toGeminiContents(messages: ChatMessage[]) {
  return messages.map(msg => {
    const parts: Record<string, unknown>[] = [];
    if (msg.images && msg.images.length > 0) {
      for (const img of msg.images) {
        const match = img.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
        }
      }
    }
    parts.push({ text: msg.content || ' ' });
    return { role: msg.role === 'assistant' ? 'model' : 'user', parts };
  });
}

function toOpenAIMessages(messages: ChatMessage[], systemPrompt: string) {
  const result: { role: string; content: unknown }[] = [
    { role: 'system', content: systemPrompt }
  ];
  for (const msg of messages) {
    if (msg.role === 'user' && msg.images && msg.images.length > 0) {
      const content: { type: string; text?: string; image_url?: { url: string } }[] = [];
      content.push({ type: 'text', text: msg.content || 'Describe this image' });
      for (const img of msg.images) {
        content.push({ type: 'image_url', image_url: { url: img } });
      }
      result.push({ role: 'user', content });
    } else {
      result.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      });
    }
  }
  return result;
}

function isRetryableError(errorMsg: string): boolean {
  return /429|500|503|overloaded|quota|rate.?limit|capacity|unavailable|keys? failed|exhausted/i.test(errorMsg);
}

// =============================================================================
// Gemini Streaming (with key rotation)
// =============================================================================

export async function callGeminiStreaming(
  messages: ChatMessage[],
  model: string,
  keys: string[],
  systemPrompt: string,
  onChunk: (text: string) => void,
  onResetContent: () => void,
  addLog: (entry: LogEntry) => void,
  signal?: AbortSignal
): Promise<{ text: string; images: string[] }> {
  if (keys.length === 0) {
    throw new Error('No Google API keys configured. Go to Settings → API Keys.');
  }

  const shuffledKeys = [...keys].sort(() => Math.random() - 0.5);
  const errors: string[] = [];

  addLog({ timestamp: Date.now(), level: 'info', message: `→ Gemini [${model}] — ${shuffledKeys.length} key(s)` });

  for (let i = 0; i < shuffledKeys.length; i++) {
    const key = shuffledKeys[i];
    const keyHint = key.slice(-6);

    if (signal?.aborted) throw new Error('Request aborted');

    try {
      const contents = toGeminiContents(messages);
      const body: Record<string, unknown> = {
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { temperature: 1.0, maxOutputTokens: 65536 },
      };

      if (isImageCapableModel(model)) {
        (body.generationConfig as Record<string, unknown>).responseModalities = ['TEXT', 'IMAGE'];
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${key}&alt=sse`;
      addLog({ timestamp: Date.now(), level: 'info', message: `Key ...${keyHint} (${i + 1}/${shuffledKeys.length})` });

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 200)}`);
      }

      onResetContent();

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      const images: string[] = [];
      let buffer = '';
      let gotContent = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;

          try {
            const data = JSON.parse(jsonStr);

            if (data.error) {
              const errMsg = data.error.message || JSON.stringify(data.error);
              throw new Error(`Stream error ${data.error.code || ''}: ${errMsg.slice(0, 200)}`);
            }

            const candidates = data.candidates || [];
            if (candidates.length === 0) {
              if (data.promptFeedback?.blockReason) {
                throw new Error(`Prompt blocked: ${data.promptFeedback.blockReason}`);
              }
              continue;
            }

            const parts = candidates[0]?.content?.parts || [];
            for (const part of parts) {
              if (part.text) {
                fullText += part.text;
                onChunk(part.text);
                gotContent = true;
              }
              if (part.inlineData) {
                images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                gotContent = true;
              }
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && (
              parseErr.message.startsWith('Stream error') ||
              parseErr.message.startsWith('Prompt blocked')
            )) {
              if (gotContent) {
                addLog({ timestamp: Date.now(), level: 'warn', message: 'Stream interrupted with partial content' });
                return { text: fullText, images };
              }
              throw parseErr;
            }
          }
        }
      }

      if (!gotContent && !fullText && images.length === 0) {
        throw new Error('Empty response from model');
      }

      addLog({ timestamp: Date.now(), level: 'info', message: `← OK via ...${keyHint} (${fullText.length} chars${images.length ? `, ${images.length} imgs` : ''})` });
      return { text: fullText, images };

    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      if (errMsg.includes('abort')) throw e;

      errors.push(`...${keyHint}: ${errMsg.slice(0, 100)}`);
      addLog({ timestamp: Date.now(), level: 'warn', message: `Key ...${keyHint} failed: ${errMsg.slice(0, 80)}` });

      if (!isRetryableError(errMsg)) throw new Error(errMsg);
      continue;
    }
  }

  addLog({ timestamp: Date.now(), level: 'error', message: `All ${shuffledKeys.length} keys exhausted for ${model}` });
  throw new Error(`All ${shuffledKeys.length} keys failed for ${model}.`);
}

// =============================================================================
// OpenRouter Streaming
// =============================================================================

export async function callOpenRouter(
  messages: ChatMessage[],
  model: string,
  apiKey: string,
  systemPrompt: string,
  onChunk: (text: string) => void,
  addLog: (entry: LogEntry) => void,
  signal?: AbortSignal
): Promise<{ text: string; images: string[] }> {
  if (!apiKey) {
    throw new Error('No OpenRouter API key. Go to Settings → API Keys.');
  }

  addLog({ timestamp: Date.now(), level: 'info', message: `→ OpenRouter [${getModelShortName(model)}]` });

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'DophyAI',
    },
    body: JSON.stringify({ model, messages: toOpenAIMessages(messages, systemPrompt), stream: true }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${errorText.slice(0, 200)}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        try {
          const data = JSON.parse(line.slice(6));
          const chunk = data.choices?.[0]?.delta?.content;
          if (chunk) { fullText += chunk; onChunk(chunk); }
        } catch { /* skip */ }
      }
    }
  }

  addLog({ timestamp: Date.now(), level: 'info', message: `← OpenRouter OK (${fullText.length} chars)` });
  return { text: fullText, images: [] };
}

// =============================================================================
// SambaNova Streaming (OpenAI-compatible API)
// =============================================================================

const SAMBA_BASE_URL = 'https://api.sambanova.ai/v1';

export async function callSambaNovaStreaming(
  messages: ChatMessage[],
  model: string,
  apiKey: string,
  systemPrompt: string,
  onChunk: (text: string) => void,
  addLog: (entry: LogEntry) => void,
  signal?: AbortSignal
): Promise<{ text: string; images: string[] }> {
  if (!apiKey) {
    throw new Error('No SambaNova API key. Go to Settings → API Keys.');
  }

  addLog({ timestamp: Date.now(), level: 'info', message: `→ SambaNova [${model}]` });

  const response = await fetch(`${SAMBA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: toOpenAIMessages(messages, systemPrompt),
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SambaNova ${response.status}: ${errorText.slice(0, 200)}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        try {
          const data = JSON.parse(line.slice(6));
          const chunk = data.choices?.[0]?.delta?.content;
          if (chunk) { fullText += chunk; onChunk(chunk); }
        } catch { /* skip */ }
      }
    }
  }

  addLog({ timestamp: Date.now(), level: 'info', message: `← SambaNova OK (${fullText.length} chars)` });
  return { text: fullText, images: [] };
}

// =============================================================================
// AI Search Mode — Uses Gemini's built-in Google Search grounding
// =============================================================================
// This uses the Gemini API's native `google_search` tool which provides
// real-time web search results directly from Google. No CORS issues,
// no third-party proxies — just a direct API call with the user's existing
// Google API keys.
// =============================================================================

interface GroundingSource {
  title: string;
  url: string;
}

function getCurrentDateInfo(): { dateStr: string; year: number } {
  const now = new Date();
  return {
    dateStr: now.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }),
    year: now.getFullYear(),
  };
}

/**
 * Calls Gemini with google_search grounding tool.
 * Streams the response text and collects grounding sources from metadata.
 * Accepts full conversation history for multi-turn context.
 */
async function callGeminiWithSearch(
  messages: ChatMessage[],
  keys: string[],
  systemPrompt: string,
  onChunk: (text: string) => void,
  addLog: (entry: LogEntry) => void,
  signal?: AbortSignal
): Promise<{ text: string; sources: GroundingSource[] }> {
  const shuffledKeys = [...keys].sort(() => Math.random() - 0.5);
  // Models that support google_search tool
  const searchModels = ['gemini-2.5-flash', 'gemini-2.0-flash'];

  for (const model of searchModels) {
    for (const key of shuffledKeys) {
      if (signal?.aborted) throw new Error('Request aborted');
      const keyHint = key.slice(-6);

      try {
        addLog({ timestamp: Date.now(), level: 'info', message: `🔍 Searching via ${model} ...${keyHint}` });

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${key}&alt=sse`;

        // Build full conversation contents for multi-turn context
        const contents = toGeminiContents(messages);

        const body = {
          contents,
          tools: [{ google_search: {} }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          // Check for location error
          if (errorText.includes('not supported') || errorText.includes('FAILED_PRECONDITION')) {
            throw new Error(`HTTP 400: ${errorText.slice(0, 200)}`);
          }
          throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 200)}`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        const sources: GroundingSource[] = [];
        let buffer = '';
        let gotContent = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;

            try {
              const data = JSON.parse(jsonStr);

              if (data.error) {
                const errMsg = data.error.message || JSON.stringify(data.error);
                throw new Error(`Stream error: ${errMsg.slice(0, 200)}`);
              }

              const candidates = data.candidates || [];
              if (candidates.length === 0) continue;

              const candidate = candidates[0];

              // Extract text
              const parts = candidate?.content?.parts || [];
              for (const part of parts) {
                if (part.text) {
                  fullText += part.text;
                  onChunk(part.text);
                  gotContent = true;
                }
              }

              // Extract grounding metadata (comes in later chunks)
              const groundingMeta = candidate?.groundingMetadata;
              if (groundingMeta?.groundingChunks) {
                for (const chunk of groundingMeta.groundingChunks) {
                  if (chunk.web?.uri) {
                    const exists = sources.some(s => s.url === chunk.web.uri);
                    if (!exists) {
                      sources.push({
                        title: chunk.web.title || '',
                        url: chunk.web.uri,
                      });
                    }
                  }
                }
              }

              // Also check groundingSupports for additional source info
              if (groundingMeta?.groundingSupports) {
                for (const support of groundingMeta.groundingSupports) {
                  if (support.groundingChunkIndices) {
                    // These reference the chunks above, already collected
                  }
                }
              }

              // Check webSearchQueries for logging
              if (groundingMeta?.webSearchQueries) {
                addLog({
                  timestamp: Date.now(),
                  level: 'info',
                  message: `🔎 Search queries: ${groundingMeta.webSearchQueries.join(' | ')}`,
                });
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message.startsWith('Stream error')) {
                if (gotContent) {
                  addLog({ timestamp: Date.now(), level: 'warn', message: 'Stream interrupted with partial content' });
                  return { text: fullText, sources };
                }
                throw parseErr;
              }
            }
          }
        }

        if (!gotContent && !fullText) {
          throw new Error('Empty search response');
        }

        addLog({
          timestamp: Date.now(),
          level: 'info',
          message: `✓ Search OK: ${fullText.length} chars, ${sources.length} sources`,
        });

        return { text: fullText, sources };

      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        if (errMsg.includes('abort')) throw e;
        // Non-retryable errors (like location not supported) should propagate
        if (errMsg.includes('not supported') || errMsg.includes('FAILED_PRECONDITION')) {
          throw e;
        }
        addLog({ timestamp: Date.now(), level: 'warn', message: `Search ${model} ...${keyHint}: ${errMsg.slice(0, 80)}` });
        continue;
      }
    }
  }

  throw new Error('Google Search failed with all keys/models');
}

/**
 * Fallback search: use SambaNova/OpenRouter without search grounding
 * when Google keys are not available. Passes full conversation history.
 */
async function callFallbackSearch(
  messages: ChatMessage[],
  config: AppConfig,
  onChunk: (text: string) => void,
  addLog: (entry: LogEntry) => void,
  signal?: AbortSignal
): Promise<{ text: string; images: string[] }> {
  const { dateStr, year } = getCurrentDateInfo();
  const prompt = `Today is ${dateStr}, ${year}. The user is asking a question that would benefit from current information. Answer as best you can from your training knowledge. If the information might be outdated, clearly state that. Respond in the same language as the user's question. Use Markdown for formatting.`;

  // Try SambaNova
  if (config.sambaKey) {
    const models = ['DeepSeek-V3.1', 'DeepSeek-V3-0324', 'gpt-oss-120b'];
    for (const model of models) {
      if (signal?.aborted) throw new Error('aborted');
      try {
        addLog({ timestamp: Date.now(), level: 'info', message: `📝 Fallback via SambaNova ${model}` });
        return await callSambaNovaStreaming(messages, model, config.sambaKey, prompt, onChunk, addLog, signal);
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        if (errMsg.includes('abort')) throw e;
        continue;
      }
    }
  }

  // Try OpenRouter
  if (config.openrouterKey && config.openrouterModels.length > 0) {
    const model = config.openrouterModels[0];
    addLog({ timestamp: Date.now(), level: 'info', message: `📝 Fallback via OpenRouter ${getModelShortName(model)}` });
    return await callOpenRouter(messages, model, config.openrouterKey, prompt, onChunk, addLog, signal);
  }

  throw new Error('AI Search requires Google API keys (for web search) or SambaNova/OpenRouter keys (for knowledge-based answers). Add keys in Settings.');
}

/**
 * Main search mode handler.
 * Primary: Gemini with Google Search grounding (real web results).
 * Fallback: SambaNova/OpenRouter with training knowledge.
 */
async function callSearchMode(
  messages: ChatMessage[],
  config: AppConfig,
  onChunk: (text: string) => void,
  onResetContent: () => void,
  addLog: (entry: LogEntry) => void,
  signal?: AbortSignal
): Promise<{ text: string; images: string[] }> {
  const userQuery = messages[messages.length - 1]?.content || '';
  if (!userQuery.trim()) throw new Error('Empty query');

  const { dateStr, year } = getCurrentDateInfo();

  addLog({ timestamp: Date.now(), level: 'info', message: '🔍 AI Search starting...' });

  // ========= Primary: Gemini with Google Search grounding =========
  if (config.googleKeys.length > 0) {
    try {
      onResetContent();

      const systemPrompt = `Today is ${dateStr}. The current year is ${year}.

You are an AI search assistant with access to Google Search. Answer the user's question using up-to-date information from the web.

RULES:
1. Provide accurate, comprehensive, and current information.
2. Do NOT use numbered citation markers like [1], [2] in the text. Write naturally.
3. Use Markdown formatting: headers, lists, bold text for readability.
4. Use LaTeX for math: $inline$ or $$block$$.
5. Respond in the SAME LANGUAGE as the user's question.
6. If information is uncertain, say so.
7. Be specific with dates, numbers, and facts.
8. Use conversation history for context — if the user says "more details" or "tell me more", refer to the previous topic.`;

      // Pass FULL conversation history for multi-turn context
      const result = await callGeminiWithSearch(
        messages,
        config.googleKeys,
        systemPrompt,
        onChunk,
        addLog,
        signal
      );

      // Append sources in the special marker format for frontend parsing
      let finalText = result.text;
      if (result.sources.length > 0) {
        finalText += '\n\n<!--SOURCES-->\n';
        for (const s of result.sources) {
          const title = s.title || (() => { try { return new URL(s.url).hostname; } catch { return s.url; } })();
          finalText += `- [${title}](${s.url})\n`;
        }
        finalText += '<!--/SOURCES-->';
      }

      return { text: finalText, images: [] };

    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      if (errMsg.includes('abort')) throw e;
      // If location error, propagate it
      if (errMsg.includes('not supported') || errMsg.includes('FAILED_PRECONDITION')) {
        throw e;
      }
      // Otherwise fall through to SambaNova/OpenRouter fallback
      addLog({ timestamp: Date.now(), level: 'warn', message: `Google Search failed: ${errMsg.slice(0, 80)}, trying fallback...` });
    }
  }

  // ========= Fallback: SambaNova/OpenRouter without search =========
  addLog({ timestamp: Date.now(), level: 'info', message: '📝 No Google keys — using knowledge-based answer' });
  onResetContent();
  return await callFallbackSearch(messages, config, onChunk, addLog, signal);
}

// =============================================================================
// Auto Mode — tries models in priority order with fallback
// =============================================================================

async function callAutoMode(
  messages: ChatMessage[],
  autoKey: string,
  config: AppConfig,
  onChunk: (text: string) => void,
  onResetContent: () => void,
  addLog: (entry: LogEntry) => void,
  signal?: AbortSignal
): Promise<{ text: string; images: string[] }> {
  const autoConfig = AUTO_MODES[autoKey];
  if (!autoConfig) throw new Error(`Unknown auto mode: ${autoKey}`);

  let modelsToTry: string[];

  if (autoConfig.provider === 'openrouter') {
    modelsToTry = [...config.openrouterModels].sort(() => Math.random() - 0.5);
    if (modelsToTry.length === 0) {
      throw new Error('No OpenRouter models configured. Add models in Settings → Models.');
    }
  } else if (autoConfig.provider === 'sambanova') {
    modelsToTry = [...autoConfig.models];
    if (modelsToTry.length === 0) {
      throw new Error('No SambaNova models configured.');
    }
  } else {
    modelsToTry = [...autoConfig.models];
  }

  addLog({ timestamp: Date.now(), level: 'info', message: `🔄 Auto [${autoConfig.label}] — ${modelsToTry.length} model(s) to try` });

  const allErrors: string[] = [];

  for (let i = 0; i < modelsToTry.length; i++) {
    const modelName = modelsToTry[i];
    if (signal?.aborted) throw new Error('Request aborted');

    addLog({ timestamp: Date.now(), level: 'info', message: `Auto: trying ${getModelShortName(modelName)} (${i + 1}/${modelsToTry.length})` });

    try {
      onResetContent();

      if (autoConfig.provider === 'google') {
        return await callGeminiStreaming(
          messages, modelName, config.googleKeys, config.systemPrompt,
          onChunk, onResetContent, addLog, signal
        );
      } else if (autoConfig.provider === 'sambanova') {
        return await callSambaNovaStreaming(
          messages, modelName, config.sambaKey, config.systemPrompt,
          onChunk, addLog, signal
        );
      } else {
        return await callOpenRouter(
          messages, modelName, config.openrouterKey, config.systemPrompt,
          onChunk, addLog, signal
        );
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      if (errMsg.includes('abort')) throw e;

      allErrors.push(`${getModelShortName(modelName)}: ${errMsg.slice(0, 80)}`);

      if (!isRetryableError(errMsg)) {
        addLog({ timestamp: Date.now(), level: 'error', message: `Auto: ${getModelShortName(modelName)} non-retryable error: ${errMsg.slice(0, 80)}` });
        throw e;
      }

      addLog({ timestamp: Date.now(), level: 'warn', message: `Auto: ${getModelShortName(modelName)} failed, trying next...` });
      continue;
    }
  }

  addLog({ timestamp: Date.now(), level: 'error', message: `Auto: all ${modelsToTry.length} models failed` });
  throw new Error(`Auto mode: all ${modelsToTry.length} models failed. Check API keys or try later.\n\n${allErrors.join('\n')}`);
}

// =============================================================================
// Main Router
// =============================================================================

export async function generateResponse(
  messages: ChatMessage[],
  model: string,
  config: AppConfig,
  onChunk: (text: string) => void,
  onResetContent: () => void,
  addLog: (entry: LogEntry) => void,
  signal?: AbortSignal
): Promise<{ text: string; images: string[] }> {
  if (model === 'auto-search') {
    return callSearchMode(messages, config, onChunk, onResetContent, addLog, signal);
  }

  if (isAutoMode(model)) {
    return callAutoMode(messages, model, config, onChunk, onResetContent, addLog, signal);
  }

  if (isGoogleModel(model)) {
    return callGeminiStreaming(messages, model, config.googleKeys, config.systemPrompt, onChunk, onResetContent, addLog, signal);
  } else if (isSambaModel(model)) {
    return callSambaNovaStreaming(messages, model, config.sambaKey, config.systemPrompt, onChunk, addLog, signal);
  } else {
    return callOpenRouter(messages, model, config.openrouterKey, config.systemPrompt, onChunk, addLog, signal);
  }
}
