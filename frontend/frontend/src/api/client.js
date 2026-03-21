const BASE = '/api'

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'Request failed')
  }
  return res.json()
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'Request failed')
  }
  return res.json()
}

export function sendChatMessage(repoUrl, message, history, userName = '') {
  return post('/chat', { repo_url: repoUrl, message, history, user_name: userName })
}

export async function* streamChatMessage(repoUrl, message, history, userName = '') {
  const res = await fetch(`${BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo_url: repoUrl, message, history, user_name: userName }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'Request failed')
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = JSON.parse(line.slice(6))
      if (data.error) throw new Error(data.error)
      if (data.done) return
      if (data.token) yield data.token
    }
  }
}

export function analyzeRepo(repoUrl) {
  return post('/analyze-repo', { repo_url: repoUrl })
}

export function securityScan(repoUrl) {
  return post('/security-scan', { repo_url: repoUrl })
}

export function analyzeCode(repoUrl, filePath) {
  return post('/analyze-code', { repo_url: repoUrl, file_path: filePath })
}

export function getAnalytics(periodDays = 30) {
  return get(`/analytics?period_days=${periodDays}`)
}

export async function checkHealth() {
  return get('/health')
}
