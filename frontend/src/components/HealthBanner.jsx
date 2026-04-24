import { useEffect, useState } from 'react'
import { checkHealth } from '../api/client'

const POLL_INTERVAL_MS = 30_000

const SERVICE_LINKS = {
  kafka:    'http://localhost:8080',
  database: 'https://console.neon.tech',
}

/**
 * @param {{ status: string }} service
 */
function Dot({ status }) {
  return (
    <span
      className={'health-dot' + (status === 'ok' ? ' health-dot--ok' : ' health-dot--error')}
      title={status}
    />
  )
}

export default function HealthBanner() {
  const [services, setServices] = useState(null)

  async function fetchHealth() {
    try {
      const data = await checkHealth()
      setServices(data.services)
    } catch {
      setServices(null)
    }
  }

  useEffect(() => {
    fetchHealth()
    const id = setInterval(fetchHealth, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  if (!services) return null

  return (
    <div className="health-banner">
      {Object.entries(services).map(([name, svc]) => (
        <span key={name} className="health-item">
          <Dot status={svc.status} />
          {SERVICE_LINKS[name]
            ? <a href={SERVICE_LINKS[name]} target="_blank" rel="noopener noreferrer" className="health-link">{name}</a>
            : name
          }
        </span>
      ))}
    </div>
  )
}
