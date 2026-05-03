import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ThinkingDots from '../components/ThinkingDots'
import { githubRepoWebUrl } from '../utils/githubRepoUrl'
import { getRepoOverview, streamChatMessage } from '../api/client'
import { isValidGitHubUrl } from '../utils/validateGitHubUrl'

function sameRepoUrl(a, b) {
  if (!a || !b) return false
  return String(a).replace(/\/$/, '') === String(b).replace(/\/$/, '')
}

export default function ChatPage({
  repoUrl, setRepoUrl,
  userName, setUserName,
  activeRepo, setActiveRepo,
  messages, setMessages,
  chatRepoOverview,
  setChatRepoOverview,
}) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Restore banner when returning to Chat: fetch overview whenever activeRepo has no matching overview
  useEffect(() => {
    if (!activeRepo?.trim()) {
      setChatRepoOverview(null)
      return
    }
    const u = activeRepo.trim()
    if (chatRepoOverview && sameRepoUrl(chatRepoOverview.repo_url, u)) return

    let cancelled = false
    getRepoOverview(u)
      .then(ov => { if (!cancelled) setChatRepoOverview(ov) })
      .catch(() => { if (!cancelled) setChatRepoOverview(null) })
    return () => { cancelled = true }
  }, [activeRepo, chatRepoOverview, setChatRepoOverview])

  function loadRepo(e) {
    e.preventDefault()
    if (!userName.trim()) {
      setError('Please enter your name before loading a repository.')
      return
    }
    const trimmed = repoUrl.trim()
    if (!trimmed) return
    if (!isValidGitHubUrl(trimmed)) {
      setError('Please enter a valid GitHub repository URL, e.g. https://github.com/owner/repo')
      return
    }
    setActiveRepo(trimmed)
    setMessages([])
    setError('')
    setChatRepoOverview(null)
  }

  async function handleSend(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || !activeRepo || loading) return

    const historySnapshot = messages
    const withUser = [...messages, { role: 'user', content: text }]
    setMessages([...withUser, { role: 'assistant', content: '' }])
    setInput('')
    setError('')
    setLoading(true)

    try {
      for await (const token of streamChatMessage(activeRepo, text, historySnapshot, userName.trim())) {
        setMessages(prev => {
          const copy = [...prev]
          const last = copy[copy.length - 1]
          copy[copy.length - 1] = { ...last, content: last.content + token }
          return copy
        })
      }
    } catch (err) {
      setError(err.message)
      setMessages(withUser)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e)
    }
  }

  return (
    <div className="page">
      <form className="repo-bar" onSubmit={loadRepo}>
        <input
          className="input-name"
          type="text"
          placeholder="Your name"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          aria-label="Your name"
        />
        <input
          className="input-url"
          type="url"
          placeholder="https://github.com/owner/repo"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          required
        />
        <button className="btn btn-secondary" type="submit" disabled={!userName.trim()}>
          Load repo
        </button>
      </form>

      {activeRepo && (
        <div className="chat-repo-banner">
          {chatRepoOverview?.opengraph_image_url && (
            <img className="chat-repo-banner-img" src={chatRepoOverview.opengraph_image_url} alt="" loading="lazy" />
          )}
          <div className="chat-repo-banner-meta">
            <p className="status-text">
              Repository:{' '}
              <a
                className="chat-repo-link"
                href={githubRepoWebUrl(chatRepoOverview?.repo_url ?? activeRepo)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {chatRepoOverview?.name ?? activeRepo}
              </a>
            </p>
            {chatRepoOverview?.description && (
              <p className="chat-repo-desc">{chatRepoOverview.description}</p>
            )}
          </div>
        </div>
      )}

      <div className="chat-window">
        {messages.length === 0 && !loading && (
          <div className="chat-empty">
            {activeRepo
              ? 'Ask anything about this repository'
              : 'Enter a repository URL above to start'}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <span className="message-role">
              {msg.role === 'user' ? 'You' : 'Assistant'}
            </span>
            <div className="message-bubble">
              {msg.role === 'assistant' ? (
                msg.content === '' && loading && i === messages.length - 1
                  ? <ThinkingDots label="Thinking" />
                  : <div className="md"><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown></div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form className="chat-input-row" onSubmit={handleSend}>
        <textarea
          className="input-message"
          placeholder={activeRepo ? 'Ask a question...' : 'Load a repository first'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!activeRepo || loading}
          rows={1}
        />
        <button
          className="btn"
          type="submit"
          disabled={!activeRepo || loading || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  )
}
