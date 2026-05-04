import { useLayoutEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import GeneratingCycle from './GeneratingCycle'
import { githubRepoWebUrl } from '../utils/githubRepoUrl'
import { readmeExcerptForMarkdown } from '../utils/readmeExcerptForMarkdown'

/** ~5 lines of prose at root font size (matches `.overview-readme-md--collapsed` max-height). */
const README_COLLAPSED_REM = 7.75

function ReadmeExcerptBlock({ excerpt }) {
  const mdRef = useRef(null)
  const [expanded, setExpanded] = useState(false)
  const [needsToggle, setNeedsToggle] = useState(false)

  useLayoutEffect(() => {
    setExpanded(false)
  }, [excerpt])

  useLayoutEffect(() => {
    const el = mdRef.current
    if (!el || !excerpt) {
      setNeedsToggle(false)
      return
    }
    const measure = () => {
      const rootRem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      const maxPx = README_COLLAPSED_REM * rootRem
      setNeedsToggle(el.scrollHeight > maxPx + 10)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [excerpt])

  const collapsed = needsToggle && !expanded

  return (
    <div className="overview-readme">
      <span className="overview-section-label">README (excerpt)</span>
      <div
        className={
          'overview-readme-shell' +
          (needsToggle ? ' overview-readme-shell--interactive' : '') +
          (collapsed ? ' overview-readme-shell--collapsed' : '')
        }
        role={needsToggle ? 'button' : undefined}
        tabIndex={needsToggle ? 0 : undefined}
        aria-expanded={needsToggle ? expanded : undefined}
        onClick={e => {
          if (!needsToggle) return
          if (e.target.closest('a, button')) return
          setExpanded(v => !v)
        }}
        onKeyDown={e => {
          if (!needsToggle) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded(x => !x)
          }
        }}
      >
        <div className="overview-readme-md-wrap">
          <div
            ref={mdRef}
            className={'overview-readme-md md' + (collapsed ? ' overview-readme-md--collapsed' : '')}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {readmeExcerptForMarkdown(excerpt)}
            </ReactMarkdown>
          </div>
          {collapsed && <div className="overview-readme-fade" aria-hidden />}
        </div>
        {needsToggle && (
          <span className="overview-readme-toggle-hint">
            {expanded ? 'Click to collapse' : 'Click to show full excerpt'}
          </span>
        )}
      </div>
    </div>
  )
}

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
            href={githubRepoWebUrl(overview.repo_url)}
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
        <ReadmeExcerptBlock excerpt={overview.readme_excerpt} />
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
          <GeneratingCycle />
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
