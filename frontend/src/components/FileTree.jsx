import { useMemo, useState } from 'react'

const SEVERITY_RANK = { HIGH: 3, MEDIUM: 2, LOW: 1 }

const SEV_COLOR = {
  HIGH:   'var(--sev-high)',
  MEDIUM: 'var(--sev-medium)',
  LOW:    'var(--sev-low)',
}

function buildTree(paths) {
  const root = { children: new Map() }
  for (const path of paths) {
    const parts = path.split('/')
    let node = root
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      const dirPath = parts.slice(0, i + 1).join('/')
      if (!node.children.has(part)) {
        node.children.set(part, { type: 'dir', name: part, dirPath, children: new Map() })
      }
      node = node.children.get(part)
    }
    const filename = parts[parts.length - 1]
    node.children.set(filename, { type: 'file', name: filename, path })
  }
  return root
}

function buildSeverityMap(findings) {
  const map = {}
  for (const f of findings) {
    if (!f.file_path) continue
    const sev = f.severity?.toUpperCase()
    const existing = map[f.file_path]
    if (!existing || (SEVERITY_RANK[sev] ?? 0) > (SEVERITY_RANK[existing] ?? 0)) {
      map[f.file_path] = sev
    }
  }
  return map
}

function dirMaxSeverity(node, severityMap) {
  let max = 0
  let maxSev = null
  for (const child of node.children.values()) {
    let sev
    if (child.type === 'file') {
      sev = severityMap[child.path]
    } else {
      sev = dirMaxSeverity(child, severityMap)
    }
    const rank = SEVERITY_RANK[sev] ?? 0
    if (rank > max) { max = rank; maxSev = sev }
  }
  return maxSev
}

function SeverityDot({ severity }) {
  if (!severity) return null
  return (
    <span
      className="tree-sev-dot"
      style={{ background: SEV_COLOR[severity] }}
      title={severity}
    />
  )
}

function TreeNode({ node, depth, expanded, onToggle, severityMap, selectedFile, onSelectFile }) {
  if (node.type === 'file') {
    const sev = severityMap[node.path]
    const isSelected = node.path === selectedFile
    return (
      <div
        className={`tree-item tree-file${isSelected ? ' tree-item--selected' : ''}`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={() => onSelectFile(isSelected ? null : node.path)}
        title={node.path}
      >
        <span className="tree-icon">
          {sev ? <SeverityDot severity={sev} /> : <span className="tree-file-icon">◦</span>}
        </span>
        <span className="tree-label">{node.name}</span>
      </div>
    )
  }

  const isOpen = expanded.has(node.dirPath)
  const dirSev = dirMaxSeverity(node, severityMap)

  return (
    <div className="tree-dir-group">
      <div
        className="tree-item tree-dir"
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={() => onToggle(node.dirPath)}
      >
        <span className="tree-icon tree-chevron">{isOpen ? '▾' : '▸'}</span>
        <span className="tree-label">{node.name}</span>
        {dirSev && <SeverityDot severity={dirSev} />}
        <span className="tree-count">{node.children.size}</span>
      </div>
      {isOpen && (
        <div className="tree-children">
          {[...node.children.values()].map(child => (
            <TreeNode
              key={child.type === 'dir' ? child.dirPath : child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              severityMap={severityMap}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function FileTree({ paths = [], findings = [], selectedFile, onSelectFile }) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(new Set())

  const severityMap = useMemo(() => buildSeverityMap(findings), [findings])

  const filteredPaths = useMemo(() => {
    if (!search.trim()) return paths
    const q = search.toLowerCase()
    return paths.filter(p => p.toLowerCase().includes(q))
  }, [paths, search])

  const tree = useMemo(() => buildTree(filteredPaths), [filteredPaths])

  function toggleDir(dirPath) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(dirPath)) next.delete(dirPath)
      else next.add(dirPath)
      return next
    })
  }

  const findingsCount = findings.length
  const annotatedCount = Object.keys(severityMap).length

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <span className="file-tree-title">
          Files <span className="file-tree-count-badge">{paths.length}</span>
        </span>
        {findingsCount > 0 && (
          <span className="file-tree-findings-badge">
            {annotatedCount} flagged
          </span>
        )}
      </div>
      <div className="file-tree-search-row">
        <input
          className="file-tree-search"
          placeholder="Filter files…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="file-tree-clear" onClick={() => setSearch('')}>✕</button>
        )}
      </div>
      <div className="file-tree-body">
        {tree.children.size === 0 ? (
          <div className="file-tree-empty">No files match</div>
        ) : (
          [...tree.children.values()].map(child => (
            <TreeNode
              key={child.type === 'dir' ? child.dirPath : child.path}
              node={child}
              depth={0}
              expanded={expanded}
              onToggle={toggleDir}
              severityMap={severityMap}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
            />
          ))
        )}
      </div>
      {findingsCount > 0 && (
        <div className="file-tree-legend">
          <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--sev-high)' }} /> High</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--sev-medium)' }} /> Medium</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--sev-low)' }} /> Low</span>
        </div>
      )}
    </div>
  )
}
