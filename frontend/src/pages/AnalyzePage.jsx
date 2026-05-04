import ThinkingDots from '../components/ThinkingDots'
import FileTree from '../components/FileTree'
import FindingsPanel from '../components/FindingsPanel'
import RepoOverviewCard from '../components/RepoOverviewCard'
import { githubRepoSlug, githubRepoWebUrl } from '../utils/githubRepoUrl'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'compare',  label: 'Compare' },
  { id: 'review',   label: 'Review'  },
]

export default function AnalyzePage({
  repoUrl,
  setRepoUrl,
  overview,
  summary,
  loadingOverview,
  loadingSummary,
  overviewError,
  activeTab,
  setActiveTab,
  compareUrl,
  setCompareUrl,
  compareGoals,
  setCompareGoals,
  compareResult,
  loadingCompare,
  compareError,
  reviewType,
  setReviewType,
  reviewResults,
  selectedFile,
  setSelectedFile,
  handleLoad,
  handleCompare,
  handleReview,
  findings,
  activeReviewError,
  activeReviewLoading,
  selectedReviewFile,
  setSelectedReviewFile,
}) {
  return (
    <div className="analyze-page">
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
                        ? `Security: ${reviewResults.security.finding_count}, Code quality: ${reviewResults.technical.finding_count}`
                        : (reviewResults.security
                          ? `Security: ${reviewResults.security.finding_count}`
                          : `Code quality: ${reviewResults.technical.finding_count}`)
                    }
                  >
                    {(reviewResults.security?.finding_count ?? 0) + (reviewResults.technical?.finding_count ?? 0)}
                  </span>
                )}
              </button>
            ))}
          </div>

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

          {activeTab === 'compare' && (
            <div className="analyze-tab-content">
              <div className="compare-section">
                <p className="compare-intro">
                  See how another repository lines up with yours before you commit to adopting or forking it.
                </p>
                <div className="compare-repos-row">
                  <div className="compare-repo-chip">
                    <span className="compare-repo-label">Repo A</span>
                    <a
                      className="compare-repo-name"
                      href={githubRepoWebUrl(overview.repo_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {overview.name}
                    </a>
                  </div>
                  <span className="compare-vs">vs</span>
                  <div className="compare-repo-chip compare-repo-chip--b">
                    <span className="compare-repo-label">Repo B</span>
                    {compareUrl ? (
                      <a
                        className="compare-repo-name"
                        href={githubRepoWebUrl(compareUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {githubRepoSlug(compareUrl) || compareUrl}
                      </a>
                    ) : (
                      <span className="compare-repo-placeholder">not set</span>
                    )}
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
                    placeholder="e.g. I need a small logging library to embed in my CLI"
                    value={compareGoals}
                    onChange={e => setCompareGoals(e.target.value)}
                  />
                  <p className="compare-goals-hint">
                    Optional context helps the model focus—mention constraints (language, size, license, runtime).
                  </p>
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
                          <a
                            className="compare-repo-meta-name"
                            href={githubRepoWebUrl(r.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {r.name}
                          </a>
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

          {activeTab === 'review' && (
            <div className="analyze-tab-content analyze-review-content">
              <p className="review-intro">
                {reviewType === 'security' ? (
                  <>
                    <strong>Security</strong> looks for vulnerabilities and unsafe patterns based on the code we can see in context.
                  </>
                ) : (
                  <>
                    <strong>Code quality</strong> looks for bugs, brittle logic, error-handling gaps, and maintainability issues - not security claims.
                  </>
                )}
              </p>
              <div className="review-controls">
                <div className="review-type-toggle">
                  <button
                    type="button"
                    className={`review-toggle-btn${reviewType === 'security' ? ' review-toggle-btn--active' : ''}`}
                    onClick={() => setReviewType('security')}
                  >
                    Security
                  </button>
                  <button
                    type="button"
                    className={`review-toggle-btn${reviewType === 'technical' ? ' review-toggle-btn--active' : ''}`}
                    onClick={() => setReviewType('technical')}
                    title="Bugs, logic, and maintainability"
                  >
                    Code quality
                  </button>
                </div>
                <button
                  type="button"
                  className="btn"
                  onClick={handleReview}
                  disabled={activeReviewLoading}
                >
                  {activeReviewLoading
                    ? <ThinkingDots label={reviewType === 'security' ? 'Scanning' : 'Reviewing'} />
                    : (reviewType === 'security' ? 'Run security scan' : 'Run code quality review')}
                </button>
              </div>

              {activeReviewError && <div className="error-banner">{activeReviewError}</div>}

              {activeReviewLoading && (
                <div className="analyze-loading">
                  <ThinkingDots label={reviewType === 'security' ? 'Scanning for security issues' : 'Reviewing for bugs and code quality'} />
                </div>
              )}

              {reviewResults[reviewType] && (
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

      {!overview && !loadingOverview && (
        <div className="analyze-empty">
          <p>Enter a GitHub repository URL and click <strong>Load</strong> to get started.</p>
          <p className="analyze-empty-sub">
            Then explore the tree, compare against another repo, or run a security or code-quality review.
          </p>
        </div>
      )}
    </div>
  )
}
