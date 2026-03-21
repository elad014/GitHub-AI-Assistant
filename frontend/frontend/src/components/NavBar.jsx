import { NavLink } from 'react-router-dom'
import HealthBanner from './HealthBanner'

export default function NavBar() {
  return (
    <nav className="navbar">
      <span className="navbar-brand">GitHub AI Assistant</span>
      <div className="navbar-links">
        <NavLink to="/chat"      className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Chat</NavLink>
        <NavLink to="/analyze"   className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Analyze</NavLink>
        <NavLink to="/dashboard" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Dashboard</NavLink>
      </div>
      <div className="navbar-right">
        <HealthBanner />
      </div>
    </nav>
  )
}
