import { useEffect, useState } from 'react'

const DOTS = ['', '.', '..', '...']

/**
 * @param {{ label?: string, spinner?: boolean }} props
 * @returns {JSX.Element}
 */
export default function ThinkingDots({ label = 'Thinking', spinner = false }) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => (t + 1) % DOTS.length), 500)
    return () => clearInterval(id)
  }, [])

  return (
    <span className="thinking-dots">
      {spinner && <span className="spinner" aria-hidden="true" />}
      {label}
      <span className="thinking-dots-trail">{DOTS[tick]}</span>
    </span>
  )
}
