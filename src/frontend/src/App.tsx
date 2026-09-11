import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import Shell from '@/components/Shell'
import EngineGate from '@/components/EngineGate'
import Dashboard from './pages/Dashboard'
import Session from './pages/Session'
import History from './pages/History'

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="usmle-ui-theme">
      <EngineGate>
        <BrowserRouter>
          <Shell>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/session" element={<Session />} />
              <Route path="/history" element={<History />} />
            </Routes>
          </Shell>
        </BrowserRouter>
      </EngineGate>
    </ThemeProvider>
  )
}