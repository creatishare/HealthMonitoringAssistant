import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Layout from './components/common/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Records from './pages/Records'
import RecordDetail from './pages/RecordDetail'
import RecordForm from './pages/RecordForm'
import OCRUpload from './pages/OCRUpload'
import Charts from './pages/Charts'
import Medications from './pages/Medications'
import MedicationForm from './pages/MedicationForm'
import Alerts from './pages/Alerts'
import Profile from './pages/Profile'

function App() {
  const { isAuthenticated, logout } = useAuthStore()

  useEffect(() => {
    const handleUnauthorized = () => logout()
    window.addEventListener('unauthorized', handleUnauthorized)
    return () => window.removeEventListener('unauthorized', handleUnauthorized)
  }, [logout])

  return (
    <Routes>
      {/* 公开路由 */}
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />

      {/* 需要认证的路由 */}
      <Route element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/records" element={<Records />} />
        <Route path="/records/new" element={<RecordForm />} />
        <Route path="/records/ocr" element={<OCRUpload />} />
        <Route path="/records/:id" element={<RecordDetail />} />
        <Route path="/records/:id/edit" element={<RecordForm />} />
        <Route path="/charts" element={<Charts />} />
        <Route path="/medications" element={<Medications />} />
        <Route path="/medications/new" element={<MedicationForm />} />
        <Route path="/medications/:id/edit" element={<MedicationForm />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
    </Routes>
  )
}

export default App
