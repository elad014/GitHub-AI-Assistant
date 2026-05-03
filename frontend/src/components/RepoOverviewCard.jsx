import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function RepoOverviewCard({ overview, summary, loadingSummary }) {
  return (
    <div className="overview-card">
      {overview?.opengraph_image_url && (
        <div className="overview-banner">
          <img
            className="overview-banner-img"
            src={overview.opengraph_image_url}
            alt=""
            loading="lazy"
          />
          <div className="overview-banner-fade" />
        </div>
      )}
      <div className="overview-card-header">
        <div className="overview-card-title">
          <a
            className="overview-repo-name"
            href={overview.repo_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {overview.name}
          </a>
          {overview.language && (
            <span className="overview-badge overview-badge--lang">{overview.language}</span>
          )}
        </div>
        <div className="overview-card-meta">
          <span className="overview-meta-item">★ {overview.stars.toLocaleString()}</span>
          <span className="overview-meta-item">{overview.file_count} files</span>
        </div>
      </div>

      {overview.description && (
        <p className="overview-description">{overview.description}</p>
      )}

      {overview.readme_excerpt && (
        <div className="overview-readme">
          <span className="overview-section-label">README (excerpt)</span>
          <div className="overview-readme-md md">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{overview.readme_excerpt}</ReactMarkdown>
          </div>
        </div>
      )}

      {overview.key_files.length > 0 && (
        <div className="overview-key-files">
          <span className="overview-section-label">Key files</span>
          <div className="key-files-list">
            {overview.key_files.map(f => (
              <span key={f} className="key-file-tag">{f}</span>
            ))}
          </div>
        </div>
      )}

      <div className="overview-summary">
        <span className="overview-section-label">AI Summary</span>
        {loadingSummary ? (
          <div className="overview-summary-loading">
            <span className="thinking-dots">Generating summary<span className="thinking-dots-trail">…</span></span>
          </div>
        ) : summary ? (
          <div className="overview-summary-md md">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary.summary}</ReactMarkdown>
          </div>
        ) : (
          <p className="overview-summary-placeholder">Summary not yet loaded.</p>
        )}
      </div>
    </div>
  )
}
