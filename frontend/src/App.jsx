import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import NavBar from './components/NavBar'
import AnalyzePage from './pages/AnalyzePage'
import ChatPage from './pages/ChatPage'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  // Lifted here so state survives tab navigation
  const [repoUrl, setRepoUrl] = useState('')
  const [userName, setUserName] = useState('')
  const [activeRepo, setActiveRepo] = useState('')
  const [messages, setMessages] = useState([])

  return (
    <BrowserRouter>
      <NavBar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/chat" element={
            <ChatPage
              repoUrl={repoUrl}       setRepoUrl={setRepoUrl}
              userName={userName}     setUserName={setUserName}
              activeRepo={activeRepo} setActiveRepo={setActiveRepo}
              messages={messages}     setMessages={setMessages}
            />
          } />
          <Route path="/analyze"   element={<AnalyzePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
