import { useCallback, useEffect, useState } from 'react'
import { getAnalytics } from '../api/client'

const PERIODS = [7, 30, 90]

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

function RepoRow({ repo_url, count, rank }) {
  const name = repo_url.replace('https://github.com/', '')
  return (
    <div className="table-row">
      <span className="row-rank">{rank}</span>
      <span className="row-repo" title={repo_url}>{name}</span>
      <span className="row-count">{count.toLocaleString()}</span>
    </div>
  )
}

export default function DashboardPage() {
  const [period, setPeriod] = useState(30)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
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

  useEffect(() => { load() }, [load])

  return (
    <div className="page dashboard-page">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Analytics</h1>
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
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading && <p className="status-text">Loading analytics...</p>}

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
                  ))
              }
            </div>

            <div className="panel">
              <h2 className="panel-title">Top Repositories</h2>
              {data.top_repos.length === 0
                ? <p className="status-text">No activity in this period.</p>
                : data.top_repos.map((r, i) => (
                    <RepoRow key={r.repo_url} rank={i + 1} {...r} />
                  ))
              }
            </div>
          </div>
        </>
      )}
    </div>
  )
}
