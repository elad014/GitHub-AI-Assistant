import { NavLink } from 'react-router-dom'
import HealthBanner from './HealthBanner'

export default function NavBar() {
  return (
    <nav className="navbar">
      <a
        href="/"
        className="navbar-brand"
        aria-label="Go to landing page"
        data-build="landing-v2"
      >
        GitHub AI Assistant
      </a>

      <div className="navbar-links">
        <NavLink to="/chat"      className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Chat</NavLink>
        <NavLink to="/analyze"   className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Analyze</NavLink>
        <NavLink to="/dashboard" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Dashboard</NavLink>
        <NavLink to="/help"      className={({ isActive }) => 'nav-link nav-link--help' + (isActive ? ' active' : '')}>
          <span className="nav-help-icon">?</span>
          Help
        </NavLink>
      </div>

      <div className="navbar-right">
        <HealthBanner />
      </div>
    </nav>
  )
}
