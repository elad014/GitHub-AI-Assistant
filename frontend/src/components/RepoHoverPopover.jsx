import { createPortal } from 'react-dom'
import { githubRepoWebUrl } from '../utils/githubRepoUrl'

function popoverStyle(rect) {
  const width = 300
  const margin = 10
  let left = rect.right + margin
  if (left + width > window.innerWidth - 8) {
    left = Math.max(8, rect.left - width - margin)
  }
  let top = rect.top
  const maxH = Math.min(320, window.innerHeight - 16)
  if (top + maxH > window.innerHeight - 8) {
    top = Math.max(8, window.innerHeight - maxH - 8)
  }
  return {
    position: 'fixed',
    left,
    top,
    width,
    maxHeight: maxH,
    zIndex: 10000,
  }
}

/**
 * @param {{ rect: DOMRect, loading: boolean, error: string | null, overview: object | null } | null} state
 */
export default function RepoHoverPopover({ state, onMouseEnter, onMouseLeave }) {
  if (!state?.rect) return null

  const { loading, error, overview } = state

  return createPortal(
    <div
      className="repo-hover-popover"
      style={popoverStyle(state.rect)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="region"
      aria-label="Repository preview"
    >
      {loading && <p className="repo-hover-popover-status">Loading overview…</p>}
      {error && <p className="repo-hover-popover-error">{error}</p>}
      {!loading && !error && overview && (
        <>
          <a
            className="repo-hover-popover-name"
            href={githubRepoWebUrl(overview.repo_url)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {overview.name}
          </a>
          <div className="repo-hover-popover-meta">
            {overview.language && (
              <span className="overview-badge overview-badge--lang">{overview.language}</span>
            )}
            <span className="overview-meta-item">★ {overview.stars?.toLocaleString?.() ?? overview.stars}</span>
            <span className="overview-meta-item">{overview.file_count} files</span>
          </div>
          {overview.description && (
            <p className="repo-hover-popover-desc">{overview.description}</p>
          )}
        </>
      )}
    </div>,
    document.body,
  )
}
