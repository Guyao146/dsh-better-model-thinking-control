/**
 * Host half of dsh-better-model-thinking-control.
 *
 * DSH's llm-pi-ai plugin owns the `llm-pi-ai` settings namespace. This plugin
 * intentionally does not register that namespace again. It provides a
 * short-lived probe for common OpenAI-compatible gateway metadata instead.
 */

export const inject = ['webServer', 'credentials', 'llm']

const API = '/dsh-reasoning-control/api'
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024
const LEVELS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']

function sendJson(res, status, value) {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(body)
}

async function readJsonBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > 32 * 1024) throw new Error('请求体过大')
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
  } catch {
    throw new Error('请求体需要是 JSON')
  }
}

function baseUrlOf(raw) {
  const url = new URL(String(raw || '').trim())
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('中转站地址只支持 HTTP 或 HTTPS')
  }
  url.search = ''
  url.hash = ''
  url.pathname = url.pathname.replace(/\/+$/, '')
  return url.toString().replace(/\/$/, '')
}

async function boundedText(response, url) {
  const declared = Number(response.headers.get('content-length') || NaN)
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) {
    await response.body?.cancel()
    throw new Error(`${url} 返回内容过大`)
  }
  if (!response.body) return ''
  const reader = response.body.getReader()
  const chunks = []
  let total = 0
  try {
    for (;;) {
      const part = await reader.read()
      if (part.done) break
      total += part.value.byteLength
      if (total > MAX_RESPONSE_BYTES) throw new Error(`${url} 返回内容过大`)
      chunks.push(part.value)
    }
  } finally {
    await reader.cancel().catch(() => {})
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function normalizeLevel(value) {
  const raw = typeof value === 'string'
    ? value
    : value && typeof value === 'object'
      ? (value.id ?? value.name ?? value.value ?? value.effort)
      : undefined
  const valueText = text(raw)
  if (!valueText) return undefined
  const normalized = valueText.toLowerCase().replace(/[ _-]+/g, '')
  const aliases = { none: 'off', disabled: 'off', default: 'medium', ultra: 'max' }
  return aliases[normalized] || LEVELS.find((level) => level.replace('-', '') === normalized) || valueText
}

function wireValue(value, fallback) {
  if (value && typeof value === 'object') {
    return text(value.wireValue ?? value.wire ?? value.requestValue ?? value.value) || fallback
  }
  return text(value) || fallback
}

function effortContainer(model) {
  const candidates = [
    model?.reasoning_efforts,
    model?.reasoningEfforts,
    model?.supported_reasoning_efforts,
    model?.supportedReasoningEfforts,
    model?.thinking_levels,
    model?.thinkingLevels,
    model?.supported_thinking_levels,
    model?.supportedThinkingLevels,
    model?.reasoning?.efforts,
    model?.reasoning?.levels,
    model?.reasoning?.supported,
    model?.thinking?.efforts,
    model?.thinking?.levels,
    model?.thinking?.supported,
  ]
  return candidates.find((value) => Array.isArray(value) || (value && typeof value === 'object'))
}

/** Convert gateway reasoning metadata to dsh's reasoningEfforts shape. */
export function parseReasoningEfforts(model) {
  if (model?.reasoning === false || model?.thinking === false) return false
  const container = effortContainer(model)
  if (!container) return undefined
  const pairs = Array.isArray(container) ? container.map((value) => [value, value]) : Object.entries(container)
  const result = {}
  for (const [key, value] of pairs) {
    const id = normalizeLevel(Array.isArray(container) ? key : key)
    if (!id) continue
    // DSH uses null specifically for "off, send no reasoning parameter".
    // A plain array has no separate wire spelling, so its off entry follows
    // that convention too.
    result[id] = id === 'off' && (Array.isArray(container) || value == null || value === '' || value === true)
      ? null
      : wireValue(value, id)
  }
  return Object.keys(result).length ? result : undefined
}

function normalizeModels(payload) {
  if (!payload || !Array.isArray(payload.data)) throw new Error('中转站返回中没有 data 模型列表')
  return payload.data.map((model) => {
    const id = text(model?.id)
    if (!id) return null
    const efforts = parseReasoningEfforts(model)
    const contextWindow = Number(model?.context_window || model?.context_length)
    return {
      id,
      ...(text(model?.name ?? model?.display_name ?? model?.displayName) ? { name: text(model.name ?? model.display_name ?? model.displayName) } : {}),
      ...(efforts !== undefined ? { reasoningEfforts: efforts } : {}),
      ...(Number.isInteger(contextWindow) && contextWindow > 0 ? { contextWindow } : {}),
    }
  }).filter(Boolean)
}

async function resolveCredential(ctx, ref) {
  const keyRef = text(ref)
  if (!keyRef) return undefined
  const credentials = ctx.get('credentials')
  const result = credentials?.resolve ? await credentials.resolve(keyRef) : undefined
  return result?.value || undefined
}

async function probe(ctx, body) {
  const api = String(body.api || 'openai-completions')
  if (api !== 'openai-completions' && api !== 'openai-responses') {
    throw new Error('当前仅支持 OpenAI Completions/Responses 中转站')
  }
  const baseUrl = baseUrlOf(body.baseURL)
  const url = `${baseUrl}/models`
  // A key typed into the card is one-shot only and wins over the stored
  // credential reference. It is never written to settings or credentials.
  const oneShotKey = text(body.apiKey)
  const apiKey = oneShotKey || await resolveCredential(ctx, body.apiKeyEnv)
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      ...(apiKey ? { authorization: `Bearer ${apiKey}`, 'x-api-key': apiKey } : {}),
    },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) {
    const reason = response.status === 401 || response.status === 403
      ? (apiKey ? '，API Key 被中转站拒绝，请确认 Key、权限和 /models 接口权限 / API key was rejected; check the key, permissions, and /models access' : '，请在卡片中输入一次性 API Key / enter a one-shot API key in the card')
      : ''
    throw new Error(`${url} 返回 HTTP ${response.status}${reason}`)
  }
  const raw = await boundedText(response, url)
  let payload
  try { payload = JSON.parse(raw) } catch { throw new Error(`${url} 返回的不是 JSON`) }
  const models = normalizeModels(payload)
  // A standard OpenAI /models reply often has only ids. When the provider is
  // already live in DSH, its adapter catalog is a better, local source of the
  // exact supported levels, so use it only to fill missing gateway metadata.
  const llm = ctx.get('llm')
  if (body.provider && llm?.resolveModelInfo) {
    for (const model of models) {
      if (model.reasoningEfforts !== undefined) continue
      try {
        const info = await llm.resolveModelInfo(String(body.provider), model.id)
        const efforts = info?.reasoning?.efforts
        if (Array.isArray(efforts) && efforts.length) {
          model.reasoningEfforts = Object.fromEntries(efforts.map((effort) => [String(effort.id), String(effort.id)]))
        }
      } catch {
        // Newly drafted/unregistered providers are expected to have no entry.
      }
    }
  }
  return { ok: true, models }
}

export function apply(ctx) {
  const disposer = ctx.webServer.register({
    kind: 'prefix',
    path: API,
    handler: async (req, res) => {
      let url
      try { url = new URL(req.url, 'http://127.0.0.1') } catch { return sendJson(res, 400, { ok: false, error: 'bad url' }) }
      if (req.headers['x-dsh-reasoning'] !== '1') return sendJson(res, 403, { ok: false, error: 'forbidden' })
      if (url.pathname !== `${API}/probe`) return sendJson(res, 404, { ok: false, error: 'unknown api' })
      if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'method not allowed' })
      try { return sendJson(res, 200, await probe(ctx, await readJsonBody(req))) } catch (error) {
        return sendJson(res, 400, { ok: false, error: String(error?.message || error) })
      }
    },
  })
  ctx.on('dispose', disposer)
}