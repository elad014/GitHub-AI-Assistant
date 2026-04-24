import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ThinkingDots from '../components/ThinkingDots'
import { streamChatMessage } from '../api/client'

export default function ChatPage({
  repoUrl, setRepoUrl,
  userName, setUserName,
  activeRepo, setActiveRepo,
  messages, setMessages,
}) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function loadRepo(e) {
    e.preventDefault()
    if (!userName.trim()) {
      setError('Please enter your name before loading a repository.')
      return
    }
    const trimmed = repoUrl.trim()
    if (!trimmed) return
    setActiveRepo(trimmed)
    setMessages([])
    setError('')
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
        <p className="status-text">
          Repository: {activeRepo}
        </p>
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
