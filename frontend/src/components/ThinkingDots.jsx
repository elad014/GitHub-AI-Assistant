import { useEffect, useState } from 'react'

const DOTS = ['', '.', '..', '...']

export default function ThinkingDots({ label = 'Thinking' }) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => (t + 1) % DOTS.length), 500)
    return () => clearInterval(id)
  }, [])

  return (
    <span className="thinking-dots">
      {label}
      <span className="thinking-dots-trail">{DOTS[tick]}</span>
    </span>
  )
}
