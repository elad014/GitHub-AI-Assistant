const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api'

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

export function getRepoOverview(repoUrl) {
  return post('/repo-overview', { repo_url: repoUrl })
}

export function reviewSecurity(repoUrl, focus = '') {
  return post('/review/security', { repo_url: repoUrl, focus })
}

export function reviewTechnical(repoUrl, focus = '') {
  return post('/review/technical', { repo_url: repoUrl, focus })
}

export function compareRepos(repoAUrl, repoBUrl, goals = '') {
  return post('/compare-repos', { repo_a_url: repoAUrl, repo_b_url: repoBUrl, comparison_goals: goals })
}

export function getAnalytics(periodDays = 30) {
  return get(`/analytics?period_days=${periodDays}`)
}

export function getKnownRepos(limit = 50) {
  return get(`/known-repos?limit=${limit}`)
}

export function getRepoHistory(repoUrl, limit = 100) {
  return get(`/repo-history?repo_url=${encodeURIComponent(repoUrl)}&limit=${limit}`)
}

export async function checkHealth() {
  return get('/health')
}
