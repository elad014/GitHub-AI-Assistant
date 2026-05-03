import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getAnalytics, getKnownRepos, getRepoHistory, getRepoOverview } from '../api/client'
import RepoHoverPopover from '../components/RepoHoverPopover'
import { githubRepoSlug, githubRepoWebUrl } from '../utils/githubRepoUrl'

const PERIODS = [7, 30, 90]

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function fmtDate(dateStr) {
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const EVENT_META = {
  chat:             { label: 'Chat',             cls: 'evt--chat' },
  analyze:          { label: 'Analysis',         cls: 'evt--analyze' },
  review_security:  { label: 'Security Review',  cls: 'evt--security' },
  review_technical: { label: 'Code quality', cls: 'evt--technical' },
  code_explain:     { label: 'Code Explain',     cls: 'evt--explain' },
}

function eventMeta(type) {
  return EVENT_META[type] ?? { label: type, cls: 'evt--other' }
}

function findingCount(aiResponse) {
  try {
    const arr = JSON.parse(aiResponse)
    if (Array.isArray(arr)) return arr.length
  } catch { /* ignored */ }
  return null
}

// ── Analytics sub-components ─────────────────────────────────────────────────

function StatCard({ label, value, highlight }) {
  return (
    <div className={'stat-card' + (highlight ? ' stat-card--highlight' : '')}>
      <span className="stat-value">{value ?? '—'}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

function EventRow({ event_type, count }) {
  return (
    <div className="table-row">
      <span className="event-badge">{event_type}</span>
      <span className="row-count">{count.toLocaleString()}</span>
    </div>
  )
}

function RepoRow({ repo_url, count, rank, onRepoHoverEnter, onRepoHoverLeave }) {
  const href = githubRepoWebUrl(repo_url)
  const name = githubRepoSlug(repo_url) || repo_url.replace(/^https?:\/\/github\.com\//i, '')
  return (
    <div
      className="table-row"
      onMouseEnter={(e) => onRepoHoverEnter?.(repo_url, e.currentTarget)}
      onMouseLeave={onRepoHoverLeave}
    >
      <span className="row-rank">{rank}</span>
      <a
        className="row-repo"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={href}
      >
        {name}
      </a>
      <span className="row-count">{count.toLocaleString()}</span>
    </div>
  )
}

// ── History sub-components ────────────────────────────────────────────────────

function ReviewFindingsList({ aiResponse }) {
  const [openIdx, setOpenIdx] = useState(null)
  let findings = []
  try {
    findings = JSON.parse(aiResponse)
  } catch { /* ignored */ }

  if (!Array.isArray(findings) || findings.length === 0) {
    return (
      <div className="history-section">
        <span className="history-section-label">Raw Response</span>
        <p className="history-section-text">{(aiResponse || '').slice(0, 800)}</p>
      </div>
    )
  }

  return (
    <div className="history-findings">
      {findings.map((f, i) => {
        const sev = (f.severity || 'low').toLowerCase()
        const isOpen = openIdx === i
        const lines =
          f.line_start != null
            ? `L${f.line_start}${f.line_end != null ? `–${f.line_end}` : ''}`
            : null
        return (
          <div
            key={i}
            className={`history-finding history-finding--${sev}`}
          >
            <button
              type="button"
              className="history-finding-header"
              onClick={() => setOpenIdx(isOpen ? null : i)}
              aria-expanded={isOpen}
            >
              <span className={`sev-badge sev-badge--${sev}`}>{f.severity || 'LOW'}</span>
              <span className="history-finding-title">{f.title}</span>
              {f.file_path && (
                <code className="history-finding-file" title={f.file_path}>
                  {f.file_path}
                </code>
              )}
              <span className="history-finding-chevron" aria-hidden>{isOpen ? '▾' : '▸'}</span>
            </button>
            {isOpen && (
              <div className="history-finding-body">
                {(f.file_path || lines) && (
                  <div className="history-finding-meta">
                    {f.file_path && (
                      <code className="history-finding-file history-finding-file--block">{f.file_path}</code>
                    )}
                    {lines && <span className="history-finding-lines">{lines}</span>}
                  </div>
                )}
                <div className="history-finding-section">
                  <span className="finding-section-label">Issue</span>
                  <p className="finding-section-text">{f.description || '—'}</p>
                </div>
                <div className="history-finding-section">
                  <span className="finding-section-label">Recommendation</span>
                  <p className="finding-section-text finding-recommendation">{f.recommendation || '—'}</p>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function HistoryEntry({ entry }) {
  const [open, setOpen] = useState(false)
  const meta = eventMeta(entry.event_type)
  const count = (entry.event_type === 'review_security' || entry.event_type === 'review_technical')
    ? findingCount(entry.ai_response)
    : null

  const PREVIEW_AI = 360
  const PREVIEW_CHAT = 120

  let preview = ''
  if (entry.event_type === 'chat' && entry.user_message) {
    preview = entry.user_message.length > PREVIEW_CHAT
      ? entry.user_message.slice(0, PREVIEW_CHAT) + '…'
      : entry.user_message
  } else if (entry.event_type === 'code_explain' && entry.user_message) {
    preview = entry.user_message
  } else {
    const raw = (entry.ai_response || '').replace(/\r\n/g, '\n')
    preview = raw.length > PREVIEW_AI ? raw.slice(0, PREVIEW_AI) + '…' : raw
  }

  return (
    <div className={`history-entry ${open ? 'history-entry--open' : ''}`}>
      <div className="history-entry-header" onClick={() => setOpen(o => !o)}>
        <div className="history-entry-left">
          <span className={`history-evt-badge ${meta.cls}`}>{meta.label}</span>
          {entry.user_name && (
            <span className="history-user">{entry.user_name}</span>
          )}
          {count !== null && (
            <span className="history-count-badge">{count} findings</span>
          )}
        </div>
        <div className="history-entry-right">
          <span className="history-time" title={fmtDate(entry.created_at)}>
            {timeAgo(entry.created_at)}
          </span>
          <span className="history-chevron">{open ? '▾' : '▸'}</span>
        </div>
      </div>

      {!open && (
        <p className="history-preview">{preview}</p>
      )}

      {open && (
        <div className="history-entry-body">
          {entry.event_type === 'chat' && (
            <>
              {entry.user_message && (
                <div className="history-section">
                  <span className="history-section-label">Question</span>
                  <div className="history-section-md md">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.user_message}</ReactMarkdown>
                  </div>
                </div>
              )}
              <div className="history-section">
                <span className="history-section-label">Answer</span>
                <div className="history-section-md md">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.ai_response}</ReactMarkdown>
                </div>
              </div>
            </>
          )}

          {entry.event_type === 'analyze' && (
            <div className="history-section">
              <span className="history-section-label">AI Summary</span>
              <div className="history-section-md md">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.ai_response}</ReactMarkdown>
              </div>
            </div>
          )}

          {(entry.event_type === 'review_security' || entry.event_type === 'review_technical') && (
            <ReviewFindingsList aiResponse={entry.ai_response} />
          )}

          {entry.event_type === 'code_explain' && (
            <>
              {entry.user_message && (
                <div className="history-section">
                  <span className="history-section-label">File</span>
                  <code className="history-finding-file">{entry.user_message}</code>
                </div>
              )}
              <div className="history-section">
                <span className="history-section-label">Explanation</span>
                <div className="history-section-md md">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.ai_response}</ReactMarkdown>
                </div>
              </div>
            </>
          )}

          <div className="history-meta-row">
            <span className="history-model">{entry.model_name}</span>
            <span className="history-date">{fmtDate(entry.created_at)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [dashTab, setDashTab] = useState('analytics')

  // Analytics state
  const [period, setPeriod]   = useState(30)
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  // History state
  const [knownRepos, setKnownRepos]         = useState([])
  const [loadingRepos, setLoadingRepos]     = useState(false)
  const [selectedRepo, setSelectedRepo]     = useState(null)
  const [history, setHistory]               = useState(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyError, setHistoryError]     = useState('')
  const [typeFilter, setTypeFilter]         = useState('all')

  // Repo hover preview (Top Repos + History sidebar)
  const [repoHover, setRepoHover] = useState(null)
  const hoverTimerRef = useRef(null)
  const hideTimerRef = useRef(null)
  const activeHoverRepoRef = useRef(null)
  const overviewCacheRef = useRef(new Map())

  const cancelRepoHoverClose = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const scheduleRepoHoverClose = useCallback(() => {
    cancelRepoHoverClose()
    hideTimerRef.current = setTimeout(() => {
      activeHoverRepoRef.current = null
      setRepoHover(null)
      hideTimerRef.current = null
    }, 160)
  }, [cancelRepoHoverClose])

  const handleRepoHoverEnter = useCallback((repoUrl, anchorEl) => {
    cancelRepoHoverClose()
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    activeHoverRepoRef.current = repoUrl
    const rect = anchorEl.getBoundingClientRect()
    const cached = overviewCacheRef.current.get(repoUrl)
    if (cached) {
      setRepoHover({ rect, loading: false, error: null, overview: cached })
      return
    }
    hoverTimerRef.current = setTimeout(async () => {
      hoverTimerRef.current = null
      if (activeHoverRepoRef.current !== repoUrl) return
      setRepoHover({ rect, loading: true, error: null, overview: null })
      try {
        const overview = await getRepoOverview(repoUrl)
        if (activeHoverRepoRef.current !== repoUrl) return
        overviewCacheRef.current.set(repoUrl, overview)
        setRepoHover({ rect, loading: false, error: null, overview })
      } catch (err) {
        if (activeHoverRepoRef.current !== repoUrl) return
        setRepoHover({ rect, loading: false, error: err.message || 'Failed to load', overview: null })
      }
    }, 380)
  }, [cancelRepoHoverClose])

  const handleRepoHoverLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    scheduleRepoHoverClose()
  }, [scheduleRepoHoverClose])

  useEffect(() => {
    setRepoHover(null)
    activeHoverRepoRef.current = null
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hoverTimerRef.current = null
    hideTimerRef.current = null
  }, [dashTab])

  // Load analytics
  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await getAnalytics(period))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { loadAnalytics() }, [loadAnalytics])

  // Load known repos when switching to history tab
  useEffect(() => {
    if (dashTab !== 'history' || knownRepos.length > 0) return
    setLoadingRepos(true)
    getKnownRepos()
      .then(d => setKnownRepos(d.repos))
      .catch(() => {})
      .finally(() => setLoadingRepos(false))
  }, [dashTab, knownRepos.length])

  // Load history for selected repo
  async function selectRepo(repo_url) {
    setSelectedRepo(repo_url)
    setHistory(null)
    setHistoryError('')
    setTypeFilter('all')
    setLoadingHistory(true)
    try {
      const d = await getRepoHistory(repo_url)
      setHistory(d)
    } catch (err) {
      setHistoryError(err.message)
    } finally {
      setLoadingHistory(false)
    }
  }

  const visibleEntries = history?.entries?.filter(
    e => typeFilter === 'all' || e.event_type === typeFilter
  ) ?? []

  const entryTypes = history
    ? [...new Set(history.entries.map(e => e.event_type))]
    : []

  return (
    <div className="page dashboard-page">
      {/* ── Top bar ── */}
      <div className="dashboard-header">
        <div className="dashboard-tab-row">
          <button
            className={`dash-tab-btn${dashTab === 'analytics' ? ' dash-tab-btn--active' : ''}`}
            onClick={() => setDashTab('analytics')}
          >
            Analytics
          </button>
          <button
            className={`dash-tab-btn${dashTab === 'history' ? ' dash-tab-btn--active' : ''}`}
            onClick={() => setDashTab('history')}
          >
            History
          </button>
        </div>

        {dashTab === 'analytics' && (
          <div className="period-tabs">
            {PERIODS.map(p => (
              <button
                key={p}
                className={'period-tab' + (period === p ? ' period-tab--active' : '')}
                onClick={() => setPeriod(p)}
              >
                {p}d
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Analytics tab ── */}
      {dashTab === 'analytics' && (
        <>
          {error && <div className="error-banner">{error}</div>}
          {loading && <p className="status-text">Loading analytics…</p>}
          {!loading && data && (
            <>
              <div className="stat-grid">
                <StatCard label="Total Events"       value={data.total_events.toLocaleString()} />
                <StatCard label="Security Scans"     value={data.security_scans.toLocaleString()} />
                <StatCard
                  label="High-Severity Findings"
                  value={data.high_severity_findings.toLocaleString()}
                  highlight={data.high_severity_findings > 0}
                />
              </div>
              <div className="dashboard-panels">
                <div className="panel">
                  <h2 className="panel-title">Events by Type</h2>
                  {data.events_by_type.length === 0
                    ? <p className="status-text">No events in this period.</p>
                    : data.events_by_type.map(e => (
                        <EventRow key={e.event_type} {...e} />
                      ))}
                </div>
                <div className="panel">
                  <h2 className="panel-title">Top Repositories</h2>
                  {data.top_repos.length === 0
                    ? <p className="status-text">No activity in this period.</p>
                    : data.top_repos.map((r, i) => (
                        <RepoRow
                          key={r.repo_url}
                          rank={i + 1}
                          {...r}
                          onRepoHoverEnter={handleRepoHoverEnter}
                          onRepoHoverLeave={handleRepoHoverLeave}
                        />
                      ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── History tab ── */}
      {dashTab === 'history' && (
        <div className="history-layout">
          {/* Repo list sidebar */}
          <div className="history-sidebar">
            <h2 className="panel-title" style={{ marginBottom: '0.75rem' }}>Repositories</h2>
            {loadingRepos && <p className="status-text">Loading…</p>}
            {!loadingRepos && knownRepos.length === 0 && (
              <p className="status-text">No history yet.</p>
            )}
            {knownRepos.map(r => {
              const name = githubRepoSlug(r.repo_url) || r.repo_url.replace(/^https?:\/\/github\.com\//i, '')
              return (
                <button
                  key={r.repo_url}
                  type="button"
                  className={`history-repo-btn${selectedRepo === r.repo_url ? ' history-repo-btn--active' : ''}`}
                  onClick={() => selectRepo(r.repo_url)}
                  title={r.repo_url}
                  onMouseEnter={(e) => handleRepoHoverEnter(r.repo_url, e.currentTarget)}
                  onMouseLeave={handleRepoHoverLeave}
                >
                  <span className="history-repo-name">{name}</span>
                  <div className="history-repo-meta">
                    <span className="history-repo-count">{r.event_count} events</span>
                    <span className="history-repo-time">{timeAgo(r.last_activity)}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Timeline panel */}
          <div className="history-timeline-panel">
            {!selectedRepo && (
              <div className="history-empty">
                <p>Select a repository to see its history.</p>
              </div>
            )}

            {selectedRepo && loadingHistory && (
              <p className="status-text">Loading history…</p>
            )}

            {selectedRepo && historyError && (
              <div className="error-banner">{historyError}</div>
            )}

            {history && !loadingHistory && (
              <>
                <div className="history-timeline-header">
                  <span className="history-timeline-title">
                    <a
                      className="history-timeline-repo-link"
                      href={githubRepoWebUrl(selectedRepo)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {githubRepoSlug(selectedRepo)}
                    </a>
                    <span className="history-total-badge">{history.total}</span>
                  </span>
                  <div className="history-filter-row">
                    <button
                      className={`history-filter-btn${typeFilter === 'all' ? ' history-filter-btn--active' : ''}`}
                      onClick={() => setTypeFilter('all')}
                    >All</button>
                    {entryTypes.map(t => (
                      <button
                        key={t}
                        className={`history-filter-btn ${eventMeta(t).cls}${typeFilter === t ? ' history-filter-btn--active' : ''}`}
                        onClick={() => setTypeFilter(t)}
                      >
                        {eventMeta(t).label}
                      </button>
                    ))}
                  </div>
                </div>

                {visibleEntries.length === 0 ? (
                  <p className="status-text">No entries match this filter.</p>
                ) : (
                  <div className="history-timeline">
                    {visibleEntries.map(e => (
                      <HistoryEntry key={e.id} entry={e} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <RepoHoverPopover
        state={repoHover}
        onMouseEnter={cancelRepoHoverClose}
        onMouseLeave={handleRepoHoverLeave}
      />
    </div>
  )
}
