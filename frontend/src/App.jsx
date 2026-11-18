import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, socialError } from './auth'
import Header from './components/Header'
import AuthPage from './pages/AuthPage'
import DiscussionList from './pages/DiscussionList'
import DiscussionDetail from './pages/DiscussionDetail'
import DiscussionForm from './pages/DiscussionForm'
import Profile from './pages/Profile'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <main>
          <Routes>
            {/* 소셜 로그인 실패로 돌아왔으면 로그인 화면, 아니면 토론 목록 */}
            <Route path="/" element={<Navigate to={socialError ? '/login' : '/discussions'} replace />} />
            <Route path="/discussions" element={<DiscussionList />} />
            <Route path="/discussions/new" element={<DiscussionForm />} />
            <Route path="/discussions/:id" element={<DiscussionDetail />} />
            <Route path="/discussions/:id/edit" element={<DiscussionForm />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/me" element={<Profile />} />
            <Route path="*" element={<Navigate to="/discussions" replace />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
