import { useEffect, useRef, useState } from 'react'

// ── Section data ───────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'getting-started', label: 'Getting Started',  icon: '🚀' },
  { id: 'chat',            label: 'Chat',              icon: '💬' },
  { id: 'analyze',         label: 'Analyze',           icon: '🔍' },
  { id: 'dashboard',       label: 'Dashboard',         icon: '📊' },
  { id: 'tips',            label: 'Tips & Shortcuts',  icon: '⚡' },
]

// ── Small reusable pieces ──────────────────────────────────────────────────────

function Kbd({ children }) {
  return <kbd className="help-kbd">{children}</kbd>
}

function Tag({ children, color }) {
  return <span className={`help-tag help-tag--${color ?? 'default'}`}>{children}</span>
}

function StepList({ steps }) {
  return (
    <ol className="help-steps">
      {steps.map((s, i) => (
        <li key={i} className="help-step">
          <span className="help-step-num">{i + 1}</span>
          <span className="help-step-text">{s}</span>
        </li>
      ))}
    </ol>
  )
}

function FeatureCard({ icon, title, children }) {
  return (
    <div className="help-feature-card">
      <span className="help-feature-icon">{icon}</span>
      <div className="help-feature-content">
        <h4 className="help-feature-title">{title}</h4>
        {children}
      </div>
    </div>
  )
}

function Callout({ type = 'info', children }) {
  const icons = { info: 'ℹ️', tip: '💡', warning: '⚠️' }
  return (
    <div className={`help-callout help-callout--${type}`}>
      <span className="help-callout-icon">{icons[type]}</span>
      <div className="help-callout-body">{children}</div>
    </div>
  )
}

function SubSection({ id, title, children }) {
  return (
    <section id={id} className="help-sub">
      <h3 className="help-sub-title">{title}</h3>
      {children}
    </section>
  )
}

function Section({ id, icon, title, badge, children }) {
  return (
    <section id={id} className="help-section">
      <header className="help-section-header">
        <span className="help-section-icon">{icon}</span>
        <h2 className="help-section-title">{title}</h2>
        {badge && <span className="help-section-badge">{badge}</span>}
      </header>
      {children}
    </section>
  )
}

// ── Page component ─────────────────────────────────────────────────────────────

export default function HelpPage() {
  const [active, setActive] = useState(SECTIONS[0].id)
  const contentRef = useRef(null)
  const observerRef = useRef(null)

  // Highlight the sidebar entry whose section is closest to the top of the viewport
  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    const sectionEls = SECTIONS.map(s => document.getElementById(s.id)).filter(Boolean)

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting)
        if (visible.length === 0) return
        const topmost = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        setActive(topmost.target.id)
      },
      { root: el, threshold: 0.15 },
    )
    sectionEls.forEach(s => observerRef.current.observe(s))
    return () => observerRef.current?.disconnect()
  }, [])

  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActive(id)
  }

  return (
    <div className="help-page">
      {/* ── Left TOC sidebar ── */}
      <aside className="help-sidebar">
        <p className="help-sidebar-heading">Contents</p>
        <nav className="help-toc">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              type="button"
              className={`help-toc-btn${active === s.id ? ' help-toc-btn--active' : ''}`}
              onClick={() => scrollTo(s.id)}
            >
              <span className="help-toc-icon">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Scrollable content ── */}
      <div className="help-content" ref={contentRef}>

        {/* Hero */}
        <header className="help-hero">
          <h1 className="help-hero-title">Help &amp; Documentation</h1>
          <p className="help-hero-sub">
            Everything you need to get the most out of <strong>GitHub AI Assistant</strong> — from
            chatting about a codebase to running deep security reviews.
          </p>
        </header>

        {/* ══ Getting Started ══════════════════════════════════════════════════ */}
        <Section id="getting-started" icon="🚀" title="Getting Started">
          <p className="help-body">
            GitHub AI Assistant connects to any public (or private, with a token) GitHub
            repository and lets you explore it with an AI. You can chat freely, run structured
            analyses, compare two repos side-by-side, or trigger security and code-quality
            reviews — all without cloning anything locally.
          </p>

          <SubSection id="gs-flow" title="Basic flow">
            <StepList steps={[
              "Enter a full GitHub repository URL in any page\u2019s URL bar \u2014 e.g., https://github.com/owner/repo.",
              'Click Load (Analyze / Chat). The AI fetches metadata, the file tree, and key file contents.',
              'Ask questions in Chat, explore the Overview, run a Review, or Compare with another repo.',
              'Every action is recorded: revisit results in the Dashboard \u2192 History tab any time.',
            ]} />
          </SubSection>

          <SubSection id="gs-requirements" title="Requirements">
            <div className="help-card-grid">
              <FeatureCard icon="🔑" title="Public repos">
                Work out of the box — no token needed.
              </FeatureCard>
              <FeatureCard icon="🔐" title="Private repos">
                Set <code className="help-code">GITHUB_TOKEN</code> in <code className="help-code">.env</code> with
                at least <Tag color="green">repo</Tag> scope.
              </FeatureCard>
              <FeatureCard icon="🤖" title="AI model">
                Defaults to <Tag color="blue">claude-sonnet</Tag>. Override with
                <code className="help-code">ANTHROPIC_MODEL</code> in <code className="help-code">.env</code>.
              </FeatureCard>
            </div>
          </SubSection>

          <Callout type="tip">
            For large monorepos, the AI automatically picks the most relevant files from the
            tree. You don't need to paste file paths manually.
          </Callout>
        </Section>

        {/* ══ Chat ═════════════════════════════════════════════════════════════ */}
        <Section id="chat" icon="💬" title="Chat">
          <p className="help-body">
            The Chat page lets you have a free-form conversation with an AI that has full
            context of the repository you load. Ask anything — architecture questions, "explain
            this file", "what does function X do", "is there a bug on line Y".
          </p>

          <SubSection id="chat-start" title="Starting a chat session">
            <StepList steps={[
              'Enter your name in the Name field (optional, used to track history).',
              'Paste a GitHub repo URL and press Enter or click Load repo.',
              "A banner appears with the repo\u2019s social preview image, name, and description.",
              'Start typing in the message box and press Enter (or click Send).',
            ]} />
          </SubSection>

          <SubSection id="chat-streaming" title="Streaming responses">
            <p className="help-body">
              Responses stream token-by-token so you see the answer being written in real time.
              While streaming, the Send button is disabled. A <em>Thinking…</em> indicator shows
              before the first token arrives.
            </p>
          </SubSection>

          <SubSection id="chat-context" title="Repository context">
            <div className="help-card-grid">
              <FeatureCard icon="📂" title="File tree">
                The AI receives a list of every file in the repo so it can reason about structure.
              </FeatureCard>
              <FeatureCard icon="📄" title="Key file contents">
                Source files likely relevant to your question are fetched automatically (up to 6 000 chars each).
              </FeatureCard>
              <FeatureCard icon="📖" title="README">
                The first 3 000 characters of the README are always included for general context.
              </FeatureCard>
            </div>
          </SubSection>

          <Callout type="info">
            The chat session is kept in memory while you stay on the page. Navigating away and
            returning restores your conversation because state is lifted to the root app.
          </Callout>

          <SubSection id="chat-tips" title="Tips for better answers">
            <ul className="help-list">
              <li>Be specific: <em>"What does the <code className="help-code">auth/jwt.py</code> module do?"</em> outperforms <em>"explain the auth"</em>.</li>
              <li>Mention file names directly — the AI will pull their content automatically.</li>
              <li>Ask follow-up questions; the conversation history is always sent along.</li>
              <li>For long files, ask about specific functions rather than the whole file.</li>
            </ul>
          </SubSection>
        </Section>

        {/* ══ Analyze ══════════════════════════════════════════════════════════ */}
        <Section id="analyze" icon="🔍" title="Analyze" badge="3 tabs">
          <p className="help-body">
            The Analyze page is the main workspace for deep, structured inspection of a
            repository. It has three tabs: <strong>Overview</strong>, <strong>Compare</strong>,
            and <strong>Review</strong>. State (including results) persists while you navigate
            between tabs and even if you visit Chat and return.
          </p>

          <SubSection id="analyze-overview" title="Overview tab">
            <p className="help-body">
              Loads rich metadata and an AI-generated plain-English summary of the repository.
            </p>
            <div className="help-card-grid">
              <FeatureCard icon="🖼️" title="Banner + meta">
                Social preview image, stars, language, file count, and description fetched from
                the GitHub API.
              </FeatureCard>
              <FeatureCard icon="📝" title="README excerpt">
                The top portion of the README rendered as Markdown, so you can read the project's
                own documentation inline.
              </FeatureCard>
              <FeatureCard icon="🗝️" title="Key files">
                Important files detected automatically (e.g., <code className="help-code">package.json</code>,
                <code className="help-code">Dockerfile</code>, <code className="help-code">main.py</code>).
              </FeatureCard>
              <FeatureCard icon="🤖" title="AI Summary">
                A short, opinionated summary: what the project does, its main technologies, and
                notable architectural choices. Cached for the session.
              </FeatureCard>
              <FeatureCard icon="🌳" title="File tree">
                An interactive tree of all files. Click any file to highlight it (used by the
                Review tab findings).
              </FeatureCard>
            </div>
          </SubSection>

          <SubSection id="analyze-compare" title="Compare tab">
            <p className="help-body">
              Compares the loaded repository (Repo A) against a second repository (Repo B)
              you provide. Useful for choosing between two libraries or understanding
              architectural differences.
            </p>
            <StepList steps={[
              'Load a repo with the URL bar at the top of the page.',
              'Switch to the Compare tab.',
              'Paste the URL of the second repository into the input.',
              'Optionally describe your goal in the context field (e.g., "I need a small logging lib for my CLI").',
              'Click Compare and wait for the structured verdict.',
            ]} />
            <div className="help-card-grid help-card-grid--2col">
              <FeatureCard icon="⚖️" title="Verdict">
                A single-sentence recommendation of which repo better fits your stated goal.
              </FeatureCard>
              <FeatureCard icon="📋" title="Per-repo cards">
                Language, stars, description shown side-by-side for quick reference.
              </FeatureCard>
              <FeatureCard icon="📑" title="Sections">
                Multiple scored dimensions (API design, documentation, activity…) with
                explanatory prose.
              </FeatureCard>
              <FeatureCard icon="💾" title="Cached">
                Results are cached per (Repo A, Repo B) pair for the session; re-running clears
                the cache.
              </FeatureCard>
            </div>
            <Callout type="tip">
              The optional context field significantly improves relevance — the AI can weigh
              trade-offs that matter to you (e.g. license, runtime size, TypeScript support).
            </Callout>
          </SubSection>

          <SubSection id="analyze-review" title="Review tab">
            <p className="help-body">
              Runs a structured, multi-finding code review. Two modes are available and each
              keeps its own independent cached result.
            </p>
            <div className="help-card-grid help-card-grid--2col">
              <FeatureCard icon="🛡️" title="Security">
                <Tag color="red">security</Tag> Scans for vulnerabilities, unsafe patterns,
                hardcoded secrets, insecure dependencies, and injection risks visible in the
                fetched file context.
              </FeatureCard>
              <FeatureCard icon="🧹" title="Code quality">
                <Tag color="amber">quality</Tag> Looks for bugs, brittle logic, error-handling
                gaps, dead code, and maintainability issues — not security claims.
              </FeatureCard>
            </div>

            <h4 className="help-h4">Each finding includes:</h4>
            <ul className="help-list">
              <li><Tag color="red">HIGH</Tag> / <Tag color="amber">MEDIUM</Tag> / <Tag color="green">LOW</Tag> severity badge</li>
              <li>A short title and an exact file path + line range (when available)</li>
              <li><strong>Issue</strong> — what the problem is and why it matters</li>
              <li><strong>Recommendation</strong> — a concrete fix (highlighted in green)</li>
            </ul>

            <h4 className="help-h4">Navigation</h4>
            <ul className="help-list">
              <li>The <strong>Review</strong> tab badge shows the total finding count; red if any HIGH findings.</li>
              <li>The left-hand file tree highlights files that have at least one finding.</li>
              <li>Click a file in the tree to filter the findings panel to that file only.</li>
              <li>Click a finding card to expand it and read the full description.</li>
            </ul>

            <Callout type="warning">
              Reviews are limited to the files the AI fetches (context window). Very large
              repos may not have every file analysed; focus files are chosen heuristically.
            </Callout>
          </SubSection>
        </Section>

        {/* ══ Dashboard ════════════════════════════════════════════════════════ */}
        <Section id="dashboard" icon="📊" title="Dashboard" badge="2 tabs">
          <p className="help-body">
            The Dashboard aggregates everything that has happened across all your sessions —
            how many events of each type, which repos you use most, and a full per-repo audit
            trail. Data is persisted in the backend database.
          </p>

          <SubSection id="dash-analytics" title="Analytics tab">
            <p className="help-body">
              Aggregated statistics for the last <strong>7 / 30 / 90 days</strong> (toggle in
              the top-right).
            </p>
            <div className="help-card-grid help-card-grid--3col">
              <FeatureCard icon="🔢" title="Total Events">
                Every tracked interaction: chats, analyses, reviews, explains.
              </FeatureCard>
              <FeatureCard icon="🛡️" title="Security Scans">
                Count of security reviews run in the period.
              </FeatureCard>
              <FeatureCard icon="🚨" title="High-Severity Findings">
                Aggregate count; card border turns red when &gt; 0.
              </FeatureCard>
            </div>
            <p className="help-body" style={{ marginTop: '0.75rem' }}>
              Below the stats two panels list <strong>Events by Type</strong> and <strong>Top
              Repositories</strong>. Hover any repository name in the Top Repos panel to see
              a live preview card (language, stars, file count, description).
            </p>
          </SubSection>

          <SubSection id="dash-history" title="History tab">
            <p className="help-body">
              A full chronological log for each repository. Select a repo from the sidebar to
              load its timeline.
            </p>
            <div className="help-card-grid help-card-grid--2col">
              <FeatureCard icon="📚" title="Sidebar">
                Lists every repo you've used, with event count and last-activity time. Hover
                to see an overview popover. Click to load the timeline.
              </FeatureCard>
              <FeatureCard icon="🕓" title="Timeline">
                Each entry is an expandable card. The entry shows the event type, user,
                timestamp, and a preview line. Click to expand full content.
              </FeatureCard>
            </div>

            <h4 className="help-h4">Expandable history entries</h4>
            <ul className="help-list">
              <li><Tag color="blue">Chat</Tag> — Question and full AI answer, both rendered as Markdown.</li>
              <li><Tag color="purple">Analysis</Tag> — The AI summary for that run.</li>
              <li><Tag color="red">Security Review</Tag> — Expandable finding cards identical to the Analyze tab (severity, file, issue, recommendation).</li>
              <li><Tag color="amber">Code quality</Tag> — Same structure as Security Review.</li>
              <li><Tag color="green">Code Explain</Tag> — The file path and the explanation.</li>
            </ul>

            <h4 className="help-h4">Filtering</h4>
            <p className="help-body">
              Use the filter buttons above the timeline to show only a specific event type.
              The <strong>All</strong> button resets the filter.
            </p>
          </SubSection>

          <SubSection id="dash-popover" title="Repo hover popover">
            <p className="help-body">
              Hovering over any repository name in the <em>Top Repositories</em> panel or in
              the <em>History sidebar</em> shows a floating preview card with:
            </p>
            <ul className="help-list">
              <li>Repo name (clickable GitHub link)</li>
              <li>Language badge, star count, file count</li>
              <li>Short description (up to 6 lines)</li>
            </ul>
            <Callout type="tip">
              Overview data is fetched on first hover and then <strong>cached in memory</strong> — 
              subsequent hovers are instant. Moving the cursor from the row onto the popover
              keeps it open.
            </Callout>
          </SubSection>
        </Section>

        {/* ══ Tips & Shortcuts ═════════════════════════════════════════════════ */}
        <Section id="tips" icon="⚡" title="Tips &amp; Shortcuts">

          <SubSection id="tips-keyboard" title="Keyboard shortcuts">
            <div className="help-shortcuts">
              <div className="help-shortcut-row">
                <span className="help-shortcut-keys"><Kbd>Enter</Kbd></span>
                <span className="help-shortcut-desc">Send chat message (when message box is focused)</span>
              </div>
              <div className="help-shortcut-row">
                <span className="help-shortcut-keys"><Kbd>Shift</Kbd> + <Kbd>Enter</Kbd></span>
                <span className="help-shortcut-desc">Insert a newline in the chat input without sending</span>
              </div>
              <div className="help-shortcut-row">
                <span className="help-shortcut-keys"><Kbd>Enter</Kbd> (form)</span>
                <span className="help-shortcut-desc">Submit any URL / Load form</span>
              </div>
            </div>
          </SubSection>

          <SubSection id="tips-general" title="General tips">
            <ul className="help-list">
              <li>
                <strong>Session persistence</strong> — Analyze results and Chat history survive
                route changes because state is lifted to the root app. You won't lose your
                review just by visiting Dashboard.
              </li>
              <li>
                <strong>Repo links</strong> — Every repo name throughout the UI (Overview card,
                Compare chips, Top Repos, History timeline header) is a direct link to GitHub
                that opens in a new tab.
              </li>
              <li>
                <strong>Compare context</strong> — Always fill in the optional context field
                when comparing repos; it moves the AI from generic comparison to advice
                tailored to your constraints.
              </li>
              <li>
                <strong>Security vs Code quality</strong> — These are independent runs with
                separate caches. Run both on the same repo to get a complete picture.
              </li>
              <li>
                <strong>Model override</strong> — Set <code className="help-code">ANTHROPIC_MODEL</code> in
                your <code className="help-code">.env</code> to swap the underlying Claude model. Default is
                <code className="help-code">claude-sonnet-4-5</code>.
              </li>
              <li>
                <strong>GitHub token</strong> — For private repos or to avoid rate-limiting on
                public repos, add a <code className="help-code">GITHUB_TOKEN</code> to your
                <code className="help-code">.env</code>.
              </li>
            </ul>
          </SubSection>

          <SubSection id="tips-perf" title="Performance notes">
            <ul className="help-list">
              <li>
                Large repos (&gt; 1 000 files) have their context trimmed automatically.
                The AI prioritises files with names matching your query, plus always-relevant
                configs and entry points.
              </li>
              <li>
                Analyses and reviews are <strong>not</strong> cached between browser sessions.
                Use Dashboard → History to re-read past results without re-running.
              </li>
              <li>
                If the backend health indicator shows a red dot, the API or database is
                unreachable — wait a moment and refresh.
              </li>
            </ul>
          </SubSection>

          <Callout type="info">
            The scrollbar throughout the app has been styled to match the blue accent palette —
            you can always tell at a glance that scrollable content is available.
          </Callout>
        </Section>

        {/* Footer spacer */}
        <div className="help-footer-spacer" />
      </div>
    </div>
  )
}
