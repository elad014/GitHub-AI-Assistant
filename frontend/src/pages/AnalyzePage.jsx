import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ThinkingDots from '../components/ThinkingDots'
import { analyzeRepo } from '../api/client'

export default function AnalyzePage() {
  const [repoUrl, setRepoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = repoUrl.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const data = await analyzeRepo(trimmed)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <form className="repo-bar" onSubmit={handleSubmit}>
        <input
          className="input-url"
          type="url"
          placeholder="https://github.com/owner/repo"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          required
        />
        <button className="btn" type="submit" disabled={loading}>
          {loading ? <ThinkingDots label="Analyzing" /> : 'Analyze'}
        </button>
      </form>

      {loading && (
        <div className="analyze-loading">
          <ThinkingDots label="Analyzing repository" />
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      {result && (
        <div className="analyze-result">
          <div className="result-header">
            <span className="result-name">{result.name}</span>
            <div className="result-meta">
              {result.language && <span>{result.language}</span>}
              <span>{result.stars.toLocaleString()} stars</span>
              <span>{result.file_count} files</span>
            </div>
          </div>

          <div className="result-body">
            {result.description && (
              <div className="result-section">
                <h3>Description</h3>
                <p>{result.description}</p>
              </div>
            )}

            <div className="result-section">
              <h3>AI Summary</h3>
              <div className="md">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {result.summary}
                </ReactMarkdown>
              </div>
            </div>

            {result.key_files.length > 0 && (
              <div className="result-section">
                <h3>Key Files</h3>
                <ul className="key-files-list">
                  {result.key_files.map((f) => (
                    <li key={f} className="key-file-tag">{f}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
