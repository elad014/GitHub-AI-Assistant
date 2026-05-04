import { useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import NavBar from './components/NavBar'
import AnalyzePage from './pages/AnalyzePage'
import ChatPage from './pages/ChatPage'
import DashboardPage from './pages/DashboardPage'
import HelpPage from './pages/HelpPage'
import LandingPage from './pages/LandingPage'
import { useAnalyzeSession } from './hooks/useAnalyzeSession'

export default function App() {
  // Chat — lifted so state survives route changes
  const [repoUrl, setRepoUrl] = useState('')
  const [userName, setUserName] = useState('')
  const [activeRepo, setActiveRepo] = useState('')
  const [messages, setMessages] = useState([])
  const [chatRepoOverview, setChatRepoOverview] = useState(null)

  const analyzeSession = useAnalyzeSession()

  return (
    <BrowserRouter>
      <NavBar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/chat" element={
            <ChatPage
              repoUrl={repoUrl}       setRepoUrl={setRepoUrl}
              userName={userName}     setUserName={setUserName}
              activeRepo={activeRepo} setActiveRepo={setActiveRepo}
              messages={messages}     setMessages={setMessages}
              chatRepoOverview={chatRepoOverview}
              setChatRepoOverview={setChatRepoOverview}
            />
          } />
          <Route path="/analyze"   element={<AnalyzePage {...analyzeSession} />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/help"      element={<HelpPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
