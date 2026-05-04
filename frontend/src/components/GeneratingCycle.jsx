import { useEffect, useState } from 'react'

/** Cycles trailing dots after the full phrase (reads as one line). */
const DOT_SUFFIX = ['', '.', '..', '...']

export default function GeneratingCycle() {
  const [i, setI] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setI(n => (n + 1) % DOT_SUFFIX.length)
    }, 450)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="overview-summary-loading">
      <span className="generating-cycle">
        Generating summary{DOT_SUFFIX[i]}
      </span>
    </div>
  )
}
