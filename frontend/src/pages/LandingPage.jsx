import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ThinkingDots from '../components/ThinkingDots'

// ── Demo repo ──────────────────────────────────────────────────────────────────

const DEMO_OVERVIEW = {
  name: 'vercel/next.js',
  repo_url: 'https://github.com/vercel/next.js',
  description: 'The React Framework for the Web.',
  language: 'JavaScript',
  stars: 125847,
  file_count: 3924,
  opengraph_image_url: 'https://opengraph.githubassets.com/1/vercel/next.js',
}

// ── Scene 1 — Chat ─────────────────────────────────────────────────────────────

const CHAT_Q =
  "I'm adding auth to my Node.js backend — how can I implement it using the same patterns as this repo?"

const CHAT_A = `## Adding Auth to Your Node.js Backend

Next.js uses **middleware** for route protection. Here is how to port that pattern:

**Step 1 — Install deps**
\`npm install jsonwebtoken cookie-parser\`

**Step 2 — Write the middleware**
\`\`\`js
// middleware/withAuth.js
export function withAuth(handler) {
  return (req, res) => {
    const token = req.cookies?.token
    if (!token) return res.status(401).json({ error: 'Unauthorized' })
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    return handler(req, res)
  }
}
\`\`\`

**Step 3 — Protect routes**
Wrap any handler: \`router.get('/me', withAuth(meHandler))\`

Store JWTs in **httpOnly cookies** (as this repo does) — never in localStorage.`

// ── Scene 2 — Security Review ──────────────────────────────────────────────────

const SECURITY_FINDINGS = [
  {
    severity: 'HIGH',
    title: 'Server Actions lack CSRF validation',
    file: 'app/actions/user.ts',
    description: 'Mutations callable from any origin without an origin check.',
  },
  {
    severity: 'MEDIUM',
    title: 'Secrets exposed via NEXT_PUBLIC_ prefix',
    file: 'next.config.js',
    description: 'Variables prefixed NEXT_PUBLIC_ are bundled into client JS.',
  },
  {
    severity: 'MEDIUM',
    title: 'Auth routes missing rate limiting',
    file: 'pages/api/auth/[...nextauth].ts',
    description: 'Brute-force attacks against login endpoint are not throttled.',
  },
  {
    severity: 'LOW',
    title: 'Verbose stack traces in non-prod builds',
    file: 'server.js',
    description: 'Error messages may leak internal paths in staging environments.',
  },
]

// ── Scene 3 — Analysis ────────────────────────────────────────────────────────

const ANALYZE_SUMMARY = `## Repository Overview

**Next.js** is structured into four core packages: \`next\` (runtime & CLI), \`create-next-app\` (scaffolding), \`next-swc\` (Rust/SWC compiler bindings), and \`next-env\` (TypeScript types).

**Architecture highlights**
- **App Router** — React Server Components with streaming SSR via Suspense boundaries
- **Pages Router** — classic SSR/SSG still fully supported alongside the new router
- **SWC compiler** — Rust-based, delivers ~17x faster transforms than Babel
- **Turbopack** — incremental bundler written in Rust (replaces Webpack, opt-in)

**Stack:** React 18, Node.js, TypeScript, Rust (SWC / Turbopack), CSS Modules`

// ── Scene metadata ─────────────────────────────────────────────────────────────

const SCENES = [
  { id: 'chat',     label: 'Chat',            icon: '💬' },
  { id: 'security', label: 'Security Review',  icon: '🛡️' },
  { id: 'analyze',  label: 'Analysis',         icon: '🔍' },
]

const SEV_COLOR = { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' }

// ── Cursor ─────────────────────────────────────────────────────────────────────

function Cursor() {
  return <span className="landing-cursor" aria-hidden />
}

// ── DemoWindow — three-scene loop ─────────────────────────────────────────────

function DemoWindow() {
  const [sceneIdx,   setSceneIdx]   = useState(0)

  // Scene 1 — chat
  const [chatPhase,  setChatPhase]  = useState('idle')   // idle|typing|thinking|streaming|done
  const [chatQ,      setChatQ]      = useState('')
  const [chatA,      setChatA]      = useState('')

  // Scene 2 — security
  const [secPhase,   setSecPhase]   = useState('idle')   // idle|scanning|revealing|done
  const [findings,   setFindings]   = useState([])

  // Scene 3 — analyze
  const [anPhase,    setAnPhase]    = useState('idle')   // idle|analyzing|streaming|done
  const [anText,     setAnText]     = useState('')

  const abortedRef = useRef(false)
  const bottomRef  = useRef(null)

  // ── Core async helpers ────────────────────────────────────────────────────────
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const ok    = ()  => !abortedRef.current

  // ── Scene runners ─────────────────────────────────────────────────────────────

  async function runChat() {
    setSceneIdx(0)
    setChatPhase('typing')
    setChatQ('')
    setChatA('')
    setFindings([])
    setAnText('')

    for (let i = 1; i <= CHAT_Q.length && ok(); i++) {
      setChatQ(CHAT_Q.slice(0, i))
      await sleep(36)
    }
    if (!ok()) return

    setChatPhase('thinking')
    await sleep(1700)
    if (!ok()) return

    setChatPhase('streaming')
    for (let i = 1; i <= CHAT_A.length && ok(); i++) {
      setChatA(CHAT_A.slice(0, i))
      await sleep(9)
    }
    if (!ok()) return

    setChatPhase('done')
    await sleep(4000)
  }

  async function runSecurity() {
    setSceneIdx(1)
    setSecPhase('scanning')
    setFindings([])
    setChatPhase('idle')
    await sleep(2400)
    if (!ok()) return

    setSecPhase('revealing')
    for (let i = 0; i < SECURITY_FINDINGS.length && ok(); i++) {
      setFindings(SECURITY_FINDINGS.slice(0, i + 1))
      await sleep(950)
    }
    if (!ok()) return

    setSecPhase('done')
    await sleep(3800)
  }

  async function runAnalyze() {
    setSceneIdx(2)
    setAnPhase('analyzing')
    setAnText('')
    setSecPhase('idle')
    await sleep(2200)
    if (!ok()) return

    setAnPhase('streaming')
    for (let i = 1; i <= ANALYZE_SUMMARY.length && ok(); i++) {
      setAnText(ANALYZE_SUMMARY.slice(0, i))
      await sleep(8)
    }
    if (!ok()) return

    setAnPhase('done')
    await sleep(4000)
  }

  // ── Main loop ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    abortedRef.current = false

    async function loop() {
      while (ok()) {
        await runChat();     if (!ok()) break
        await sleep(400)
        await runSecurity(); if (!ok()) break
        await sleep(400)
        await runAnalyze();  if (!ok()) break
        await sleep(400)
      }
    }

    const id = setTimeout(loop, 600)
    return () => {
      abortedRef.current = true
      clearTimeout(id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-scroll the chat / findings area
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  })

  // ── Render helpers ────────────────────────────────────────────────────────────

  function renderChat() {
    return (
      <>
        <div className="demo-chat">
          {chatPhase !== 'idle' && (
            <div className="message user demo-msg">
              <span className="message-role">You</span>
              <div className="message-bubble">
                {chatQ}
                {chatPhase === 'typing' && <Cursor />}
              </div>
            </div>
          )}

          {chatPhase === 'thinking' && (
            <div className="message assistant demo-msg">
              <span className="message-role">Assistant</span>
              <div className="message-bubble">
                <ThinkingDots label="Thinking" />
              </div>
            </div>
          )}

          {(chatPhase === 'streaming' || chatPhase === 'done') && chatA && (
            <div className="message assistant demo-msg">
              <span className="message-role">Assistant</span>
              <div className="message-bubble demo-ai-bubble">
                <div className="md demo-md">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{chatA}</ReactMarkdown>
                </div>
                {chatPhase === 'streaming' && <Cursor />}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="demo-input-bar">
          <span className="demo-input-placeholder">Ask anything about this repository…</span>
          <span className="demo-send-btn">Send</span>
        </div>
      </>
    )
  }

  function renderSecurity() {
    return (
      <div className="demo-findings-area">
        {secPhase === 'scanning' && (
          <div className="demo-scanning">
            <ThinkingDots label="Scanning for vulnerabilities" />
          </div>
        )}

        {(secPhase === 'revealing' || secPhase === 'done') && (
          <>
            <div className="demo-findings-header">
              <span className="demo-findings-count">
                {findings.length} finding{findings.length !== 1 ? 's' : ''} detected
              </span>
            </div>
            <div className="demo-findings-list">
              {findings.map((f, i) => (
                <div
                  key={i}
                  className={`demo-finding demo-finding--${SEV_COLOR[f.severity]}`}
                >
                  <div className="demo-finding-row">
                    <span className={`sev-badge sev-badge--${f.severity.toLowerCase()}`}>
                      {f.severity}
                    </span>
                    <span className="demo-finding-title">{f.title}</span>
                  </div>
                  <code className="demo-finding-file">{f.file}</code>
                  <p className="demo-finding-desc">{f.description}</p>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </>
        )}
      </div>
    )
  }

  function renderAnalyze() {
    return (
      <div className="demo-analyze-area">
        {anPhase === 'analyzing' && (
          <div className="demo-scanning">
            <ThinkingDots label="Generating analysis" />
          </div>
        )}

        {(anPhase === 'streaming' || anPhase === 'done') && (
          <div className="demo-analyze-body">
            <div className="md demo-md">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{anText}</ReactMarkdown>
            </div>
            {anPhase === 'streaming' && <Cursor />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    )
  }

  // ── Full window ───────────────────────────────────────────────────────────────

  return (
    <div className="demo-window">
      {/* macOS-style title bar */}
      <div className="demo-chrome">
        <span className="demo-dot demo-dot--red"   />
        <span className="demo-dot demo-dot--amber" />
        <span className="demo-dot demo-dot--green" />
        <span className="demo-chrome-title">GitHub AI Assistant</span>
      </div>

      {/* Scene tabs */}
      <div className="demo-scene-tabs">
        {SCENES.map((s, i) => (
          <span
            key={s.id}
            className={`demo-scene-tab${i === sceneIdx ? ' demo-scene-tab--active' : ''}`}
          >
            <span className="demo-scene-tab-icon">{s.icon}</span>
            {s.label}
          </span>
        ))}
      </div>

      {/* Repo banner (always visible) */}
      <div className="demo-repo-banner">
        <img
          className="demo-repo-img"
          src={DEMO_OVERVIEW.opengraph_image_url}
          alt=""
          loading="lazy"
        />
        <div className="demo-repo-meta">
          <a
            className="demo-repo-name"
            href={DEMO_OVERVIEW.repo_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {DEMO_OVERVIEW.name}
          </a>
          <div className="demo-repo-stats">
            <span className="overview-badge overview-badge--lang">{DEMO_OVERVIEW.language}</span>
            <span className="overview-meta-item">★ {DEMO_OVERVIEW.stars.toLocaleString()}</span>
            <span className="overview-meta-item">{DEMO_OVERVIEW.file_count.toLocaleString()} files</span>
          </div>
          <p className="demo-repo-desc">{DEMO_OVERVIEW.description}</p>
        </div>
      </div>

      {/* Scene content */}
      <div className="demo-scene-content">
        {sceneIdx === 0 && renderChat()}
        {sceneIdx === 1 && renderSecurity()}
        {sceneIdx === 2 && renderAnalyze()}
      </div>
    </div>
  )
}

// ── Feature pills ──────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: '💬', label: 'Chat' },
  { icon: '🔍', label: 'Analyze' },
  { icon: '⚖️', label: 'Compare repos' },
  { icon: '🛡️', label: 'Security review' },
  { icon: '🧹', label: 'Code quality' },
  { icon: '📊', label: 'History' },
]

// ── Landing page ───────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="landing-page">

      {/* ── Left — hero ── */}
      <section className="landing-hero">
        <div className="landing-hero-inner">

          <span className="landing-eyebrow">
            <span className="landing-eyebrow-dot" />
            AI-powered code intelligence
          </span>

          <h1 className="landing-title">
            Understand any{' '}
            <span className="landing-title-accent">GitHub repo</span>{' '}
            instantly
          </h1>

          <p className="landing-desc">
            Ask questions in plain English, run deep security scans, compare projects
            side-by-side, and review code quality — all without cloning a single file.
          </p>

          <div className="landing-ctas">
            <Link to="/chat"    className="landing-cta landing-cta--primary">Start chatting →</Link>
            <Link to="/analyze" className="landing-cta landing-cta--secondary">Analyze a repo</Link>
            <Link to="/help"    className="landing-cta landing-cta--ghost">See all features</Link>
          </div>

          <div className="landing-features">
            {FEATURES.map(f => (
              <span key={f.label} className="landing-pill">
                <span className="landing-pill-icon">{f.icon}</span>
                {f.label}
              </span>
            ))}
          </div>

        </div>
      </section>

      {/* ── Right — animated demo ── */}
      <section className="landing-demo-col" aria-label="Live demo">
        <DemoWindow />
        <p className="landing-demo-note">
          <span className="landing-demo-badge">DEMO</span>
          Simulated — try the real thing above
        </p>
      </section>

    </div>
  )
}
