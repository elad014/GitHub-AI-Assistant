import { useState } from 'react'
import ThinkingDots from '../components/ThinkingDots'
import FileTree from '../components/FileTree'
import FindingsPanel from '../components/FindingsPanel'
import RepoOverviewCard from '../components/RepoOverviewCard'
import {
  analyzeRepo,
  compareRepos,
  getRepoOverview,
  reviewSecurity,
  reviewTechnical,
} from '../api/client'
import { isValidGitHubUrl } from '../utils/validateGitHubUrl'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'compare',  label: 'Compare' },
  { id: 'review',   label: 'Review'  },
]

export default function AnalyzePage() {
  const [repoUrl, setRepoUrl]               = useState('')
  const [overview, setOverview]             = useState(null)
  const [summary, setSummary]               = useState(null)
  const [loadingOverview, setLoadingOverview] = useState(false)
  const [loadingSummary, setLoadingSummary]   = useState(false)
  const [overviewError, setOverviewError]   = useState('')
  const [activeTab, setActiveTab]           = useState('overview')

  // Compare state
  const [compareUrl, setCompareUrl]         = useState('')
  const [compareGoals, setCompareGoals]     = useState('')
  const [compareResult, setCompareResult]   = useState(null)
  const [loadingCompare, setLoadingCompare] = useState(false)
  const [compareError, setCompareError]     = useState('')

  // Review state
  const [reviewType, setReviewType]         = useState('security')
  const [reviewResults, setReviewResults]   = useState({ security: null, technical: null })
  const [loadingReview, setLoadingReview]   = useState({ security: false, technical: false })
  const [reviewErrors, setReviewErrors]     = useState({ security: '', technical: '' })
  const [selectedFileByReview, setSelectedFileByReview] = useState({ security: null, technical: null })

  // Shared file selection (tree ↔ findings panel)
  const [selectedFile, setSelectedFile]     = useState(null)

  async function handleLoad(e) {
    e.preventDefault()
    const url = repoUrl.trim()
    if (!url || loadingOverview) return
    if (!isValidGitHubUrl(url)) {
      setOverviewError('Please enter a valid GitHub repository URL, e.g. https://github.com/owner/repo')
      return
    }

    setLoadingOverview(true)
    setOverviewError('')
    setOverview(null)
    setSummary(null)
    setReviewResults({ security: null, technical: null })
    setReviewErrors({ security: '', technical: '' })
    setLoadingReview({ security: false, technical: false })
    setSelectedFileByReview({ security: null, technical: null })
    setCompareResult(null)
    setSelectedFile(null)
    setActiveTab('overview')

    try {
      const data = await getRepoOverview(url)
      setOverview(data)
      // Kick off AI summary in the background — doesn't block tree render
      setLoadingSummary(true)
      analyzeRepo(url)
        .then(s => setSummary(s))
        .catch(() => {})
        .finally(() => setLoadingSummary(false))
    } catch (err) {
      setOverviewError(err.message)
    } finally {
      setLoadingOverview(false)
    }
  }

  async function handleCompare(e) {
    e.preventDefault()
    const urlB = compareUrl.trim()
    if (!urlB || loadingCompare) return

    setLoadingCompare(true)
    setCompareError('')
    setCompareResult(null)

    try {
      const data = await compareRepos(repoUrl.trim(), urlB, compareGoals.trim())
      setCompareResult(data)
    } catch (err) {
      setCompareError(err.message)
    } finally {
      setLoadingCompare(false)
    }
  }

  async function handleReview() {
    if (loadingReview[reviewType]) return
    setLoadingReview(prev => ({ ...prev, [reviewType]: true }))
    setReviewErrors(prev => ({ ...prev, [reviewType]: '' }))
    setSelectedFileByReview(prev => ({ ...prev, [reviewType]: null }))

    try {
      const fn = reviewType === 'security' ? reviewSecurity : reviewTechnical
      const data = await fn(repoUrl.trim())
      setReviewResults(prev => ({ ...prev, [reviewType]: data }))
    } catch (err) {
      setReviewErrors(prev => ({ ...prev, [reviewType]: err.message }))
    } finally {
      setLoadingReview(prev => ({ ...prev, [reviewType]: false }))
    }
  }

  const activeReviewResult = reviewResults[reviewType]
  const findings = activeReviewResult?.findings ?? []
  const activeReviewError = reviewErrors[reviewType]
  const activeReviewLoading = loadingReview[reviewType]
  const selectedReviewFile = selectedFileByReview[reviewType]
  function setSelectedReviewFile(path) {
    setSelectedFileByReview(prev => ({ ...prev, [reviewType]: path }))
  }

  return (
    <div className="analyze-page">
      {/* ── URL bar ── */}
      <div className="analyze-url-bar">
        <form className="repo-bar" onSubmit={handleLoad}>
          <input
            className="input-url"
            type="url"
            placeholder="https://github.com/owner/repo"
            value={repoUrl}
            onChange={e => setRepoUrl(e.target.value)}
            required
          />
          <button className="btn" type="submit" disabled={loadingOverview}>
            {loadingOverview ? <ThinkingDots label="Loading" /> : 'Load'}
          </button>
        </form>
        {overviewError && <div className="error-banner">{overviewError}</div>}
      </div>

      {/* ── Tabs (only show after repo is loaded) ── */}
      {overview && (
        <>
          <div className="analyze-tabs">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`analyze-tab${activeTab === t.id ? ' analyze-tab--active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
                {t.id === 'review' && (reviewResults.security || reviewResults.technical) && (
                  <span
                    className={
                      'tab-badge' +
                      ((reviewResults.security?.has_high_severity || reviewResults.technical?.has_high_severity) ? ' tab-badge--high' : '')
                    }
                    title={
                      reviewResults.security && reviewResults.technical
                        ? `Security: ${reviewResults.security.finding_count}, Technical: ${reviewResults.technical.finding_count}`
                        : (reviewResults.security ? `Security: ${reviewResults.security.finding_count}` : `Technical: ${reviewResults.technical.finding_count}`)
                    }
                  >
                    {(reviewResults.security?.finding_count ?? 0) + (reviewResults.technical?.finding_count ?? 0)}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Overview tab ── */}
          {activeTab === 'overview' && (
            <div className="analyze-tab-content">
              <RepoOverviewCard
                overview={overview}
                summary={summary}
                loadingSummary={loadingSummary}
              />
              <div className="analyze-tree-wrapper">
                <FileTree
                  paths={overview.paths}
                  findings={[]}
                  selectedFile={selectedFile}
                  onSelectFile={setSelectedFile}
                />
              </div>
            </div>
          )}

          {/* ── Compare tab ── */}
          {activeTab === 'compare' && (
            <div className="analyze-tab-content">
              <div className="compare-section">
                <div className="compare-repos-row">
                  <div className="compare-repo-chip">
                    <span className="compare-repo-label">Repo A</span>
                    <code className="compare-repo-name">{overview.name}</code>
                  </div>
                  <span className="compare-vs">vs</span>
                  <div className="compare-repo-chip compare-repo-chip--b">
                    <span className="compare-repo-label">Repo B</span>
                    <span className="compare-repo-placeholder">
                      {compareUrl || 'not set'}
                    </span>
                  </div>
                </div>

                <form className="compare-form" onSubmit={handleCompare}>
                  <input
                    className="input-url"
                    type="url"
                    placeholder="https://github.com/owner/other-repo"
                    value={compareUrl}
                    onChange={e => setCompareUrl(e.target.value)}
                    required
                  />
                  <input
                    className="input-url compare-goals-input"
                    type="text"
                    placeholder="Optional: describe your integration goals…"
                    value={compareGoals}
                    onChange={e => setCompareGoals(e.target.value)}
                  />
                  <button className="btn" type="submit" disabled={loadingCompare}>
                    {loadingCompare ? <ThinkingDots label="Comparing" /> : 'Compare'}
                  </button>
                </form>

                {compareError && <div className="error-banner">{compareError}</div>}

                {loadingCompare && (
                  <div className="analyze-loading">
                    <ThinkingDots label="Analysing both repositories" />
                  </div>
                )}

                {compareResult && (
                  <div className="compare-result">
                    <div className="compare-verdict">
                      <span className="compare-verdict-label">Verdict</span>
                      <p className="compare-verdict-text">{compareResult.verdict}</p>
                    </div>
                    <div className="compare-repo-metas">
                      {[compareResult.repo_a, compareResult.repo_b].map((r, i) => (
                        <div key={i} className="compare-repo-meta-card">
                          <span className="compare-repo-meta-name">{r.name}</span>
                          <div className="compare-repo-meta-row">
                            {r.language && <span className="overview-badge overview-badge--lang">{r.language}</span>}
                            <span className="overview-meta-item">★ {r.stars.toLocaleString()}</span>
                          </div>
                          {r.description && <p className="compare-repo-meta-desc">{r.description}</p>}
                        </div>
                      ))}
                    </div>
                    <div className="compare-sections">
                      {compareResult.sections.map((s, i) => (
                        <div key={i} className="compare-section-item">
                          <h4 className="compare-section-title">{s.title}</h4>
                          <p className="compare-section-content">{s.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Review tab ── */}
          {activeTab === 'review' && (
            <div className="analyze-tab-content analyze-review-content">
              <div className="review-controls">
                <div className="review-type-toggle">
                  <button
                    className={`review-toggle-btn${reviewType === 'security' ? ' review-toggle-btn--active' : ''}`}
                    onClick={() => setReviewType('security')}
                  >
                    Security
                  </button>
                  <button
                    className={`review-toggle-btn${reviewType === 'technical' ? ' review-toggle-btn--active' : ''}`}
                    onClick={() => setReviewType('technical')}
                  >
                    Technical
                  </button>
                </div>
                <button
                  className="btn"
                  onClick={handleReview}
                  disabled={activeReviewLoading}
                >
                  {activeReviewLoading
                    ? <ThinkingDots label={reviewType === 'security' ? 'Scanning' : 'Reviewing'} />
                    : `Run ${reviewType === 'security' ? 'Security Scan' : 'Technical Review'}`}
                </button>
              </div>

              {activeReviewError && <div className="error-banner">{activeReviewError}</div>}

              {activeReviewLoading && (
                <div className="analyze-loading">
                  <ThinkingDots label={reviewType === 'security' ? 'Scanning for security issues' : 'Reviewing for technical bugs'} />
                </div>
              )}

              {activeReviewResult && (
                <div className="review-split">
                  <div className="review-tree-col">
                    <FileTree
                      paths={overview.paths}
                      findings={findings}
                      selectedFile={selectedReviewFile}
                      onSelectFile={setSelectedReviewFile}
                    />
                  </div>
                  <div className="review-findings-col">
                    <FindingsPanel
                      findings={findings}
                      selectedFile={selectedReviewFile}
                      onSelectFile={setSelectedReviewFile}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Empty state ── */}
      {!overview && !loadingOverview && (
        <div className="analyze-empty">
          <p>Enter a GitHub repository URL and click <strong>Load</strong> to get started.</p>
          <p className="analyze-empty-sub">
            Once loaded you can explore the file tree, compare it with another repo, or run a security / technical review.
          </p>
        </div>
      )}
    </div>
  )
}
