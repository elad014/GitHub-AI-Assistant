import { useState } from 'react'

const SEV_LABEL = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' }
const SEV_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 }

function SeverityBadge({ severity }) {
  const s = severity?.toUpperCase()
  return (
    <span className={`sev-badge sev-badge--${s?.toLowerCase() ?? 'low'}`}>
      {SEV_LABEL[s] ?? severity}
    </span>
  )
}

function FindingCard({ finding, isOpen, onToggle, onSelectFile }) {
  return (
    <div
      className={`finding-card finding-card--${finding.severity?.toLowerCase()}`}
      onClick={onToggle}
    >
      <div className="finding-card-header">
        <SeverityBadge severity={finding.severity} />
        <span className="finding-title">{finding.title}</span>
        {finding.file_path && (
          <button
            className="finding-file-link"
            onClick={e => { e.stopPropagation(); onSelectFile(finding.file_path) }}
            title="Highlight in tree"
          >
            {finding.file_path.split('/').pop()}
          </button>
        )}
        <span className="finding-chevron">{isOpen ? '▾' : '▸'}</span>
      </div>
      {isOpen && (
        <div className="finding-card-body">
          {finding.file_path && (
            <div className="finding-meta">
              <span className="finding-meta-label">File</span>
              <code className="finding-meta-value">{finding.file_path}</code>
              {finding.line_start && (
                <code className="finding-meta-value">
                  L{finding.line_start}{finding.line_end ? `–${finding.line_end}` : ''}
                </code>
              )}
            </div>
          )}
          <div className="finding-section">
            <span className="finding-section-label">Issue</span>
            <p className="finding-section-text">{finding.description}</p>
          </div>
          <div className="finding-section">
            <span className="finding-section-label">Recommendation</span>
            <p className="finding-section-text finding-recommendation">{finding.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function FindingsPanel({ findings = [], selectedFile, onSelectFile }) {
  const [openIdx, setOpenIdx] = useState(null)
  const [filterSev, setFilterSev] = useState('ALL')

  const displayed = findings
    .filter(f => filterSev === 'ALL' || f.severity?.toUpperCase() === filterSev)
    .filter(f => !selectedFile || f.file_path === selectedFile)
    .sort((a, b) => (SEV_ORDER[a.severity?.toUpperCase()] ?? 3) - (SEV_ORDER[b.severity?.toUpperCase()] ?? 3))

  const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 }
  for (const f of findings) counts[f.severity?.toUpperCase()] = (counts[f.severity?.toUpperCase()] ?? 0) + 1

  return (
    <div className="findings-panel">
      <div className="findings-panel-header">
        <span className="findings-panel-title">
          {selectedFile ? (
            <>
              <button className="findings-back-btn" onClick={() => onSelectFile(null)}>←</button>
              <code className="findings-file-name">{selectedFile.split('/').pop()}</code>
            </>
          ) : (
            <>Findings <span className="findings-total-badge">{findings.length}</span></>
          )}
        </span>
        <div className="findings-filter-row">
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(s => (
            <button
              key={s}
              className={`findings-filter-btn${filterSev === s ? ' findings-filter-btn--active' : ''}`}
              onClick={() => setFilterSev(s)}
            >
              {s === 'ALL' ? 'All' : s}
              {s !== 'ALL' && counts[s] ? <span className="filter-count">{counts[s]}</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="findings-list">
        {displayed.length === 0 ? (
          <div className="findings-empty">
            {selectedFile ? 'No findings for this file.' : 'No findings match the current filter.'}
          </div>
        ) : (
          displayed.map((f, i) => (
            <FindingCard
              key={i}
              finding={f}
              isOpen={openIdx === i}
              onToggle={() => setOpenIdx(openIdx === i ? null : i)}
              onSelectFile={onSelectFile}
            />
          ))
        )}
      </div>
    </div>
  )
}
